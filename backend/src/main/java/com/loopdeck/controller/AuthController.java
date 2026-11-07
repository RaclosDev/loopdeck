package com.loopdeck.controller;

import com.loopdeck.security.RefreshCookies;
import com.loopdeck.security.TrustedOrigins;
import com.loopdeck.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final TrustedOrigins trustedOrigins;

    public AuthController(AuthService authService, TrustedOrigins trustedOrigins) {
        this.authService = authService;
        this.trustedOrigins = trustedOrigins;
    }

    public record RegisterBody(
        @Email @NotBlank @Size(max = 255) String email,
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

    public record AuthConfigDto(String googleClientId) {}

    private ResponseEntity<AuthResponseDto> buildAuthCookieResponse(AuthService.AuthResponse res) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.issue(res.refreshToken()).toString())
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.clearLegacy().toString())
                .body(new AuthResponseDto(res.token(), res.user()));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody RegisterBody req) {
        return buildAuthCookieResponse(authService.register(new AuthService.RegisterRequest(req.email(), req.name(), req.password())));
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
    public ResponseEntity<AuthResponseDto> refreshToken(
            @CookieValue(name = RefreshCookies.NAME, required = false) String refreshTokenCookie,
            HttpServletRequest request) {
        if (!trustedOrigins.isTrusted(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (refreshTokenCookie == null || refreshTokenCookie.isBlank()) {
            return ResponseEntity.status(401).build();
        }
        return buildAuthCookieResponse(authService.refreshToken(refreshTokenCookie));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = RefreshCookies.NAME, required = false) String refreshTokenCookie,
            HttpServletRequest request) {
        if (!trustedOrigins.isTrusted(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (refreshTokenCookie != null && !refreshTokenCookie.isBlank()) {
            authService.logout(refreshTokenCookie);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.clear().toString())
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.clearLegacy().toString())
                .build();
    }

    @GetMapping("/config")
    public ResponseEntity<AuthConfigDto> getConfig() {
        return ResponseEntity.ok(new AuthConfigDto(authService.getGoogleClientId()));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserDto> me(Authentication auth) {
        return ResponseEntity.ok(authService.me(auth.getName()));
    }
}
