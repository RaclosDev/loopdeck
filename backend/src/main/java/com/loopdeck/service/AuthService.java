package com.loopdeck.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.loopdeck.model.User;
import com.loopdeck.repository.UserRepository;
import com.loopdeck.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${google.client.id:}")
    private String googleClientId;

    public record RegisterRequest(String email, String name, String password) {}
    public record LoginRequest(String email, String password) {}
    public record AuthResponse(String token, UserDto user) {}
    public record UserDto(String id, String email, String name, Integer points, Integer streak, String mascot) {}

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
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, toDto(user));
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, toDto(user));
    }

    public AuthResponse googleLogin(String credential) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(credential);
            if (idToken == null) {
                throw new IllegalArgumentException("Token de Google inválido");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            // Buscar usuario por googleId o por email
            User user = userRepository.findByGoogleId(googleId)
                    .orElseGet(() -> userRepository.findByEmail(email.toLowerCase().trim())
                            .orElse(null));

            if (user == null) {
                // Crear usuario nuevo
                user = User.builder()
                        .email(email.toLowerCase().trim())
                        .name(name != null ? name : email.split("@")[0])
                        .googleId(googleId)
                        .build();
                userRepository.save(user);
            } else if (user.getGoogleId() == null) {
                // Vincular cuenta existente con Google
                user.setGoogleId(googleId);
                userRepository.save(user);
            }

            String token = jwtUtil.generateToken(user.getId(), user.getEmail());
            return new AuthResponse(token, toDto(user));

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Error al verificar con Google: " + e.getMessage());
        }
    }

    public UserDto me(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return toDto(user);
    }

    private UserDto toDto(User user) {
        return new UserDto(
            user.getId(), 
            user.getEmail(), 
            user.getName(), 
            user.getPoints() != null ? user.getPoints() : 0, 
            user.getCurrentStreak() != null ? user.getCurrentStreak() : 0, 
            user.getEquippedMascot() != null ? user.getEquippedMascot() : "default"
        );
    }
}

