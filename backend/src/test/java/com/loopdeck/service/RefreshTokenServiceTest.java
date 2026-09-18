package com.loopdeck.service;

import com.loopdeck.model.RefreshToken;
import com.loopdeck.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

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
}
