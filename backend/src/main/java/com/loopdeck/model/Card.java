package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "cards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
}
