package com.loopdeck.controller;

import com.loopdeck.config.FarmCropConfig;
import com.loopdeck.model.Card;
import com.loopdeck.model.Note;
import com.loopdeck.model.User;
import com.loopdeck.repository.UserRepository;
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
    private final UserRepository userRepository;

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
        int rating,
        int timeTakenMs
    ) {}

    // ── Notes ──────────────────────────────────────────────────────────────

    @GetMapping("/decks/{deckId}/notes")
    public ResponseEntity<List<Note>> listNotes(Authentication auth, @PathVariable String deckId) {
        return ResponseEntity.ok(cardService.getNotesByDeck(auth.getName(), deckId));
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
    public ResponseEntity<Void> importNotes(Authentication auth,
                                            @PathVariable String deckId,
                                            @RequestBody List<ImportNoteBody> bodyList) {
        List<CardService.CreateNoteRequest> requests = bodyList.stream()
                .map(b -> new CardService.CreateNoteRequest(deckId, b.noteType(), b.fieldsJson(), b.tags()))
                .toList();
        cardService.importNotes(auth.getName(), deckId, requests);
        return ResponseEntity.ok().build();
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

    // ── Study ──────────────────────────────────────────────────────────────

    @GetMapping("/decks/{deckId}/study")
    public ResponseEntity<List<Card>> dueCards(Authentication auth,
                                               @PathVariable String deckId,
                                               @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(cardService.getDueCards(auth.getName(), deckId, limit));
    }

    @PostMapping("/cards/{cardId}/review")
    public ResponseEntity<Map<String, Object>> review(Authentication auth,
                                       @PathVariable String cardId,
                                       @RequestBody ReviewBody body) {
        Card card = cardService.reviewCard(auth.getName(), cardId,
                new CardService.ReviewRequest(body.rating(), body.timeTakenMs()));

        // Award coins based on rating
        String ratingName = switch (body.rating()) {
            case 1 -> "again";
            case 2 -> "hard";
            case 3 -> "good";
            case 4 -> "easy";
            default -> "good";
        };
        int coinsEarned = FarmCropConfig.coinsForRating(ratingName);

        User user = userRepository.findById(auth.getName()).orElse(null);
        int totalCoins = 0;
        if (user != null) {
            totalCoins = (user.getPoints() != null ? user.getPoints() : 0) + coinsEarned;
            user.setPoints(totalCoins);
            userRepository.save(user);
        }

        return ResponseEntity.ok(Map.of(
            "card", card,
            "coinsEarned", coinsEarned,
            "totalCoins", totalCoins
        ));
    }
}
