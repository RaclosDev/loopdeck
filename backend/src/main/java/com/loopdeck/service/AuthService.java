package com.loopdeck.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.loopdeck.model.Deck;
import com.loopdeck.model.Note;
import com.loopdeck.model.User;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import com.loopdeck.repository.UserRepository;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import com.loopdeck.model.RefreshToken;
import com.loopdeck.exception.TokenRefreshException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final DeckRepository deckRepository;
    private final NoteRepository noteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final RefreshTokenService refreshTokenService;
    private final com.loopdeck.mapper.UserMapper userMapper;

    @Value("${google.client-id:CHANGE_ME}")
    private String googleClientId;

    public String getGoogleClientId() {
        return googleClientId;
    }

    private String generateToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("loopdeck-backend")
                .issuedAt(now)
                .expiresAt(now.plus(15, ChronoUnit.MINUTES))
                .subject(user.getId())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .build();
        org.springframework.security.oauth2.jose.jws.MacAlgorithm alg = org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256;
        org.springframework.security.oauth2.jwt.JwsHeader jwsHeader = org.springframework.security.oauth2.jwt.JwsHeader.with(alg).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, claims)).getTokenValue();
    }

    public record RegisterRequest(String email, String name, String password) {}
    public record LoginRequest(String email, String password) {}
    public record AuthResponse(String token, String refreshToken, UserDto user) {}
    public record UserDto(String id, String email, String name) {}

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already in use");
        }
        User user = userMapper.toEntity(req);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        userRepository.save(user);

        String token = this.generateToken(user);
        return new AuthResponse(token, refreshTokenService.createRefreshToken(user.getId()).getPlainToken(), userMapper.toDto(user));
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = this.generateToken(user);
        return new AuthResponse(token, refreshTokenService.createRefreshToken(user.getId()).getPlainToken(), userMapper.toDto(user));
    }

    @Transactional
    public AuthResponse googleLogin(String credential) {
        try {
            // Intentamos validar como ID Token primero
            try {
                GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                        new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(Collections.singletonList(googleClientId))
                        .build();

                GoogleIdToken idToken = verifier.verify(credential);
                if (idToken != null) {
                    GoogleIdToken.Payload payload = idToken.getPayload();
                    return processGoogleUser(payload.getSubject(), payload.getEmail(), (String) payload.get("name"));
                }
            } catch (Exception e) {
                // Si falla, ignoramos y probamos como Access Token
            }

                        // Validamos como Access Token ante el endpoint tokeninfo de Google
            java.net.URL tokenInfoUrl = new java.net.URL("https://oauth2.googleapis.com/tokeninfo?access_token=" + java.net.URLEncoder.encode(credential, java.nio.charset.StandardCharsets.UTF_8));
            java.net.HttpURLConnection tokenInfoConn = (java.net.HttpURLConnection) tokenInfoUrl.openConnection();
            tokenInfoConn.setRequestMethod("GET");
            if (tokenInfoConn.getResponseCode() == 200) {
                java.io.InputStream tis = tokenInfoConn.getInputStream();
                String tokenInfoResponse = new String(tis.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                com.fasterxml.jackson.databind.JsonNode tokenInfoJson = new com.fasterxml.jackson.databind.ObjectMapper().readTree(tokenInfoResponse);

                // Validar audiencia
                if (googleClientId != null && !googleClientId.isBlank()) {
                    String aud = tokenInfoJson.has("aud") ? tokenInfoJson.get("aud").asText() : "";
                    String azp = tokenInfoJson.has("azp") ? tokenInfoJson.get("azp").asText() : "";
                    String issuedTo = tokenInfoJson.has("issued_to") ? tokenInfoJson.get("issued_to").asText() : "";
                    if (!googleClientId.equals(aud) && !googleClientId.equals(azp) && !googleClientId.equals(issuedTo)) {
                        throw new IllegalArgumentException("Token de Google no emitido para esta aplicación");
                    }
                }

                // Validar email verificado
                if (tokenInfoJson.has("email_verified") && !tokenInfoJson.get("email_verified").asBoolean()) {
                    throw new IllegalArgumentException("El email de Google no está verificado");
                }

                String googleId = tokenInfoJson.get("sub").asText();
                String email = tokenInfoJson.get("email").asText();

                // Obtener nombre desde userinfo si está disponible
                String name = null;
                try {
                    java.net.URL userinfoUrl = new java.net.URL("https://www.googleapis.com/oauth2/v3/userinfo");
                    java.net.HttpURLConnection userinfoConn = (java.net.HttpURLConnection) userinfoUrl.openConnection();
                    userinfoConn.setRequestProperty("Authorization", "Bearer " + credential);
                    userinfoConn.setRequestMethod("GET");
                    if (userinfoConn.getResponseCode() == 200) {
                        String uiResp = new String(userinfoConn.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                        com.fasterxml.jackson.databind.JsonNode uiJson = new com.fasterxml.jackson.databind.ObjectMapper().readTree(uiResp);
                        if (uiJson.has("name")) {
                            name = uiJson.get("name").asText();
                        }
                    }
                } catch (Exception e) {
                    log.debug("No se pudo obtener el nombre desde Google userinfo", e);
                }

                return processGoogleUser(googleId, email, name);
            }
            throw new IllegalArgumentException("Token de Google inválido o expirado");

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error al verificar con Google", e);
            throw new IllegalArgumentException("Error al verificar credenciales de Google");
        }
    }

    private AuthResponse processGoogleUser(String googleId, String email, String name) {
        User user = userRepository.findByGoogleId(googleId)
                .orElseGet(() -> userRepository.findByEmail(email.toLowerCase().trim())
                        .orElse(null));

        if (user == null) {
            user = User.builder()
                    .id(java.util.UUID.randomUUID().toString())
                    .email(email.toLowerCase().trim())
                    .name(name != null ? name : email.split("@")[0])
                    .googleId(googleId)
                    .build();
            userRepository.save(user);

        } else if (user.getGoogleId() == null) {
            user.setGoogleId(googleId);
            userRepository.save(user);
        }

        String token = this.generateToken(user);
        return new AuthResponse(token, refreshTokenService.createRefreshToken(user.getId()).getPlainToken(), userMapper.toDto(user));
    }

    @Transactional
    public AuthResponse refreshToken(String requestRefreshToken) {
        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUserId)
                .map(userId -> {
                    User user = userRepository.findById(userId).orElseThrow(() -> new TokenRefreshException("User not found"));
                    
                    // Do not rotate refresh token to prevent PWA race conditions on poor networks
                    String token = generateToken(user);
                    return new AuthResponse(token, requestRefreshToken, userMapper.toDto(user));
                })
                .orElseThrow(() -> new TokenRefreshException("Refresh token is not in database!"));
    }

    public void logout(String requestRefreshToken) {
        refreshTokenService.deleteByToken(requestRefreshToken);
    }

    @Transactional(readOnly = true)
    public UserDto me(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return userMapper.toDto(user);
    }
}
