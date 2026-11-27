package com.loopdeck.interceptor;

import com.loopdeck.security.ClientIp;
import com.loopdeck.security.SlidingWindowLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.UrlPathHelper;

import java.security.Principal;

/**
 * Ventana deslizante de un minuto por IP y ruta en autenticación e IA. La IP del visitante sale
 * del proxy de confianza; como quien llama sin proxy puede inventarse esa cabecera, la dirección
 * real de la conexión tiene además su propio cubo, mayor, que pone tope a las falsificaciones.
 * La ruta se normaliza (decodificada, sin parámetros de ruta ni barras repetidas) para que escribirla
 * de otra forma, como {@code /api/%61uth/login}, no esquive el límite. En IA hay además un tope por
 * usuario y otro diario, porque cada llamada cuesta dinero y la IP es fácil de rotar.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    static final int MAX_REQUESTS_PER_MINUTE = 60;
    static final int PROXY_HOP_MULTIPLIER = 20;
    static final int AI_REQUESTS_PER_USER_PER_MINUTE = 30;
    static final int AI_REQUESTS_PER_USER_PER_DAY = 500;
    private static final long MINUTE_MS = 60_000;
    private static final long DAY_MS = 24 * 60 * 60_000L;

    private final SlidingWindowLimiter perMinute = new SlidingWindowLimiter(MINUTE_MS);
    private final SlidingWindowLimiter perDay = new SlidingWindowLimiter(DAY_MS);
    private final ClientIp clientIp;

    public RateLimitInterceptor(ClientIp clientIp) {
        this.clientIp = clientIp;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = normalizedPath(request);
        boolean auth = isUnder(path, "/api/auth");
        boolean ai = isUnder(path, "/api/ai");
        if (!auth && !ai) {
            return true;
        }

        long now = System.currentTimeMillis();
        String visitor = clientIp.resolve(request);
        String connection = request.getRemoteAddr();
        boolean allowed = perMinute.tryAcquire(visitor + ":" + path, MAX_REQUESTS_PER_MINUTE, now);
        if (allowed && connection != null && !connection.equals(visitor)) {
            allowed = perMinute.tryAcquire("hop:" + connection + ":" + path, MAX_REQUESTS_PER_MINUTE * PROXY_HOP_MULTIPLIER, now);
        }
        if (allowed && ai) {
            Principal user = request.getUserPrincipal();
            if (user != null && user.getName() != null) {
                allowed = perMinute.tryAcquire("ai-user:" + user.getName(), AI_REQUESTS_PER_USER_PER_MINUTE, now)
                    && perDay.tryAcquire("ai-user:" + user.getName(), AI_REQUESTS_PER_USER_PER_DAY, now);
            }
        }
        if (!allowed) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\": \"Demasiadas peticiones. Inténtalo de nuevo en un minuto\"}");
        }
        return allowed;
    }

    /** Ruta tal como la enruta Spring: decodificada, sin ;parámetros y con las barras repetidas colapsadas. */
    static String normalizedPath(HttpServletRequest request) {
        String path = UrlPathHelper.defaultInstance.getLookupPathForRequest(request);
        return path.replaceAll("/{2,}", "/");
    }

    private static boolean isUnder(String path, String prefix) {
        return path.equals(prefix) || path.startsWith(prefix + "/");
    }
}
