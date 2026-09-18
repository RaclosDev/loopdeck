package com.loopdeck.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reviews")
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
    public Review() {}

    public Review(String id, String cardId, Integer rating, Double intervalDays, Double easeFactor, Integer timeTakenMs, Instant reviewedAt) {
        this.id = id;
        this.cardId = cardId;
        this.rating = rating;
        this.intervalDays = intervalDays;
        this.easeFactor = easeFactor;
        this.timeTakenMs = timeTakenMs;
        this.reviewedAt = reviewedAt;
    }

    public String getId() { return id; }

    public void setId(String id) { this.id = id; }

    public String getCardId() { return cardId; }

    public void setCardId(String cardId) { this.cardId = cardId; }

    public Integer getRating() { return rating; }

    public void setRating(Integer rating) { this.rating = rating; }

    public Double getIntervalDays() { return intervalDays; }

    public void setIntervalDays(Double intervalDays) { this.intervalDays = intervalDays; }

    public Double getEaseFactor() { return easeFactor; }

    public void setEaseFactor(Double easeFactor) { this.easeFactor = easeFactor; }

    public Integer getTimeTakenMs() { return timeTakenMs; }

    public void setTimeTakenMs(Integer timeTakenMs) { this.timeTakenMs = timeTakenMs; }

    public Instant getReviewedAt() { return reviewedAt; }

    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }

    public static ReviewBuilder builder() { return new ReviewBuilder(); }

    public static class ReviewBuilder {
        private String id;
        private String cardId;
        private Integer rating;
        private Double intervalDays;
        private Double easeFactor;
        private Integer timeTakenMs;
        private Instant reviewedAt;
        public ReviewBuilder id(String id) { this.id = id; return this; }
        public ReviewBuilder cardId(String cardId) { this.cardId = cardId; return this; }
        public ReviewBuilder rating(Integer rating) { this.rating = rating; return this; }
        public ReviewBuilder intervalDays(Double intervalDays) { this.intervalDays = intervalDays; return this; }
        public ReviewBuilder easeFactor(Double easeFactor) { this.easeFactor = easeFactor; return this; }
        public ReviewBuilder timeTakenMs(Integer timeTakenMs) { this.timeTakenMs = timeTakenMs; return this; }
        public ReviewBuilder reviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; return this; }
        public Review build() { return new Review(this.id, this.cardId, this.rating, this.intervalDays, this.easeFactor, this.timeTakenMs, this.reviewedAt); }
    }
}
