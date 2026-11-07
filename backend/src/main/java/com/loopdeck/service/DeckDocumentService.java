package com.loopdeck.service;

import com.loopdeck.model.DeckDocument;
import com.loopdeck.repository.DeckDocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/** Documento de apoyo de un mazo: validación del archivo y acceso solo para el dueño del mazo. */
@Service
public class DeckDocumentService {

    static final long MAX_DOCUMENT_BYTES = 15L * 1024 * 1024;
    private static final Map<String, String> DOCUMENT_TYPES = Map.of(
        "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pdf", "application/pdf", "txt", "text/plain", "md", "text/markdown");

    private final DeckService decks;
    private final DeckDocumentRepository documents;

    public DeckDocumentService(DeckService decks, DeckDocumentRepository documents) {
        this.decks = decks;
        this.documents = documents;
    }

    public void store(String userId, String deckId, MultipartFile file) {
        decks.verifyOwnership(userId, deckId);

        if (file.isEmpty()) throw new IllegalArgumentException("El archivo está vacío");
        if (file.getSize() > MAX_DOCUMENT_BYTES) throw new MaxUploadSizeExceededException(MAX_DOCUMENT_BYTES);
        String originalName = file.getOriginalFilename();
        if (originalName == null) throw new IllegalArgumentException("El archivo debe tener un nombre");
        StringBuilder safeName = new StringBuilder();
        for (char character : originalName.toCharArray()) {
            boolean unsafe = Character.isISOControl(character) || character == '\\' || character == '/' || character == '"';
            safeName.append(unsafe ? '_' : character);
        }
        String fileName = safeName.toString().strip();
        if (fileName.length() > 255) throw new IllegalArgumentException("El nombre del archivo es demasiado largo");
        String extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String contentType = DOCUMENT_TYPES.get(extension);
        if (contentType == null) throw new IllegalArgumentException("Formato de archivo no permitido");

        DeckDocument doc = new DeckDocument();
        doc.setDeckId(deckId);
        try {
            doc.setFileData(file.getBytes());
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el documento subido", e);
        }
        doc.setFileName(fileName);
        doc.setContentType(contentType);
        documents.save(doc);
    }

    public Optional<DeckDocument> find(String userId, String deckId) {
        decks.verifyOwnership(userId, deckId);
        return documents.findById(deckId);
    }

    public boolean exists(String userId, String deckId) {
        decks.verifyOwnership(userId, deckId);
        return documents.existsById(deckId);
    }
}
