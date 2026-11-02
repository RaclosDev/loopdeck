package com.loopdeck.service;

import com.loopdeck.exception.InvalidInputException;
import com.loopdeck.model.Note;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudyPreparationService {
    private final DeckRepository decks;
    private final CardRepository cards;
    private final NoteRepository notes;
    public record PreparedStudy(CardService.StudyBatch batch, long validForMs) {}

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String, PreparedStudy> prepare(String user, List<String> ids, String order) {
        if (ids == null || ids.isEmpty() || ids.size() > 12 || ids.stream().anyMatch(id -> id == null || id.isBlank()) ||
            order == null || !List.of("new_first", "review_first", "mixed").contains(order))
            throw new InvalidInputException("Preparación de mazos no válida");
        List<String> selected = ids.stream().distinct().toList();
        if (decks.findByIdInAndUserId(selected, user).size() != selected.size())
            throw new InvalidInputException("Mazo no disponible");
        Instant now = Instant.now();
        var prepared = cards.findPreparedCards(user, selected, now, order);
        var noteIds = prepared.stream().map(card -> card.getNoteId()).distinct().toList();
        Map<String, Note> noteMap = noteIds.isEmpty() ? Map.of() : notes.findAllById(noteIds).stream()
            .collect(Collectors.toMap(Note::getId, note -> note));
        var stats = cards.getStatsForDecks(selected, now).stream()
            .collect(Collectors.toMap(CardRepository.DeckStatsProjection::getDeckId, value -> value));
        var nextDue = cards.findNextDue(selected, now).stream()
            .collect(Collectors.toMap(CardRepository.NextDueProjection::getDeckId, CardRepository.NextDueProjection::getNextDue));
        Map<String, PreparedStudy> result = new LinkedHashMap<>();
        for (String id : selected) {
            var items = prepared.stream().filter(card -> id.equals(card.getDeckId()))
                .map(card -> new CardService.DueCardDto(card, noteMap.get(card.getNoteId()))).toList();
            var raw = stats.get(id);
            var counts = raw == null ? new DeckService.DeckStats(id,0,0,0,0,0) :
                new DeckService.DeckStats(id, count(raw.getNewCount()), count(raw.getLearningCount()), count(raw.getReviewCount()),
                    count(raw.getTotalCount()), count(raw.getNoteCount()));
            long validFor = nextDue.containsKey(id) ? Math.max(0, Math.min(60_000, Duration.between(Instant.now(), nextDue.get(id)).toMillis())) : 60_000;
            result.put(id, new PreparedStudy(new CardService.StudyBatch(items, counts,
                counts.newCount() + counts.learningCount() + counts.reviewCount() > items.size()), validFor));
        }
        return result;
    }
    private static long count(Long value) { return value == null ? 0 : value; }
}
