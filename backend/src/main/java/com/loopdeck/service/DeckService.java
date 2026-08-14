package com.loopdeck.service;

import com.loopdeck.model.Deck;
import com.loopdeck.repository.DeckRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeckService {

    private final DeckRepository deckRepository;

    public record CreateDeckRequest(String name, String description, String parentId) {}
    public record UpdateDeckRequest(String name, String description) {}

    public List<Deck> getDecks(String userId) {
        return deckRepository.findByUserIdOrderByNameAsc(userId);
    }

    public Deck createDeck(String userId, CreateDeckRequest req) {
        Deck deck = Deck.builder()
                .userId(userId)
                .name(req.name().trim())
                .description(req.description() != null ? req.description().trim() : "")
                .parentId(req.parentId())
                .build();
        return deckRepository.save(deck);
    }

    public Deck updateDeck(String userId, String deckId, UpdateDeckRequest req) {
        Deck deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));
        deck.setName(req.name().trim());
        if (req.description() != null) deck.setDescription(req.description().trim());
        return deckRepository.save(deck);
    }

    public void deleteDeck(String userId, String deckId) {
        Deck deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));
        deckRepository.delete(deck);
    }
}
