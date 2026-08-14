package com.loopdeck.service;

import com.loopdeck.model.Card;
import com.loopdeck.model.Note;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CardService {

    private final NoteRepository noteRepository;
    private final CardRepository cardRepository;
    private final DeckRepository deckRepository;

    public record CreateNoteRequest(String deckId, String noteType, String fieldsJson, String tags) {}
    public record UpdateNoteRequest(String fieldsJson, String tags) {}
    public record ReviewRequest(int rating, int timeTakenMs) {}

    // ── Notes ──────────────────────────────────────────────────────────────

    public List<Note> getNotesByDeck(String userId, String deckId) {
        deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));
        return noteRepository.findByDeckIdOrderByCreatedAtDesc(deckId);
    }

    @Transactional
    public Note createNote(String userId, CreateNoteRequest req) {
        deckRepository.findByIdAndUserId(req.deckId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));

        Note note = Note.builder()
                .userId(userId)
                .deckId(req.deckId())
                .noteType(req.noteType() != null ? req.noteType() : "basic")
                .fieldsJson(req.fieldsJson())
                .tags(req.tags() != null ? req.tags() : "")
                .build();
        noteRepository.save(note);

        // Create card(s) for the note
        int numCards = "cloze".equals(note.getNoteType()) ? 1 : ("reverse".equals(note.getNoteType()) ? 2 : 1);
        for (int i = 0; i < numCards; i++) {
            Card card = Card.builder()
                    .noteId(note.getId())
                    .cardOrdinal(i)
                    .build();
            cardRepository.save(card);
        }

        return note;
    }

    @Transactional
    public Note updateNote(String userId, String noteId, UpdateNoteRequest req) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Note not found"));
        note.setFieldsJson(req.fieldsJson());
        if (req.tags() != null) note.setTags(req.tags());
        return noteRepository.save(note);
    }

    @Transactional
    public void deleteNote(String userId, String noteId) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Note not found"));
        // Cards are deleted via cascade
        noteRepository.delete(note);
    }

    // ── Study session ──────────────────────────────────────────────────────

    public List<Card> getDueCards(String userId, String deckId, int limit) {
        deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));
        return cardRepository.findDueCardsByDeckId(deckId, Instant.now(), limit);
    }

    @Transactional
    public Card reviewCard(String userId, String cardId, ReviewRequest req) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));

        // Verify ownership via note → deck → user
        Note note = noteRepository.findById(card.getNoteId())
                .orElseThrow(() -> new IllegalArgumentException("Note not found"));
        deckRepository.findByIdAndUserId(note.getDeckId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Not authorized"));

        applySmTwo(card, req.rating());
        return cardRepository.save(card);
    }

    // ── SM-2 Algorithm ────────────────────────────────────────────────────

    private static final int[] LEARNING_STEPS_MINUTES = {1, 10};
    private static final int GRADUATING_INTERVAL_DAYS = 1;
    private static final int EASY_INTERVAL_DAYS = 4;

    void applySmTwo(Card card, int rating) {
        switch (card.getState()) {
            case "new", "learning" -> applyLearning(card, rating);
            case "review" -> applyReview(card, rating);
            case "relearning" -> applyRelearning(card, rating);
        }
    }

    private void applyLearning(Card card, int rating) {
        if (rating == 1) { // Again
            card.setLearningStep(0);
            card.setState("learning");
            card.setDue(Instant.now().plusSeconds(LEARNING_STEPS_MINUTES[0] * 60L));
        } else if (rating == 4) { // Easy → skip to review immediately
            card.setState("review");
            card.setIntervalDays((double) EASY_INTERVAL_DAYS);
            card.setEaseFactor(2.5);
            card.setRepetitions(1);
            card.setDue(Instant.now().plusSeconds((long)(EASY_INTERVAL_DAYS * 86400)));
        } else { // Good / Hard → advance steps
            int nextStep = card.getLearningStep() + 1;
            if (nextStep >= LEARNING_STEPS_MINUTES.length) {
                // Graduate
                card.setState("review");
                card.setIntervalDays((double) GRADUATING_INTERVAL_DAYS);
                card.setEaseFactor(2.5);
                card.setRepetitions(1);
                card.setDue(Instant.now().plusSeconds(GRADUATING_INTERVAL_DAYS * 86400L));
            } else {
                card.setLearningStep(nextStep);
                card.setState("learning");
                card.setDue(Instant.now().plusSeconds(LEARNING_STEPS_MINUTES[nextStep] * 60L));
            }
        }
    }

    private void applyReview(Card card, int rating) {
        double ease = card.getEaseFactor();
        double interval = card.getIntervalDays();

        switch (rating) {
            case 1 -> { // Again → relearning
                card.setLapses(card.getLapses() + 1);
                card.setState("relearning");
                card.setLearningStep(0);
                card.setEaseFactor(Math.max(1.3, ease - 0.2));
                card.setDue(Instant.now().plusSeconds(10 * 60L)); // 10 min relearn step
                if (card.getLapses() >= 8) card.setLeech(true);
            }
            case 2 -> { // Hard
                ease = Math.max(1.3, ease - 0.15);
                interval = Math.max(1, interval * 1.2);
                card.setEaseFactor(ease);
                card.setIntervalDays(interval);
                card.setRepetitions(card.getRepetitions() + 1);
                card.setDue(Instant.now().plusSeconds((long)(interval * 86400)));
            }
            case 3 -> { // Good
                interval = Math.max(1, interval * ease);
                card.setIntervalDays(interval);
                card.setRepetitions(card.getRepetitions() + 1);
                card.setDue(Instant.now().plusSeconds((long)(interval * 86400)));
            }
            case 4 -> { // Easy
                ease = Math.min(ease + 0.15, 3.5);
                interval = Math.max(1, interval * ease * 1.3);
                card.setEaseFactor(ease);
                card.setIntervalDays(interval);
                card.setRepetitions(card.getRepetitions() + 1);
                card.setDue(Instant.now().plusSeconds((long)(interval * 86400)));
            }
        }
        card.setState("review");
    }

    private void applyRelearning(Card card, int rating) {
        if (rating == 1) {
            card.setDue(Instant.now().plusSeconds(10 * 60L));
        } else {
            card.setState("review");
            card.setIntervalDays(Math.max(1, card.getIntervalDays() * 0.5));
            card.setDue(Instant.now().plusSeconds((long)(card.getIntervalDays() * 86400)));
        }
    }
}
