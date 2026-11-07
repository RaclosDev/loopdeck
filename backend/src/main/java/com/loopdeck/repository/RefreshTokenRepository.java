package com.loopdeck.repository;

import com.loopdeck.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);

    void deleteByUserId(String userId);

    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.expiryDate < :now")
    int deleteExpiredBefore(@Param("now") Instant now);
}
