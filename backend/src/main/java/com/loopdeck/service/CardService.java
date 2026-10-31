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
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CardService {

    private final NoteRepository noteRepository;
    private final CardRepository cardRepository;
    private final DeckRepository deckRepository;


    public record CreateNoteRequest(String deckId, String noteType, String fieldsJson, String tags) {}
    public record UpdateNoteRequest(String fieldsJson, String tags) {}
    public record ReviewRequest(int rating, int timeTakenMs) {}


    @Transactional(readOnly = true)
    public List<Note> getNotesByDeck(String userId, String deckId) {
        deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));
        return noteRepository.findByDeckIdOrderByCreatedAtDesc(deckId);
    }

    @Transactional
    public Note createNote(String userId, CreateNoteRequest req) {
        deckRepository.findByIdAndUserId(req.deckId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));

        NoteContent content = NoteContent.validate(req.noteType(), req.fieldsJson(), req.tags());
        Note note = Note.builder()
                .userId(userId)
                .deckId(req.deckId())
                .noteType(content.type())
                .fieldsJson(content.fieldsJson())
                .tags(content.tags())
                .build();
        noteRepository.save(note);


        for (int ordinal : content.ordinals()) {
            cardRepository.save(Card.builder().noteId(note.getId()).deckId(req.deckId()).cardOrdinal(ordinal).build());
        }

        return note;
    }

    @Transactional
    public Note updateNote(String userId, String noteId, UpdateNoteRequest req) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Note not found"));
        NoteContent content = NoteContent.validate(note.getNoteType(), req.fieldsJson(), req.tags() == null ? note.getTags() : req.tags());
        note.setFieldsJson(content.fieldsJson());
        note.setTags(content.tags());
        if ("cloze".equals(note.getNoteType())) {
            List<Card> existing = cardRepository.findByNoteId(noteId);
            var retained = new java.util.HashSet<Integer>();
            var removed = new java.util.ArrayList<Card>();
            for (Card card : existing) {
                if (card.getCardOrdinal() == 0) card.setCardOrdinal(content.ordinals().get(0));
                if (content.ordinals().contains(card.getCardOrdinal()) && retained.add(card.getCardOrdinal())) {
                    cardRepository.save(card);
                } else removed.add(card);
            }
            cardRepository.deleteAllInBatch(removed);
            for (int ordinal : content.ordinals()) {
                if (!retained.contains(ordinal)) cardRepository.save(Card.builder().noteId(noteId).deckId(note.getDeckId()).cardOrdinal(ordinal).build());
            }
        }
        return noteRepository.save(note);
    }

    @Transactional
    public void deleteNote(String userId, String noteId) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Note not found"));
        // Cards are deleted via cascade
        noteRepository.delete(note);
    }


    public record DueCardDto(Card card, Note note) {}

    @Transactional(readOnly = true)
    public List<DueCardDto> getDueCards(String userId, String deckId, int limit) {
        deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));
        
        if (limit < 1 || limit > 1000) throw new com.loopdeck.exception.InvalidInputException("El tamaño de repaso debe estar entre 1 y 1000");
        List<Card> dueCards = cardRepository.findDueCardsByDeckId(deckId, Instant.now(), limit);
        
        // Fetch all related notes in a single batch query
        List<String> noteIds = dueCards.stream().map(Card::getNoteId).toList();
        Map<String, Note> notesMap = noteRepository.findAllById(noteIds)
                .stream()
                .collect(java.util.stream.Collectors.toMap(Note::getId, n -> n));
                
        return dueCards.stream()
                .map(c -> new DueCardDto(c, notesMap.get(c.getNoteId())))
                .toList();
    }

    public record StudyBatch(List<DueCardDto> items, DeckService.DeckStats counts, boolean hasMore) {}

    @Transactional(readOnly = true)
    public StudyBatch getStudyBatch(String userId, String deckId, int limit, String order) {
        deckRepository.findByIdAndUserId(deckId, userId).orElseThrow(() -> new IllegalArgumentException("Mazo no encontrado"));
        if (limit < 1 || limit > 100 || !List.of("new_first", "review_first", "mixed").contains(order))
            throw new com.loopdeck.exception.InvalidInputException("Configuración de repaso no válida");
        Instant now = Instant.now();
        var dueCards = cardRepository.findStudyBatch(deckId, now, limit, order);
        var noteIds = dueCards.stream().map(Card::getNoteId).distinct().toList();
        var notes = noteIds.isEmpty() ? Map.<String,Note>of() : noteRepository.findAllById(noteIds).stream().collect(java.util.stream.Collectors.toMap(Note::getId, note -> note));
        var items = dueCards.stream().map(card -> new DueCardDto(card, notes.get(card.getNoteId()))).toList();
        var raw = cardRepository.getStatsForDecks(List.of(deckId), now);
        var counts = raw.isEmpty() ? new DeckService.DeckStats(deckId,0,0,0,0,0) : new DeckService.DeckStats(deckId,
            count(raw.get(0).getNewCount()), count(raw.get(0).getLearningCount()), count(raw.get(0).getReviewCount()),
            count(raw.get(0).getTotalCount()), count(raw.get(0).getNoteCount()));
        return new StudyBatch(items, counts, counts.newCount() + counts.learningCount() + counts.reviewCount() > items.size());
    }
    private static long count(Long value) { return value == null ? 0 : value; }

    @Transactional(readOnly = true)
    public Map<String, String> getCardStatesByDeck(String userId, String deckId) {
        deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Deck not found"));

        return NoteStates.aggregate(cardRepository.findCardStatesByDeckId(deckId));
    }

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
        } else if (rating == 2) {
            int step = Math.max(0, Math.min(card.getLearningStep(), LEARNING_STEPS_MINUTES.length - 1));
            int current = LEARNING_STEPS_MINUTES[step];
            int next = step + 1 < LEARNING_STEPS_MINUTES.length ? LEARNING_STEPS_MINUTES[step + 1] : current * 2;
            card.setLearningStep(step);
            card.setState("learning");
            card.setDue(Instant.now().plusSeconds(Math.round((current + next) / 2.0) * 60L));
        } else {
            int nextStep = card.getLearningStep() + 1;
            if (nextStep >= LEARNING_STEPS_MINUTES.length) {

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
    }

    private void applyRelearning(Card card, int rating) {
        if (rating <= 2) {
            card.setDue(Instant.now().plusSeconds(10 * 60L));
        } else {
            card.setState("review");
            card.setIntervalDays(Math.max(1, card.getIntervalDays() * (rating == 3 ? 0.7 : 1.0)));
            card.setDue(Instant.now().plusSeconds((long)(card.getIntervalDays() * 86400)));
        }
    }
}
