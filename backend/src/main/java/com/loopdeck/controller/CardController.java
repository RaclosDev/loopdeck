package com.loopdeck.controller;


import com.loopdeck.model.Card;
import com.loopdeck.model.Note;
import com.loopdeck.service.CardService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;
    private final com.loopdeck.service.NoteQueryService noteQueries;
    private final com.loopdeck.service.NoteImportService imports;
    private final com.loopdeck.service.StudyReviewService reviewService;

    public record CreateNoteBody(
        @NotBlank String deckId,
        String noteType,
        @NotBlank String fieldsJson,
        String tags
    ) {}

    public record UpdateNoteBody(
        @NotBlank String fieldsJson,
        String tags
    ) {}

    public record ReviewBody(
        @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(4) int rating,
        @jakarta.validation.constraints.Min(0) int timeTakenMs,
        String requestId
    ) {}


    @GetMapping("/decks/{deckId}/notes")
    public ResponseEntity<List<Note>> listNotes(Authentication auth, @PathVariable String deckId) {
        return ResponseEntity.ok(cardService.getNotesByDeck(auth.getName(), deckId));
    }

    @GetMapping("/decks/{deckId}/notes/page")
    public ResponseEntity<com.loopdeck.service.NoteQueryService.NotePage> notePage(Authentication auth, @PathVariable String deckId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "") String search, @RequestParam(defaultValue = "") String tag) {
        return ResponseEntity.ok(noteQueries.page(auth.getName(), deckId, page, size, search, tag));
    }
    @GetMapping("/decks/{deckId}/notes/tags")
    public ResponseEntity<List<String>> noteTags(Authentication auth, @PathVariable String deckId) {
        return ResponseEntity.ok(noteQueries.tags(auth.getName(), deckId));
    }

    @PostMapping("/notes")
    public ResponseEntity<Note> createNote(Authentication auth, @Valid @RequestBody CreateNoteBody body) {
        Note note = cardService.createNote(auth.getName(),
                new CardService.CreateNoteRequest(body.deckId(), body.noteType(), body.fieldsJson(), body.tags()));
        return ResponseEntity.ok(note);
    }

    public record ImportNoteBody(
        String noteType,
        @NotBlank String fieldsJson,
        String tags
    ) {}

    @PostMapping("/decks/{deckId}/import")
    public ResponseEntity<com.loopdeck.service.NoteImportService.ImportResult> importNotes(Authentication auth,
                                            @PathVariable String deckId,
                                            @RequestBody List<ImportNoteBody> bodyList,
                                            @RequestHeader(value = "Idempotency-Key", required = false) String requestId) {
        if (bodyList == null || bodyList.isEmpty() || bodyList.size() > 500 || bodyList.stream().anyMatch(java.util.Objects::isNull)) throw new com.loopdeck.exception.InvalidInputException("El lote debe contener entre 1 y 500 notas válidas");
        List<CardService.CreateNoteRequest> requests = bodyList.stream()
                .map(b -> new CardService.CreateNoteRequest(deckId, b.noteType(), b.fieldsJson(), b.tags()))
                .toList();
        return ResponseEntity.ok(imports.importNotes(auth.getName(), deckId, requests, requestId));
    }

    @PutMapping("/notes/{noteId}")
    public ResponseEntity<Note> updateNote(Authentication auth,
                                           @PathVariable String noteId,
                                           @Valid @RequestBody UpdateNoteBody body) {
        Note note = cardService.updateNote(auth.getName(), noteId,
                new CardService.UpdateNoteRequest(body.fieldsJson(), body.tags()));
        return ResponseEntity.ok(note);
    }

    @DeleteMapping("/notes/{noteId}")
    public ResponseEntity<Void> deleteNote(Authentication auth, @PathVariable String noteId) {
        cardService.deleteNote(auth.getName(), noteId);
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/decks/{deckId}/card-states")
    public ResponseEntity<Map<String, String>> cardStates(Authentication auth, @PathVariable String deckId) {
        return ResponseEntity.ok(cardService.getCardStatesByDeck(auth.getName(), deckId));
    }

    @GetMapping("/decks/{deckId}/study")
    public ResponseEntity<List<CardService.DueCardDto>> dueCards(Authentication auth,
                                               @PathVariable String deckId,
                                               @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(cardService.getDueCards(auth.getName(), deckId, limit));
    }

    @GetMapping("/decks/{deckId}/study/batch")
    public ResponseEntity<CardService.StudyBatch> studyBatch(Authentication auth, @PathVariable String deckId,
            @RequestParam(defaultValue = "50") int limit, @RequestParam(defaultValue = "new_first") String order) {
        return ResponseEntity.ok(cardService.getStudyBatch(auth.getName(), deckId, limit, order));
    }

    @PostMapping("/cards/{cardId}/review")
    public ResponseEntity<com.loopdeck.service.StudyReviewService.ReviewResult> review(Authentication auth,
                                       @PathVariable String cardId,
                                       @Valid @RequestBody ReviewBody body) {
        return ResponseEntity.ok(reviewService.review(auth.getName(), cardId, body.rating(), body.timeTakenMs(), body.requestId()));
    }

    public record RestoreBody(String reviewId, String state, java.time.Instant due, Double intervalDays, Double easeFactor,
                              Integer repetitions, Integer lapses, Integer learningStep, Boolean leech) {
        Card legacyCard() { Card card = new Card(); card.setState(state); card.setDue(due); card.setIntervalDays(intervalDays); card.setEaseFactor(easeFactor);
            card.setRepetitions(repetitions); card.setLapses(lapses); card.setLearningStep(learningStep); card.setLeech(leech); return card; }
    }

    @PostMapping("/cards/{cardId}/restore")
    public ResponseEntity<com.loopdeck.service.StudyReviewService.RestoreResult> restore(Authentication auth, @PathVariable String cardId, @RequestBody RestoreBody body) {
        return ResponseEntity.ok(reviewService.restore(auth.getName(), cardId, body.reviewId(), body.legacyCard()));
    }
}
