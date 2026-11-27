package com.loopdeck.controller;

import com.loopdeck.security.RefreshCookies;
import com.loopdeck.service.PasskeyService;
import com.loopdeck.service.PasskeyService.Ceremony;
import com.loopdeck.service.PasskeyService.PasskeyView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;

/**
 * Llaves de acceso ({@link PasskeyService}). Entrar con una llave es público y devuelve lo mismo que
 * el login con contraseña; añadirlas, verlas y borrarlas requiere la sesión de su cuenta.
 */
@RestController
@RequiredArgsConstructor
public class PasskeyController {

    private final PasskeyService passkeyService;

    @PostMapping(value = "/api/auth/passkeys/login/options", produces = MediaType.APPLICATION_JSON_VALUE)
    public String loginOptions() {
        return ceremonyJson(passkeyService.startLogin());
    }

    @PostMapping("/api/auth/passkeys/login")
    public ResponseEntity<?> login(@Valid @RequestBody PasskeyResponse body) {
        return passkeyService.finishLogin(body.requestId(), body.credential().toString())
                .<ResponseEntity<?>>map(res -> ResponseEntity.ok()
                        .header(HttpHeaders.SET_COOKIE, RefreshCookies.issue(res.refreshToken()).toString())
                        .header(HttpHeaders.SET_COOKIE, RefreshCookies.clearLegacy().toString())
                        .body(new AuthController.AuthResponseDto(res.token(), res.user())))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "No se ha podido entrar con esta llave de acceso.")));
    }

    @GetMapping("/api/users/me/passkeys")
    public List<PasskeyView> list(Authentication auth) {
        return passkeyService.list(auth.getName());
    }

    @PostMapping(value = "/api/users/me/passkeys/options", produces = MediaType.APPLICATION_JSON_VALUE)
    public String registrationOptions(Authentication auth, @Valid @RequestBody(required = false) Reauth body) {
        String password = body == null ? null : body.password();
        String googleCredential = body == null ? null : body.googleCredential();
        return ceremonyJson(passkeyService.startRegistration(auth.getName(), password, googleCredential));
    }

    @PostMapping("/api/users/me/passkeys")
    public ResponseEntity<PasskeyView> register(Authentication auth, @Valid @RequestBody NewPasskey body) {
        PasskeyView saved = passkeyService.finishRegistration(
                auth.getName(), body.requestId(), body.credential().toString(), body.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** Borra la llave y devuelve las que quedan; 404 si no es de la cuenta. */
    @DeleteMapping("/api/users/me/passkeys/{id}")
    public ResponseEntity<List<PasskeyView>> delete(Authentication auth, @PathVariable Long id) {
        return passkeyService.delete(auth.getName(), id)
                ? ResponseEntity.ok(passkeyService.list(auth.getName()))
                : ResponseEntity.notFound().build();
    }

    /** {@code {"requestId": "...", "options": {"publicKey": {...}}}}: las opciones ya vienen en JSON. */
    private static String ceremonyJson(Ceremony ceremony) {
        return "{\"requestId\":\"" + ceremony.requestId() + "\",\"options\":" + ceremony.browserOptionsJson() + "}";
    }

    /** Respuesta del navegador a un reto: la credencial en el formato JSON de WebAuthn. */
    public record PasskeyResponse(@NotBlank @Size(max = 64) String requestId, @NotNull JsonNode credential) {
    }

    /** Confirmación de identidad para añadir una llave: la contraseña, o una credencial de Google si no tiene. */
    public record Reauth(@Size(max = 100) String password, @Size(max = 8192) String googleCredential) {
    }

    public record NewPasskey(@NotBlank @Size(max = 64) String requestId, @NotNull JsonNode credential,
                             @Size(max = 200) String name) {
    }
}
