package com.loopdeck.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
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
    private Integer points = 0;

    @Column(name = "current_streak", columnDefinition = "integer default 0")
    private Integer currentStreak = 0;

    @Column(name = "last_login_date")
    private java.time.LocalDate lastLoginDate;

    @Column(name = "equipped_mascot")
    private String equippedMascot = "default";

    @Column(name = "unlocked_skins", columnDefinition = "text")
    private String unlockedSkins = "default";

    @PrePersist
    void prePersist() {
        if (id == null) id = java.util.UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
    }
    public User() {}

    public User(String id, String email, String name, String passwordHash, String googleId, Instant createdAt, Integer points, Integer currentStreak, java.time.LocalDate lastLoginDate, String equippedMascot, String unlockedSkins) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.googleId = googleId;
        this.createdAt = createdAt;
        this.points = points;
        this.currentStreak = currentStreak;
        this.lastLoginDate = lastLoginDate;
        this.equippedMascot = equippedMascot;
        this.unlockedSkins = unlockedSkins;
    }

    public String getId() { return id; }

    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }

    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }

    public void setName(String name) { this.name = name; }

    public String getPasswordHash() { return passwordHash; }

    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getGoogleId() { return googleId; }

    public void setGoogleId(String googleId) { this.googleId = googleId; }

    public Instant getCreatedAt() { return createdAt; }

    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Integer getPoints() { return points; }

    public void setPoints(Integer points) { this.points = points; }

    public Integer getCurrentStreak() { return currentStreak; }

    public void setCurrentStreak(Integer currentStreak) { this.currentStreak = currentStreak; }

    public java.time.LocalDate getLastLoginDate() { return lastLoginDate; }

    public void setLastLoginDate(java.time.LocalDate lastLoginDate) { this.lastLoginDate = lastLoginDate; }

    public String getEquippedMascot() { return equippedMascot; }

    public void setEquippedMascot(String equippedMascot) { this.equippedMascot = equippedMascot; }

    public String getUnlockedSkins() { return unlockedSkins; }

    public void setUnlockedSkins(String unlockedSkins) { this.unlockedSkins = unlockedSkins; }

    public static UserBuilder builder() { return new UserBuilder(); }

    public static class UserBuilder {
        private String id;
        private String email;
        private String name;
        private String passwordHash;
        private String googleId;
        private Instant createdAt;
        private Integer points;
        private Integer currentStreak;
        private java.time.LocalDate lastLoginDate;
        private String equippedMascot;
        private String unlockedSkins;
        public UserBuilder id(String id) { this.id = id; return this; }
        public UserBuilder email(String email) { this.email = email; return this; }
        public UserBuilder name(String name) { this.name = name; return this; }
        public UserBuilder passwordHash(String passwordHash) { this.passwordHash = passwordHash; return this; }
        public UserBuilder googleId(String googleId) { this.googleId = googleId; return this; }
        public UserBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public UserBuilder points(Integer points) { this.points = points; return this; }
        public UserBuilder currentStreak(Integer currentStreak) { this.currentStreak = currentStreak; return this; }
        public UserBuilder lastLoginDate(java.time.LocalDate lastLoginDate) { this.lastLoginDate = lastLoginDate; return this; }
        public UserBuilder equippedMascot(String equippedMascot) { this.equippedMascot = equippedMascot; return this; }
        public UserBuilder unlockedSkins(String unlockedSkins) { this.unlockedSkins = unlockedSkins; return this; }
        public User build() { return new User(this.id, this.email, this.name, this.passwordHash, this.googleId, this.createdAt, this.points, this.currentStreak, this.lastLoginDate, this.equippedMascot, this.unlockedSkins); }
    }
}
