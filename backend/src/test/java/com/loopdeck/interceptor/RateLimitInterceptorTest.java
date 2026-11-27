package com.loopdeck.interceptor;

import com.loopdeck.security.ClientIp;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.security.Principal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RateLimitInterceptorTest {

    private final RateLimitInterceptor limiter = new RateLimitInterceptor(new ClientIp(0));

    private static MockHttpServletRequest request(String uri, String address, String user) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        request.setRemoteAddr(address);
        if (user != null) {
            Principal principal = () -> user;
            request.setUserPrincipal(principal);
        }
        return request;
    }

    private boolean allowed(MockHttpServletRequest request) throws Exception {
        return limiter.preHandle(request, new MockHttpServletResponse(), null);
    }

    @Test
    void aiIsLimitedPerUserEvenWhenAddressesAndRoutesChange() throws Exception {
        int allowed = 0;
        for (int i = 0; i < 40; i++) {
            String route = i % 2 == 0 ? "/api/ai/definition" : "/api/ai/chat";
            if (allowed(request(route, "10.1.0." + i, "user-1"))) allowed++;
        }
        assertEquals(RateLimitInterceptor.AI_REQUESTS_PER_USER_PER_MINUTE, allowed);
        // Otro usuario conserva su cupo.
        assertTrue(allowed(request("/api/ai/definition", "10.2.0.1", "user-2")));
    }

    @Test
    void anEncodedOrRepeatedSlashPathCountsAsTheSameRoute() throws Exception {
        String[] spellings = {"/api/auth/login", "/api/%61uth/login", "/api//auth/login", "/api/auth/login;x=1"};
        int allowed = 0;
        for (int i = 0; i < 70; i++) {
            if (allowed(request(spellings[i % spellings.length], "10.0.0.2", null))) allowed++;
        }
        assertEquals(RateLimitInterceptor.MAX_REQUESTS_PER_MINUTE, allowed);
    }

    @Test
    void otherRoutesAreNotLimited() throws Exception {
        for (int i = 0; i < 200; i++) {
            assertTrue(allowed(request("/api/decks", "10.0.0.3", "user-1")));
        }
    }

    @Test
    void passwordResetRequestHasAnHourlyLimitPerVisitorEvenWhenSpelledDifferently() throws Exception {
        String[] spellings = {"/api/auth/password-reset/request", "/api/%61uth/password-reset/request", "/api//auth/password-reset/request"};
        int allowed = 0;
        for (int i = 0; i < 30; i++) {
            if (allowed(request(spellings[i % spellings.length], "10.0.1.1", null))) allowed++;
        }
        assertEquals(RateLimitInterceptor.PASSWORD_RESET_REQUESTS_PER_HOUR, allowed);
        // Otro visitante conserva su cupo.
        assertTrue(allowed(request("/api/auth/password-reset/request", "10.0.1.2", null)));
    }

    @Test
    void passwordResetConfirmHasItsOwnHourlyLimit() throws Exception {
        int allowed = 0;
        for (int i = 0; i < 40; i++) {
            if (allowed(request("/api/auth/password-reset/confirm", "10.0.1.3", null))) allowed++;
        }
        assertEquals(RateLimitInterceptor.PASSWORD_RESET_CONFIRMS_PER_HOUR, allowed);
        // Pedir el correo no gasta el cupo de confirmar.
        assertTrue(allowed(request("/api/auth/password-reset/request", "10.0.1.3", null)));
    }

    @Test
    void otherAuthRoutesKeepOnlyTheMinuteLimit() throws Exception {
        int allowed = 0;
        for (int i = 0; i < 50; i++) {
            if (allowed(request("/api/auth/login", "10.0.1.4", null))) allowed++;
        }
        assertEquals(50, allowed);
    }
}
