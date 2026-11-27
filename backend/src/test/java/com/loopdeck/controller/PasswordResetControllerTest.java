package com.loopdeck.controller;

import com.loopdeck.config.SecurityConfig;
import com.loopdeck.config.WebConfig;
import com.loopdeck.exception.InvalidResetTokenException;
import com.loopdeck.interceptor.RateLimitInterceptor;
import com.loopdeck.security.ClientIp;
import com.loopdeck.security.TrustedOrigins;
import com.loopdeck.service.AuthService;
import com.loopdeck.service.PasswordResetService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Contrato HTTP de recuperar contraseña, con la seguridad y el límite de peticiones reales. */
@WebMvcTest({PasswordResetController.class, AuthController.class})
@Import({SecurityConfig.class, WebConfig.class, RateLimitInterceptor.class, ClientIp.class, TrustedOrigins.class})
class PasswordResetControllerTest {

    private static final String REQUEST = "/api/auth/password-reset/request";
    private static final String CONFIRM = "/api/auth/password-reset/confirm";

    @Autowired MockMvc mvc;
    @MockitoBean PasswordResetService service;
    @MockitoBean AuthService authService;

    private org.springframework.test.web.servlet.ResultActions send(String path, String ip, String body) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).header("X-Forwarded-For", ip).content(body));
    }

    @Test
    void requestAnswersTheSameAcceptedBodyWhateverTheService() throws Exception {
        send(REQUEST, "198.51.100.1", "{\"email\":\"existe@example.com\"}")
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value("Si la cuenta existe, te hemos enviado un correo"));
        send(REQUEST, "198.51.100.1", "{\"email\":\"no-existe@example.com\"}")
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.message").value("Si la cuenta existe, te hemos enviado un correo"));
        verify(service).request("existe@example.com");
        verify(service).request("no-existe@example.com");
    }

    @Test
    void requestRejectsAMalformedEmailWithoutCallingTheService() throws Exception {
        send(REQUEST, "198.51.100.2", "{\"email\":\"esto-no-es-un-correo\"}").andExpect(status().isBadRequest());
        send(REQUEST, "198.51.100.2", "{}").andExpect(status().isBadRequest());
        verify(service, never()).request(any());
    }

    @Test
    void requestIsLimitedPerVisitorAndAnswersTooManyRequests() throws Exception {
        for (int i = 0; i < 10; i++) {
            send(REQUEST, "198.51.100.3", "{\"email\":\"a@example.com\"}").andExpect(status().isAccepted());
        }
        send(REQUEST, "198.51.100.3", "{\"email\":\"a@example.com\"}").andExpect(status().isTooManyRequests());
        // Otra IP no queda afectada.
        send(REQUEST, "198.51.100.4", "{\"email\":\"a@example.com\"}").andExpect(status().isAccepted());
    }

    @Test
    void confirmChangesThePasswordAndAnswersNoContent() throws Exception {
        send(CONFIRM, "198.51.100.5", "{\"token\":\"abc\",\"newPassword\":\"clave-nueva-1\"}").andExpect(status().isNoContent());
        verify(service).confirm(eq("abc"), eq("clave-nueva-1"));
    }

    @Test
    void confirmWithAnInvalidTokenAnswersBadRequestWithAClearMessage() throws Exception {
        doThrow(new InvalidResetTokenException()).when(service).confirm(any(), any());

        send(CONFIRM, "198.51.100.6", "{\"token\":\"abc\",\"newPassword\":\"clave-nueva-1\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("El enlace ha caducado o ya se ha usado. Pide uno nuevo"));
    }

    @Test
    void confirmAppliesTheRegistrationPasswordRules() throws Exception {
        send(CONFIRM, "198.51.100.7", "{\"token\":\"abc\",\"newPassword\":\"corta\"}").andExpect(status().isBadRequest());
        send(CONFIRM, "198.51.100.7", "{\"token\":\"\",\"newPassword\":\"clave-nueva-1\"}").andExpect(status().isBadRequest());
        send(CONFIRM, "198.51.100.7", "{\"token\":\"abc\",\"newPassword\":\"" + "x".repeat(101) + "\"}").andExpect(status().isBadRequest());
        verify(service, never()).confirm(any(), any());
    }

    @Test
    void confirmIsLimitedPerVisitor() throws Exception {
        for (int i = 0; i < 20; i++) {
            send(CONFIRM, "198.51.100.8", "{\"token\":\"abc\",\"newPassword\":\"clave-nueva-1\"}").andExpect(status().isNoContent());
        }
        send(CONFIRM, "198.51.100.8", "{\"token\":\"abc\",\"newPassword\":\"clave-nueva-1\"}").andExpect(status().isTooManyRequests());
    }
}
