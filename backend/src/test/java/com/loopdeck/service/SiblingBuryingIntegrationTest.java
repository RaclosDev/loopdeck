package com.loopdeck.service;

import com.loopdeck.TestcontainersConfiguration;
import com.loopdeck.repository.CardRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SiblingBuryingIntegrationTest {
    @Autowired StudyReviewService study;
    @Autowired CardService cards;
    @Autowired DeckService decks;
    @Autowired CardRepository cardRepository;
    @Autowired SiblingBurying burying;
    @Autowired JdbcTemplate jdbc;
    String owner, deckId, noteId;

    @BeforeEach void seed() {
        owner = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users(id,email,name) VALUES (?,?,?)", owner, owner + "@example.invalid", "Bury test");
        deckId = decks.createDeck(owner, new DeckService.CreateDeckRequest("Mazo", "", null)).getId();
        noteId = cards.createNote(owner, new CardService.CreateNoteRequest(deckId, "reverse", "{\"front\":\"f\",\"back\":\"b\"}", "")).getId();
    }
    @AfterEach void clean() { jdbc.update("DELETE FROM users WHERE id = ?", owner); }

    List<String> queue(String order) {
        return cards.getStudyBatch(owner, deckId, 10, order).items().stream().map(item -> item.card().getId()).toList();
    }
    boolean buried(String cardId) { return Boolean.TRUE.equals(cardRepository.findById(cardId).orElseThrow().isBuried()); }

    @Test void aBatchOffersOnlyOneCardPerNoteAndTheSiblingIsBuriedAfterReviewing() {
        var both = cardRepository.findByNoteId(noteId);
        assertEquals(2, both.size());
        for (String order : List.of("new_first", "review_first", "mixed")) assertEquals(1, queue(order).size());

        String first = queue("new_first").get(0);
        String sibling = both.stream().map(c -> c.getId()).filter(id -> !id.equals(first)).findFirst().orElseThrow();
        study.review(owner, first, 3, 100, UUID.randomUUID().toString());

        assertTrue(buried(sibling));
        assertFalse(buried(first));
        assertFalse(queue("new_first").contains(sibling));
        assertEquals(1, cards.getStudyBatch(owner, deckId, 10, "new_first").counts().totalCount() - 1);
    }

    @Test void buriedSiblingsComeBackWhenTheNextStudyDayStartsAndUndoLeavesThemBuried() {
        String first = queue("new_first").get(0);
        String sibling = cardRepository.findByNoteId(noteId).stream().map(c -> c.getId()).filter(id -> !id.equals(first)).findFirst().orElseThrow();
        var result = study.review(owner, first, 3, 100, UUID.randomUUID().toString());

        study.restore(owner, first, result.reviewId(), null);
        assertTrue(buried(sibling));

        // Durante el mismo día de estudio no vuelve; al empezar el siguiente, sí.
        assertEquals(0, burying.unburyForNewStudyDay(Instant.now()));
        assertTrue(buried(sibling));
        assertEquals(1, burying.unburyForNewStudyDay(Instant.now().plus(1, ChronoUnit.DAYS)));
        assertFalse(buried(sibling));
        assertEquals(1, queue("new_first").size());
    }

    @Test void suspendedAndLearningSiblingsAreNeverBuried() {
        var both = cardRepository.findByNoteId(noteId);
        var suspended = both.get(1);
        suspended.setSuspended(true);
        cardRepository.save(suspended);

        study.review(owner, both.get(0).getId(), 3, 100, UUID.randomUUID().toString());
        assertFalse(buried(suspended.getId()));

        suspended.setSuspended(false);
        suspended.setState("learning");
        cardRepository.save(suspended);
        study.review(owner, both.get(0).getId(), 3, 100, UUID.randomUUID().toString());
        assertFalse(buried(suspended.getId()));
    }

    @Test void theDatabaseSessionRunsInUtcAndTimestampDefaultsDoNotDependOnIt() {
        assertEquals("UTC", jdbc.queryForObject("SHOW TIME ZONE", String.class));
        for (String column : List.of("cards.due", "cards.created_at", "reviews.reviewed_at", "decks.created_at", "users.created_at")) {
            String[] parts = column.split("[.]");
            String definition = jdbc.queryForObject("SELECT column_default FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
                    String.class, parts[0], parts[1]);
            assertTrue(definition.contains("UTC"), column + " -> " + definition);
        }
    }
}
