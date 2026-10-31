package com.loopdeck.service;

import com.loopdeck.TestcontainersConfiguration;
import com.loopdeck.model.*;
import com.loopdeck.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class DataIntegrityIntegrationTest {
    @Autowired CardService cards;
    @Autowired DeckService decks;
    @Autowired CardRepository cardRepository;
    @Autowired NoteRepository notes;
    @Autowired ReviewRepository reviews;
    @Autowired DeckDocumentRepository documents;
    @Autowired JdbcTemplate jdbc;
    @Autowired NoteImportService imports;
    @Autowired NoteQueryService queries;
    @Autowired TemplateService templates;
    @Autowired javax.sql.DataSource dataSource;
    String owner, other;
    @BeforeEach void seedUsers() {
        owner = UUID.randomUUID().toString(); other = UUID.randomUUID().toString();
        for (String user : List.of(owner, other)) jdbc.update("INSERT INTO users(id,email,name) VALUES (?,?,?)", user, user + "@example.invalid", "Data test");
    }
    @AfterEach void cleanUsers() {
        for (String user : List.of(owner, other)) jdbc.update("DELETE FROM users WHERE id = ?", user);
    }
    Deck deck(String user) { return decks.createDeck(user, new DeckService.CreateDeckRequest("Mazo", "", null)); }
    @Test @org.springframework.transaction.annotation.Transactional
    void legacyClozeMigrationKeepsTheOriginalHistoryAndAddsMissingIndices() {
        var deck = deck(owner);
        var note = note(deck, "cloze", "{\"text\":\"{{c1::uno}} {{c3::tres}} {{c1000000000::grande}}\"}");
        var original = cardRepository.findByNoteId(note.getId()).get(0);
        jdbc.update("DELETE FROM cards WHERE note_id=? AND id<>?", note.getId(), original.getId());
        jdbc.update("UPDATE cards SET card_ordinal=0,state='review',interval_days=12,suspended=true WHERE id=?", original.getId());
        jdbc.update("INSERT INTO reviews(id,card_id,rating) VALUES (?,?,3)", UUID.randomUUID().toString(), original.getId());
        var script = new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
            new org.springframework.core.io.ClassPathResource("db/migration/V20__repair_legacy_cloze_cards.sql"));
        script.execute(dataSource);
        assertEquals(1, jdbc.queryForObject("SELECT card_ordinal FROM cards WHERE id=?", Integer.class, original.getId()));
        assertEquals(12.0, jdbc.queryForObject("SELECT interval_days FROM cards WHERE id=?", Double.class, original.getId()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM reviews WHERE card_id=?", Integer.class, original.getId()));
        assertEquals(List.of(1,3,1000000000), jdbc.queryForList("SELECT card_ordinal FROM cards WHERE note_id=? ORDER BY card_ordinal", Integer.class, note.getId()));
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM cards WHERE note_id=? AND suspended=true", Integer.class, note.getId()));
    }
    @Test void bundledTemplateImportsAllNotesWithCardsAndRejectsUnknownTemplates() {
        var user = new User(); user.setId(owner);
        assertThrows(com.loopdeck.exception.InvalidInputException.class, () -> templates.importTemplate(user, "missing"));
        var deck = templates.importTemplate(user, "capitals-europe");
        assertEquals(53, notes.findByDeckId(deck.getId()).size());
        assertEquals(53, cardRepository.findByDeckId(deck.getId()).size());
        assertEquals(53, queries.page(owner, deck.getId(), 0, 25, "", "").total());
    }
    Note note(Deck deck, String type, String json) { return cards.createNote(owner, new CardService.CreateNoteRequest(deck.getId(), type, json, "bio")); }

    @Test void cannotAttachADeckToAnotherAccount() {
        Deck foreign = deck(other);
        assertThrows(IllegalArgumentException.class, () -> decks.createDeck(owner, new DeckService.CreateDeckRequest("Inválido", "", foreign.getId())));
        assertTrue(decks.getDecks(owner).isEmpty());
    }
    @Test void clozeEditsPreserveRetainedSchedulingAndCreateOnlyNewIndices() {
        var deck = deck(owner);
        var note = note(deck, "cloze", "{\"text\":\"{{c1::uno}} {{c3::tres}}\"}");
        var initial = cardRepository.findByNoteId(note.getId());
        assertEquals(Set.of(1,3), new HashSet<>(initial.stream().map(Card::getCardOrdinal).toList()));
        var retained = initial.stream().filter(c -> c.getCardOrdinal() == 1).findFirst().orElseThrow();
        retained.setState("review"); retained.setIntervalDays(12.0); cardRepository.save(retained);
        cards.updateNote(owner, note.getId(), new CardService.UpdateNoteRequest("{\"text\":\"{{c1::uno}} {{c4::cuatro}}\"}", null));
        var updated = cardRepository.findByNoteId(note.getId());
        assertEquals(Set.of(1,4), new HashSet<>(updated.stream().map(Card::getCardOrdinal).toList()));
        var existing = updated.stream().filter(c -> c.getCardOrdinal() == 1).findFirst().orElseThrow();
        assertEquals(retained.getId(), existing.getId()); assertEquals("review", existing.getState()); assertEquals(12.0, existing.getIntervalDays());
    }
    @Test void deletingADeckCascadesToNotesCardsReviewsAndDocumentsOnlyForItsOwner() {
        var deck = deck(owner); var keep = deck(other);
        var note = note(deck, "basic", "{\"front\":\"f\",\"back\":\"b\"}");
        var card = cardRepository.findByNoteId(note.getId()).get(0);
        var review = reviews.save(new Review(null, card.getId(), 3, 1.0, 2.5, 100, Instant.now()));
        var doc = new DeckDocument(); doc.setDeckId(deck.getId()); doc.setFileName("a.txt"); doc.setFileData(new byte[]{1}); documents.save(doc);
        decks.deleteDeck(owner, deck.getId());
        assertFalse(notes.existsById(note.getId())); assertFalse(cardRepository.existsById(card.getId()));
        assertFalse(reviews.existsById(review.getId())); assertFalse(documents.existsById(deck.getId()));
        assertEquals(keep.getId(), decks.getDecks(other).get(0).getId());
    }
    @Test void invalidNoteContentNeverPersists() {
        var deck = deck(owner);
        assertThrows(com.loopdeck.exception.InvalidInputException.class, () -> note(deck, "basic", "null"));
        assertTrue(notes.findByDeckId(deck.getId()).isEmpty());
    }
    @Test void aBatchCreatesTheCorrectCardsAndCanBeRetriedWithoutDuplicates() {
        var deck = deck(owner);
        var body = List.of(
            new CardService.CreateNoteRequest(deck.getId(), "basic", "{\"front\":\"f\",\"back\":\"b\"}", "bio"),
            new CardService.CreateNoteRequest(deck.getId(), "reverse", "{\"front\":\"f\",\"back\":\"b\"}", "bio"),
            new CardService.CreateNoteRequest(deck.getId(), "cloze", "{\"text\":\"{{c1::uno}} {{c2::dos}}\"}", "bio")
        );
        String key = UUID.randomUUID().toString();
        assertFalse(imports.importNotes(owner, deck.getId(), body, key).alreadyApplied());
        assertTrue(imports.importNotes(owner, deck.getId(), body, key).alreadyApplied());
        assertEquals(3, notes.findByDeckId(deck.getId()).size());
        assertEquals(5, cardRepository.findByDeckId(deck.getId()).size());
        assertEquals(5, decks.getDeckStats(owner).get(deck.getId()).newCount());
        assertThrows(com.loopdeck.exception.ConflictException.class, () -> imports.importNotes(owner, deck.getId(), body.subList(0,1), key));
    }
    @Test void aMalformedBatchIsAtomicAndCannotWriteToAnotherAccount() {
        var deck = deck(owner);
        var valid = new CardService.CreateNoteRequest(deck.getId(), "basic", "{\"front\":\"f\",\"back\":\"b\"}", "");
        var invalid = new CardService.CreateNoteRequest(deck.getId(), "basic", "null", "");
        assertThrows(com.loopdeck.exception.InvalidInputException.class, () -> imports.importNotes(owner, deck.getId(), List.of(valid,invalid), UUID.randomUUID().toString()));
        assertTrue(notes.findByDeckId(deck.getId()).isEmpty());
        assertThrows(IllegalArgumentException.class, () -> imports.importNotes(other, deck.getId(), List.of(valid), UUID.randomUUID().toString()));
        assertTrue(notes.findByDeckId(deck.getId()).isEmpty());
    }
    @Test void pagesHaveStableOrderingLiteralSearchAndExactTags() {
        var deck = deck(owner);
        var body = java.util.stream.IntStream.range(0,60).mapToObj(i -> new CardService.CreateNoteRequest(deck.getId(), "basic",
            "{\"front\":\"Concepto " + i + " 10%_!\",\"back\":\"Respuesta\"}", i == 0 ? "bio" : "biología")).toList();
        imports.importNotes(owner, deck.getId(), body, UUID.randomUUID().toString());
        var a = queries.page(owner, deck.getId(), 0, 25, "", "");
        var b = queries.page(owner, deck.getId(), 1, 25, "", "");
        var c = queries.page(owner, deck.getId(), 2, 25, "", "");
        assertEquals(60, a.total()); assertEquals(25, a.items().size()); assertEquals(10,c.items().size());
        var ids = new HashSet<String>();
        for (var page : List.of(a,b,c)) for (var item : page.items()) assertTrue(ids.add(item.note().getId()));
        assertEquals(a.items().stream().map(item -> item.note().getId()).toList(), queries.page(owner,deck.getId(),0,25,"","").items().stream().map(item -> item.note().getId()).toList());
        assertEquals(1, queries.page(owner,deck.getId(),0,25,"10%_!","bio").total());
        assertEquals(0, queries.page(owner,deck.getId(),0,25,"100%_!","").total());
        assertEquals(List.of("bio","biología"),queries.tags(owner,deck.getId()));
        assertThrows(IllegalArgumentException.class, () -> queries.page(other,deck.getId(),0,25,"",""));
    }
    @Test void studyOrdersTheWholeDeckBeforeTakingABlock() {
        var deck = deck(owner);
        var body = java.util.stream.IntStream.range(0,80).mapToObj(i -> new CardService.CreateNoteRequest(deck.getId(), "basic", "{\"front\":\"f\",\"back\":\"b\"}", "")).toList();
        imports.importNotes(owner,deck.getId(),body,UUID.randomUUID().toString());
        var all = cardRepository.findByDeckId(deck.getId());
        for (int i=0;i<60;i++) { var card=all.get(i); card.setState("review"); card.setDue(Instant.now().minusSeconds(100)); cardRepository.save(card); }
        var first = cards.getStudyBatch(owner,deck.getId(),10,"new_first");
        assertTrue(first.items().stream().allMatch(item -> item.card().getState().equals("new")));
        assertTrue(first.hasMore()); assertEquals(80,first.counts().totalCount());
        var reviewsFirst = cards.getStudyBatch(owner,deck.getId(),10,"review_first");
        assertTrue(reviewsFirst.items().stream().allMatch(item -> item.card().getState().equals("review")));
        assertEquals(first.items().stream().map(item -> item.card().getId()).toList(),cards.getStudyBatch(owner,deck.getId(),10,"new_first").items().stream().map(item -> item.card().getId()).toList());
    }
}
