package com.loopdeck.service;

import com.loopdeck.model.Card;
import java.time.Instant;

public record CardSchedule(String state, Instant due, Double intervalDays, Double easeFactor,
                           Integer repetitions, Integer lapses, Integer learningStep, Boolean leech) {
    public static CardSchedule capture(Card card) {
        return new CardSchedule(card.getState(), card.getDue(), card.getIntervalDays(), card.getEaseFactor(),
            card.getRepetitions(), card.getLapses(), card.getLearningStep(), card.isLeech());
    }
    public void restore(Card card) {
        card.setState(state); card.setDue(due); card.setIntervalDays(intervalDays); card.setEaseFactor(easeFactor);
        card.setRepetitions(repetitions); card.setLapses(lapses); card.setLearningStep(learningStep); card.setLeech(leech);
    }
}
