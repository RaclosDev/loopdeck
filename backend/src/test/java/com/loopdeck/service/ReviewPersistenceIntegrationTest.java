package com.loopdeck.service;

import com.loopdeck.TestcontainersConfiguration;
import com.loopdeck.exception.*;
import com.loopdeck.model.*;
import com.loopdeck.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.util.concurrent.*;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ReviewPersistenceIntegrationTest {
    @Autowired StudyReviewService study;
    @Autowired CardService cards;
    @Autowired DeckService decks;
    @Autowired CardRepository cardRepository;
    @Autowired ReviewRepository reviews;
    @Autowired JdbcTemplate jdbc;
    String owner, cardId;
    @BeforeEach void seed() {
        owner = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users(id,email,name) VALUES (?,?,?)", owner, owner + "@example.invalid", "Review test");
        var deck = decks.createDeck(owner, new DeckService.CreateDeckRequest("Mazo", "", null));
        var note = cards.createNote(owner, new CardService.CreateNoteRequest(deck.getId(), "basic", "{\"front\":\"f\",\"back\":\"b\"}", ""));
        cardId = cardRepository.findByNoteId(note.getId()).get(0).getId();
    }
    @AfterEach void clean() { jdbc.update("DELETE FROM users WHERE id = ?", owner); }
    String requestId() { return UUID.randomUUID().toString(); }

    @Test void aReviewIsIdempotentAndRejectsChangedPayloads() {
        String id = requestId();
        study.review(owner, cardId, 3, 100, id);
        study.review(owner, cardId, 3, 100, id);
        assertEquals(1, reviews.findByCardIdOrderByReviewedAtDesc(cardId).size());
        assertEquals("learning", cardRepository.findById(cardId).orElseThrow().getState());
        assertThrows(ConflictException.class, () -> study.review(owner, cardId, 3, 200, id));
        assertThrows(InvalidInputException.class, () -> study.review(owner, cardId, 5, 0, requestId()));
    }
    @Test void undoUsesTheServerSnapshotAndKeepsTheIdempotencyTombstone() {
        var before = CardSchedule.capture(cardRepository.findById(cardId).orElseThrow());
        String id = requestId();
        study.review(owner, cardId, 4, 100, id);
        var forged = new Card(); forged.setState("invalid"); forged.setIntervalDays(-1.0);
        assertFalse(study.restore(owner, cardId, id, forged).alreadyUndone());
        assertEquals(before, CardSchedule.capture(cardRepository.findById(cardId).orElseThrow()));
        assertTrue(study.restore(owner, cardId, id, null).alreadyUndone());
        assertTrue(reviews.findById(id).orElseThrow().isUndone());
        assertThrows(ConflictException.class, () -> study.review(owner, cardId, 4, 100, id));
    }
    @Test void legacyUndoCannotWriteAnArbitraryStateOrUndoAnAmbiguousSnapshot() {
        Card before = cardRepository.findById(cardId).orElseThrow();
        String id = requestId(); study.review(owner, cardId, 3, 100, id);
        assertThrows(ConflictException.class, () -> study.restore(owner, cardId, null, new Card()));
        study.restore(owner, cardId, null, before);
        study.review(owner, cardId, 3, 100, requestId());
        assertThrows(ConflictException.class, () -> study.restore(owner, cardId, null, before));
    }
    @Test void latestAppliedReviewRemainsOrderedEvenWhenTheClockMovesBackwards() {
        String first = requestId(); study.review(owner, cardId, 3, 100, first);
        var review = reviews.findById(first).orElseThrow(); review.setReviewedAt(Instant.now().plusSeconds(3600)); reviews.save(review);
        String second = requestId(); study.review(owner, cardId, 3, 100, second);
        assertTrue(reviews.findById(second).orElseThrow().getReviewedAt().isAfter(reviews.findById(first).orElseThrow().getReviewedAt()));
        assertThrows(ConflictException.class, () -> study.restore(owner, cardId, first, null));
        study.restore(owner, cardId, second, null); study.restore(owner, cardId, first, null);
        assertEquals("new", cardRepository.findById(cardId).orElseThrow().getState());
    }
    @Test void concurrentReviewsOfTheSameCardDoNotLoseAnUpdate() throws Exception {
        runTogether(() -> study.review(owner, cardId, 3, 100, requestId()), () -> study.review(owner, cardId, 3, 100, requestId()));
        assertEquals(2, reviews.findByCardIdOrderByReviewedAtDesc(cardId).size());
        assertEquals("review", cardRepository.findById(cardId).orElseThrow().getState());
    }
    @Test void concurrentRetriesApplyOnlyOnce() throws Exception {
        String id = requestId();
        runTogether(() -> study.review(owner, cardId, 3, 100, id), () -> study.review(owner, cardId, 3, 100, id));
        assertEquals(1, reviews.findByCardIdOrderByReviewedAtDesc(cardId).size());
        runTogether(() -> study.restore(owner, cardId, id, null), () -> study.restore(owner, cardId, id, null));
        assertEquals("new", cardRepository.findById(cardId).orElseThrow().getState());
    }
    @Test void anotherAccountCannotReviewOrUndoTheCard() {
        assertThrows(IllegalArgumentException.class, () -> study.review("someone-else", cardId, 3, 100, requestId()));
        assertThrows(IllegalArgumentException.class, () -> study.restore("someone-else", cardId, requestId(), null));
        assertTrue(reviews.findByCardIdOrderByReviewedAtDesc(cardId).isEmpty());
    }
    @Test void equivalentUuidCaseIsTheSameActionForReviewAndUndo() {
        String id = requestId();
        study.review(owner, cardId, 3, 100, id.toUpperCase(java.util.Locale.ROOT));
        study.review(owner, cardId, 3, 100, id);
        assertEquals(1, reviews.findByCardIdOrderByReviewedAtDesc(cardId).size());
        study.restore(owner, cardId, id.toUpperCase(java.util.Locale.ROOT), null);
        assertTrue(study.restore(owner, cardId, id, null).alreadyUndone());
    }
    @Test void theSameActionIdCannotMoveBetweenCardsDuringConcurrentRequests() throws Exception {
        String deckId = cardRepository.findById(cardId).orElseThrow().getDeckId();
        var note = cards.createNote(owner, new CardService.CreateNoteRequest(deckId, "basic", "{\"front\":\"f\",\"back\":\"b\"}", ""));
        String secondId = cardRepository.findByNoteId(note.getId()).get(0).getId();
        Map<String, CardSchedule> before = Map.of(cardId, CardSchedule.capture(cardRepository.findById(cardId).orElseThrow()),
            secondId, CardSchedule.capture(cardRepository.findById(secondId).orElseThrow()));
        String id = requestId();
        var succeeded = ConcurrentHashMap.<String>newKeySet();
        java.util.function.Function<String, Object> attempt = card -> {
            try { study.review(owner, card, 4, 100, id); succeeded.add(card); }
            catch (ConflictException | org.springframework.dao.DataIntegrityViolationException expected) { return expected; }
            return null;
        };
        runTogether(() -> attempt.apply(cardId), () -> attempt.apply(secondId));
        assertEquals(1, succeeded.size());
        assertEquals(succeeded.iterator().next(), reviews.findById(id).orElseThrow().getCardId());
        String unchanged = succeeded.contains(cardId) ? secondId : cardId;
        assertEquals(before.get(unchanged), CardSchedule.capture(cardRepository.findById(unchanged).orElseThrow()));
    }
    private void runTogether(Callable<?> first, Callable<?> second) throws Exception {
        var start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> { start.await(); return first.call(); });
            var b = pool.submit(() -> { start.await(); return second.call(); });
            start.countDown(); a.get(15, TimeUnit.SECONDS); b.get(15, TimeUnit.SECONDS);
        } finally { pool.shutdownNow(); }
    }
}
