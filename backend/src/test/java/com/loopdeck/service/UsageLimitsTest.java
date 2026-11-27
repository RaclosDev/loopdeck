package com.loopdeck.service;

import com.loopdeck.exception.ConflictException;
import com.loopdeck.mapper.DeckMapper;
import com.loopdeck.model.Deck;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class UsageLimitsTest {

    @Test
    void decksStopAtTheLimit() {
        assertDoesNotThrow(() -> UsageLimits.checkDecks(UsageLimits.MAX_DECKS - 1));
        assertThrows(ConflictException.class, () -> UsageLimits.checkDecks(UsageLimits.MAX_DECKS));
    }

    @Test
    void notesStopAtTheLimitCountingTheWholeBatch() {
        assertDoesNotThrow(() -> UsageLimits.checkNotes(UsageLimits.MAX_NOTES - 2, 2));
        assertThrows(ConflictException.class, () -> UsageLimits.checkNotes(UsageLimits.MAX_NOTES - 1, 2));
    }

    @Test
    void documentBytesStopAtTheLimit() {
        long max = UsageLimits.MAX_DOCUMENT_BYTES_TOTAL;
        assertDoesNotThrow(() -> UsageLimits.checkDocumentBytes(max - 10, 10));
        assertThrows(ConflictException.class, () -> UsageLimits.checkDocumentBytes(max - 10, 11));
    }

    @Test
    void creatingADeckOverTheLimitSavesNothing() {
        DeckRepository decks = mock(DeckRepository.class);
        DeckMapper mapper = mock(DeckMapper.class);
        when(mapper.toEntity(any())).thenReturn(new Deck());
        when(decks.countByUserId("u1")).thenReturn((long) UsageLimits.MAX_DECKS);
        DeckService service = new DeckService(decks, mock(CardRepository.class), mapper);

        assertThrows(ConflictException.class,
                () -> service.createDeck("u1", new DeckService.CreateDeckRequest("Nuevo", "", null)));

        verify(decks, never()).save(any());
    }

    @Test
    void creatingANoteOverTheLimitSavesNothing() {
        NoteRepository notes = mock(NoteRepository.class);
        CardRepository cards = mock(CardRepository.class);
        DeckRepository decks = mock(DeckRepository.class);
        when(decks.findByIdAndUserId("d", "u1")).thenReturn(Optional.of(new Deck()));
        when(notes.countByUserId("u1")).thenReturn((long) UsageLimits.MAX_NOTES);
        CardService service = new CardService(notes, cards, decks, null);

        assertThrows(ConflictException.class, () -> service.createNote("u1",
                new CardService.CreateNoteRequest("d", "basic", "{\"front\":\"f\",\"back\":\"b\"}", "")));

        verify(notes, never()).save(any());
        verifyNoInteractions(cards);
    }

    @Test
    void anImportThatDoesNotFitIsRejectedBeforeWritingAnything() {
        DeckRepository decks = mock(DeckRepository.class);
        NoteRepository notes = mock(NoteRepository.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(decks.findByIdAndUserId("d", "u1")).thenReturn(Optional.of(new Deck()));
        when(notes.countByUserId("u1")).thenReturn((long) UsageLimits.MAX_NOTES - 1);
        NoteImportService service = new NoteImportService(decks, notes, jdbc, new ObjectMapper());
        var request = new CardService.CreateNoteRequest("d", "basic", "{\"front\":\"f\",\"back\":\"b\"}", "");

        assertThrows(ConflictException.class, () -> service.importNotes("u1", "d", List.of(request, request), null));

        verifyNoInteractions(jdbc);
    }
}
