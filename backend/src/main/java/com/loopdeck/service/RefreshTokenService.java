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
 * Refresh tokens con rotación. Cada refresco emite un token nuevo de la misma familia (la sesión de un
 * dispositivo) y deja el anterior marcado como rotado. Si llega un token ya rotado fuera de la gracia
 * es una reutilización (cookie robada o copia antigua): se revoca toda la familia.
 *
 * <p>Duración: la sesión se desliza con el uso (30 días sin abrir la app) y nunca supera 60 días desde
 * el inicio de sesión; pasado ese tope hay que entrar de nuevo. Antes era de 365 días sin rotación.
 *
 * <p>Gracia: dos pestañas (o la PWA y una pestaña) pueden refrescar a la vez con la misma cookie. Un
 * token rotado hace menos de {@value #GRACE_SECONDS} segundos no dispara la revocación: recibe otro
 * sucesor de la misma familia, hasta {@value #MAX_GRACE_SUCCESSORS} veces. Pasado ese margen o ese
 * límite, cuenta como reutilización.
 */
@Service
public class RefreshTokenService {
    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    static final long GRACE_SECONDS = 30;
    static final int MAX_GRACE_SUCCESSORS = 3;

    static final Duration IDLE_LIFETIME = RefreshCookies.MAX_AGE;
    static final Duration ABSOLUTE_LIFETIME = Duration.ofDays(60);
    static final Duration ROTATION_GRACE = Duration.ofSeconds(GRACE_SECONDS);

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public Optional<RefreshToken> findByToken(String token) {
        // Hash the plain token before querying the database.
        String hashedToken = RefreshToken.hashToken(token);
        return refreshTokenRepository.findByToken(hashedToken);
    }

    /** Abre una familia nueva (inicio de sesión). */
    public RefreshToken createRefreshToken(String userId) {
        Instant now = Instant.now();
        RefreshToken refreshToken = new RefreshToken(userId, now.plus(IDLE_LIFETIME), now.plus(ABSOLUTE_LIFETIME));
        return refreshTokenRepository.save(refreshToken);
    }

    /**
     * Canjea un token por su sucesor. Lanza {@link TokenRefreshException} si no existe, caducó o es una
     * reutilización; en este último caso la revocación de la familia se confirma pese a la excepción.
     */
    @Transactional(noRollbackFor = TokenRefreshException.class)
    public RefreshToken rotate(String plainToken) {
        RefreshToken token = refreshTokenRepository.findByTokenForUpdate(RefreshToken.hashToken(plainToken))
                .orElseThrow(() -> new TokenRefreshException("Refresh token is not in database!"));
        Instant now = Instant.now();

        if (token.getExpiryDate().isBefore(now)) {
            refreshTokenRepository.delete(token);
            throw new TokenRefreshException("Refresh token was expired. Please make a new signin request");
        }

        if (token.getRotatedAt() != null) {
            boolean withinGrace = now.isBefore(token.getRotatedAt().plus(ROTATION_GRACE))
                    && token.getGraceSuccessors() < MAX_GRACE_SUCCESSORS;
            if (!withinGrace) {
                refreshTokenRepository.deleteByFamilyId(token.getFamilyId());
                log.warn("Refresh token rotado reutilizado: se revoca la familia de sesión");
                throw new TokenRefreshException("Refresh token reuse detected");
            }
            token.setGraceSuccessors(token.getGraceSuccessors() + 1);
        } else {
            token.setRotatedAt(now);
        }
        refreshTokenRepository.save(token);
        return refreshTokenRepository.save(successorOf(token, now));
    }

    private static RefreshToken successorOf(RefreshToken token, Instant now) {
        Instant next = now.plus(IDLE_LIFETIME);
        Instant expiry = next.isAfter(token.getAbsoluteExpiry()) ? token.getAbsoluteExpiry() : next;
        return new RefreshToken(token.getUserId(), expiry, token.getAbsoluteExpiry(), token.getFamilyId());
    }

    /** Cierra la sesión de este dispositivo: revoca toda la familia del token. */
    @Transactional
    public void deleteByToken(String token) {
        refreshTokenRepository.findByToken(RefreshToken.hashToken(token))
                .ifPresent(found -> refreshTokenRepository.deleteByFamilyId(found.getFamilyId()));
    }

    /** Revoca todas las familias de la cuenta. */
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
