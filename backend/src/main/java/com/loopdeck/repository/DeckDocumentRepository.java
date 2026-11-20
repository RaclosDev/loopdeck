package com.loopdeck.repository;

import com.loopdeck.model.DeckDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeckDocumentRepository extends JpaRepository<DeckDocument, String> {
    /** Nombre y tipo de los documentos, sin cargar su contenido. */
    interface DocumentInfo { String getDeckId(); String getFileName(); String getContentType(); }

    @org.springframework.data.jpa.repository.Query(
        "SELECT d.deckId AS deckId, d.fileName AS fileName, d.contentType AS contentType FROM DeckDocument d WHERE d.deckId IN :deckIds")
    java.util.List<DocumentInfo> findInfoByDeckIdIn(
        @org.springframework.data.repository.query.Param("deckIds") java.util.List<String> deckIds);
}
