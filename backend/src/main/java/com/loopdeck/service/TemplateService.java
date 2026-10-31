package com.loopdeck.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.loopdeck.exception.InvalidInputException;
import com.loopdeck.model.Deck;
import com.loopdeck.model.User;
import com.loopdeck.repository.DeckRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TemplateService {
    private final DeckRepository decks;
    private final NoteImportService imports;
    private final ObjectMapper mapper;
    private final List<Map<String, Object>> registry;
    private final Map<String, TemplateFile> templates;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TemplateFile(String name, String description, String category, List<TemplateCard> cards) {}
    public record TemplateCard(String front, String back) {}

    public TemplateService(DeckRepository decks, NoteImportService imports, ObjectMapper mapper) {
        this.decks = decks; this.imports = imports; this.mapper = mapper;
        try (var input = new ClassPathResource("templates/registry.json").getInputStream()) {
            List<Map<String, Object>> entries = mapper.readValue(input, new TypeReference<>() {});
            registry = entries.stream().map(Map::copyOf).toList();
            Map<String, TemplateFile> loaded = new HashMap<>();
            for (var entry : registry) {
                String id = (String) entry.get("id");
                try (var file = new ClassPathResource("templates/" + id + ".json").getInputStream()) {
                    loaded.put(id, mapper.readValue(file, TemplateFile.class));
                }
            }
            templates = Map.copyOf(loaded);
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot load bundled templates", ex);
        }
    }

    @Transactional
    public Deck importTemplate(User user, String templateId) {
        TemplateFile template = templates.get(templateId);
        if (template == null) throw new InvalidInputException("Unknown template");
        Deck deck = new Deck();
        deck.setUserId(user.getId()); deck.setName(template.name()); deck.setDescription(template.description());
        deck = decks.saveAndFlush(deck);
        try {
            String tags = template.category() == null ? "template" : template.category().toLowerCase(Locale.ROOT);
            var notes = new java.util.ArrayList<CardService.CreateNoteRequest>();
            for (var card : template.cards()) {
                notes.add(new CardService.CreateNoteRequest(deck.getId(), "basic",
                    mapper.writeValueAsString(Map.of("front", card.front(), "back", card.back())), tags));
            }
            for (int start = 0; start < notes.size(); start += 500) {
                imports.importNotes(user.getId(), deck.getId(), notes.subList(start, Math.min(start + 500, notes.size())), null);
            }
            return deck;
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new IllegalStateException("Cannot serialize bundled template", ex);
        }
    }

    public List<Map<String, Object>> getAvailableTemplates() { return registry; }
}
