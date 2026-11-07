package com.loopdeck.security;

import org.springframework.http.ResponseCookie;

import java.time.Duration;

/** Cookie del refresh token: solo viaja a /api/auth y dura lo mismo que el token en la base de datos. */
public final class RefreshCookies {

    public static final String NAME = "refreshToken";
    public static final String PATH = "/api/auth";
    public static final Duration MAX_AGE = Duration.ofDays(30);

    private RefreshCookies() {
    }

    public static ResponseCookie issue(String token) {
        return base(token, PATH).maxAge(MAX_AGE).build();
    }

    public static ResponseCookie clear() {
        return base("", PATH).maxAge(0).build();
    }

    /** Borra la cookie que versiones anteriores dejaban en la raíz. */
    public static ResponseCookie clearLegacy() {
        return base("", "/").maxAge(0).build();
    }

    private static ResponseCookie.ResponseCookieBuilder base(String value, String path) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(true).sameSite("Lax").path(path);
    }
}
