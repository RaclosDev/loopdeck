package com.loopdeck.service;

import com.loopdeck.model.RefreshToken;
import com.loopdeck.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testFindByToken_HashesTokenBeforeLookup() {
        String plainToken = "my-plain-token";
        String hashedToken = RefreshToken.hashToken(plainToken);

        RefreshToken mockToken = new RefreshToken();
        mockToken.setToken(hashedToken);
        
        when(refreshTokenRepository.findByToken(hashedToken)).thenReturn(Optional.of(mockToken));

        Optional<RefreshToken> result = refreshTokenService.findByToken(plainToken);

        assertTrue(result.isPresent());
        assertEquals(hashedToken, result.get().getToken());
        verify(refreshTokenRepository).findByToken(hashedToken);
    }

    @Test
    void extendSlidesTheIdleWindow() {
        RefreshToken token = new RefreshToken("user", Instant.now().plus(Duration.ofDays(1)));
        when(refreshTokenRepository.save(token)).thenReturn(token);

        refreshTokenService.extend(token);

        Duration left = Duration.between(Instant.now(), token.getExpiryDate());
        assertTrue(left.compareTo(Duration.ofDays(29)) > 0, "la sesión vuelve a durar 30 días");
    }

    @Test
    void extendNeverPassesOneYearFromSignIn() throws Exception {
        RefreshToken token = new RefreshToken("user", Instant.now().plus(Duration.ofDays(1)));
        var createdAt = RefreshToken.class.getDeclaredField("createdAt");
        createdAt.setAccessible(true);
        Instant signIn = Instant.now().minus(Duration.ofDays(350));
        createdAt.set(token, signIn);
        when(refreshTokenRepository.save(token)).thenReturn(token);

        refreshTokenService.extend(token);

        assertEquals(signIn.plus(Duration.ofDays(365)), token.getExpiryDate());
    }

    @Test
    void purgeDeletesExpiredTokens() {
        when(refreshTokenRepository.deleteExpiredBefore(any())).thenReturn(3);
        refreshTokenService.purgeExpired();
        verify(refreshTokenRepository).deleteExpiredBefore(any());
    }
}
