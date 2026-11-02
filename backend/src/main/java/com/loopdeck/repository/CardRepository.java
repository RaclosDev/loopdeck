package com.loopdeck.repository;

import com.loopdeck.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface CardRepository extends JpaRepository<Card, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Card c WHERE c.id = :id")
    java.util.Optional<Card> findLockedById(@Param("id") String id);

    List<Card> findByNoteId(String noteId);

    List<Card> findByDeckId(String deckId);

    @Query("SELECT c FROM Card c " +
           "WHERE c.deckId = :deckId AND c.suspended = false AND c.buried = false " +
           "AND ((c.state = 'new') OR (c.due <= :now)) " +
           "ORDER BY c.due ASC LIMIT :limit")
    List<Card> findDueCardsByDeckId(@Param("deckId") String deckId, @Param("now") Instant now, @Param("limit") int limit);

    @Query(value = "SELECT c.* FROM cards c WHERE c.deck_id = :deckId AND c.suspended = false AND c.buried = false " +
        "AND (c.state = 'new' OR c.due <= :now) " +
        "ORDER BY CASE WHEN :studyOrder = 'new_first' AND c.state = 'new' THEN 0 WHEN :studyOrder = 'review_first' AND c.state = 'review' THEN 0 " +
        "WHEN :studyOrder IN ('new_first','review_first') THEN 1 ELSE 0 END, " +
        "CASE WHEN :studyOrder = 'mixed' THEN random() ELSE 0 END, c.due ASC, c.id ASC LIMIT :limit", nativeQuery = true)
    List<Card> findStudyBatch(@Param("deckId") String deckId, @Param("now") Instant now, @Param("limit") int limit, @Param("studyOrder") String studyOrder);

    void deleteByNoteId(String noteId);

    @Query(value = "SELECT c.* FROM decks d CROSS JOIN LATERAL (SELECT c.* FROM cards c " +
        "WHERE c.deck_id=d.id AND c.suspended=false AND c.buried=false AND (c.state='new' OR c.due<=:now) " +
        "ORDER BY CASE WHEN :studyOrder='new_first' AND c.state='new' THEN 0 " +
        "WHEN :studyOrder='review_first' AND c.state='review' THEN 0 " +
        "WHEN :studyOrder IN ('new_first','review_first') THEN 1 ELSE 0 END, " +
        "CASE WHEN :studyOrder='mixed' THEN random() ELSE 0 END, c.due,c.id LIMIT 2) c " +
        "WHERE d.user_id=:userId AND d.id IN (:deckIds) ORDER BY d.id, " +
        "CASE WHEN :studyOrder='new_first' AND c.state='new' THEN 0 " +
        "WHEN :studyOrder='review_first' AND c.state='review' THEN 0 " +
        "WHEN :studyOrder IN ('new_first','review_first') THEN 1 ELSE 0 END, " +
        "CASE WHEN :studyOrder='mixed' THEN random() ELSE 0 END, c.due,c.id", nativeQuery = true)
    List<Card> findPreparedCards(@Param("userId") String userId, @Param("deckIds") List<String> deckIds,
        @Param("now") Instant now, @Param("studyOrder") String studyOrder);

    interface NextDueProjection { String getDeckId(); Instant getNextDue(); }
    @Query("SELECT c.deckId as deckId, MIN(c.due) as nextDue FROM Card c WHERE c.deckId IN :deckIds " +
        "AND c.suspended=false AND c.buried=false AND c.state <> 'new' AND c.due > :now GROUP BY c.deckId")
    List<NextDueProjection> findNextDue(@Param("deckIds") List<String> deckIds, @Param("now") Instant now);

    void deleteByDeckId(String deckId);

    interface CardStateProjection {
        String getNoteId();
        String getState();
    }

    @Query("SELECT c.noteId as noteId, c.state as state FROM Card c WHERE c.deckId = :deckId")
    List<CardStateProjection> findCardStatesByDeckId(@Param("deckId") String deckId);

    @Query("SELECT c.noteId as noteId, c.state as state FROM Card c WHERE c.deckId = :deckId AND c.noteId IN :noteIds")
    List<CardStateProjection> findCardStatesForNotes(@Param("deckId") String deckId, @Param("noteIds") List<String> noteIds);

    interface DeckStatsProjection {
        String getDeckId();
        Long getNewCount();
        Long getLearningCount();
        Long getReviewCount();
        Long getTotalCount();
        Long getNoteCount();
    }

    @Query("SELECT c.deckId as deckId, " +
           "SUM(CASE WHEN c.suspended = false AND c.buried = false AND c.state = 'new' THEN 1 ELSE 0 END) as newCount, " +
           "SUM(CASE WHEN c.suspended = false AND c.buried = false AND (c.state = 'learning' OR c.state = 'relearning') AND c.due <= :now THEN 1 ELSE 0 END) as learningCount, " +
           "SUM(CASE WHEN c.suspended = false AND c.buried = false AND c.state = 'review' AND c.due <= :now THEN 1 ELSE 0 END) as reviewCount, " +
           "COUNT(c.id) as totalCount, " +
           "COUNT(DISTINCT c.noteId) as noteCount " +
           "FROM Card c " +
           "WHERE c.deckId IN :deckIds " +
           "GROUP BY c.deckId")
    List<DeckStatsProjection> getStatsForDecks(@Param("deckIds") List<String> deckIds, @Param("now") Instant now);
}
