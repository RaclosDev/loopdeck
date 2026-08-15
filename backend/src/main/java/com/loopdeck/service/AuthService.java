package com.loopdeck.service;

import com.loopdeck.model.User;
import com.loopdeck.repository.UserRepository;
import com.loopdeck.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

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
