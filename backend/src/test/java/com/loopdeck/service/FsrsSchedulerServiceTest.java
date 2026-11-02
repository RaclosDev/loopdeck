package com.loopdeck.service;

import com.loopdeck.model.Card;
import com.loopdeck.repository.ReviewRepository;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FsrsSchedulerServiceTest {

    @Test
    void previewReturnsAllFourServerOwnedOptionsForANewCard() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        when(reviews.findByCardIdOrderByReviewedAtDesc("card-1")).thenReturn(List.of());
        FsrsSchedulerService scheduler = new FsrsSchedulerService(reviews);
        Card card = new Card();
        card.setId("card-1");
        card.setState("new");
        card.setLearningStep(0);

        var options = scheduler.preview(card);

        assertEquals(4, options.size());
        assertTrue(options.get(1).endsWith("m"));
        assertTrue(options.get(2).endsWith("m"));
        assertTrue(options.get(3).endsWith("m") || options.get(3).endsWith("h"));
        assertTrue(options.get(4).endsWith("d"));
    }

    @Test
    void applyPersistsFsrsMemoryStateAndSchedulesTheLearningStep() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        when(reviews.findByCardIdOrderByReviewedAtDesc("card-2")).thenReturn(List.of());
        FsrsSchedulerService scheduler = new FsrsSchedulerService(reviews);
        Card card = new Card();
        card.setId("card-2");
        card.setState("new");
        card.setLearningStep(0);
        Instant before = Instant.now();

        scheduler.apply(card, 3, null);

        assertNotNull(card.getFsrsState());
        assertFalse(card.getFsrsState().isBlank());
        assertEquals("learning", card.getState());
        assertTrue(Duration.between(before, card.getDue()).toMinutes() >= 9);
        assertTrue(Duration.between(before, card.getDue()).toMinutes() <= 11);
    }

    @Test
    void customIntervalOverridesDueDateWithoutDiscardingFsrsMemory() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        when(reviews.findByCardIdOrderByReviewedAtDesc("card-3")).thenReturn(List.of());
        FsrsSchedulerService scheduler = new FsrsSchedulerService(reviews);
        Card card = new Card();
        card.setId("card-3");
        card.setState("new");
        card.setLearningStep(0);
        Instant before = Instant.now();

        scheduler.apply(card, 3, 90);

        assertNotNull(card.getFsrsState());
        long minutes = Duration.between(before, card.getDue()).toMinutes();
        assertTrue(minutes >= 89 && minutes <= 90);
    }
}
