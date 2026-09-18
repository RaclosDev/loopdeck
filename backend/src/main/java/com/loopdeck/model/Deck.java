package com.loopdeck.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "decks")
public class Deck {

    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String name;

    @Column(name = "parent_id")
    private String parentId;

    @Column(name = "preset_id")
    private String presetId;

    @Column
    private String description;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = java.util.UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
        if (description == null) description = "";
    }
    public Deck() {}

    public Deck(String id, String userId, String name, String parentId, String presetId, String description, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.parentId = parentId;
        this.presetId = presetId;
        this.description = description;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }

    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }

    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }

    public void setName(String name) { this.name = name; }

    public String getParentId() { return parentId; }

    public void setParentId(String parentId) { this.parentId = parentId; }

    public String getPresetId() { return presetId; }

    public void setPresetId(String presetId) { this.presetId = presetId; }

    public String getDescription() { return description; }

    public void setDescription(String description) { this.description = description; }

    public Instant getCreatedAt() { return createdAt; }

    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public static DeckBuilder builder() { return new DeckBuilder(); }

    public static class DeckBuilder {
        private String id;
        private String userId;
        private String name;
        private String parentId;
        private String presetId;
        private String description;
        private Instant createdAt;
        public DeckBuilder id(String id) { this.id = id; return this; }
        public DeckBuilder userId(String userId) { this.userId = userId; return this; }
        public DeckBuilder name(String name) { this.name = name; return this; }
        public DeckBuilder parentId(String parentId) { this.parentId = parentId; return this; }
        public DeckBuilder presetId(String presetId) { this.presetId = presetId; return this; }
        public DeckBuilder description(String description) { this.description = description; return this; }
        public DeckBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Deck build() { return new Deck(this.id, this.userId, this.name, this.parentId, this.presetId, this.description, this.createdAt); }
    }
}
