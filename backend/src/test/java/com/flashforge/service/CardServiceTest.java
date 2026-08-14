package com.flashforge.service;

import com.flashforge.model.Card;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CardServiceTest {

    private CardService cardService;

    @BeforeEach
    void setUp() {
        cardService = new CardService(null, null, null);
    }

    @Test
    void testNewCard_Again() {
        Card card = new Card();
        card.setState("new");
        card.setLearningStep(0);

        cardService.applySmTwo(card, 1);

        assertEquals("learning", card.getState());
        assertEquals(0, card.getLearningStep());
    }

    @Test
    void testNewCard_Easy() {
        Card card = new Card();
        card.setState("new");

        cardService.applySmTwo(card, 4);

        assertEquals("review", card.getState());
        assertEquals(4.0, card.getIntervalDays());
        assertEquals(2.5, card.getEaseFactor());
        assertEquals(1, card.getRepetitions());
    }

    @Test
    void testReviewCard_Good() {
        Card card = new Card();
        card.setState("review");
        card.setIntervalDays(10.0);
        card.setEaseFactor(2.5);
        card.setRepetitions(3);

        cardService.applySmTwo(card, 3);

        assertEquals("review", card.getState());
        assertEquals(25.0, card.getIntervalDays(), 0.01);
        assertEquals(2.5, card.getEaseFactor(), 0.01);
        assertEquals(4, card.getRepetitions());
    }

    @Test
    void testReviewCard_Again() {
        Card card = new Card();
        card.setState("review");
        card.setIntervalDays(10.0);
        card.setEaseFactor(2.5);
        card.setLapses(0);

        cardService.applySmTwo(card, 1);

        assertEquals("relearning", card.getState());
        assertEquals(0, card.getLearningStep());
        assertEquals(2.3, card.getEaseFactor(), 0.01);
        assertEquals(1, card.getLapses());
    }
    
    @Test
    void testReviewCard_Hard() {
        Card card = new Card();
        card.setState("review");
        card.setIntervalDays(10.0);
        card.setEaseFactor(2.5);
        card.setRepetitions(3);

        cardService.applySmTwo(card, 2);

        assertEquals("review", card.getState());
        assertEquals(12.0, card.getIntervalDays(), 0.01);
        assertEquals(2.35, card.getEaseFactor(), 0.01);
        assertEquals(4, card.getRepetitions());
    }
}
