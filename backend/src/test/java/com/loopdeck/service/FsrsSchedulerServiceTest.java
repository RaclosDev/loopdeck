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
        when(reviews.findByCardIdInAndUndoneFalseOrderByReviewedAtAsc(List.of("card-1"))).thenReturn(List.of());
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
        assertTrue(card.getFsrsState().startsWith("FSRS-5:"));
        assertFalse(card.getFsrsState().isBlank());
        assertEquals("learning", card.getState());
        assertTrue(Duration.between(before, card.getDue()).toMinutes() >= 9);
        assertTrue(Duration.between(before, card.getDue()).toMinutes() <= 11);
    }

    @Test
    void previewMatchesThePersistedScheduleForTheSameCardAndRating() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        when(reviews.findByCardIdOrderByReviewedAtDesc("card-4")).thenReturn(List.of());
        FsrsSchedulerService scheduler = new FsrsSchedulerService(reviews);
        Card card = new Card();
        card.setId("card-4");
        card.setState("new");
        card.setLearningStep(0);
        scheduler.apply(card, 3, null);
        var preview = scheduler.preview(card);
        Instant before = Instant.now();

        scheduler.apply(card, 3, null);

        long actualMinutes = Duration.between(before, card.getDue()).toMinutes();
        String actual = actualMinutes < 60 ? actualMinutes + "m"
                : actualMinutes < 1440 ? Math.round(actualMinutes / 60.0) + "h"
                : Math.round(actualMinutes / 1440.0) + "d";
        assertEquals(preview.get(3), actual);
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

    @Test
    void fuzzRangeUsesTheCorrectBandsAndNeverShrinksBelowTwoDays() {
        // Intervalo 10: delta = 1 + 0.15 * (7 - 2.5) + 0.1 * (10 - 7) = 1.975 -> [8, 12]
        assertArrayEquals(new int[]{8, 12}, FsrsSchedulerService.fuzzRange(10, 36500));
        // Intervalo 30: delta = 1 + 0.675 + 1.3 + 0.05 * 10 = 3.475 -> [27, 33]
        assertArrayEquals(new int[]{27, 33}, FsrsSchedulerService.fuzzRange(30, 36500));
        // Intervalo 3: delta = 1.075 -> [2, 4]
        assertArrayEquals(new int[]{2, 4}, FsrsSchedulerService.fuzzRange(3, 36500));
        // El máximo respeta el intervalo máximo
        assertEquals(36500, FsrsSchedulerService.fuzzRange(36500, 36500)[1]);
    }

    @Test
    void fuzzedDaysTruncatesInsteadOfRoundingUpAndStaysInsideTheRange() {
        assertEquals(8, FsrsSchedulerService.fuzzedDays(10, 0.0, 36500));
        assertEquals(12, FsrsSchedulerService.fuzzedDays(10, 0.999999, 36500));
        // 0.5 * 5 + 8 = 10.5 -> 10 (redondear daría 11)
        assertEquals(10, FsrsSchedulerService.fuzzedDays(10, 0.5, 36500));
        // Por debajo de 3 días no hay fuzz
        assertEquals(2, FsrsSchedulerService.fuzzedDays(2, 0.9, 36500));
        for (int interval = 3; interval < 400; interval++) {
            int[] range = FsrsSchedulerService.fuzzRange(interval, 36500);
            for (double r : new double[]{0.0, 0.25, 0.5, 0.75, 0.9999}) {
                int days = FsrsSchedulerService.fuzzedDays(interval, r, 36500);
                assertTrue(days >= range[0] && days <= range[1], interval + " -> " + days);
            }
        }
    }

    @Test
    void scheduledIntervalsInReviewStayWithinTheFuzzRangeAndMatchThePreview() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        FsrsSchedulerService scheduler = new FsrsSchedulerService(reviews);
        Card card = new Card();
        card.setId("card-fuzz");
        card.setState("review");
        card.setIntervalDays(30.0);
        card.setDue(Instant.now());
        card.setLearningStep(0);
        card.setRepetitions(7);

        var preview = scheduler.preview(card);
        scheduler.apply(card, 4, null);

        // La previsualización y el guardado usan la misma semilla y dan el mismo intervalo
        assertEquals(preview.get(4), Math.round(Duration.between(Instant.now(), card.getDue()).toMinutes() / 1440.0) + "d");
        assertTrue(Duration.between(Instant.now(), card.getDue()).toDays() >= 2);
    }

    @Test
    void legacyReviewCardKeepsItsIntervalInsteadOfJumpingToSixtyDays() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        FsrsSchedulerService scheduler = new FsrsSchedulerService(reviews);
        Instant now = Instant.now();
        Card card = new Card();
        card.setId("legacy-1");
        card.setState("review");
        card.setIntervalDays(3.0);
        card.setDue(now);
        card.setLearningStep(0);
        card.setCreatedAt(now.minus(Duration.ofDays(3)));

        scheduler.apply(card, 3, null);

        long days = Duration.between(now, card.getDue()).toDays();
        assertTrue(days >= 2 && days <= 12, "esperaba un intervalo cercano a 3-8 días y fue " + days);
        assertEquals("review", card.getState());
    }

    @Test
    void legacyRelearningCardKeepsRelearning() {
        ReviewRepository reviews = mock(ReviewRepository.class);
        FsrsSchedulerService scheduler = new FsrsSchedulerService(reviews);
        Card card = new Card();
        card.setId("legacy-2");
        card.setState("relearning");
        card.setIntervalDays(5.0);
        card.setDue(Instant.now());
        card.setLearningStep(0);

        scheduler.apply(card, 1, null);

        assertEquals("relearning", card.getState());
        assertTrue(Duration.between(Instant.now(), card.getDue()).toMinutes() <= 11);
    }
}
