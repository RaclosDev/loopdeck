package com.loopdeck.service;

import com.loopdeck.model.Card;
import com.loopdeck.model.Deck;
import com.loopdeck.model.Note;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
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
    void testCreateNote_PopulatesDeckIdOnGeneratedCards() {
        NoteRepository noteRepo = mock(NoteRepository.class);
        CardRepository cardRepo = mock(CardRepository.class);
        DeckRepository deckRepo = mock(DeckRepository.class);
        CardService service = new CardService(noteRepo, cardRepo, deckRepo, null);

        String userId = "user-1";
        String deckId = "deck-123";
        when(deckRepo.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(new Deck()));
        when(noteRepo.save(any(Note.class))).thenAnswer(i -> {
            Note n = i.getArgument(0);
            n.setId("note-1");
            return n;
        });

        service.createNote(userId, new CardService.CreateNoteRequest(deckId, "basic", "{\"front\":\"f\",\"back\":\"b\"}", "tag"));

        ArgumentCaptor<Card> cardCaptor = ArgumentCaptor.forClass(Card.class);
        verify(cardRepo).save(cardCaptor.capture());
        assertEquals(deckId, cardCaptor.getValue().getDeckId(), "Generated Card must have deckId set from request");
    }

    @Test
    void testGetCardStatesByDeck() {
        NoteRepository noteRepo = mock(NoteRepository.class);
        CardRepository cardRepo = mock(CardRepository.class);
        DeckRepository deckRepo = mock(DeckRepository.class);
        CardService service = new CardService(noteRepo, cardRepo, deckRepo, null);

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

    @Test void reversibleNotesHaveTheSameStateRegardlessOfRowOrder() {
        NoteRepository notes = mock(NoteRepository.class);
        CardRepository cards = mock(CardRepository.class);
        DeckRepository decks = mock(DeckRepository.class);
        CardService service = new CardService(notes, cards, decks, null);
        when(decks.findByIdAndUserId("deck", "user")).thenReturn(Optional.of(new Deck()));
        var learning = mock(CardRepository.CardStateProjection.class);
        var review = mock(CardRepository.CardStateProjection.class);
        when(learning.getNoteId()).thenReturn("note"); when(learning.getState()).thenReturn("learning");
        when(review.getNoteId()).thenReturn("note"); when(review.getState()).thenReturn("review");
        for (var rows : List.of(List.of(learning, review), List.of(review, learning))) {
            when(cards.findCardStatesByDeckId("deck")).thenReturn(rows);
            assertEquals("learning", service.getCardStatesByDeck("user", "deck").get("note"));
        }
    }
}
