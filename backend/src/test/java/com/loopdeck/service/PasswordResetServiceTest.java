package com.loopdeck.service;

import com.loopdeck.TestcontainersConfiguration;
import com.loopdeck.exception.InvalidResetTokenException;
import com.loopdeck.exception.TokenRefreshException;
import com.loopdeck.model.RefreshToken;
import com.loopdeck.repository.PasswordResetTokenRepository;
import com.loopdeck.repository.UserRepository;
import com.loopdeck.security.LoginThrottle;
import com.loopdeck.service.mail.EmailSender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

/** Recuperar contraseña contra PostgreSQL real, con el envío del correo grabado y ejecutado en el mismo hilo. */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class PasswordResetServiceTest {

    private static final Pattern LINK_TOKEN = Pattern.compile("https://loopdeck\\.test/reset-password\\?token=([A-Za-z0-9_-]+)");

    /** Graba los correos que se mandarían. */
    static class RecordingSender implements EmailSender {
        final List<Email> sent = new ArrayList<>();
        @Override public boolean enabled() { return true; }
        @Override public void send(Email email) { sent.add(email); }
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Autowired PasswordResetTokenRepository tokens;
    @Autowired RefreshTokenService refreshTokens;
    @Autowired PasswordEncoder encoder;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired LoginThrottle throttle;

    RecordingSender sender;
    PasswordResetService service;
    String userId, email, googleUserId, googleEmail;

    @BeforeEach
    void setUp() {
        sender = new RecordingSender();
        service = new PasswordResetService(users, tokens, refreshTokens, encoder, throttle, sender,
                transactionManager, "https://loopdeck.test/", Runnable::run);
        userId = UUID.randomUUID().toString();
        email = userId + "@example.invalid";
        jdbc.update("INSERT INTO users(id,email,name,password_hash) VALUES (?,?,?,?)", userId, email, "Reset test", encoder.encode("vieja-clave"));
        googleUserId = UUID.randomUUID().toString();
        googleEmail = googleUserId + "@example.invalid";
        jdbc.update("INSERT INTO users(id,email,name) VALUES (?,?,?)", googleUserId, googleEmail, "Solo Google");
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM users WHERE id IN (?, ?)", userId, googleUserId);
    }

    private String lastToken() {
        assertFalse(sender.sent.isEmpty(), "se esperaba un correo");
        Matcher matcher = LINK_TOKEN.matcher(sender.sent.get(sender.sent.size() - 1).text());
        assertTrue(matcher.find(), "el correo lleva el enlace con el token");
        return matcher.group(1);
    }

    private int pendingTokens() {
        return jdbc.queryForObject("SELECT count(*) FROM password_reset_tokens WHERE user_id = ?", Integer.class, userId);
    }

    private boolean passwordIs(String plain) {
        String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, userId);
        return encoder.matches(plain, hash);
    }

    @Test
    void requestForAnExistingAccountSendsOneEmailWithALinkToThePublicUrl() {
        service.request(email.toUpperCase());

        assertEquals(1, sender.sent.size());
        assertEquals(email, sender.sent.get(0).to());
        assertNotNull(lastToken());
        assertEquals(1, pendingTokens());
    }

    @Test
    void requestForAnUnknownAccountSendsNothingAndStoresNothing() {
        assertDoesNotThrow(() -> service.request("nadie-" + UUID.randomUUID() + "@example.invalid"));

        assertTrue(sender.sent.isEmpty());
    }

    @Test
    void theDatabaseOnlyKeepsTheHashOfTheToken() {
        service.request(email);
        String plain = lastToken();

        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM password_reset_tokens WHERE token_hash = ?", Integer.class, plain));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM password_reset_tokens WHERE token_hash = ?", Integer.class, com.loopdeck.security.SecureTokens.hash(plain)));
    }

    @Test
    void aGoogleOnlyAccountGetsAnEmailTellingItToSignInWithGoogleAndNoToken() {
        service.request(googleEmail);

        assertEquals(1, sender.sent.size());
        assertFalse(sender.sent.get(0).text().contains("reset-password"));
        assertTrue(sender.sent.get(0).text().contains("Google"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM password_reset_tokens WHERE user_id = ?", Integer.class, googleUserId));
    }

    @Test
    void confirmChangesThePasswordAndRevokesEverySession() {
        RefreshToken session = refreshTokens.createRefreshToken(userId);
        refreshTokens.createRefreshToken(userId);
        service.request(email);

        service.confirm(lastToken(), "clave-nueva-1");

        assertTrue(passwordIs("clave-nueva-1"));
        assertFalse(passwordIs("vieja-clave"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE user_id = ?", Integer.class, userId));
        assertThrows(TokenRefreshException.class, () -> refreshTokens.rotate(session.getPlainToken()));
        assertEquals(0, pendingTokens());
    }

    @Test
    void confirmOnlyTouchesTheAccountOfTheToken() {
        String foreignId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users(id,email,name,password_hash) VALUES (?,?,?,?)", foreignId, foreignId + "@example.invalid", "Otra", encoder.encode("otra-clave"));
        RefreshToken foreignSession = refreshTokens.createRefreshToken(foreignId);
        try {
            service.request(email);
            service.confirm(lastToken(), "clave-nueva-1");

            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE user_id = ?", Integer.class, foreignId));
            assertDoesNotThrow(() -> refreshTokens.rotate(foreignSession.getPlainToken()));
        } finally {
            jdbc.update("DELETE FROM users WHERE id = ?", foreignId);
        }
    }

    @Test
    void aTokenWorksOnlyOnce() {
        service.request(email);
        String token = lastToken();
        service.confirm(token, "clave-nueva-1");

        assertThrows(InvalidResetTokenException.class, () -> service.confirm(token, "otra-clave-2"));
        assertTrue(passwordIs("clave-nueva-1"));
    }

    @Test
    void anExpiredTokenFailsAndLeavesThePasswordAlone() {
        service.request(email);
        jdbc.update("UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute' WHERE user_id = ?", userId);

        assertThrows(InvalidResetTokenException.class, () -> service.confirm(lastToken(), "clave-nueva-1"));
        assertTrue(passwordIs("vieja-clave"));
    }

    @Test
    void aNewRequestInvalidatesThePreviousToken() {
        service.request(email);
        String first = lastToken();
        service.request(email);
        String second = lastToken();

        assertNotEquals(first, second);
        assertEquals(1, pendingTokens());
        assertThrows(InvalidResetTokenException.class, () -> service.confirm(first, "clave-nueva-1"));
        assertDoesNotThrow(() -> service.confirm(second, "clave-nueva-1"));
    }

    @Test
    void unknownOrBlankTokensFail() {
        assertThrows(InvalidResetTokenException.class, () -> service.confirm("no-existe", "clave-nueva-1"));
        assertThrows(InvalidResetTokenException.class, () -> service.confirm("  ", "clave-nueva-1"));
        assertThrows(InvalidResetTokenException.class, () -> service.confirm(null, "clave-nueva-1"));
    }

    @Test
    void aTokenIssuedBeforeTheAccountBecameGoogleOnlyNoLongerWorks() {
        service.request(email);
        String token = lastToken();
        jdbc.update("UPDATE users SET password_hash = NULL WHERE id = ?", userId);

        assertThrows(InvalidResetTokenException.class, () -> service.confirm(token, "clave-nueva-1"));
        assertNull(jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, userId));
    }

    @Test
    void confirmClearsTheLoginThrottleOfTheAccount() {
        for (int i = 0; i < 20; i++) throttle.recordFailure(email);
        assertThrows(RuntimeException.class, () -> throttle.check(email));
        service.request(email);

        service.confirm(lastToken(), "clave-nueva-1");

        assertDoesNotThrow(() -> throttle.check(email));
    }

    @Test
    void thePerEmailLimitSilentlyDropsRequestsOverThreePerHour() {
        for (int i = 0; i < 6; i++) service.request(email);

        assertEquals(PasswordResetService.MAX_REQUESTS_PER_EMAIL_PER_HOUR, sender.sent.size());
    }

    @Test
    void theEmailLimitIsPerAddress() {
        for (int i = 0; i < 5; i++) service.request(email);
        service.request(googleEmail);

        assertEquals(PasswordResetService.MAX_REQUESTS_PER_EMAIL_PER_HOUR + 1, sender.sent.size());
    }

    @Test
    void aFailingSenderNeverLeaksAnExceptionToTheCaller() {
        PasswordResetService failing = new PasswordResetService(users, tokens, refreshTokens, encoder, throttle,
                new EmailSender() {
                    @Override public boolean enabled() { return true; }
                    @Override public void send(Email e) { throw new IllegalStateException("boom"); }
                }, transactionManager, "https://loopdeck.test", Runnable::run);

        assertDoesNotThrow(() -> failing.request(email));
    }

    @Test
    void purgeRemovesExpiredTokensOnly() {
        service.request(email);
        jdbc.update("INSERT INTO password_reset_tokens(user_id, token_hash, expires_at) VALUES (?, ?, now() - interval '1 day')", googleUserId, "caducado" + UUID.randomUUID());

        service.purgeExpired();

        assertEquals(1, pendingTokens());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM password_reset_tokens WHERE user_id = ?", Integer.class, googleUserId));
    }
}
