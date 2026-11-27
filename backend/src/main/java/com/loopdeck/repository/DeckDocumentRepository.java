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

    /** Bytes de documentos de la cuenta sin contar el del mazo indicado (que una subida nueva reemplaza). */
    @org.springframework.data.jpa.repository.Query(nativeQuery = true, value =
        "SELECT COALESCE(SUM(octet_length(d.file_data)), 0) FROM deck_documents d JOIN decks k ON k.id = d.deck_id "
        + "WHERE k.user_id = :userId AND d.deck_id <> :deckId")
    long sumBytesByUserExcludingDeck(
        @org.springframework.data.repository.query.Param("userId") String userId,
        @org.springframework.data.repository.query.Param("deckId") String deckId);
}
