package com.loopdeck.security;

import com.loopdeck.interceptor.RateLimitInterceptor;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClientIpTest {

    private static MockHttpServletRequest request(String remote, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(remote);
        if (forwardedFor != null) request.addHeader("X-Forwarded-For", forwardedFor);
        return request;
    }

    @Test
    void usesTheHopAddedByTheTrustedProxyNotTheFirstValue() {
        ClientIp ip = new ClientIp(1);
        assertEquals("203.0.113.7", ip.resolve(request("10.0.0.2", "1.2.3.4, 203.0.113.7")));
    }

    @Test
    void fallsBackToTheConnectionWithoutProxyOrWithMalformedValues() {
        ClientIp ip = new ClientIp(1);
        assertEquals("10.0.0.2", ip.resolve(request("10.0.0.2", null)));
        assertEquals("10.0.0.2", ip.resolve(request("10.0.0.2", "<script>")));
        assertEquals("10.0.0.2", new ClientIp(0).resolve(request("10.0.0.2", "203.0.113.7")));
    }

    @Test
    void visitorsBehindTheSameEdgeGetSeparateBuckets() throws Exception {
        RateLimitInterceptor limiter = new RateLimitInterceptor(new ClientIp(1));
        for (int i = 0; i < 60; i++) {
            assertTrue(limiter.preHandle(request("10.0.0.2", "198.51.100.1"), new MockHttpServletResponse(), null));
        }
        assertFalse(limiter.preHandle(request("10.0.0.2", "198.51.100.1"), new MockHttpServletResponse(), null));
        assertTrue(limiter.preHandle(request("10.0.0.2", "198.51.100.2"), new MockHttpServletResponse(), null));
    }

    @Test
    void spoofedAddressesStillHitTheConnectionCap() throws Exception {
        RateLimitInterceptor limiter = new RateLimitInterceptor(new ClientIp(1));
        int allowed = 0;
        for (int i = 0; i < 1300; i++) {
            String spoofed = "198.51." + (i / 250) + "." + (i % 250);
            if (limiter.preHandle(request("192.0.2.9", spoofed), new MockHttpServletResponse(), null)) allowed++;
        }
        assertEquals(1200, allowed);
    }
}
