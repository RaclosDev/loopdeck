package com.loopdeck.controller;

import com.loopdeck.service.AuthService;
import com.loopdeck.service.RefreshTokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    public AuthController(AuthService authService, RefreshTokenService refreshTokenService) {
        this.authService = authService;
        this.refreshTokenService = refreshTokenService;
    }

    public record RegisterBody(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 2, max = 80) String name,
        @NotBlank @Size(min = 6, max = 100) String password
    ) {}

    public record LoginBody(
        @Email @NotBlank String email,
        @NotBlank String password
    ) {}

    public record GoogleLoginBody(
        String credential,
        String token
    ) {}
    
    public record RefreshTokenRequest(
        @NotBlank String refreshToken
    ) {}

    public record AuthResponseDto(String token, AuthService.UserDto user) {}
    
    private ResponseEntity<AuthResponseDto> buildAuthCookieResponse(AuthService.AuthResponse res) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", res.refreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(7 * 24 * 60 * 60) // 7 days
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new AuthResponseDto(res.token(), res.user()));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@RequestBody AuthService.RegisterRequest req) {
        return buildAuthCookieResponse(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody LoginBody body) {
        AuthService.AuthResponse res = authService.login(
                new AuthService.LoginRequest(body.email(), body.password()));
        return buildAuthCookieResponse(res);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponseDto> googleLogin(@RequestBody GoogleLoginBody body) {
        String idToken = body.credential() != null && !body.credential().isBlank() 
            ? body.credential() 
            : body.token();
            
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        
        AuthService.AuthResponse res = authService.googleLogin(idToken);
        return buildAuthCookieResponse(res);
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponseDto> refreshToken(@CookieValue(name = "refreshToken", required = false) String refreshTokenCookie) {
        if (refreshTokenCookie == null || refreshTokenCookie.isBlank()) {
            return ResponseEntity.status(401).build();
        }
        return buildAuthCookieResponse(authService.refreshToken(refreshTokenCookie));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = "refreshToken", required = false) String refreshTokenCookie) {
        if (refreshTokenCookie != null && !refreshTokenCookie.isBlank()) {
            authService.logout(refreshTokenCookie);
        }
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(0) 
                .build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).build();
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        return ResponseEntity.ok(Map.of("googleClientId", authService.getGoogleClientId()));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserDto> me(Authentication auth) {
        return ResponseEntity.ok(authService.me(auth.getName()));
    }
}
