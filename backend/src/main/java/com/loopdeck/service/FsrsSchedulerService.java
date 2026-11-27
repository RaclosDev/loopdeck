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
import java.util.Collection;
import java.util.HashMap;
import java.util.stream.Collectors;

/**
 * Adapter between LoopDeck's persisted card/review model and the FSRS-5 scheduler.
 * FSRS state is stored on each card so scheduling is deterministic and survives restarts.
 */
@Service
@RequiredArgsConstructor
public class FsrsSchedulerService {
    private static final String FSRS_STATE_PREFIX = "FSRS-5:";
    private static final double LEGACY_DIFFICULTY = 5.0;
    private final ReviewRepository reviews;

    private static final int MAXIMUM_INTERVAL_DAYS = 36500;

    /**
     * El fuzz de la librería se desactiva: su cálculo del rango está mal (usa
     * {@code min(intervalo, fin - inicio)} en lugar de {@code min(intervalo, fin) - inicio}) y redondea
     * hacia arriba. El fuzz correcto se aplica en {@link #fuzzed}.
     */
    private Scheduler schedulerFor() {
        return Scheduler.builder()
                .desiredRetention(0.90)
                .learningSteps(new Duration[]{Duration.ofMinutes(1), Duration.ofMinutes(10)})
                .relearningSteps(new Duration[]{Duration.ofMinutes(10)})
                .maximumInterval(MAXIMUM_INTERVAL_DAYS)
                .enableFuzzing(false)
                .build();
    }

    private static long fuzzSeed(Card card) {
        String seedMaterial = (card.getId() == null ? "new-card" : card.getId()) + ":"
                + (card.getRepetitions() == null ? 0 : card.getRepetitions());
        int seed = seedMaterial.hashCode() & 0x7fffffff;
        return seed == 0 ? 1 : seed;
    }

    /** Rango {mínimo, máximo} en días del fuzz de FSRS para un intervalo de {@code interval} días. */
    static int[] fuzzRange(int interval, int maximumInterval) {
        double[][] ranges = {{2.5, 7.0, 0.15}, {7.0, 20.0, 0.1}, {20.0, Double.POSITIVE_INFINITY, 0.05}};
        double delta = 1.0;
        for (double[] range : ranges) {
            delta += range[2] * Math.max(Math.min(interval, range[1]) - range[0], 0.0);
        }
        int min = Math.max(2, (int) Math.round(interval - delta));
        int max = Math.min((int) Math.round(interval + delta), maximumInterval);
        return new int[]{Math.min(min, max), max};
    }

    /** Intervalo con fuzz (en días) para {@code interval} >= 3; {@code random} es un valor en [0, 1). */
    static int fuzzedDays(int interval, double random, int maximumInterval) {
        if (interval < 3) return interval;
        int[] range = fuzzRange(interval, maximumInterval);
        return Math.min((int) Math.floor(random * (range[1] - range[0] + 1) + range[0]), maximumInterval);
    }

    /**
     * Revisa la tarjeta y aplica el fuzz al intervalo cuando la tarjeta queda en repaso. Se usa tanto en la
     * previsualización como al guardar, con la misma semilla, para que ambas coincidan.
     */
    private io.github.openspacedrepetition.Card reviewWithFuzz(Card card, Scheduler scheduler,
            io.github.openspacedrepetition.Card current, int rating, Instant now) {
        io.github.openspacedrepetition.Card next = scheduler.reviewCard(current, rating(rating), now).card();
        if (next.getState() == State.REVIEW) {
            int days = (int) Duration.between(now, next.getDue()).toDays();
            if (days >= 3) {
                double random = new java.util.Random(fuzzSeed(card)).nextDouble();
                next.setDue(now.plus(Duration.ofDays(fuzzedDays(days, random, MAXIMUM_INTERVAL_DAYS))));
            }
        }
        return next;
    }

