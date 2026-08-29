package com.loopdeck.controller;

import com.loopdeck.model.User;
import com.loopdeck.repository.UserRepository;
import com.loopdeck.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    @PostMapping("/daily-login")
    public ResponseEntity<AuthService.UserDto> dailyLogin(Authentication auth) {
        User user = userRepository.findById(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        LocalDate today = LocalDate.now();
        LocalDate lastLogin = user.getLastLoginDate();

        if (lastLogin == null) {
            // First time ever logging in (or first time since this feature was added)
            user.setLastLoginDate(today);
            user.setCurrentStreak(1);
            user.setPoints((user.getPoints() == null ? 0 : user.getPoints()) + 10);
        } else if (lastLogin.isEqual(today.minusDays(1))) {
            // Logged in yesterday -> increment streak
            user.setLastLoginDate(today);
            int newStreak = (user.getCurrentStreak() == null ? 0 : user.getCurrentStreak()) + 1;
            user.setCurrentStreak(newStreak);
            
            // Base 10 points + 2 for every streak day (capped at 50 points max per day)
            int bonus = Math.min(newStreak * 2, 40);
            user.setPoints(user.getPoints() + 10 + bonus);
        } else if (lastLogin.isBefore(today.minusDays(1))) {
            // Missed a day -> reset streak
            user.setLastLoginDate(today);
            user.setCurrentStreak(1);
            user.setPoints((user.getPoints() == null ? 0 : user.getPoints()) + 10);
        }
        // If lastLogin.isEqual(today), do nothing (already claimed today)

        userRepository.save(user);

        return ResponseEntity.ok(authService.me(user.getId()));
    }

    @PostMapping("/buy-skin")
    public ResponseEntity<AuthService.UserDto> buySkin(Authentication auth, @RequestBody Map<String, String> body) {
        String skin = body.get("skin");
        int cost = Integer.parseInt(body.getOrDefault("cost", "0"));

        User user = userRepository.findById(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String currentUnlocked = user.getUnlockedSkins();
        if (currentUnlocked == null) currentUnlocked = "default";
        
        boolean isOwned = false;
        for (String s : currentUnlocked.split(",")) {
            if (s.trim().equals(skin)) {
                isOwned = true;
                break;
            }
        }

        if (!isOwned) {
            int currentPoints = user.getPoints() == null ? 0 : user.getPoints();
            if (currentPoints < cost) {
                throw new IllegalArgumentException("No tienes suficientes puntos.");
            }
            user.setPoints(currentPoints - cost);
            user.setUnlockedSkins(currentUnlocked + "," + skin);
        }

        user.setEquippedMascot(skin);
        userRepository.save(user);

        return ResponseEntity.ok(authService.me(user.getId()));
    }
}
