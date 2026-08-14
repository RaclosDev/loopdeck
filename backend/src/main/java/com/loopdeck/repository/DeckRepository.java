package com.loopdeck.repository;

import com.loopdeck.model.Deck;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DeckRepository extends JpaRepository<Deck, String> {
    List<Deck> findByUserIdOrderByNameAsc(String userId);
    Optional<Deck> findByIdAndUserId(String id, String userId);
}
