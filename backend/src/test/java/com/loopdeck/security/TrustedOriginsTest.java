package com.loopdeck.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrustedOriginsTest {

    private final TrustedOrigins origins = new TrustedOrigins(new String[]{"https://loopdeck.raclos.es", "http://localhost:5173"});

    private static MockHttpServletRequest post(String header, String value) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        request.addHeader("Host", "app.internal:8080");
        if (header != null) request.addHeader(header, value);
        return request;
    }

    @Test
    void acceptsConfiguredOriginsAndRefererPaths() {
        assertTrue(origins.isTrusted(post("Origin", "https://loopdeck.raclos.es")));
        assertTrue(origins.isTrusted(post("Origin", "http://localhost:5173")));
        assertTrue(origins.isTrusted(post("Referer", "https://loopdeck.raclos.es/study?deck=1")));
    }

    @Test
    void acceptsTheSameHostAndRequestsWithoutBrowserHeaders() {
        assertTrue(origins.isTrusted(post("Origin", "http://app.internal:8080")));
        assertTrue(origins.isTrusted(post(null, null)));
    }

    @Test
    void rejectsOtherSites() {
        assertFalse(origins.isTrusted(post("Origin", "https://evil.example")));
        assertFalse(origins.isTrusted(post("Origin", "https://loopdeck.raclos.es.evil.example")));
        assertFalse(origins.isTrusted(post("Referer", "not a url")));
    }
}
