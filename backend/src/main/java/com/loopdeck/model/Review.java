package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    private String id;

    @Column(name = "card_id", nullable = false)
    private String cardId;

    @Column(nullable = false)
    private Integer rating;

    @Column(name = "interval_days")
    private Double intervalDays;

    @Column(name = "ease_factor")
    private Double easeFactor;

    @Column(name = "time_taken_ms")
    private Integer timeTakenMs;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = java.util.UUID.randomUUID().toString();
        if (reviewedAt == null) reviewedAt = Instant.now();
    }
}
