package com.loopdeck.controller;

import com.loopdeck.security.RefreshCookies;
import com.loopdeck.service.AccountService;
import com.loopdeck.service.AuthService;
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
