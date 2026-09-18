package com.loopdeck.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notes")
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
    public Note() {}

    public Note(String id, String userId, String deckId, String noteType, String fieldsJson, String tags, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.userId = userId;
        this.deckId = deckId;
        this.noteType = noteType;
        this.fieldsJson = fieldsJson;
        this.tags = tags;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }

    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }

    public void setUserId(String userId) { this.userId = userId; }

    public String getDeckId() { return deckId; }

    public void setDeckId(String deckId) { this.deckId = deckId; }

    public String getNoteType() { return noteType; }

    public void setNoteType(String noteType) { this.noteType = noteType; }

    public String getFieldsJson() { return fieldsJson; }

    public void setFieldsJson(String fieldsJson) { this.fieldsJson = fieldsJson; }

    public String getTags() { return tags; }

    public void setTags(String tags) { this.tags = tags; }

    public Instant getCreatedAt() { return createdAt; }

    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }

    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public static NoteBuilder builder() { return new NoteBuilder(); }

    public static class NoteBuilder {
        private String id;
        private String userId;
        private String deckId;
        private String noteType;
        private String fieldsJson;
        private String tags;
        private Instant createdAt;
        private Instant updatedAt;
        public NoteBuilder id(String id) { this.id = id; return this; }
        public NoteBuilder userId(String userId) { this.userId = userId; return this; }
        public NoteBuilder deckId(String deckId) { this.deckId = deckId; return this; }
        public NoteBuilder noteType(String noteType) { this.noteType = noteType; return this; }
        public NoteBuilder fieldsJson(String fieldsJson) { this.fieldsJson = fieldsJson; return this; }
        public NoteBuilder tags(String tags) { this.tags = tags; return this; }
        public NoteBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public NoteBuilder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public Note build() { return new Note(this.id, this.userId, this.deckId, this.noteType, this.fieldsJson, this.tags, this.createdAt, this.updatedAt); }
    }
}
