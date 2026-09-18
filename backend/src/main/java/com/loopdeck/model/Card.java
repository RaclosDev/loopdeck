package com.loopdeck.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "cards")
public class Card {

    @Id
    private String id;

    @Column(name = "note_id", nullable = false)
    private String noteId;

    @Column(name = "card_ordinal")
    private Integer cardOrdinal;

    @Column
    private String state;

    @Column
    private Instant due;

    @Column(name = "interval_days")
    private Double intervalDays;

    @Column(name = "ease_factor")
    private Double easeFactor;

    @Column
    private Integer repetitions;

    @Column
    private Integer lapses;

    @Column(name = "learning_step")
    private Integer learningStep;

    @Column
    private Boolean suspended;

    @Column
    private Boolean buried;

    @Column(name = "flag_color")
    private String flagColor;

    @Column(name = "is_leech")
    private Boolean leech;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = java.util.UUID.randomUUID().toString();
        if (cardOrdinal == null) cardOrdinal = 0;
        if (state == null) state = "new";
        if (due == null) due = Instant.now();
        if (intervalDays == null) intervalDays = 0.0;
        if (easeFactor == null) easeFactor = 2.5;
        if (repetitions == null) repetitions = 0;
        if (lapses == null) lapses = 0;
        if (learningStep == null) learningStep = 0;
        if (suspended == null) suspended = false;
        if (buried == null) buried = false;
        if (leech == null) leech = false;
        if (createdAt == null) createdAt = Instant.now();
    }
    public Card() {}

    public Card(String id, String noteId, Integer cardOrdinal, String state, Instant due, Double intervalDays, Double easeFactor, Integer repetitions, Integer lapses, Integer learningStep, Boolean suspended, Boolean buried, String flagColor, Boolean leech, Instant createdAt) {
        this.id = id;
        this.noteId = noteId;
        this.cardOrdinal = cardOrdinal;
        this.state = state;
        this.due = due;
        this.intervalDays = intervalDays;
        this.easeFactor = easeFactor;
        this.repetitions = repetitions;
        this.lapses = lapses;
        this.learningStep = learningStep;
        this.suspended = suspended;
        this.buried = buried;
        this.flagColor = flagColor;
        this.leech = leech;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }

    public void setId(String id) { this.id = id; }

    public String getNoteId() { return noteId; }

    public void setNoteId(String noteId) { this.noteId = noteId; }

    public Integer getCardOrdinal() { return cardOrdinal; }

    public void setCardOrdinal(Integer cardOrdinal) { this.cardOrdinal = cardOrdinal; }

    public String getState() { return state; }

    public void setState(String state) { this.state = state; }

    public Instant getDue() { return due; }

    public void setDue(Instant due) { this.due = due; }

    public Double getIntervalDays() { return intervalDays; }

    public void setIntervalDays(Double intervalDays) { this.intervalDays = intervalDays; }

    public Double getEaseFactor() { return easeFactor; }

    public void setEaseFactor(Double easeFactor) { this.easeFactor = easeFactor; }

    public Integer getRepetitions() { return repetitions; }

    public void setRepetitions(Integer repetitions) { this.repetitions = repetitions; }

    public Integer getLapses() { return lapses; }

    public void setLapses(Integer lapses) { this.lapses = lapses; }

    public Integer getLearningStep() { return learningStep; }

    public void setLearningStep(Integer learningStep) { this.learningStep = learningStep; }

    public Boolean isSuspended() { return suspended; }

    public void setSuspended(Boolean suspended) { this.suspended = suspended; }

    public Boolean isBuried() { return buried; }

    public void setBuried(Boolean buried) { this.buried = buried; }

    public String getFlagColor() { return flagColor; }

    public void setFlagColor(String flagColor) { this.flagColor = flagColor; }

    public Boolean isLeech() { return leech; }

    public void setLeech(Boolean leech) { this.leech = leech; }

    public Instant getCreatedAt() { return createdAt; }

    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public static CardBuilder builder() { return new CardBuilder(); }

    public static class CardBuilder {
        private String id;
        private String noteId;
        private Integer cardOrdinal;
        private String state;
        private Instant due;
        private Double intervalDays;
        private Double easeFactor;
        private Integer repetitions;
        private Integer lapses;
        private Integer learningStep;
        private Boolean suspended;
        private Boolean buried;
        private String flagColor;
        private Boolean leech;
        private Instant createdAt;
        public CardBuilder id(String id) { this.id = id; return this; }
        public CardBuilder noteId(String noteId) { this.noteId = noteId; return this; }
        public CardBuilder cardOrdinal(Integer cardOrdinal) { this.cardOrdinal = cardOrdinal; return this; }
        public CardBuilder state(String state) { this.state = state; return this; }
        public CardBuilder due(Instant due) { this.due = due; return this; }
        public CardBuilder intervalDays(Double intervalDays) { this.intervalDays = intervalDays; return this; }
        public CardBuilder easeFactor(Double easeFactor) { this.easeFactor = easeFactor; return this; }
        public CardBuilder repetitions(Integer repetitions) { this.repetitions = repetitions; return this; }
        public CardBuilder lapses(Integer lapses) { this.lapses = lapses; return this; }
        public CardBuilder learningStep(Integer learningStep) { this.learningStep = learningStep; return this; }
        public CardBuilder suspended(Boolean suspended) { this.suspended = suspended; return this; }
        public CardBuilder buried(Boolean buried) { this.buried = buried; return this; }
        public CardBuilder flagColor(String flagColor) { this.flagColor = flagColor; return this; }
        public CardBuilder leech(Boolean leech) { this.leech = leech; return this; }
        public CardBuilder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Card build() { return new Card(this.id, this.noteId, this.cardOrdinal, this.state, this.due, this.intervalDays, this.easeFactor, this.repetitions, this.lapses, this.learningStep, this.suspended, this.buried, this.flagColor, this.leech, this.createdAt); }
    }
}
