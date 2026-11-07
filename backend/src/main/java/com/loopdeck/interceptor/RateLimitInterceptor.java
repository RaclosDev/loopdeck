package com.loopdeck.interceptor;

import com.loopdeck.security.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Ventana deslizante de un minuto por IP y ruta en autenticación e IA. La IP del visitante sale
 * del proxy de confianza; como quien llama sin proxy puede inventarse esa cabecera, la dirección
 * real de la conexión tiene además su propio cubo, mayor, que pone tope a las falsificaciones.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    static final int MAX_REQUESTS_PER_MINUTE = 60;
    static final int PROXY_HOP_MULTIPLIER = 20;
    private static final long TIME_WINDOW_MS = 60000;
    private static final int MAX_TRACKED_ENTRIES = 2000;

    private final Map<String, Deque<Long>> requestCounts = new ConcurrentHashMap<>();
    private final ClientIp clientIp;

    public RateLimitInterceptor(ClientIp clientIp) {
        this.clientIp = clientIp;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/auth") && !path.startsWith("/api/ai")) {
            return true;
        }

        long now = System.currentTimeMillis();
        pruneIfLarge(now);

        String visitor = clientIp.resolve(request);
        String connection = request.getRemoteAddr();
        boolean allowed = tryAcquire(visitor + ":" + path, MAX_REQUESTS_PER_MINUTE, now);
        if (allowed && connection != null && !connection.equals(visitor)) {
            allowed = tryAcquire("hop:" + connection + ":" + path, MAX_REQUESTS_PER_MINUTE * PROXY_HOP_MULTIPLIER, now);
        }
        if (!allowed) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\": \"Demasiadas peticiones. Inténtalo de nuevo en un minuto\"}");
        }
        return allowed;
    }

    private boolean tryAcquire(String key, int limit, long now) {
        Deque<Long> timestamps = requestCounts.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() > TIME_WINDOW_MS) {
            timestamps.pollFirst();
        }
        if (timestamps.size() >= limit) {
            return false;
        }
        timestamps.addLast(now);
        return true;
    }

    // Evita que el mapa crezca sin límite podando entradas inactivas.
    private void pruneIfLarge(long now) {
        if (requestCounts.size() > MAX_TRACKED_ENTRIES) {
            requestCounts.entrySet().removeIf(entry -> {
                Long last = entry.getValue().peekLast();
                return last == null || now - last > TIME_WINDOW_MS;
            });
        }
    }
}
