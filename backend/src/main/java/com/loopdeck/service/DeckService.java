package com.loopdeck.service;

import com.loopdeck.model.Deck;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import com.loopdeck.repository.DeckDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeckService {

    private final DeckRepository deckRepository;
    private final NoteRepository noteRepository;
    private final CardRepository cardRepository;
    private final DeckDocumentRepository deckDocumentRepository;

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

    @Transactional
    public void deleteDeck(String userId, String deckId) {
        Deck deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));
        deckDocumentRepository.deleteById(deckId); // Prevents orphaned documents
        cardRepository.deleteByDeckId(deckId); // Prevents orphaned cards!
        noteRepository.deleteByDeckId(deckId);
        deckRepository.delete(deck);
    }

    public record DeckStats(String deckId, long newCount, long learningCount, long reviewCount) {}

    public java.util.Map<String, DeckStats> getDeckStats(String userId) {
        List<Deck> decks = getDecks(userId);
        if (decks.isEmpty()) return java.util.Collections.emptyMap();

        List<String> deckIds = decks.stream().map(Deck::getId).toList();
        List<CardRepository.DeckStatsProjection> statsList = cardRepository.getStatsForDecks(deckIds, java.time.Instant.now());

        java.util.Map<String, DeckStats> result = new java.util.HashMap<>();
        for (Deck d : decks) {
            result.put(d.getId(), new DeckStats(d.getId(), 0, 0, 0));
        }

        for (CardRepository.DeckStatsProjection s : statsList) {
            result.put(s.getDeckId(), new DeckStats(s.getDeckId(), 
                s.getNewCount() != null ? s.getNewCount() : 0L, 
                s.getLearningCount() != null ? s.getLearningCount() : 0L, 
                s.getReviewCount() != null ? s.getReviewCount() : 0L));
        }

        return result;
    }
}
