package com.loopdeck.controller;

import com.loopdeck.exception.ReauthenticationException;
import com.loopdeck.interceptor.RateLimitInterceptor;
import com.loopdeck.service.AccountService;
import com.loopdeck.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private AccountService accountService;

    @MockitoBean
    private RateLimitInterceptor rateLimitInterceptor;

    @BeforeEach
    void setUp() throws Exception {
        when(rateLimitInterceptor.preHandle(any(), any(), any())).thenReturn(true);
    }

    private static UsernamePasswordAuthenticationToken user() {
        return new UsernamePasswordAuthenticationToken("u1", null);
    }

    @Test
    void logoutEverywhereRevokesEveryTokenAndClearsTheCookie() throws Exception {
        mockMvc.perform(delete("/api/users/me/sessions").principal(user()))
                .andExpect(status().isNoContent())
                .andExpect(header().exists("Set-Cookie"));

        verify(authService).logoutAll("u1");
    }

    @Test
    void changingThePasswordReturnsAFreshSession() throws Exception {
        when(authService.changePassword("u1", "vieja-clave", "nueva-clave")).thenReturn(
                new AuthService.AuthResponse("jwt", "refresh", new AuthService.UserDto("u1", "a@b.es", "Ana")));

        mockMvc.perform(put("/api/users/me/password").principal(user()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"vieja-clave\",\"newPassword\":\"nueva-clave\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt"))
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    void aWrongCurrentPasswordIsForbidden() throws Exception {
        when(authService.changePassword("u1", "mala-clave", "nueva-clave"))
                .thenThrow(new ReauthenticationException("La contraseña actual no es correcta"));

        mockMvc.perform(put("/api/users/me/password").principal(user()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"mala-clave\",\"newPassword\":\"nueva-clave\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("La contraseña actual no es correcta"));
    }

    @Test
    void aTooShortNewPasswordIsRejectedBeforeTouchingTheAccount() throws Exception {
        mockMvc.perform(put("/api/users/me/password").principal(user()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"vieja-clave\",\"newPassword\":\"abc\"}"))
                .andExpect(status().isBadRequest());

        verify(authService, never()).changePassword(any(), any(), any());
    }

    @Test
    void theExportIsStreamedAsADownloadableJsonFile() throws Exception {
        doAnswer(call -> {
            call.<java.io.OutputStream>getArgument(1).write("{\"decks\":[]}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return null;
        }).when(accountService).exportTo(eq("u1"), any());

        mockMvc.perform(get("/api/users/me/export").principal(user()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"loopdeck-datos.json\""))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{\"decks\":[]}"));
    }

    @Test
    void anUnknownAccountFailsBeforeAnythingIsWritten() throws Exception {
        doThrow(new IllegalArgumentException("User not found")).when(accountService).requireAccount("u1");

        mockMvc.perform(get("/api/users/me/export").principal(user()))
                .andExpect(status().is4xxClientError());

        verify(accountService, never()).exportTo(any(), any());
    }
}
