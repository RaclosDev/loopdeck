package com.loopdeck.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;

class SecurityConfigTest {
    @Test void rejectsMissingShortAndPublicPlaceholderSecrets() {
        var config = new SecurityConfig();
        for (String value : new String[] { null, "short", "CHANGE_ME_DO_NOT_USE_IN_PROD_12345678901234567890" }) {
            ReflectionTestUtils.setField(config, "jwtSecret", value);
            assertThrows(IllegalArgumentException.class, config::validateJwtSecret);
        }
        ReflectionTestUtils.setField(config, "jwtSecret", "test-only-placeholder-never-for-deployment-0123456789");
        assertDoesNotThrow(config::validateJwtSecret);
    }

    @Test void contentSecurityPolicyBlocksForeignScriptsAndFraming() {
        String csp = SecurityConfig.CONTENT_SECURITY_POLICY;
        assertTrue(csp.contains("script-src 'self' https://accounts.google.com/gsi/client;"));
        assertFalse(csp.contains("script-src 'self' 'unsafe-inline'"));
        assertTrue(csp.contains("object-src 'none'"));
        assertTrue(csp.contains("frame-ancestors 'self'"));
        assertTrue(csp.contains("frame-src 'self'"), "la portada incrusta su propia /demo");
    }

    @Test void onlyTheDemoCanBeFramedByThePortfolio() {
        for (String path : new String[] { "/demo", "/demo/mazos/3" }) {
            var response = framingHeaders(path);
            assertTrue(response.getHeader("Content-Security-Policy")
                .endsWith("frame-ancestors 'self' https://portfolio.raclos.es"), path);
            assertNull(response.getHeader("X-Frame-Options"), path);
        }
        for (String path : new String[] { "/", "/login", "/demos", "/demo-x", "/api/demo", "/api/decks" }) {
            var response = framingHeaders(path);
            assertEquals(SecurityConfig.CONTENT_SECURITY_POLICY, response.getHeader("Content-Security-Policy"), path);
            assertEquals("SAMEORIGIN", response.getHeader("X-Frame-Options"), path);
        }
    }

    private static MockHttpServletResponse framingHeaders(String path) {
        var response = new MockHttpServletResponse();
        response.setHeader("Content-Security-Policy", SecurityConfig.CONTENT_SECURITY_POLICY);
        SecurityConfig.FRAMING.writeHeaders(new MockHttpServletRequest("GET", path), response);
        return response;
    }
}
