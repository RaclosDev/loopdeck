package com.loopdeck.service;

import com.loopdeck.exception.TokenRefreshException;
import com.loopdeck.model.RefreshToken;
import com.loopdeck.repository.RefreshTokenRepository;
import com.loopdeck.security.RefreshCookies;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Refresh tokens de larga duración sin rotación: la PWA y la app instalada en iOS pueden
 * compartir la misma cookie, y rotarla cerraría una de las dos sesiones. La sesión se desliza
 * con el uso (30 días sin abrir la app) y nunca supera un año desde el inicio de sesión.
 */
@Service
public class RefreshTokenService {
    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    static final Duration IDLE_LIFETIME = RefreshCookies.MAX_AGE;
    static final Duration ABSOLUTE_LIFETIME = Duration.ofDays(365);

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public Optional<RefreshToken> findByToken(String token) {
        // Hash the plain token before querying the database.
        String hashedToken = RefreshToken.hashToken(token);
        return refreshTokenRepository.findByToken(hashedToken);
    }

    public RefreshToken createRefreshToken(String userId) {
        RefreshToken refreshToken = new RefreshToken(userId, Instant.now().plus(IDLE_LIFETIME));
        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new TokenRefreshException("Refresh token was expired. Please make a new signin request");
        }
        return token;
    }

    /** Alarga la sesión al usarse, sin pasar del tope absoluto. */
    @Transactional
    public RefreshToken extend(RefreshToken token) {
        Instant now = Instant.now();
        Instant cap = token.getCreatedAt() == null ? now.plus(IDLE_LIFETIME) : token.getCreatedAt().plus(ABSOLUTE_LIFETIME);
        Instant next = now.plus(IDLE_LIFETIME);
        token.setExpiryDate(next.isAfter(cap) ? cap : next);
        return refreshTokenRepository.save(token);
    }

    @Transactional
    public void deleteByToken(String token) {
        String hashedToken = RefreshToken.hashToken(token);
        refreshTokenRepository.findByToken(hashedToken).ifPresent(refreshTokenRepository::delete);
    }

    @Transactional
    public void deleteByUserId(String userId) {
        refreshTokenRepository.deleteByUserId(userId);
    }

    /** Purga diaria de sesiones caducadas para que la tabla no crezca sin límite. */
    @Scheduled(cron = "0 30 4 * * *", zone = "UTC")
    @Transactional
    public void purgeExpired() {
        int deleted = refreshTokenRepository.deleteExpiredBefore(Instant.now());
        if (deleted > 0) {
            log.info("Refresh tokens caducados eliminados: {}", deleted);
        }
    }
}
