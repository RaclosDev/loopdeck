package com.loopdeck.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.loopdeck.exception.ConflictException;
import com.loopdeck.exception.InvalidInputException;
import com.loopdeck.repository.DeckRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
@RequiredArgsConstructor
public class NoteImportService {
    private final DeckRepository decks;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public record ImportResult(int importedCount, boolean alreadyApplied) {}
    private record PreparedNote(String id, NoteContent content) {}
    private record PreparedCard(String id, String noteId, int ordinal) {}

    @Transactional
    public ImportResult importNotes(String user, String deck, List<CardService.CreateNoteRequest> requests, String requestId) {
        decks.findByIdAndUserId(deck, user).orElseThrow(() -> new IllegalArgumentException("Mazo no encontrado"));
        if (requests == null || requests.isEmpty() || requests.size() > 500) throw new InvalidInputException("El lote debe contener entre 1 y 500 notas");
        List<NoteContent> contents = requests.stream().map(req -> {
            if (req == null) throw new InvalidInputException("El lote contiene una nota vacía");
            return NoteContent.validate(req.noteType(), req.fieldsJson(), req.tags());
        }).toList();
        if (requestId != null) {
            String id;
            try {
                id = UUID.fromString(requestId).toString();
                if (!id.equalsIgnoreCase(requestId)) throw new IllegalArgumentException();
            } catch (IllegalArgumentException ex) { throw new InvalidInputException("Identificador de lote no válido"); }
            String hash = digest(contents);
            int inserted = jdbc.update("INSERT INTO note_imports(id,user_id,deck_id,request_hash) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING", id, user, deck, hash);
            if (inserted == 0) {
                Boolean same = jdbc.queryForObject("SELECT user_id = ? AND deck_id = ? AND request_hash = ? FROM note_imports WHERE id = ?", Boolean.class, user, deck, hash, id);
                if (!Boolean.TRUE.equals(same)) throw new ConflictException("El identificador de lote ya corresponde a otra acción");
                return new ImportResult(contents.size(), true);
            }
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        var prepared = contents.stream().map(content -> new PreparedNote(UUID.randomUUID().toString(), content)).toList();
        jdbc.batchUpdate("INSERT INTO notes(id,user_id,deck_id,note_type,fields_json,tags,created_at,updated_at) VALUES (?,?,?,?,CAST(? AS jsonb),?,?,?)", prepared, 100, (ps, note) -> {
            ps.setString(1,note.id()); ps.setString(2,user); ps.setString(3,deck); ps.setString(4,note.content().type());
            ps.setString(5,note.content().fieldsJson()); ps.setString(6,note.content().tags()); ps.setObject(7,now); ps.setObject(8,now);
        });
        var cards = new ArrayList<PreparedCard>();
        for (var note : prepared) for (int ordinal : note.content().ordinals()) cards.add(new PreparedCard(UUID.randomUUID().toString(), note.id(), ordinal));
        jdbc.batchUpdate("INSERT INTO cards(id,note_id,deck_id,card_ordinal,state,due,interval_days,ease_factor,repetitions,lapses,learning_step,suspended,buried,is_leech,created_at) VALUES (?,?,?,?,'new',?,0,2.5,0,0,0,false,false,false,?)", cards, 100, (ps, card) -> {
            ps.setString(1,card.id()); ps.setString(2,card.noteId()); ps.setString(3,deck); ps.setInt(4,card.ordinal()); ps.setObject(5,now); ps.setObject(6,now);
        });
        return new ImportResult(prepared.size(), false);
    }
    private String digest(List<NoteContent> contents) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(contents))); }
        catch (NoSuchAlgorithmException | JsonProcessingException ex) { throw new IllegalStateException("Unable to identify import batch", ex); }
    }
}
