package com.loopdeck.repository;

import com.loopdeck.model.DeckDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeckDocumentRepository extends JpaRepository<DeckDocument, String> {
}
