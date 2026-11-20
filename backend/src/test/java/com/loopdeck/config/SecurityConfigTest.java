package com.loopdeck.config;

import org.junit.jupiter.api.Test;
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
    }
}
