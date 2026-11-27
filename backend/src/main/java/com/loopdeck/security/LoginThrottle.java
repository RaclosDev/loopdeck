package com.loopdeck.security;

import com.loopdeck.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Tope de intentos de contraseña fallidos por cuenta, con independencia de la IP: quien rota de
 * dirección no puede probar contraseñas sin fin contra el mismo correo. Un acierto reinicia la cuenta.
 */
@Component
public class LoginThrottle {

    static final int MAX_FAILURES = 10;
    static final long WINDOW_MS = 5 * 60_000L;

    private final SlidingWindowLimiter failures = new SlidingWindowLimiter(WINDOW_MS);

    /** Lanza 429 si la cuenta ya acumula demasiados fallos recientes. */
    public void check(String email) {
        if (failures.count(key(email), System.currentTimeMillis()) >= MAX_FAILURES) {
            throw new TooManyRequestsException("Demasiados intentos. Inténtalo de nuevo en unos minutos");
        }
    }

    public void recordFailure(String email) {
        failures.record(key(email), System.currentTimeMillis());
    }

    public void reset(String email) {
        failures.clear(key(email));
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
