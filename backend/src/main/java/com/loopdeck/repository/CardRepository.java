package com.loopdeck.repository;

import com.loopdeck.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface CardRepository extends JpaRepository<Card, String> {
    List<Card> findByNoteId(String noteId);

    List<Card> findByDeckId(String deckId);

    @Query("SELECT c FROM Card c " +
           "WHERE c.deckId = :deckId AND c.suspended = false AND c.buried = false " +
           "AND ((c.state = 'new') OR (c.due <= :now)) " +
           "ORDER BY c.due ASC LIMIT :limit")
    List<Card> findDueCardsByDeckId(@Param("deckId") String deckId, @Param("now") Instant now, @Param("limit") int limit);

    void deleteByNoteId(String noteId);

    void deleteByDeckId(String deckId);

    interface DeckStatsProjection {
        String getDeckId();
        Long getNewCount();
        Long getLearningCount();
        Long getReviewCount();
        Long getTotalCount();
    }

    @Query("SELECT c.deckId as deckId, " +
           "SUM(CASE WHEN c.suspended = false AND c.buried = false AND c.state = 'new' THEN 1 ELSE 0 END) as newCount, " +
           "SUM(CASE WHEN c.suspended = false AND c.buried = false AND (c.state = 'learning' OR c.state = 'relearning') AND c.due <= :now THEN 1 ELSE 0 END) as learningCount, " +
           "SUM(CASE WHEN c.suspended = false AND c.buried = false AND c.state = 'review' AND c.due <= :now THEN 1 ELSE 0 END) as reviewCount, " +
           "COUNT(c.id) as totalCount " +
           "FROM Card c " +
           "WHERE c.deckId IN :deckIds " +
           "GROUP BY c.deckId")
    List<DeckStatsProjection> getStatsForDecks(@Param("deckIds") List<String> deckIds, @Param("now") Instant now);
}
