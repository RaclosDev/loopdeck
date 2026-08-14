package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "notes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Note {

    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "deck_id", nullable = false)
    private String deckId;

    @Column(name = "note_type", nullable = false)
    private String noteType;

    @Column(name = "fields_json", columnDefinition = "TEXT")
    private String fieldsJson;

    @Column
    private String tags;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = java.util.UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
        if (noteType == null) noteType = "basic";
        if (tags == null) tags = "";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
