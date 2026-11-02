package com.loopdeck.service;

import com.loopdeck.model.Card;
import com.loopdeck.model.Review;
import com.loopdeck.repository.ReviewRepository;
import io.github.openspacedrepetition.CardAndReviewLog;
import io.github.openspacedrepetition.Rating;
import io.github.openspacedrepetition.Scheduler;
import io.github.openspacedrepetition.State;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Adapter between LoopDeck's persisted card/review model and the FSRS-5 scheduler.
 * FSRS state is stored on each card so scheduling is deterministic and survives restarts.
 */
@Service
@RequiredArgsConstructor
public class FsrsSchedulerService {
    private final ReviewRepository reviews;

    private Scheduler schedulerFor(Card card) {
        int seed = card.getId() == null ? 1 : (card.getId().hashCode() & 0x7fffffff);
        return Scheduler.builder()
                .desiredRetention(0.90)
                .learningSteps(new Duration[]{Duration.ofMinutes(1), Duration.ofMinutes(10)})
                .relearningSteps(new Duration[]{Duration.ofMinutes(10)})
                .maximumInterval(36500)
                .enableFuzzing(true)
                .randomSeedNumber(seed == 0 ? 1 : seed)
                .build();
    }

    private io.github.openspacedrepetition.Card stateFor(Card card, Scheduler scheduler) {
        if (card.getFsrsState() != null && !card.getFsrsState().isBlank()) {
            return io.github.openspacedrepetition.Card.fromJson(card.getFsrsState());
        }

        List<Review> history = reviews.findByCardIdOrderByReviewedAtDesc(card.getId()).stream()
                .filter(review -> !review.isUndone())
                .sorted(Comparator.comparing(Review::getReviewedAt))
                .toList();

        io.github.openspacedrepetition.Card fsrs = io.github.openspacedrepetition.Card.builder()
                .cardId(stableCardId(card.getId()))
                .due(card.getDue() == null ? Instant.now() : card.getDue())
                .build();

        if (!history.isEmpty()) {
            for (Review review : history) {
                CardAndReviewLog result = scheduler.reviewCard(fsrs, rating(review.getRating()), review.getReviewedAt());
                fsrs = result.card();
            }
            return fsrs;
        }

        // Legacy cards may predate review logging. Give already-graduated cards a conservative
        // initial memory state instead of attempting to run FSRS with null stability/difficulty.
        if ("review".equals(card.getState())) {
            Instant created = card.getCreatedAt() == null ? Instant.now().minus(Duration.ofDays(2)) : card.getCreatedAt();
            fsrs = scheduler.reviewCard(fsrs, Rating.GOOD, created).card();
            fsrs = scheduler.reviewCard(fsrs, Rating.GOOD, created.plus(Duration.ofMinutes(10))).card();
        } else if ("learning".equals(card.getState()) || "relearning".equals(card.getState())) {
            fsrs.setStep(Math.max(0, card.getLearningStep() == null ? 0 : card.getLearningStep()));
            if ("relearning".equals(card.getState())) fsrs.setState(State.RELEARNING);
        }
        return fsrs;
    }

    public Map<Integer, String> preview(Card card) {
        Scheduler scheduler = schedulerFor(card);
        io.github.openspacedrepetition.Card current = stateFor(card, scheduler);
        Instant now = Instant.now();
        return List.of(1, 2, 3, 4).stream().collect(Collectors.toMap(
                rating -> rating,
                rating -> {
                    CardAndReviewLog result = scheduler.reviewCard(
                            new io.github.openspacedrepetition.Card(current), rating(rating), now);
                    return format(Duration.between(now, result.card().getDue()));
                }
        ));
    }

    public void apply(Card card, int rating, Integer customIntervalMinutes) {
        Scheduler scheduler = schedulerFor(card);
        io.github.openspacedrepetition.Card current = stateFor(card, scheduler);
        Instant now = Instant.now();
        io.github.openspacedrepetition.Card next = scheduler.reviewCard(current, rating(rating), now).card();

        if (customIntervalMinutes != null) {
            next.setDue(now.plus(Duration.ofMinutes(customIntervalMinutes)));
        }

        card.setFsrsState(next.toJson());
        card.setDue(next.getDue());
        card.setState(next.getState().name().toLowerCase());
        card.setLearningStep(next.getStep() == null ? 0 : next.getStep());
        card.setIntervalDays(Math.max(0, Duration.between(now, next.getDue()).toMillis() / 86_400_000.0));
        card.setRepetitions((card.getRepetitions() == null ? 0 : card.getRepetitions()) + 1);
        if (rating == 1 && "review".equals(current.getState().name().toLowerCase())) {
            card.setLapses((card.getLapses() == null ? 0 : card.getLapses()) + 1);
            if (card.getLapses() >= 8) card.setLeech(true);
        }
        if (next.getDifficulty() != null) {
            // Keep the legacy field populated for older clients; FSRS uses its own state JSON.
            card.setEaseFactor(next.getDifficulty());
        }
    }

    private static Rating rating(int value) {
        return switch (value) {
            case 1 -> Rating.AGAIN;
            case 2 -> Rating.HARD;
            case 3 -> Rating.GOOD;
            case 4 -> Rating.EASY;
            default -> throw new IllegalArgumentException("Rating must be between 1 and 4");
        };
    }

    private static int stableCardId(String id) {
        int value = id == null ? 1 : (id.hashCode() & 0x7fffffff);
        return value == 0 ? 1 : value;
    }

    private static String format(Duration duration) {
        long minutes = Math.max(1, Math.round(duration.toMillis() / 60_000.0));
        if (minutes < 60) return minutes + "m";
        if (minutes < 1440) return Math.round(minutes / 60.0) + "h";
        return Math.max(1, Math.round(minutes / 1440.0)) + "d";
    }
}
