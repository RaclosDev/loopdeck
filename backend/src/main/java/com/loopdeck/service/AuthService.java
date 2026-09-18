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
    public record UserDto(String id, String email, String name, Integer points, Integer streak, String mascot, java.util.List<String> unlockedSkins) {}

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already in use");
        }
        User user = User.builder()
                .email(req.email().toLowerCase().trim())
                .name(req.name().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();
        userRepository.save(user);

        String token = this.generateToken(user);
        return new AuthResponse(token, refreshTokenService.createRefreshToken(user.getId()).getPlainToken(), toDto(user));
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = this.generateToken(user);
        return new AuthResponse(token, refreshTokenService.createRefreshToken(user.getId()).getPlainToken(), toDto(user));
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

            // Probamos como Access Token
            java.net.URL url = new java.net.URL("https://www.googleapis.com/oauth2/v3/userinfo");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestProperty("Authorization", "Bearer " + credential);
            conn.setRequestMethod("GET");
            if (conn.getResponseCode() == 200) {
                java.io.InputStream is = conn.getInputStream();
                String response = new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response);
                String googleId = json.get("sub").asText();
                String email = json.get("email").asText();
                String name = json.has("name") ? json.get("name").asText() : null;
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
        return new AuthResponse(token, refreshTokenService.createRefreshToken(user.getId()).getPlainToken(), toDto(user));
    }

    @Transactional
    public AuthResponse refreshToken(String requestRefreshToken) {
        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUserId)
                .map(userId -> {
                    User user = userRepository.findById(userId).orElseThrow(() -> new TokenRefreshException("User not found"));
                    
                    // Rotate refresh token
                    refreshTokenService.deleteByToken(requestRefreshToken);
                    RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(userId);
                    
                    String token = generateToken(user);
                    return new AuthResponse(token, newRefreshToken.getPlainToken(), toDto(user));
                })
                .orElseThrow(() -> new TokenRefreshException("Refresh token is not in database!"));
    }

    public void logout(String requestRefreshToken) {
        refreshTokenService.deleteByToken(requestRefreshToken);
    }

    public UserDto me(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return toDto(user);
    }

    private UserDto toDto(User user) {
        java.util.List<String> skins = new java.util.ArrayList<>();
        if (user.getUnlockedSkins() != null && !user.getUnlockedSkins().trim().isEmpty()) {
            for (String skin : user.getUnlockedSkins().split(",")) {
                if (!skin.trim().isEmpty()) skins.add(skin.trim());
            }
        } else {
            skins.add("default");
        }

        return new UserDto(
            user.getId(), 
            user.getEmail(), 
            user.getName(), 
            user.getPoints() != null ? user.getPoints() : 0, 
            user.getCurrentStreak() != null ? user.getCurrentStreak() : 0, 
            user.getEquippedMascot() != null ? user.getEquippedMascot() : "default",
            skins
        );
    }
}
