package com.loopdeck.repository;

import com.loopdeck.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface CardRepository extends JpaRepository<Card, String> {
    List<Card> findByNoteId(String noteId);

    @Query("SELECT c FROM Card c JOIN Note n ON c.noteId = n.id WHERE n.deckId = :deckId")
    List<Card> findByDeckId(@Param("deckId") String deckId);

    @Query("SELECT c FROM Card c JOIN Note n ON c.noteId = n.id " +
           "WHERE n.deckId = :deckId AND c.suspended = false AND c.buried = false " +
           "AND ((c.state = 'new') OR (c.due <= :now)) " +
           "ORDER BY c.due ASC LIMIT :limit")
    List<Card> findDueCardsByDeckId(@Param("deckId") String deckId, @Param("now") Instant now, @Param("limit") int limit);

    void deleteByNoteId(String noteId);

    @Query("DELETE FROM Card c WHERE c.noteId IN (SELECT n.id FROM Note n WHERE n.deckId = :deckId)")
    void deleteByDeckId(@Param("deckId") String deckId);
}
