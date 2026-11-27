package com.loopdeck.controller;

import com.loopdeck.service.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Recuperar la contraseña por correo. Los límites por IP están en {@code RateLimitInterceptor}. */
@RestController
@RequestMapping("/api/auth/password-reset")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    public record ResetRequestBody(@Email @NotBlank @Size(max = 255) String email) {}

    public record ResetConfirmBody(
        @NotBlank @Size(max = 200) String token,
        // Mismas reglas que el registro.
        @NotBlank @Size(min = 6, max = 100) String newPassword
    ) {}

    /** Responde siempre 202, exista o no la cuenta, para no revelar qué correos están registrados. */
    @PostMapping("/request")
    public ResponseEntity<Map<String, String>> request(@Valid @RequestBody ResetRequestBody body) {
        passwordResetService.request(body.email());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("message", "Si la cuenta existe, te hemos enviado un correo"));
    }

    @PostMapping("/confirm")
    public ResponseEntity<Void> confirm(@Valid @RequestBody ResetConfirmBody body) {
        passwordResetService.confirm(body.token(), body.newPassword());
        return ResponseEntity.noContent().build();
    }
}
