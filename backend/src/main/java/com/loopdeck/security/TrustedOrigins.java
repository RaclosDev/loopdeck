package com.loopdeck.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Las rutas que usan la cookie de sesión (refresh y logout) solo aceptan peticiones de los
 * orígenes de CORS o del mismo host. Sin cabeceras Origin ni Referer (clientes que no son
 * navegador) se permiten: la cookie SameSite=Lax ya no viaja en POST entre sitios.
 */
@Component
public class TrustedOrigins {

    private final Set<String> allowed;

    public TrustedOrigins(@Value("${cors.allowed-origins}") String[] allowedOrigins) {
        this.allowed = Arrays.stream(allowedOrigins)
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .map(TrustedOrigins::originOf)
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean isTrusted(HttpServletRequest request) {
        String source = request.getHeader("Origin");
        if (source == null || source.isBlank() || "null".equals(source)) {
            source = request.getHeader("Referer");
        }
        if (source == null || source.isBlank()) {
            return true;
        }
        String origin = originOf(source);
        if (origin == null) {
            return false;
        }
        return allowed.contains(origin) || origin.equals(sameHostOrigin(request));
    }

    private static String sameHostOrigin(HttpServletRequest request) {
        String host = request.getHeader("Host");
        if (host == null || host.isBlank()) return null;
        String proto = request.getHeader("X-Forwarded-Proto");
        String scheme = proto != null && !proto.isBlank() ? proto.split(",")[0].trim() : request.getScheme();
        return originOf(scheme + "://" + host);
    }

    static String originOf(String value) {
        try {
            URI uri = URI.create(value.trim());
            if (uri.getScheme() == null || uri.getHost() == null) return null;
            String scheme = uri.getScheme().toLowerCase(java.util.Locale.ROOT);
            int port = uri.getPort();
            boolean defaultPort = port == -1 || ("https".equals(scheme) && port == 443) || ("http".equals(scheme) && port == 80);
            return scheme + "://" + uri.getHost().toLowerCase(java.util.Locale.ROOT) + (defaultPort ? "" : ":" + port);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
