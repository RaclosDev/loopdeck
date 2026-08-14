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

    @PostMapping("/register")
    public ResponseEntity<AuthService.AuthResponse> register(@Valid @RequestBody RegisterBody body) {
        AuthService.AuthResponse res = authService.register(
                new AuthService.RegisterRequest(body.email(), body.name(), body.password()));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.AuthResponse> login(@Valid @RequestBody LoginBody body) {
        AuthService.AuthResponse res = authService.login(
                new AuthService.LoginRequest(body.email(), body.password()));
        return ResponseEntity.ok(res);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserDto> me(Authentication auth) {
        return ResponseEntity.ok(authService.me(auth.getName()));
    }
}
