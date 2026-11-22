package com.loopdeck.controller;

import com.loopdeck.interceptor.RateLimitInterceptor;
import com.loopdeck.service.AuthService;
import com.loopdeck.service.PasskeyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PasskeyController.class)
@AutoConfigureMockMvc(addFilters = false)
class PasskeyControllerTest {

    private static final String RESPONSE = "{\"requestId\":\"abc\",\"credential\":{\"id\":\"x\"}}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PasskeyService passkeyService;

    @MockitoBean
    private RateLimitInterceptor rateLimitInterceptor;

    @BeforeEach
    void setUp() throws Exception {
        when(rateLimitInterceptor.preHandle(any(), any(), any())).thenReturn(true);
    }

    @Test
    void loginOptionsWrapsTheBrowserOptions() throws Exception {
        when(passkeyService.startLogin()).thenReturn(
                new PasskeyService.Ceremony("abc", "{\"publicKey\":{\"challenge\":\"c\"}}"));

        mockMvc.perform(post("/api/auth/passkeys/login/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestId").value("abc"))
                .andExpect(jsonPath("$.options.publicKey.challenge").value("c"));
    }

    @Test
    void validPasskeyOpensASession() throws Exception {
        when(passkeyService.finishLogin(anyString(), anyString())).thenReturn(Optional.of(
                new AuthService.AuthResponse("jwt", "refresh", new AuthService.UserDto("1", "a@b.es", "Ana"))));

        mockMvc.perform(post("/api/auth/passkeys/login").contentType(MediaType.APPLICATION_JSON).content(RESPONSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt"))
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    void rejectedPasskeyIsUnauthorized() throws Exception {
        when(passkeyService.finishLogin(anyString(), anyString())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/passkeys/login").contentType(MediaType.APPLICATION_JSON).content(RESPONSE))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingCredentialIsABadRequest() throws Exception {
        mockMvc.perform(post("/api/auth/passkeys/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requestId\":\"abc\"}"))
                .andExpect(status().isBadRequest());
    }
}
