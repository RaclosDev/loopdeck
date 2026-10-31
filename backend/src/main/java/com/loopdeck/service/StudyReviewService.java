package com.loopdeck.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.loopdeck.exception.ConflictException;
import com.loopdeck.exception.InvalidInputException;
import com.loopdeck.model.Card;
import com.loopdeck.model.Review;
import com.loopdeck.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudyReviewService {
    private final CardRepository cards;
    private final DeckRepository decks;
    private final ReviewRepository reviews;
    private final CardService scheduler;
    private final ObjectMapper json;
    private final jakarta.persistence.EntityManager entityManager;

    public record ReviewResult(Card card, String reviewId) {}
    public record RestoreResult(Card card, boolean alreadyUndone) {}

    @Transactional
    public ReviewResult review(String user, String cardId, int rating, int timeTakenMs, String requestId) {
        if (rating < 1 || rating > 4 || timeTakenMs < 0) throw new InvalidInputException("Calificación o tiempo no válido");
        String id = requestId == null ? UUID.randomUUID().toString() : requestId;
        try { if (!UUID.fromString(id).toString().equalsIgnoreCase(id)) throw new IllegalArgumentException(); id = UUID.fromString(id).toString(); }
        catch (IllegalArgumentException ex) { throw new InvalidInputException("Identificador de acción no válido"); }
        Card card = ownedLockedCard(user, cardId);
        var existing = reviews.findById(id);
        if (existing.isPresent()) {
            var review = existing.get();
            if (!cardId.equals(review.getCardId()) || review.getRating() != rating || !Objects.equals(review.getTimeTakenMs(), timeTakenMs > 0 ? timeTakenMs : null))
                throw new ConflictException("El identificador ya corresponde a otra acción");
            if (review.isUndone()) throw new ConflictException("Esta revisión ya se ha deshecho");
            return new ReviewResult(card, id);
        }
        if (card.getState() == null || !java.util.List.of("new", "learning", "review", "relearning").contains(card.getState()))
            throw new ConflictException("El estado de la tarjeta no es válido");
        String previous = encode(CardSchedule.capture(card));
        scheduler.applySmTwo(card, rating);
        cards.save(card);
        Instant timestamp = Instant.now().truncatedTo(ChronoUnit.MICROS);
        var latest = reviews.findFirstByCardIdOrderByReviewedAtDescIdDesc(cardId);
        if (latest.isPresent() && !timestamp.isAfter(latest.get().getReviewedAt())) timestamp = latest.get().getReviewedAt().plus(1, ChronoUnit.MICROS);
        Review review = new Review(id, cardId, rating, card.getIntervalDays(), card.getEaseFactor(), timeTakenMs > 0 ? timeTakenMs : null, timestamp);
        review.setPreviousState(previous);
        // An assigned action ID must insert: merge could overwrite a concurrent action on another card.
        try {
            entityManager.persist(review);
            entityManager.flush();
        } catch (jakarta.persistence.EntityExistsException | org.hibernate.exception.ConstraintViolationException ex) {
            throw new ConflictException("El identificador ya corresponde a otra acción");
        }
        return new ReviewResult(card, id);
    }

    @Transactional
    public RestoreResult restore(String user, String cardId, String reviewId, Card legacyState) {
        Card card = ownedLockedCard(user, cardId);
        Review target;
        if (reviewId != null) {
            try { reviewId = UUID.fromString(reviewId).toString(); }
            catch (IllegalArgumentException ex) { throw new InvalidInputException("Invalid review ID"); }
            target = reviews.findById(reviewId).filter(r -> cardId.equals(r.getCardId()))
                .orElseThrow(() -> new ConflictException("La revisión ya no está disponible"));
            if (target.isUndone()) return new RestoreResult(card, true);
        } else {
            target = latestActive(cardId);
            if (target.getPreviousState() == null || legacyState == null || !decode(target.getPreviousState()).equals(CardSchedule.capture(legacyState)))
                throw new ConflictException("Actualiza el estudio antes de deshacer");
            if (reviews.existsByCardIdAndUndoneTrueAndPreviousState(cardId, target.getPreviousState()))
                throw new ConflictException("Actualiza el estudio antes de deshacer");
        }
        if (!latestActive(cardId).getId().equals(target.getId()) || target.getPreviousState() == null)
            throw new ConflictException("La tarjeta ha cambiado; actualiza el estudio antes de deshacer");
        decode(target.getPreviousState()).restore(card);
        cards.save(card);
        target.setUndone(true);
        reviews.save(target);
        return new RestoreResult(card, false);
    }

    private Card ownedLockedCard(String user, String id) {
        Card card = cards.findLockedById(id).orElseThrow(() -> new IllegalArgumentException("Tarjeta no encontrada"));
        decks.findByIdAndUserId(card.getDeckId(), user).orElseThrow(() -> new IllegalArgumentException("Tarjeta no encontrada"));
        return card;
    }
    private Review latestActive(String cardId) {
        return reviews.findFirstByCardIdAndUndoneFalseOrderByReviewedAtDescIdDesc(cardId)
            .orElseThrow(() -> new ConflictException("No hay una revisión disponible para deshacer"));
    }
    private String encode(CardSchedule state) {
        try { return json.writeValueAsString(state); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Unable to serialize review snapshot", ex); }
    }
    private CardSchedule decode(String state) {
        try { return json.readValue(state, CardSchedule.class); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Unable to read review snapshot", ex); }
    }
}
