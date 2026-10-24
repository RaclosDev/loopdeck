package com.loopdeck.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final Map<String, Deque<Long>> requestCounts = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 60;
    private static final long TIME_WINDOW_MS = 60000;
    private static final int MAX_TRACKED_ENTRIES = 2000;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();

        // Limitar endpoints sensibles
        if (path.startsWith("/api/auth") || path.startsWith("/api/ai")) {
            String clientIp = request.getHeader("X-Forwarded-For");
            if (clientIp != null && !clientIp.isBlank()) {
                clientIp = clientIp.split(",")[0].trim();
            } else {
                clientIp = request.getRemoteAddr();
            }

            String key = clientIp + ":" + path;
            long currentTime = System.currentTimeMillis();

            // Evitar crecimiento ilimitado de memoria podando entradas inactivas
            if (requestCounts.size() > MAX_TRACKED_ENTRIES) {
                requestCounts.entrySet().removeIf(entry -> {
                    Deque<Long> d = entry.getValue();
                    return d.isEmpty() || (currentTime - d.peekLast() > TIME_WINDOW_MS);
                });
            }

            requestCounts.putIfAbsent(key, new ConcurrentLinkedDeque<>());
            Deque<Long> timestamps = requestCounts.get(key);

            // Limpiar timestamps viejos
            while (!timestamps.isEmpty() && currentTime - timestamps.peekFirst() > TIME_WINDOW_MS) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Too many requests. Please try again later.");
                return false;
            }

            timestamps.addLast(currentTime);
        }

        return true;
    }
}
