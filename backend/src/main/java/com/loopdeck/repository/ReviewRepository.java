package com.loopdeck.repository;

import com.loopdeck.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, String> {
    List<Review> findByCardIdOrderByReviewedAtDesc(String cardId);
}
