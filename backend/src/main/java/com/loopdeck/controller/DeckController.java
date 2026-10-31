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
    private final com.loopdeck.repository.DeckDocumentRepository docRepo;
    private static final long MAX_DOCUMENT_BYTES = 15L * 1024 * 1024;
    private static final java.util.Map<String, String> DOCUMENT_TYPES = java.util.Map.of(
        "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pdf", "application/pdf", "txt", "text/plain", "md", "text/markdown");

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
    public ResponseEntity<java.util.Map<String, Boolean>> uploadDocument(Authentication auth,
                                             @PathVariable String id, 
                                             @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        deckService.verifyOwnership(auth.getName(), id);
        
        if (file.isEmpty()) throw new IllegalArgumentException("El archivo está vacío");
        if (file.getSize() > MAX_DOCUMENT_BYTES) throw new org.springframework.web.multipart.MaxUploadSizeExceededException(MAX_DOCUMENT_BYTES);
        String originalName = file.getOriginalFilename();
        if (originalName == null) throw new IllegalArgumentException("El archivo debe tener un nombre");
        StringBuilder safeName = new StringBuilder();
        for (char character : originalName.toCharArray()) {
            safeName.append(Character.isISOControl(character) || character == '\\' || character == '/' || character == '"' ? '_' : character);
        }
        String fileName = safeName.toString().strip();
        if (fileName.length() > 255) throw new IllegalArgumentException("El nombre del archivo es demasiado largo");
        String extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(java.util.Locale.ROOT);
        String contentType = DOCUMENT_TYPES.get(extension);
        if (contentType == null) throw new IllegalArgumentException("Formato de archivo no permitido");

        try {
            com.loopdeck.model.DeckDocument doc = new com.loopdeck.model.DeckDocument();
            doc.setDeckId(id);
            doc.setFileData(file.getBytes());
            doc.setFileName(fileName);
            doc.setContentType(contentType);
            docRepo.save(doc);
            return ResponseEntity.ok(java.util.Map.of("hasDocument", true));
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
