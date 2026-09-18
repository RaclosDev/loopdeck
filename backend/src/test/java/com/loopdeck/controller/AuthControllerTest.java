package com.loopdeck.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.loopdeck.service.AuthService;
import com.loopdeck.service.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.loopdeck.config.SecurityConfig;
import com.loopdeck.interceptor.RateLimitInterceptor;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // Disable security for unit testing controller
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private RefreshTokenService refreshTokenService;
    
    @MockBean
    private RateLimitInterceptor rateLimitInterceptor;

    @org.junit.jupiter.api.BeforeEach
    void setUp() throws Exception {
        when(rateLimitInterceptor.preHandle(any(), any(), any())).thenReturn(true);
    }

    @Test
    public void testGoogleLogin_acceptsCredential() throws Exception {
        AuthService.AuthResponse mockResponse = new AuthService.AuthResponse("token", "refresh", null);
        when(authService.googleLogin("my-credential")).thenReturn(mockResponse);

        AuthController.GoogleLoginBody body = new AuthController.GoogleLoginBody("my-credential", null);
        
        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    public void testGoogleLogin_acceptsToken() throws Exception {
        AuthService.AuthResponse mockResponse = new AuthService.AuthResponse("token", "refresh", null);
        when(authService.googleLogin("my-token")).thenReturn(mockResponse);

        AuthController.GoogleLoginBody body = new AuthController.GoogleLoginBody(null, "my-token");

        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }
    
    @Test
    public void testGoogleLogin_rejectsEmpty() throws Exception {
        AuthController.GoogleLoginBody body = new AuthController.GoogleLoginBody("", null);

        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testUtf8Encoding() throws Exception {
        AuthService.AuthResponse mockResponse = new AuthService.AuthResponse(
            "token", "refresh", 
            new AuthService.UserDto("1", "test@test.com", "Sesi\u00f3n", 0, 0, "default", java.util.List.of())
        );
        when(authService.login(any())).thenReturn(mockResponse);

        AuthController.LoginBody body = new AuthController.LoginBody("test@test.com", "password");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(org.hamcrest.Matchers.containsString("Sesi\u00f3n")));
    }
}
