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
    private final FsrsSchedulerService fsrsScheduler;


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


    public record DueCardDto(Card card, Note note, Map<Integer, String> intervals) {}

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
                
        var intervalMap = fsrsScheduler.previewAll(dueCards);
        return dueCards.stream()
                .map(c -> new DueCardDto(c, notesMap.get(c.getNoteId()), intervalMap.get(c.getId())))
                .toList();
    }

    public record StudyBatch(List<DueCardDto> items, DeckService.DeckStats counts, boolean hasMore) {}

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public StudyBatch getStudyBatch(String userId, String deckId, int limit, String order) {
        deckRepository.findByIdAndUserId(deckId, userId).orElseThrow(() -> new IllegalArgumentException("Mazo no encontrado"));
        if (limit < 1 || limit > 100 || !List.of("new_first", "review_first", "mixed").contains(order))
            throw new com.loopdeck.exception.InvalidInputException("Configuración de repaso no válida");
        Instant now = Instant.now();
        var dueCards = cardRepository.findStudyBatch(deckId, now, limit, order);
        var noteIds = dueCards.stream().map(Card::getNoteId).distinct().toList();
        var notes = noteIds.isEmpty() ? Map.<String,Note>of() : noteRepository.findAllById(noteIds).stream().collect(java.util.stream.Collectors.toMap(Note::getId, note -> note));
        var intervalMap = fsrsScheduler.previewAll(dueCards);
        var items = dueCards.stream().map(card -> new DueCardDto(card, notes.get(card.getNoteId()), intervalMap.get(card.getId()))).toList();
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

}
