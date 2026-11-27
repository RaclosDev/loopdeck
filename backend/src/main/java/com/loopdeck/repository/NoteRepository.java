package com.loopdeck.repository;

import com.loopdeck.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

public interface NoteRepository extends JpaRepository<Note, String> {
    List<Note> findByDeckId(String deckId);
    List<Note> findByDeckIdOrderByCreatedAtDesc(String deckId);
    List<Note> findByUserId(String userId);
    /** Página de notas de la cuenta por id (paginación por clave), para recorrerlas sin cargarlas todas. */
    List<Note> findByUserIdAndIdGreaterThanOrderByIdAsc(String userId, String afterId, Pageable page);
    long countByUserId(String userId);
    Optional<Note> findByIdAndUserId(String id, String userId);

    void deleteByDeckId(String deckId);
}
