package com.loopdeck.controller;

import com.loopdeck.model.Deck;
import com.loopdeck.service.DeckService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/decks")
@RequiredArgsConstructor
public class DeckController {

    private final DeckService deckService;

    public record CreateBody(
        @NotBlank String name,
        String description,
        String parentId
    ) {}

    public record UpdateBody(
        @NotBlank String name,
        String description
    ) {}

    @GetMapping
    public ResponseEntity<List<Deck>> list(Authentication auth) {
        return ResponseEntity.ok(deckService.getDecks(auth.getName()));
    }

    @PostMapping
    public ResponseEntity<Deck> create(Authentication auth, @Valid @RequestBody CreateBody body) {
        Deck deck = deckService.createDeck(auth.getName(),
                new DeckService.CreateDeckRequest(body.name(), body.description(), body.parentId()));
        return ResponseEntity.ok(deck);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deck> update(Authentication auth,
                                       @PathVariable String id,
                                       @Valid @RequestBody UpdateBody body) {
        Deck deck = deckService.updateDeck(auth.getName(), id,
                new DeckService.UpdateDeckRequest(body.name(), body.description()));
        return ResponseEntity.ok(deck);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable String id) {
        deckService.deleteDeck(auth.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
