package com.loopdeck.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @Transient
    private String plainToken;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private Instant expiryDate;

    public RefreshToken() {
    }

    public RefreshToken(String userId, Instant expiryDate) {
        this.userId = userId;
        this.expiryDate = expiryDate;
        this.plainToken = UUID.randomUUID().toString();
        this.token = hashToken(this.plainToken);
    }

    public Long getId() { return id; }
    public String getToken() { return token; }
    public String getPlainToken() { return plainToken; }
    public void setToken(String token) { this.token = token; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Instant getExpiryDate() { return expiryDate; }
    public void setExpiryDate(Instant expiryDate) { this.expiryDate = expiryDate; }

    public static String hashToken(String plain) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(plain.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
