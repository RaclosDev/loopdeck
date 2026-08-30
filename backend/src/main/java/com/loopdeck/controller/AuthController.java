package com.loopdeck.controller;

import com.loopdeck.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

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
        @NotBlank String credential
    ) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthService.RegisterRequest req) {
        try {
            return ResponseEntity.ok(authService.register(req));
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(java.util.Map.of(
                "error", e.getMessage() == null ? "null" : e.getMessage(),
                "stack", sw.toString()
            ));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.AuthResponse> login(@Valid @RequestBody LoginBody body) {
        AuthService.AuthResponse res = authService.login(
                new AuthService.LoginRequest(body.email(), body.password()));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthService.AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginBody body) {
        AuthService.AuthResponse res = authService.googleLogin(body.credential());
        return ResponseEntity.ok(res);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserDto> me(Authentication auth) {
        return ResponseEntity.ok(authService.me(auth.getName()));
    }
}
