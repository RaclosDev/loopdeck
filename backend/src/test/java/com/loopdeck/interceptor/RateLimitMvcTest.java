package com.loopdeck.interceptor;

import com.loopdeck.config.SecurityConfig;
import com.loopdeck.config.WebConfig;
import com.loopdeck.controller.AiController;
import com.loopdeck.controller.AuthController;
import com.loopdeck.security.ClientIp;
import com.loopdeck.security.TrustedOrigins;
import com.loopdeck.service.AiService;
import com.loopdeck.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** El límite de peticiones se aplica por la ruta real, no por cómo la escriba quien llama. */
@WebMvcTest({AuthController.class, AiController.class})
@Import({SecurityConfig.class, WebConfig.class, RateLimitInterceptor.class, ClientIp.class, TrustedOrigins.class})
class RateLimitMvcTest {
    private static final String LOGIN_BODY = "{\"email\":\"a@b.co\",\"password\":\"x\"}";

    @Autowired MockMvc mvc;
    @MockitoBean AuthService authService;
    @MockitoBean AiService aiService;

    /** Cada prueba usa su propia IP de cliente: el límite vive en memoria y se comparte entre pruebas. */
    private int send(String path, String clientIp) throws Exception {
        return mvc.perform(post(URI.create(path)).contentType(MediaType.APPLICATION_JSON)
            .header("X-Forwarded-For", clientIp).content(LOGIN_BODY)).andReturn().getResponse().getStatus();
    }

    @Test
    void anEncodedPathDoesNotEscapeTheLimit() throws Exception {
        when(authService.login(any())).thenReturn(new AuthService.AuthResponse("t", "r", null));
        // 60 por minuto y ruta: la 61 debe dar 429 aunque se alterne la grafía de la ruta.
        for (int i = 0; i < 60; i++) {
            String path = i % 2 == 0 ? "/api/auth/login" : "/api/%61uth/login";
            assertEquals(200, send(path, "203.0.113.1"), "petición " + (i + 1));
        }
        assertEquals(429, send("/api/auth/login", "203.0.113.1"));
        assertEquals(429, send("/api/%61uth/login", "203.0.113.1"));
    }

    @Test
    void onlyEncodedRequestsAreLimitedToo() throws Exception {
        when(authService.login(any())).thenReturn(new AuthService.AuthResponse("t", "r", null));
        int limited = 0;
        for (int i = 0; i < 70; i++) {
            if (send("/api/%61uth/login", "203.0.113.2") == 429) limited++;
        }
        assertEquals(10, limited);
    }
}
