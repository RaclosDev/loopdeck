package com.loopdeck.service;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Día de estudio: empieza a las 4:00 de la hora local, no a medianoche, para que repasar de madrugada cuente
 * como el día anterior. Las tarjetas hermanas enterradas vuelven al empezar el siguiente día de estudio.
 */
final class StudyDay {
    static final int START_HOUR = 4;

    private StudyDay() {}

    /** Instante en que empezó el día de estudio al que pertenece {@code now} en la zona indicada. */
    static Instant startOf(Instant now, ZoneId zone) {
        ZonedDateTime local = now.atZone(zone);
        ZonedDateTime start = local.toLocalDate().atTime(LocalTime.of(START_HOUR, 0)).atZone(zone);
        if (start.toInstant().isAfter(now)) {
            start = local.toLocalDate().minusDays(1).atTime(LocalTime.of(START_HOUR, 0)).atZone(zone);
        }
        return start.toInstant();
    }
}
