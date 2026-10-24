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

    @org.springframework.beans.factory.annotation.Autowired
    private com.loopdeck.repository.DeckDocumentRepository docRepo;

    @PostMapping("/{id}/document")
    public ResponseEntity<Void> uploadDocument(Authentication auth, 
                                             @PathVariable String id, 
                                             @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        deckService.verifyOwnership(auth.getName(), id);
        
        if (file.isEmpty() || file.getSize() > 15 * 1024 * 1024) {
            throw new IllegalArgumentException("El archivo es inválido o excede el límite máximo de 15MB");
        }
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase().matches(".*\\.(docx|pdf|txt|md)$")) {
            throw new IllegalArgumentException("Formato de archivo no permitido. Solo se permiten .docx, .pdf, .txt o .md");
        }

        try {
            com.loopdeck.model.DeckDocument doc = new com.loopdeck.model.DeckDocument();
            doc.setDeckId(id);
            doc.setFileData(file.getBytes());
            // Sanitize filename to prevent header injection
            doc.setFileName(originalName.replaceAll("[\r\n\"\\]", "_"));
            doc.setContentType(file.getContentType());
            docRepo.save(doc);
            return ResponseEntity.ok().build();
        } catch (java.io.IOException e) {
            throw new RuntimeException("Error reading document file", e);
        }
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> getDocument(Authentication auth, 
                                            @PathVariable String id) {
        deckService.verifyOwnership(auth.getName(), id);
        return docRepo.findById(id)
            .map(doc -> ResponseEntity.ok()
                .headers(headers -> {
                    org.springframework.http.ContentDisposition cd = org.springframework.http.ContentDisposition.attachment()
                        .filename(doc.getFileName(), java.nio.charset.StandardCharsets.UTF_8)
                        .build();
                    headers.setContentDisposition(cd);
                })
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, doc.getContentType() != null ? doc.getContentType() : "application/octet-stream")
                .body(doc.getFileData()))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/document/info")
    public ResponseEntity<java.util.Map<String, Boolean>> hasDocument(Authentication auth, 
                                                                    @PathVariable String id) {
        deckService.verifyOwnership(auth.getName(), id);
        boolean exists = docRepo.existsById(id);
        return ResponseEntity.ok(java.util.Map.of("hasDocument", exists));
    }
}