    private io.github.openspacedrepetition.Card stateFor(Card card, Scheduler scheduler, List<Review> loadedHistory) {
        if (card.getFsrsState() != null && !card.getFsrsState().isBlank()) {
            if (!card.getFsrsState().startsWith(FSRS_STATE_PREFIX)) {
                throw new IllegalStateException("Unsupported FSRS card-state version for card " + card.getId());
            }
            return io.github.openspacedrepetition.Card.fromJson(card.getFsrsState().substring(FSRS_STATE_PREFIX.length()));
        }

        List<Review> history = loadedHistory.stream()
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

        // Las tarjetas antiguas pueden no tener historial de repasos. Se reconstruye la memoria desde su
        // intervalo actual (con 90 % de retención, la estabilidad equivale al intervalo) en lugar de simular
        // dos repasos buenos, que convertían un intervalo de 3 días en unos 60.
        if ("review".equals(card.getState()) || "relearning".equals(card.getState())) {
            double interval = card.getIntervalDays() == null ? 0.0 : Math.max(0.0, card.getIntervalDays());
            double stability = Math.max(1.0, interval);
            Instant due = card.getDue() == null ? Instant.now() : card.getDue();
            fsrs.setState(State.REVIEW);
            fsrs.setStep(null);
            fsrs.setStability(stability);
            fsrs.setDifficulty(LEGACY_DIFFICULTY);
            fsrs.setLastReview(due.minus(Duration.ofMillis((long) (stability * 86_400_000L))));
            if ("relearning".equals(card.getState())) {
                fsrs.setState(State.RELEARNING);
                fsrs.setStep(0);
            }
        } else if ("learning".equals(card.getState())) {
            fsrs.setStep(Math.max(0, card.getLearningStep() == null ? 0 : card.getLearningStep()));
        }
        return fsrs;
    }

    public Map<Integer, String> preview(Card card) {
        return previewAll(List.of(card)).get(card.getId());
    }

    public Map<String, Map<Integer, String>> previewAll(Collection<Card> cards) {
        List<Card> legacyCards = cards.stream()
                .filter(card -> card.getFsrsState() == null || card.getFsrsState().isBlank())
                .toList();
        Map<String, List<Review>> historyByCard = new HashMap<>();
        if (!legacyCards.isEmpty()) {
            List<String> ids = legacyCards.stream().map(Card::getId).toList();
            historyByCard = reviews.findByCardIdInAndUndoneFalseOrderByReviewedAtAsc(ids).stream()
                    .collect(Collectors.groupingBy(Review::getCardId));
        }

        Map<String, Map<Integer, String>> result = new HashMap<>();
        for (Card card : cards) {
            Map<Integer, String> options = new HashMap<>();
            List<Review> history = historyByCard.getOrDefault(card.getId(), List.of());
            Instant now = Instant.now();
            for (int value = 1; value <= 4; value++) {
                // A fresh scheduler per option makes preview fuzzing identical to the subsequent
                // persisted answer, regardless of which other buttons were calculated first.
                Scheduler scheduler = schedulerFor();
                io.github.openspacedrepetition.Card current = stateFor(card, scheduler, history);
                io.github.openspacedrepetition.Card next = reviewWithFuzz(card, scheduler, current, value, now);
                options.put(value, format(Duration.between(now, next.getDue())));
            }
            result.put(card.getId(), Map.copyOf(options));
        }
        return Map.copyOf(result);
    }

    public void apply(Card card, int rating, Integer customIntervalMinutes) {
        Scheduler scheduler = schedulerFor();
        List<Review> history = card.getFsrsState() == null || card.getFsrsState().isBlank()
                ? reviews.findByCardIdOrderByReviewedAtDesc(card.getId()) : List.of();
        io.github.openspacedrepetition.Card current = stateFor(card, scheduler, history);
        Instant now = Instant.now();
        io.github.openspacedrepetition.Card next = reviewWithFuzz(card, scheduler, current, rating, now);

        if (customIntervalMinutes != null) {
            next.setDue(now.plus(Duration.ofMinutes(customIntervalMinutes)));
        }

        card.setFsrsState(FSRS_STATE_PREFIX + next.toJson());
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
