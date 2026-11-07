package com.loopdeck.controller;

import com.loopdeck.model.Deck;
import com.loopdeck.service.DeckDocumentService;
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
    private final DeckDocumentService documents;

    public record DocumentInfo(boolean hasDocument) {}

    public record CreateBody(
        @NotBlank @jakarta.validation.constraints.Size(max = 255) String name,
        String description,
        String parentId
    ) {}

    public record UpdateBody(
        @NotBlank @jakarta.validation.constraints.Size(max = 255) String name,
        String description
    ) {}

    @GetMapping
    public ResponseEntity<List<Deck>> list(Authentication auth) {
        return ResponseEntity.ok(deckService.getDecks(auth.getName()));
    }

    @GetMapping("/stats")
    public ResponseEntity<java.util.Map<String, DeckService.DeckStats>> getStats(Authentication auth) {
        return ResponseEntity.ok(deckService.getDeckStats(auth.getName()));
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

    @PostMapping("/{id}/document")
    public ResponseEntity<DocumentInfo> uploadDocument(Authentication auth,
                                                       @PathVariable String id,
                                                       @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        documents.store(auth.getName(), id, file);
        return ResponseEntity.ok(new DocumentInfo(true));
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> getDocument(Authentication auth, @PathVariable String id) {
        return documents.find(auth.getName(), id)
            .map(doc -> ResponseEntity.ok()
                .headers(headers -> headers.setContentDisposition(org.springframework.http.ContentDisposition.attachment()
                        .filename(doc.getFileName(), java.nio.charset.StandardCharsets.UTF_8)
                        .build()))
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE,
                        doc.getContentType() != null ? doc.getContentType() : "application/octet-stream")
                .body(doc.getFileData()))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/document/info")
    public ResponseEntity<DocumentInfo> hasDocument(Authentication auth, @PathVariable String id) {
        return ResponseEntity.ok(new DocumentInfo(documents.exists(auth.getName(), id)));
    }
}
