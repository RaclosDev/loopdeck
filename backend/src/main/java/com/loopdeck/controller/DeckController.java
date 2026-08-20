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

    @PostMapping("/{id}/document")
    public ResponseEntity<Void> uploadDocument(Authentication auth, 
                                             @PathVariable String id, 
                                             @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                             com.loopdeck.repository.DeckDocumentRepository docRepo) {
        // Simple security check to ensure user owns the deck
        deckService.updateDeck(auth.getName(), id, new DeckService.UpdateDeckRequest(
            deckService.getDecks(auth.getName()).stream().filter(d -> d.getId().equals(id)).findFirst().orElseThrow().getName(), null));
        
        try {
            com.loopdeck.model.DeckDocument doc = new com.loopdeck.model.DeckDocument();
            doc.setDeckId(id);
            doc.setFileData(file.getBytes());
            doc.setFileName(file.getOriginalFilename());
            doc.setContentType(file.getContentType());
            docRepo.save(doc);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> getDocument(Authentication auth, 
                                            @PathVariable String id,
                                            com.loopdeck.repository.DeckDocumentRepository docRepo) {
        return docRepo.findById(id)
            .map(doc -> ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFileName() + "\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, doc.getContentType() != null ? doc.getContentType() : "application/octet-stream")
                .body(doc.getFileData()))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/document/info")
    public ResponseEntity<java.util.Map<String, Boolean>> hasDocument(Authentication auth, 
                                                                    @PathVariable String id,
                                                                    com.loopdeck.repository.DeckDocumentRepository docRepo) {
        boolean exists = docRepo.existsById(id);
        return ResponseEntity.ok(java.util.Map.of("hasDocument", exists));
    }
}
