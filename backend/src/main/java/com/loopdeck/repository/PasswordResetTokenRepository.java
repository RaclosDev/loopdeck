package com.loopdeck.repository;

import com.loopdeck.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Gasta el token de forma atómica: solo una petición puede pasar de «sin usar» a «usado», aunque
     * lleguen dos a la vez. Devuelve 1 si lo gastó esta llamada y 0 si no existe, caducó o ya estaba usado.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.tokenHash = :hash AND t.usedAt IS NULL AND t.expiresAt > :now")
    int consume(@Param("hash") String hash, @Param("now") Instant now);

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM PasswordResetToken t WHERE t.userId = :userId")
    int deleteByUserId(@Param("userId") String userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now")
    int deleteExpiredBefore(@Param("now") Instant now);
}
