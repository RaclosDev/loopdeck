package com.loopdeck.model;

import com.loopdeck.security.SecureTokens;
import jakarta.persistence.*;
import java.time.Instant;

/**
 * Token de refresco de una sesión. Pertenece a una familia (la sesión de un dispositivo): cada uso lo
 * rota por uno nuevo de la misma familia y deja este marcado con {@code rotatedAt}. En la base de datos
 * solo está el hash; el valor en claro existe únicamente en el objeto recién creado.
 */
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

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "family_id", nullable = false, updatable = false)
    private String familyId;

    @Column(name = "absolute_expiry", nullable = false, updatable = false)
    private Instant absoluteExpiry;

    @Column(name = "rotated_at")
    private Instant rotatedAt;

    @Column(name = "grace_successors", nullable = false)
    private int graceSuccessors;

    public RefreshToken() {
    }

    /** Primer token de una familia nueva (inicio de sesión). */
    public RefreshToken(String userId, Instant expiryDate, Instant absoluteExpiry) {
        this(userId, expiryDate, absoluteExpiry, java.util.UUID.randomUUID().toString());
    }

    /** Token nuevo dentro de una familia existente (rotación). */
    public RefreshToken(String userId, Instant expiryDate, Instant absoluteExpiry, String familyId) {
        this.userId = userId;
        this.expiryDate = expiryDate;
        this.absoluteExpiry = absoluteExpiry;
        this.familyId = familyId;
        this.createdAt = Instant.now();
        this.plainToken = SecureTokens.generate();
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
    public Instant getCreatedAt() { return createdAt; }
    public String getFamilyId() { return familyId; }
    public Instant getAbsoluteExpiry() { return absoluteExpiry; }
    public Instant getRotatedAt() { return rotatedAt; }
    public void setRotatedAt(Instant rotatedAt) { this.rotatedAt = rotatedAt; }
    public int getGraceSuccessors() { return graceSuccessors; }
    public void setGraceSuccessors(int graceSuccessors) { this.graceSuccessors = graceSuccessors; }

    public static String hashToken(String plain) {
        return SecureTokens.hash(plain);
    }
}
