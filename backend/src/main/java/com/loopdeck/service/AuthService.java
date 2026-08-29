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
import com.loopdeck.security.JwtUtil;
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

    private final UserRepository userRepository;
    private final DeckRepository deckRepository;
    private final NoteRepository noteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${google.client.id:}")
    private String googleClientId;

    public record RegisterRequest(String email, String name, String password) {}
    public record LoginRequest(String email, String password) {}
    public record AuthResponse(String token, UserDto user) {}
    public record UserDto(String id, String email, String name, Integer points, Integer streak, String mascot) {}
    public record MigrateResult(int decks, int notes, String oldEmail) {}

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

    @Transactional
    public MigrateResult migrateAccount(String currentUserId, String oldEmail) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario actual no encontrado"));

        User oldUser = userRepository.findByEmail(oldEmail.toLowerCase().trim())
                .orElseThrow(() -> new IllegalArgumentException("No se encontró ninguna cuenta con el email: " + oldEmail));

        if (oldUser.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("No puedes migrar datos de tu propia cuenta");
        }

        // Transferir todos los mazos
        List<Deck> oldDecks = deckRepository.findByUserIdOrderByNameAsc(oldUser.getId());
        for (Deck deck : oldDecks) {
            deck.setUserId(currentUserId);
        }
        deckRepository.saveAll(oldDecks);

        // Transferir todas las notas/tarjetas
        List<Note> oldNotes = noteRepository.findByUserId(oldUser.getId());
        for (Note note : oldNotes) {
            note.setUserId(currentUserId);
        }
        noteRepository.saveAll(oldNotes);

        // Transferir puntos y racha si la cuenta vieja tenía más
        if (oldUser.getPoints() != null && oldUser.getPoints() > (currentUser.getPoints() != null ? currentUser.getPoints() : 0)) {
            currentUser.setPoints(oldUser.getPoints());
        }
        if (oldUser.getCurrentStreak() != null && oldUser.getCurrentStreak() > (currentUser.getCurrentStreak() != null ? currentUser.getCurrentStreak() : 0)) {
            currentUser.setCurrentStreak(oldUser.getCurrentStreak());
        }
        userRepository.save(currentUser);

        // Borrar la cuenta vieja (ya no tiene datos)
        userRepository.delete(oldUser);

        return new MigrateResult(oldDecks.size(), oldNotes.size(), oldEmail);
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
