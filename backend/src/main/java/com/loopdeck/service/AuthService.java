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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.loopdeck.util.Emails;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Collections;

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
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int GOOGLE_TIMEOUT_MS = 5000;

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
        String email = Emails.normalize(req.email());
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already in use");
        }
        User user = userMapper.toEntity(new RegisterRequest(email, req.name(), req.password()));
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        userRepository.save(user);

        String token = this.generateToken(user);
        return new AuthResponse(token, refreshTokenService.createRefreshToken(user.getId()).getPlainToken(), userMapper.toDto(user));
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(Emails.normalize(req.email()))
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
            // Primero como ID token (botón de Google); si no lo es, como access token.
            GoogleIdToken.Payload payload = verifyIdToken(credential);
            if (payload != null) {
                return processGoogleUser(payload.getSubject(), payload.getEmail(), (String) payload.get("name"));
            }

            HttpURLConnection tokenInfoConn = open("https://oauth2.googleapis.com/tokeninfo?access_token="
                    + URLEncoder.encode(credential, StandardCharsets.UTF_8));
            if (tokenInfoConn.getResponseCode() != 200) {
                throw new IllegalArgumentException("Token de Google inválido o expirado");
            }
            JsonNode tokenInfoJson = readJson(tokenInfoConn);

            if (googleClientId != null && !googleClientId.isBlank()) {
                String aud = tokenInfoJson.path("aud").asText("");
                String azp = tokenInfoJson.path("azp").asText("");
                String issuedTo = tokenInfoJson.path("issued_to").asText("");
                if (!googleClientId.equals(aud) && !googleClientId.equals(azp) && !googleClientId.equals(issuedTo)) {
                    throw new IllegalArgumentException("Token de Google no emitido para esta aplicación");
                }
            }
            if (tokenInfoJson.has("email_verified") && !tokenInfoJson.get("email_verified").asBoolean()) {
                throw new IllegalArgumentException("El email de Google no está verificado");
            }

            String googleId = tokenInfoJson.path("sub").asText("");
            String email = tokenInfoJson.path("email").asText("");
            if (googleId.isBlank() || email.isBlank()) {
                throw new IllegalArgumentException("Token de Google sin identidad");
            }
            return processGoogleUser(googleId, email, fetchGoogleName(credential));
        } catch (IOException e) {
            log.error("Error al verificar con Google", e);
            throw new IllegalArgumentException("Error al verificar credenciales de Google");
        }
    }

    private GoogleIdToken.Payload verifyIdToken(String credential) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            GoogleIdToken idToken = verifier.verify(credential);
            return idToken == null ? null : idToken.getPayload();
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            // No es un ID token válido: se prueba como access token.
            return null;
        }
    }

    private String fetchGoogleName(String accessToken) {
        try {
            HttpURLConnection conn = open("https://www.googleapis.com/oauth2/v3/userinfo");
            conn.setRequestProperty("Authorization", "Bearer " + accessToken);
            if (conn.getResponseCode() == 200) {
                JsonNode json = readJson(conn);
                if (json.hasNonNull("name")) {
                    return json.get("name").asText();
                }
            }
        } catch (IOException e) {
            log.debug("No se pudo obtener el nombre desde Google userinfo", e);
        }
        return null;
    }

    private static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(GOOGLE_TIMEOUT_MS);
        conn.setReadTimeout(GOOGLE_TIMEOUT_MS);
        return conn;
    }

    private JsonNode readJson(HttpURLConnection conn) throws IOException {
        try (InputStream in = conn.getInputStream()) {
            return objectMapper.readTree(in);
        }
    }

    private AuthResponse processGoogleUser(String googleId, String rawEmail, String name) {
        String email = Emails.normalize(rawEmail);
        User user = userRepository.findByGoogleId(googleId)
                .orElseGet(() -> userRepository.findByEmail(email)
                        .orElse(null));

        if (user == null) {
            user = User.builder()
                    .id(java.util.UUID.randomUUID().toString())
                    .email(email)
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
                .map(refreshTokenService::extend)
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
