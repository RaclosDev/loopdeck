package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private String id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "google_id")
    private String googleId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(columnDefinition = "integer default 0")
    @Builder.Default
    private Integer points = 0;

    @Column(name = "current_streak", columnDefinition = "integer default 0")
    @Builder.Default
    private Integer currentStreak = 0;

    @Column(name = "last_login_date")
    private java.time.LocalDate lastLoginDate;

    @Column(name = "equipped_mascot")
    @Builder.Default
    private String equippedMascot = "default";

    @Column(name = "unlocked_skins", columnDefinition = "text")
    @Builder.Default
    private String unlockedSkins = "default";

    @PrePersist
    void prePersist() {
        if (id == null) id = java.util.UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
    }
}
