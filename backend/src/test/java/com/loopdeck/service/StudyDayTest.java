package com.loopdeck.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StudyDayTest {
    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");

    @Test
    void theStudyDayStartsAtFourLocalTime() {
        // 12:00 hora de Madrid (CET, UTC+1) del 27 de noviembre: el día empezó a las 4:00 locales (03:00 UTC).
        assertEquals(Instant.parse("2026-11-27T03:00:00Z"), StudyDay.startOf(Instant.parse("2026-11-27T11:00:00Z"), MADRID));
    }

    @Test
    void studyingAtNightStillBelongsToTheSameDay() {
        // 23:00 locales: sigue siendo el día que empezó esa misma mañana.
        assertEquals(Instant.parse("2026-11-27T03:00:00Z"), StudyDay.startOf(Instant.parse("2026-11-27T22:00:00Z"), MADRID));
    }

    @Test
    void theSmallHoursBelongToThePreviousDay() {
        // 02:30 locales del 28: todavía cuenta como el día 27 (empezó el 27 a las 4:00).
        assertEquals(Instant.parse("2026-11-27T03:00:00Z"), StudyDay.startOf(Instant.parse("2026-11-28T01:30:00Z"), MADRID));
    }

    @Test
    void theBoundaryBelongsToTheNewDay() {
        assertEquals(Instant.parse("2026-11-28T03:00:00Z"), StudyDay.startOf(Instant.parse("2026-11-28T03:00:00Z"), MADRID));
        assertEquals(Instant.parse("2026-11-27T03:00:00Z"), StudyDay.startOf(Instant.parse("2026-11-28T02:59:59Z"), MADRID));
    }

    @Test
    void daylightSavingChangesDoNotMoveTheLocalStart() {
        // En verano Madrid es UTC+2: las 4:00 locales son las 02:00 UTC.
        assertEquals(Instant.parse("2026-07-15T02:00:00Z"), StudyDay.startOf(Instant.parse("2026-07-15T10:00:00Z"), MADRID));
        // Día del cambio de hora de otoño (25 de octubre): a las 4:00 locales ya es CET (03:00 UTC).
        assertEquals(Instant.parse("2026-10-25T03:00:00Z"), StudyDay.startOf(Instant.parse("2026-10-25T12:00:00Z"), MADRID));
        // Día del cambio de primavera (29 de marzo): 4:00 locales en CEST son las 02:00 UTC.
        assertEquals(Instant.parse("2026-03-29T02:00:00Z"), StudyDay.startOf(Instant.parse("2026-03-29T12:00:00Z"), MADRID));
    }
}
