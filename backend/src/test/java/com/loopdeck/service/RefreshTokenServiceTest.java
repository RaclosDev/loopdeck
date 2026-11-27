package com.loopdeck.service;

import com.loopdeck.TestcontainersConfiguration;
import com.loopdeck.exception.TokenRefreshException;
import com.loopdeck.model.RefreshToken;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Rotación de refresh tokens con familias, contra PostgreSQL real (hay bloqueos y borrados masivos). */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class RefreshTokenServiceTest {

    @Autowired RefreshTokenService service;
    @Autowired JdbcTemplate jdbc;
    String user, otherUser;

    @BeforeEach
    void seedUsers() {
        user = UUID.randomUUID().toString();
        otherUser = UUID.randomUUID().toString();
        for (String id : new String[] {user, otherUser}) {
            jdbc.update("INSERT INTO users(id,email,name) VALUES (?,?,?)", id, id + "@example.invalid", "Refresh test");
        }
    }

    @AfterEach
    void cleanUsers() {
        jdbc.update("DELETE FROM users WHERE id IN (?, ?)", user, otherUser);
    }

    private int tokensOf(String userId) {
        return jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE user_id = ?", Integer.class, userId);
    }

    private int familyCount(String familyId) {
        return jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE family_id = ?", Integer.class, familyId);
    }

    /** Hace que el token se rotara hace {@code seconds} segundos (el campo es TIMESTAMP en UTC). */
    private void rotatedSecondsAgo(String plain, long seconds) {
        jdbc.update("UPDATE refresh_tokens SET rotated_at = (now() AT TIME ZONE 'UTC') - make_interval(secs => ?) WHERE token = ?",
                seconds, RefreshToken.hashToken(plain));
    }

    @Test
    void tokensAreStoredOnlyAsHash() {
        RefreshToken created = service.createRefreshToken(user);

        assertNotNull(created.getPlainToken());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE token = ?", Integer.class, created.getPlainToken()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE token = ?", Integer.class, RefreshToken.hashToken(created.getPlainToken())));
    }

    @Test
    void rotateIssuesANewTokenOfTheSameFamilyAndMarksTheOldOneRotated() {
        RefreshToken first = service.createRefreshToken(user);

        RefreshToken second = service.rotate(first.getPlainToken());

        assertNotEquals(first.getPlainToken(), second.getPlainToken());
        assertEquals(first.getFamilyId(), second.getFamilyId());
        assertEquals(2, familyCount(first.getFamilyId()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE family_id = ? AND rotated_at IS NOT NULL", Integer.class, first.getFamilyId()));
        // El sucesor sí se puede volver a rotar.
        assertDoesNotThrow(() -> service.rotate(second.getPlainToken()));
    }

    @Test
    void sessionLengthIsSixtyDaysAtMostAndIdleThirty() {
        RefreshToken first = service.createRefreshToken(user);
        Duration idle = Duration.between(Instant.now(), first.getExpiryDate());
        Duration absolute = Duration.between(Instant.now(), first.getAbsoluteExpiry());

        assertTrue(idle.compareTo(Duration.ofDays(29)) > 0 && idle.compareTo(Duration.ofDays(30)) <= 0);
        assertTrue(absolute.compareTo(Duration.ofDays(59)) > 0 && absolute.compareTo(Duration.ofDays(60)) <= 0);
    }

    @Test
    void rotationNeverPassesTheAbsoluteExpiry() {
        RefreshToken first = service.createRefreshToken(user);
        // Quedan 5 días de vida absoluta: el sucesor no puede durar 30.
        jdbc.update("UPDATE refresh_tokens SET absolute_expiry = (now() AT TIME ZONE 'UTC') + interval '5 days' WHERE family_id = ?", first.getFamilyId());

        RefreshToken next = service.rotate(first.getPlainToken());

        Duration left = Duration.between(Instant.now(), next.getExpiryDate());
        assertTrue(left.compareTo(Duration.ofDays(5)) <= 0, "no supera el tope absoluto");
        assertTrue(left.compareTo(Duration.ofDays(4)) > 0);
    }

    @Test
    void reusingARotatedTokenAfterTheGraceRevokesTheWholeFamily() {
        RefreshToken first = service.createRefreshToken(user);
        RefreshToken second = service.rotate(first.getPlainToken());
        rotatedSecondsAgo(first.getPlainToken(), 120);

        assertThrows(TokenRefreshException.class, () -> service.rotate(first.getPlainToken()));

        // La revocación se confirma pese a la excepción: el sucesor legítimo tampoco sirve ya.
        assertEquals(0, familyCount(first.getFamilyId()));
        assertThrows(TokenRefreshException.class, () -> service.rotate(second.getPlainToken()));
    }

    @Test
    void reuseOnlyRevokesThatFamilyNotOtherSessionsOfTheSameUser() {
        RefreshToken phone = service.createRefreshToken(user);
        RefreshToken laptop = service.createRefreshToken(user);
        service.rotate(phone.getPlainToken());
        rotatedSecondsAgo(phone.getPlainToken(), 120);

        assertThrows(TokenRefreshException.class, () -> service.rotate(phone.getPlainToken()));

        assertEquals(0, familyCount(phone.getFamilyId()));
        assertEquals(1, familyCount(laptop.getFamilyId()));
        assertDoesNotThrow(() -> service.rotate(laptop.getPlainToken()));
    }

    @Test
    void concurrentRefreshInsideTheGraceIsAcceptedAndKeepsTheFamily() {
        RefreshToken first = service.createRefreshToken(user);
        RefreshToken fromTabOne = service.rotate(first.getPlainToken());

        // La otra pestaña llega con la misma cookie unos instantes después.
        RefreshToken fromTabTwo = assertDoesNotThrow(() -> service.rotate(first.getPlainToken()));

        assertEquals(first.getFamilyId(), fromTabTwo.getFamilyId());
        assertNotEquals(fromTabOne.getPlainToken(), fromTabTwo.getPlainToken());
        assertDoesNotThrow(() -> service.rotate(fromTabOne.getPlainToken()));
        assertDoesNotThrow(() -> service.rotate(fromTabTwo.getPlainToken()));
    }

    @Test
    void graceAcceptsAtMostThreeSuccessorsAndTheNextAttemptRevokesTheFamily() {
        RefreshToken first = service.createRefreshToken(user);
        service.rotate(first.getPlainToken()); // rotación normal
        for (int i = 0; i < RefreshTokenService.MAX_GRACE_SUCCESSORS; i++) {
            assertDoesNotThrow(() -> service.rotate(first.getPlainToken()));
        }

        assertThrows(TokenRefreshException.class, () -> service.rotate(first.getPlainToken()));
        assertEquals(0, familyCount(first.getFamilyId()));
    }

    @Test
    void anExpiredTokenIsRejectedAndRemoved() {
        RefreshToken first = service.createRefreshToken(user);
        jdbc.update("UPDATE refresh_tokens SET expiry_date = (now() AT TIME ZONE 'UTC') - interval '1 minute' WHERE token = ?",
                RefreshToken.hashToken(first.getPlainToken()));

        assertThrows(TokenRefreshException.class, () -> service.rotate(first.getPlainToken()));
        assertEquals(0, tokensOf(user));
    }

    @Test
    void anUnknownTokenIsRejected() {
        assertThrows(TokenRefreshException.class, () -> service.rotate("no-existe"));
    }

    @Test
    void logoutRevokesOnlyTheFamilyOfThatDevice() {
        RefreshToken phone = service.createRefreshToken(user);
        RefreshToken laptop = service.createRefreshToken(user);
        RefreshToken phoneNext = service.rotate(phone.getPlainToken());

        service.deleteByToken(phoneNext.getPlainToken());

        assertEquals(0, familyCount(phone.getFamilyId()));
        assertEquals(1, familyCount(laptop.getFamilyId()));
    }

    @Test
    void deleteByUserRevokesEveryFamilyOfTheAccountOnly() {
        service.createRefreshToken(user);
        RefreshToken second = service.createRefreshToken(user);
        service.rotate(second.getPlainToken());
        RefreshToken foreign = service.createRefreshToken(otherUser);

        service.deleteByUserId(user);

        assertEquals(0, tokensOf(user));
        assertEquals(1, tokensOf(otherUser));
        assertDoesNotThrow(() -> service.rotate(foreign.getPlainToken()));
    }

    @Test
    void purgeDeletesExpiredTokensOnly() {
        RefreshToken live = service.createRefreshToken(user);
        RefreshToken dead = service.createRefreshToken(user);
        jdbc.update("UPDATE refresh_tokens SET expiry_date = (now() AT TIME ZONE 'UTC') - interval '1 day' WHERE token = ?",
                RefreshToken.hashToken(dead.getPlainToken()));

        service.purgeExpired();

        assertEquals(1, familyCount(live.getFamilyId()));
        assertEquals(0, familyCount(dead.getFamilyId()));
    }

    @Test
    void aMigratedLegacyTokenWithAShortAbsoluteCapStillRotatesAndKeepsTheCap() {
        // Forma que deja la migración V27 a un token de 365 días: familia propia y tope absoluto recortado.
        RefreshToken legacy = service.createRefreshToken(user);
        jdbc.update("UPDATE refresh_tokens SET created_at = (now() AT TIME ZONE 'UTC') - interval '200 days', "
                + "absolute_expiry = (now() AT TIME ZONE 'UTC') + interval '30 days', "
                + "expiry_date = (now() AT TIME ZONE 'UTC') + interval '30 days' WHERE family_id = ?", legacy.getFamilyId());

        RefreshToken next = service.rotate(legacy.getPlainToken());

        assertEquals(legacy.getFamilyId(), next.getFamilyId());
        assertTrue(Duration.between(Instant.now(), next.getExpiryDate()).compareTo(Duration.ofDays(30)) <= 0);
    }
}
