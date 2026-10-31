package com.loopdeck.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;
import java.io.IOException;
import java.util.UUID;

@Component
public class ApiTimingFilter extends OncePerRequestFilter {
    private static final org.slf4j.Logger log = LoggerFactory.getLogger(ApiTimingFilter.class);
    private final long slowRequestMs;
    public ApiTimingFilter(@Value("${observability.slow-request-ms:1000}") long slowRequestMs) {
        this.slowRequestMs = Math.max(0, slowRequestMs);
    }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long started = System.nanoTime();
        String requestId = UUID.randomUUID().toString();
        String previous = MDC.get("requestId");
        MDC.put("requestId", requestId);
        response.setHeader("X-Request-ID", requestId);
        boolean failed = true;
        try {
            chain.doFilter(request, response);
            failed = false;
        } finally {
            long elapsed = (System.nanoTime() - started) / 1_000_000;
            int status = failed ? 500 : response.getStatus();
            if (status >= 500 || elapsed >= slowRequestMs) {
                Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
                log.warn("api_request requestId={} method={} route={} status={} durationMs={}",
                    requestId, request.getMethod(), route == null ? "unmapped" : route, status, elapsed);
            }
            if (previous == null) MDC.remove("requestId"); else MDC.put("requestId", previous);
        }
    }
}
