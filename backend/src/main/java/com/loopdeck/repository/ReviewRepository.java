package com.loopdeck.repository;

import com.loopdeck.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, String> {
    Optional<Review> findFirstByCardIdOrderByReviewedAtDescIdDesc(String cardId);
    Optional<Review> findFirstByCardIdAndUndoneFalseOrderByReviewedAtDescIdDesc(String cardId);
    boolean existsByCardIdAndUndoneTrueAndPreviousState(String cardId, String previousState);
    List<Review> findByCardIdOrderByReviewedAtDesc(String cardId);
}
