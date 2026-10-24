package com.loopdeck.service;

import com.loopdeck.model.Card;
import com.loopdeck.model.Deck;
import com.loopdeck.model.Note;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import com.loopdeck.repository.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CardServiceTest {

    private CardService cardService;

    @BeforeEach
    void setUp() {
        cardService = new CardService(null, null, null, null);
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

    @Test
    void testCreateNote_PopulatesDeckIdOnGeneratedCards() {
        NoteRepository noteRepo = mock(NoteRepository.class);
        CardRepository cardRepo = mock(CardRepository.class);
        DeckRepository deckRepo = mock(DeckRepository.class);
        ReviewRepository reviewRepo = mock(ReviewRepository.class);
        CardService service = new CardService(noteRepo, cardRepo, deckRepo, reviewRepo);

        String userId = "user-1";
        String deckId = "deck-123";
        when(deckRepo.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(new Deck()));
        when(noteRepo.save(any(Note.class))).thenAnswer(i -> {
            Note n = i.getArgument(0);
            n.setId("note-1");
            return n;
        });

        service.createNote(userId, new CardService.CreateNoteRequest(deckId, "basic", "{}", "tag"));

        ArgumentCaptor<Card> cardCaptor = ArgumentCaptor.forClass(Card.class);
        verify(cardRepo).save(cardCaptor.capture());
        assertEquals(deckId, cardCaptor.getValue().getDeckId(), "Generated Card must have deckId set from request");
    }

    @Test
    void testGetCardStatesByDeck() {
        NoteRepository noteRepo = mock(NoteRepository.class);
        CardRepository cardRepo = mock(CardRepository.class);
        DeckRepository deckRepo = mock(DeckRepository.class);
        ReviewRepository reviewRepo = mock(ReviewRepository.class);
        CardService service = new CardService(noteRepo, cardRepo, deckRepo, reviewRepo);

        String userId = "user-1";
        String deckId = "deck-123";
        when(deckRepo.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(new Deck()));

        CardRepository.CardStateProjection proj = mock(CardRepository.CardStateProjection.class);
        when(proj.getNoteId()).thenReturn("note-abc");
        when(proj.getState()).thenReturn("review");
        when(cardRepo.findCardStatesByDeckId(deckId)).thenReturn(List.of(proj));

        Map<String, String> states = service.getCardStatesByDeck(userId, deckId);
        assertEquals("review", states.get("note-abc"));
    }
}
