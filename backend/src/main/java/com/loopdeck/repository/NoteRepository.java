package com.loopdeck.repository;

import com.loopdeck.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NoteRepository extends JpaRepository<Note, String> {
    List<Note> findByDeckId(String deckId);
    List<Note> findByDeckIdOrderByCreatedAtDesc(String deckId);
    List<Note> findByUserId(String userId);
    Optional<Note> findByIdAndUserId(String id, String userId);
    List<Note> findByDeckIdAndFieldsJsonContaining(String deckId, String text);
    void deleteByDeckId(String deckId);
}
