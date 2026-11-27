package com.loopdeck.controller;

import com.loopdeck.security.RefreshCookies;
import com.loopdeck.service.AccountService;
import com.loopdeck.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;
    private final AccountService accountService;

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserDto> getMe(Authentication auth) {
        return ResponseEntity.ok(authService.me(auth.getName()));
    }

    /** Todos los datos del usuario en un JSON descargable. */
    @GetMapping("/me/export")
    public ResponseEntity<AccountService.AccountExport> export(Authentication auth) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"loopdeck-datos.json\"")
                .body(accountService.export(auth.getName()));
    }

    public record ChangePasswordBody(
            @NotBlank @Size(max = 100) String currentPassword,
            @NotBlank @Size(min = 6, max = 100) String newPassword) {
    }

    /**
     * Cambia la contraseña. Cierra las sesiones de todos los dispositivos y abre una nueva en este, con su
     * cookie y su JWT.
     */
    @PutMapping("/me/password")
    public ResponseEntity<AuthController.AuthResponseDto> changePassword(
            Authentication auth, @Valid @RequestBody ChangePasswordBody body) {
        AuthService.AuthResponse res = authService.changePassword(auth.getName(), body.currentPassword(), body.newPassword());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.issue(res.refreshToken()).toString())
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.clearLegacy().toString())
                .body(new AuthController.AuthResponseDto(res.token(), res.user()));
    }

    /**
     * Cierra todas las sesiones de la cuenta, también este dispositivo. Los JWT ya emitidos caducan solos en
     * 15 minutos como máximo; después ninguna cookie de refresco sirve.
     */
    @DeleteMapping("/me/sessions")
    public ResponseEntity<Void> logoutEverywhere(Authentication auth) {
        authService.logoutAll(auth.getName());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.clear().toString())
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.clearLegacy().toString())
                .build();
    }

    /** Borra la cuenta y todos sus datos, y cierra la sesión en este dispositivo. */
    @DeleteMapping("/me")
    public ResponseEntity<Void> delete(Authentication auth) {
        accountService.delete(auth.getName());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.clear().toString())
                .header(HttpHeaders.SET_COOKIE, RefreshCookies.clearLegacy().toString())
                .build();
    }
}
