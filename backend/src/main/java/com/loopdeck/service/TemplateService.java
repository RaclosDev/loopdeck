package com.loopdeck.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.loopdeck.model.Card;
import com.loopdeck.model.Deck;
import com.loopdeck.model.Note;
import com.loopdeck.model.User;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Service
public class TemplateService {

    private final DeckRepository deckRepository;
    private final NoteRepository noteRepository;
    private final CardRepository cardRepository;
    private final ObjectMapper objectMapper;

    public TemplateService(DeckRepository deckRepository, NoteRepository noteRepository, CardRepository cardRepository, ObjectMapper objectMapper) {
        this.deckRepository = deckRepository;
        this.noteRepository = noteRepository;
        this.cardRepository = cardRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Deck importTemplate(User user, String templateId) {
        try {
            // Load JSON from resources
            ClassPathResource resource = new ClassPathResource("templates/" + templateId + ".json");
            if (!resource.exists()) {
                throw new RuntimeException("Template not found: " + templateId);
            }
            
            try (InputStream is = resource.getInputStream()) {
                Map<String, Object> templateData = objectMapper.readValue(is, new TypeReference<Map<String, Object>>() {});
                
                // Create Deck
                Deck deck = new Deck();
                deck.setUserId(user.getId());
                deck.setName((String) templateData.get("name"));
                deck.setDescription((String) templateData.get("description"));
                deck = deckRepository.save(deck);

                // Create Notes and Cards
                List<Map<String, String>> cards = (List<Map<String, String>>) templateData.get("cards");
                String tags = templateData.containsKey("category") ? ((String) templateData.get("category")).toLowerCase() : "template";
                
                for (Map<String, String> cardData : cards) {
                    Note note = new Note();
                    note.setUserId(user.getId());
                    note.setDeckId(deck.getId());
                    note.setNoteType("basic");
                    note.setTags(tags);
                    
                    String fieldsJson = objectMapper.writeValueAsString(Map.of(
                            "front", cardData.get("front"),
                            "back", cardData.get("back")
                    ));
                    note.setFieldsJson(fieldsJson);
                    note = noteRepository.save(note);

                    Card card = new Card();
                    card.setNoteId(note.getId());
                    card.setCardOrdinal(0);
                    card.setState("new");
                    card.setIntervalDays(0.0);
                    card.setEaseFactor(2.5);
                    card.setRepetitions(0);
                    card.setLapses(0);
                    cardRepository.save(card);
                }

                return deck;
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to import template", e);
        }
    }
    
    public List<Map<String, Object>> getAvailableTemplates() {
        try {
            ClassPathResource resource = new ClassPathResource("templates/registry.json");
            if (!resource.exists()) {
                return List.of();
            }
            try (InputStream is = resource.getInputStream()) {
                return objectMapper.readValue(is, new TypeReference<List<Map<String, Object>>>() {});
            }
        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }
}
