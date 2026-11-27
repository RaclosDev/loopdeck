package com.loopdeck.service;

import com.loopdeck.exception.ConflictException;
import com.loopdeck.exception.ReauthenticationException;
import com.loopdeck.exception.TooManyRequestsException;
import com.loopdeck.mapper.UserMapper;
import com.loopdeck.model.RefreshToken;
import com.loopdeck.model.User;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import com.loopdeck.repository.PasskeyRepository;
import com.loopdeck.repository.UserRepository;
import com.loopdeck.security.LoginThrottle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private UserRepository users;
    private PasswordEncoder encoder;
    private RefreshTokenService refreshTokens;
    private PasskeyRepository passkeys;
    private AuthService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        encoder = mock(PasswordEncoder.class);
        refreshTokens = mock(RefreshTokenService.class);
        passkeys = mock(PasskeyRepository.class);
        JwtEncoder jwtEncoder = mock(JwtEncoder.class);
        when(jwtEncoder.encode(any(JwtEncoderParameters.class))).thenReturn(
            Jwt.withTokenValue("jwt").header("alg", "HS256").subject("u").build());
        when(refreshTokens.createRefreshToken(any())).thenReturn(new RefreshToken());
        UserMapper mapper = mock(UserMapper.class);
        when(mapper.toDto(any())).thenAnswer(call -> {
            User u = call.getArgument(0);
            return new AuthService.UserDto(u.getId(), u.getEmail(), u.getName());
        });
        service = new AuthService(users, mock(DeckRepository.class), mock(NoteRepository.class), encoder,
            jwtEncoder, refreshTokens, mapper, passkeys, new LoginThrottle());
    }

    private static User passwordUser() {
        return User.builder().id("victima").email("victima@example.com").name("Victima")
            .passwordHash("hash-del-atacante").build();
    }

    @Test
    void linkingGoogleToAPasswordAccountRevokesPasswordSessionsAndPasskeys() {
        User existing = passwordUser();
        when(users.findByGoogleId("g-1")).thenReturn(Optional.empty());
        when(users.findByEmail("victima@example.com")).thenReturn(Optional.of(existing));

        AuthService.AuthResponse res = service.processGoogleUser("g-1", "Victima@Example.com", "Victima");

        assertEquals("jwt", res.token());
        assertEquals("g-1", existing.getGoogleId());
        assertNull(existing.getPasswordHash());
        verify(users).save(existing);
        verify(refreshTokens).deleteByUserId("victima");
        verify(passkeys).deleteByUserId("victima");
    }

    @Test
    void anAccountAlreadyLinkedToThatGoogleIdLogsInWithoutRevokingAnything() {
        User linked = User.builder().id("u1").email("a@example.com").name("A").googleId("g-1").build();
        when(users.findByGoogleId("g-1")).thenReturn(Optional.of(linked));

        service.processGoogleUser("g-1", "a@example.com", "A");

        verify(refreshTokens, never()).deleteByUserId(any());
        verify(passkeys, never()).deleteByUserId(any());
        verify(users, never()).save(any());
    }

    @Test
    void anAccountLinkedToAnotherGoogleIdIsNotTakenOverByEmail() {
        User linked = User.builder().id("u1").email("a@example.com").name("A").googleId("g-original").build();
        when(users.findByGoogleId("g-otro")).thenReturn(Optional.empty());
        when(users.findByEmail("a@example.com")).thenReturn(Optional.of(linked));

        assertThrows(IllegalArgumentException.class, () -> service.processGoogleUser("g-otro", "a@example.com", "A"));

        assertEquals("g-original", linked.getGoogleId());
        verify(refreshTokens, never()).deleteByUserId(any());
    }

    @Test
    void aNewGoogleUserIsCreatedWithoutPassword() {
        when(users.findByGoogleId("g-2")).thenReturn(Optional.empty());
        when(users.findByEmail("nuevo@example.com")).thenReturn(Optional.empty());

        service.processGoogleUser("g-2", "nuevo@example.com", null);

        verify(users).save(org.mockito.ArgumentMatchers.argThat(u -> "g-2".equals(u.getGoogleId())
            && u.getPasswordHash() == null && "nuevo".equals(u.getName())));
    }

    @Test
    void passwordLoginIsRejectedForAccountsWithoutPassword() {
        User googleOnly = User.builder().id("u1").email("a@example.com").name("A").googleId("g-1").build();
        when(users.findByEmail("a@example.com")).thenReturn(Optional.of(googleOnly));

        assertThrows(IllegalArgumentException.class,
            () -> service.login(new AuthService.LoginRequest("a@example.com", "cualquiera")));
        verify(encoder, never()).matches(any(), any());
    }

    @Test
    void loginIsBlockedAfterTooManyFailuresForTheSameEmailAndReopensAfterASuccess() {
        User user = passwordUser();
        when(users.findByEmail("victima@example.com")).thenReturn(Optional.of(user));
        when(encoder.matches("mala", "hash-del-atacante")).thenReturn(false);
        when(encoder.matches("buena", "hash-del-atacante")).thenReturn(true);

        for (int i = 0; i < 10; i++) {
            assertThrows(IllegalArgumentException.class,
                () -> service.login(new AuthService.LoginRequest("Victima@example.com", "mala")));
        }
        // Con el límite alcanzado ni siquiera la contraseña correcta pasa, y no se llega a comprobarla.
        assertThrows(TooManyRequestsException.class,
            () -> service.login(new AuthService.LoginRequest("victima@example.com", "buena")));
        // Otra cuenta no se ve afectada.
        when(users.findByEmail("otra@example.com")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,
            () -> service.login(new AuthService.LoginRequest("otra@example.com", "x")));
    }

    @Test
    void aSuccessfulLoginResetsTheFailureCount() {
        User user = passwordUser();
        when(users.findByEmail("victima@example.com")).thenReturn(Optional.of(user));
        when(encoder.matches("mala", "hash-del-atacante")).thenReturn(false);
        when(encoder.matches("buena", "hash-del-atacante")).thenReturn(true);

        for (int round = 0; round < 3; round++) {
            for (int i = 0; i < 9; i++) {
                assertThrows(IllegalArgumentException.class,
                    () -> service.login(new AuthService.LoginRequest("victima@example.com", "mala")));
            }
            assertEquals("jwt", service.login(new AuthService.LoginRequest("victima@example.com", "buena")).token());
        }
    }

    @Test
    void confirmIdentityAcceptsTheRightPasswordAndRejectsMissingOrWrongOnes() {
        when(users.findById("victima")).thenReturn(Optional.of(passwordUser()));
        when(encoder.matches("buena", "hash-del-atacante")).thenReturn(true);

        service.confirmIdentity("victima", "buena", null);

        assertThrows(ReauthenticationException.class, () -> service.confirmIdentity("victima", "mala", null));
        assertThrows(ReauthenticationException.class, () -> service.confirmIdentity("victima", null, null));
        assertThrows(ReauthenticationException.class, () -> service.confirmIdentity("victima", "", "token-google"));
    }

    @Test
    void confirmIdentityNeedsAGoogleCredentialForGoogleOnlyAccountsAndNeverTrustsAPassword() {
        User googleOnly = User.builder().id("g").email("g@example.com").name("G").googleId("g-1").build();
        when(users.findById("g")).thenReturn(Optional.of(googleOnly));

        assertThrows(ReauthenticationException.class, () -> service.confirmIdentity("g", "cualquiera", null));
        verify(encoder, never()).matches(any(), any());
    }

    @Test
    void confirmIdentityFailsForUnknownAccounts() {
        when(users.findById("nadie")).thenReturn(Optional.empty());

        assertThrows(ReauthenticationException.class, () -> service.confirmIdentity("nadie", "x", null));
    }

    @Test
    void confirmIdentityFailuresAreThrottledPerAccount() {
        when(users.findById("victima")).thenReturn(Optional.of(passwordUser()));
        when(encoder.matches("mala", "hash-del-atacante")).thenReturn(false);
        when(encoder.matches("buena", "hash-del-atacante")).thenReturn(true);

        for (int i = 0; i < 10; i++) {
            assertThrows(ReauthenticationException.class, () -> service.confirmIdentity("victima", "mala", null));
        }
        assertThrows(TooManyRequestsException.class, () -> service.confirmIdentity("victima", "buena", null));
    }

    @Test
    void changingThePasswordRevokesEverySessionAndOpensANewOne() {
        User user = passwordUser();
        when(users.findById("victima")).thenReturn(Optional.of(user));
        when(encoder.matches("vieja", "hash-del-atacante")).thenReturn(true);
        when(encoder.encode("nueva-segura")).thenReturn("hash-nuevo");

        AuthService.AuthResponse res = service.changePassword("victima", "vieja", "nueva-segura");

        assertEquals("hash-nuevo", user.getPasswordHash());
        verify(users).save(user);
        verify(refreshTokens).deleteByUserId("victima");
        verify(refreshTokens).createRefreshToken("victima");
        assertEquals("jwt", res.token());
    }

    @Test
    void changingThePasswordWithAWrongCurrentOneChangesNothing() {
        User user = passwordUser();
        when(users.findById("victima")).thenReturn(Optional.of(user));
        when(encoder.matches("mala", "hash-del-atacante")).thenReturn(false);

        assertThrows(ReauthenticationException.class, () -> service.changePassword("victima", "mala", "nueva-segura"));

        assertEquals("hash-del-atacante", user.getPasswordHash());
        verify(users, never()).save(any());
        verify(refreshTokens, never()).deleteByUserId(any());
    }

    @Test
    void googleOnlyAccountsHaveNoPasswordToChange() {
        User googleOnly = User.builder().id("g").email("g@example.com").name("G").googleId("g-1").build();
        when(users.findById("g")).thenReturn(Optional.of(googleOnly));

        assertThrows(ConflictException.class, () -> service.changePassword("g", "x", "nueva-segura"));
        verify(refreshTokens, never()).deleteByUserId(any());
    }

    @Test
    void logoutAllDeletesEveryRefreshTokenOfTheAccount() {
        service.logoutAll("victima");

        verify(refreshTokens).deleteByUserId("victima");
    }

    @Test
    void refreshReturnsTheRotatedTokenNotTheOneThatWasPresented() {
        RefreshToken next = new RefreshToken("victima", java.time.Instant.now().plusSeconds(60), java.time.Instant.now().plusSeconds(120));
        when(refreshTokens.rotate("viejo")).thenReturn(next);
        when(users.findById("victima")).thenReturn(Optional.of(passwordUser()));

        AuthService.AuthResponse res = service.refreshToken("viejo");

        assertEquals(next.getPlainToken(), res.refreshToken());
        org.junit.jupiter.api.Assertions.assertFalse("viejo".equals(res.refreshToken()));
        assertEquals("jwt", res.token());
    }

    @Test
    void refreshPropagatesARejectedRotation() {
        when(refreshTokens.rotate("reutilizado")).thenThrow(new com.loopdeck.exception.TokenRefreshException("reuse"));

        assertThrows(com.loopdeck.exception.TokenRefreshException.class, () -> service.refreshToken("reutilizado"));
        verify(users, never()).findById(any());
    }
}
