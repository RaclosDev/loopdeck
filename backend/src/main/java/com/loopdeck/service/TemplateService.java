package com.loopdeck.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.loopdeck.model.Card;
import com.loopdeck.model.Deck;
import com.loopdeck.model.Note;
import com.loopdeck.model.User;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public Deck importCapitalsTemplate(User user) {
        // Create Deck
        Deck deck = new Deck();
        deck.setUser(user);
        deck.setName("Capitales del Mundo");
        deck.setDescription("Un mazo prediseñado para aprender las capitales de los países más importantes del mundo.");
        deck = deckRepository.save(deck);

        // Define Capitals
        Map<String, String> capitals = Map.ofEntries(
                // Europe
                Map.entry("España", "Madrid"),
                Map.entry("Francia", "París"),
                Map.entry("Alemania", "Berlín"),
                Map.entry("Italia", "Roma"),
                Map.entry("Reino Unido", "Londres"),
                Map.entry("Portugal", "Lisboa"),
                // America
                Map.entry("Estados Unidos", "Washington D.C."),
                Map.entry("Canadá", "Ottawa"),
                Map.entry("México", "Ciudad de México"),
                Map.entry("Brasil", "Brasilia"),
                Map.entry("Argentina", "Buenos Aires"),
                Map.entry("Colombia", "Bogotá"),
                // Asia
                Map.entry("China", "Pekín (Beijing)"),
                Map.entry("Japón", "Tokio"),
                Map.entry("Corea del Sur", "Seúl"),
                Map.entry("India", "Nueva Delhi"),
                // Africa
                Map.entry("Egipto", "El Cairo"),
                Map.entry("Sudáfrica", "Pretoria / Ciudad del Cabo / Bloemfontein"),
                Map.entry("Marruecos", "Rabat"),
                // Oceania
                Map.entry("Australia", "Canberra"),
                Map.entry("Nueva Zelanda", "Wellington")
        );

        // Create Notes and Cards
        for (Map.Entry<String, String> entry : capitals.entrySet()) {
            Note note = new Note();
            note.setUser(user);
            note.setDeck(deck);
            note.setNoteType("basic");
            note.setTags("geografia, capitales");
            
            try {
                String fieldsJson = objectMapper.writeValueAsString(Map.of(
                        "front", entry.getKey(),
                        "back", entry.getValue()
                ));
                note.setFieldsJson(fieldsJson);
            } catch (Exception e) {
                note.setFieldsJson("{}");
            }
            
            note = noteRepository.save(note);

            Card card = new Card();
            card.setNote(note);
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
}
