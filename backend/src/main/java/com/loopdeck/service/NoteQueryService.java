package com.loopdeck.service;

import com.loopdeck.exception.InvalidInputException;
import com.loopdeck.model.Note;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NoteQueryService {
    private final DeckRepository decks;
    private final CardRepository cards;
    private final JdbcTemplate jdbc;
    public record NoteItem(Note note, String state) {}
    public record NotePage(List<NoteItem> items, long total, int page, int size) {}
    private static final String FILTER = " FROM notes n WHERE n.deck_id = ? AND n.user_id = ? " +
        "AND (LOWER(COALESCE(n.fields_json->>'front','')) LIKE ? ESCAPE '!' " +
        "OR LOWER(COALESCE(n.fields_json->>'back','')) LIKE ? ESCAPE '!' " +
        "OR LOWER(COALESCE(n.fields_json->>'text','')) LIKE ? ESCAPE '!') " +
        "AND (? = '' OR EXISTS (SELECT 1 FROM unnest(string_to_array(COALESCE(n.tags,''),',')) tag WHERE BTRIM(tag) = ?))";

    @Transactional(readOnly = true)
    public NotePage page(String user, String deck, int page, int size, String search, String tag) {
        own(user, deck);
        if (page < 0 || page > 100000 || size < 1 || size > 50 || search == null || search.length() > 500 || tag == null || tag.length() > 1000)
            throw new InvalidInputException("Filtros o tamaño de página no válidos");
        String pattern = "%" + search.toLowerCase(java.util.Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_") + "%";
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + FILTER, Long.class, deck,user,pattern,pattern,pattern,tag,tag);
        List<Note> notes = jdbc.query("SELECT n.*" + FILTER + " ORDER BY n.created_at DESC,n.id DESC LIMIT ? OFFSET ?", (rs, row) -> {
            Note note = new Note(); note.setId(rs.getString("id")); note.setUserId(user); note.setDeckId(deck);
            note.setNoteType(rs.getString("note_type")); note.setFieldsJson(rs.getString("fields_json")); note.setTags(rs.getString("tags"));
            var created = rs.getObject("created_at", java.time.LocalDateTime.class);
            var updated = rs.getObject("updated_at", java.time.LocalDateTime.class);
            note.setCreatedAt(created == null ? null : created.toInstant(java.time.ZoneOffset.UTC));
            note.setUpdatedAt(updated == null ? null : updated.toInstant(java.time.ZoneOffset.UTC));
            return note;
        }, deck,user,pattern,pattern,pattern,tag,tag,size,page * size);
        var states = notes.isEmpty() ? java.util.Map.<String,String>of() : NoteStates.aggregate(cards.findCardStatesForNotes(deck, notes.stream().map(Note::getId).toList()));
        return new NotePage(notes.stream().map(note -> new NoteItem(note, states.getOrDefault(note.getId(), "new"))).toList(), total == null ? 0 : total, page, size);
    }
    @Transactional(readOnly = true)
    public List<String> tags(String user, String deck) {
        own(user, deck);
        return jdbc.queryForList("SELECT DISTINCT BTRIM(tag) AS tag FROM notes n CROSS JOIN LATERAL unnest(string_to_array(COALESCE(n.tags,''),',')) tag " +
            "WHERE n.deck_id = ? AND n.user_id = ? AND BTRIM(tag) <> '' ORDER BY tag", String.class, deck, user);
    }
    private void own(String user, String deck) { decks.findByIdAndUserId(deck,user).orElseThrow(() -> new IllegalArgumentException("Mazo no encontrado")); }
}
