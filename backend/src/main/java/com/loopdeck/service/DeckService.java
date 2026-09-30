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

import jakarta.validation.constraints.NotBlank;

@Service
@RequiredArgsConstructor
public class DeckService {

    private final DeckRepository deckRepository;
    private final NoteRepository noteRepository;
    private final CardRepository cardRepository;
    private final DeckDocumentRepository deckDocumentRepository;
    private final com.loopdeck.mapper.DeckMapper deckMapper;

    public record CreateDeckRequest(@NotBlank String name, String description, String parentId) {}
    public record UpdateDeckRequest(@NotBlank String name, String description) {}

    public void verifyOwnership(String userId, String deckId) {
        deckRepository.findByIdAndUserId(deckId, userId).orElseThrow(() -> new IllegalArgumentException("Deck not found or access denied"));
    }

    @Transactional(readOnly = true)
    public List<Deck> getDecks(String userId) {
        return deckRepository.findByUserIdOrderByNameAsc(userId);
    }

    public Deck createDeck(String userId, CreateDeckRequest req) {
        Deck deck = deckMapper.toEntity(req);
        deck.setUserId(userId);
        return deckRepository.save(deck);
    }

    public Deck updateDeck(String userId, String deckId, UpdateDeckRequest req) {
        Deck deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));
        deckMapper.updateEntity(req, deck);
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

    public record DeckStats(String deckId, long newCount, long learningCount, long reviewCount, long totalCount) {}

    @Transactional(readOnly = true)
    public java.util.Map<String, DeckStats> getDeckStats(String userId) {
        List<Deck> decks = getDecks(userId);
        if (decks.isEmpty()) return java.util.Collections.emptyMap();

        List<String> deckIds = decks.stream().map(Deck::getId).toList();
        List<CardRepository.DeckStatsProjection> statsList = cardRepository.getStatsForDecks(deckIds, java.time.Instant.now());

        java.util.Map<String, DeckStats> result = new java.util.HashMap<>();
        for (Deck d : decks) {
            result.put(d.getId(), new DeckStats(d.getId(), 0, 0, 0, 0));
        }

        for (CardRepository.DeckStatsProjection s : statsList) {
            result.put(s.getDeckId(), new DeckStats(s.getDeckId(), 
                s.getNewCount() != null ? s.getNewCount() : 0L, 
                s.getLearningCount() != null ? s.getLearningCount() : 0L, 
                s.getReviewCount() != null ? s.getReviewCount() : 0L,
                s.getTotalCount() != null ? s.getTotalCount() : 0L));
        }

        return result;
    }
}
