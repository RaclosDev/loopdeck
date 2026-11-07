package com.loopdeck.security;

import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletRequestWrapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.regex.Pattern;

/**
 * IP del cliente para limitar peticiones. El primer valor de X-Forwarded-For lo elige el cliente,
 * así que solo cuenta el salto que añadió el último proxy de confianza (Railway añade uno).
 */
@Component
public class ClientIp {

    private static final Pattern IP_LIKE = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    private final int trustedProxyHops;

    public ClientIp(@Value("${rate-limit.trusted-proxy-hops:1}") int trustedProxyHops) {
        this.trustedProxyHops = Math.max(0, trustedProxyHops);
    }

    public String resolve(HttpServletRequest request) {
        HttpServletRequest raw = unwrap(request);
        if (trustedProxyHops > 0) {
            List<String> hops = new ArrayList<>();
            Enumeration<String> headers = raw.getHeaders("X-Forwarded-For");
            while (headers != null && headers.hasMoreElements()) {
                for (String hop : headers.nextElement().split(",")) {
                    if (!hop.isBlank()) hops.add(hop.trim());
                }
            }
            if (!hops.isEmpty()) {
                String candidate = hops.get(Math.max(0, hops.size() - trustedProxyHops));
                if (IP_LIKE.matcher(candidate).matches()) {
                    return candidate;
                }
            }
        }
        String remote = raw.getRemoteAddr();
        return remote == null || remote.isBlank() ? "unknown" : remote.trim();
    }

    private static HttpServletRequest unwrap(HttpServletRequest request) {
        ServletRequest current = request;
        while (current instanceof ServletRequestWrapper wrapper) {
            current = wrapper.getRequest();
        }
        return current instanceof HttpServletRequest http ? http : request;
    }
}
