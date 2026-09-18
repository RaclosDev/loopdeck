package com.loopdeck.controller;

import com.loopdeck.service.AuthService;
import com.loopdeck.service.RefreshTokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
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

    @PostMapping("/register")
    public ResponseEntity<AuthService.AuthResponse> register(@RequestBody AuthService.RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.AuthResponse> login(@Valid @RequestBody LoginBody body) {
        AuthService.AuthResponse res = authService.login(
                new AuthService.LoginRequest(body.email(), body.password()));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthService.AuthResponse> googleLogin(@RequestBody GoogleLoginBody body) {
        String idToken = body.credential() != null && !body.credential().isBlank() 
            ? body.credential() 
            : body.token();
            
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        
        AuthService.AuthResponse res = authService.googleLogin(idToken);
        return ResponseEntity.ok(res);
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<AuthService.AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.ok().build();
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
