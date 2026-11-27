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
    @Autowired StudyPreparationService preparation;
    @Autowired javax.sql.DataSource dataSource;
    @Autowired AccountService accounts;
    @Autowired RefreshTokenRepository refreshTokens;
    String owner, other;
    @BeforeEach void seedUsers() {
        owner = UUID.randomUUID().toString(); other = UUID.randomUUID().toString();
        for (String user : List.of(owner, other)) jdbc.update("INSERT INTO users(id,email,name) VALUES (?,?,?)", user, user + "@example.invalid", "Data test");
    }
    @AfterEach void cleanUsers() {
        for (String user : List.of(owner, other)) jdbc.update("DELETE FROM users WHERE id = ?", user);
    }
    Deck deck(String user) { return decks.createDeck(user, new DeckService.CreateDeckRequest("Mazo", "", null)); }
    @Test void preparationIsBoundedPerDeckOwnedOrderedAndExpiresAtNextDue() {
        var first = deck(owner); var second = deck(owner); var foreign = deck(other);
        for (var selected : List.of(first, second)) {
            for (int i = 0; i < 5; i++) note(selected, "basic", "{\"front\":\"f\",\"back\":\"b\"}");
        }
        var future = cardRepository.findByDeckId(first.getId()).get(0);
        future.setState("learning"); future.setDue(Instant.now().plusSeconds(20)); cardRepository.save(future);
        var dueReview = cardRepository.findByDeckId(first.getId()).stream().filter(card -> !card.getId().equals(future.getId())).findFirst().orElseThrow();
        dueReview.setState("review"); dueReview.setDue(Instant.now().minusSeconds(10)); cardRepository.save(dueReview);
        for (String order : List.of("new_first", "review_first", "mixed")) {
            var result = preparation.prepare(owner, List.of(first.getId(), second.getId()), order);
            for (var selected : List.of(first, second)) {
                var batch = result.get(selected.getId()).batch();
                assertEquals(2, batch.items().size()); assertTrue(batch.hasMore());
                assertTrue(batch.items().stream().allMatch(pair -> selected.getId().equals(pair.note().getDeckId())));
                assertEquals(2, batch.items().stream().map(pair -> pair.card().getId()).distinct().count());
            }
            if (order.equals("new_first")) assertTrue(result.get(first.getId()).batch().items().stream().allMatch(pair -> pair.card().getState().equals("new")));
            if (order.equals("review_first")) assertEquals("review", result.get(first.getId()).batch().items().get(0).card().getState());
            assertTrue(result.get(first.getId()).validForMs() > 0 && result.get(first.getId()).validForMs() <= 20_000);
            assertEquals(60_000, result.get(second.getId()).validForMs());
        }
        assertThrows(com.loopdeck.exception.InvalidInputException.class, () -> preparation.prepare(owner, List.of(first.getId(), foreign.getId()), "new_first"));
        assertThrows(com.loopdeck.exception.InvalidInputException.class, () -> preparation.prepare(owner, Collections.nCopies(13, first.getId()), "new_first"));
        var empty = deck(owner);
        assertTrue(preparation.prepare(owner, List.of(empty.getId()), "new_first").get(empty.getId()).batch().items().isEmpty());
    }
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
        assertThrows(com.loopdeck.exception.InvalidInputException.class, () -> templates.importTemplate(user.getId(), "missing"));
        var deck = templates.importTemplate(user.getId(), "capitals-europe");
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
        // El hueco c3 ya no existe en el texto: su tarjeta no se borra, queda suspendida.
        assertEquals(Set.of(1,3,4), new HashSet<>(updated.stream().map(Card::getCardOrdinal).toList()));
        assertEquals(Set.of(1,4), new HashSet<>(updated.stream().filter(c -> !c.isSuspended()).map(Card::getCardOrdinal).toList()));
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
    tools.jackson.databind.JsonNode export(String user, int pageSize) {
        try {
            var out = new java.io.ByteArrayOutputStream();
            accounts.exportTo(user, out, pageSize);
            return new tools.jackson.databind.ObjectMapper().readTree(out.toByteArray());
        } catch (java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
    }
    static List<String> ids(tools.jackson.databind.JsonNode array) {
        return array.valueStream().map(item -> item.get("id").asString()).toList();
    }
    @Test void exportPagesThroughEveryRowWithoutRepeatingOrLosingAny() {
        var mine = deck(owner); var second = deck(owner);
        var created = new ArrayList<String>();
        for (int i = 0; i < 7; i++) created.add(note(i % 2 == 0 ? mine : second, "basic", "{\"front\":\"f\",\"back\":\"b\"}").getId());
        for (var card : cardRepository.findByDeckId(mine.getId()))
            for (int r = 0; r < 3; r++) jdbc.update("INSERT INTO reviews(id,card_id,rating) VALUES (?,?,3)", UUID.randomUUID().toString(), card.getId());

        var export = export(owner, 2);

        assertEquals(created.stream().sorted().toList(), ids(export.get("notes")));
        assertEquals(7, export.get("cards").size());
        assertEquals(7, export.get("cards").valueStream().map(card -> card.get("id").asString()).distinct().count());
        assertEquals(12, export.get("reviews").size());
    }
    @Test void exportContainsOnlyTheOwnersDataAndDeletionRemovesEverything() {
        var mine = deck(owner); var foreign = deck(other);
        var note = note(mine, "basic", "{\"front\":\"f\",\"back\":\"b\"}");
        cards.createNote(other, new CardService.CreateNoteRequest(foreign.getId(), "basic", "{\"front\":\"x\",\"back\":\"y\"}", ""));
        var card = cardRepository.findByNoteId(note.getId()).get(0);
        jdbc.update("INSERT INTO reviews(id,card_id,rating) VALUES (?,?,3)", UUID.randomUUID().toString(), card.getId());
        refreshTokens.save(new com.loopdeck.model.RefreshToken(owner, Instant.now().plusSeconds(60)));

        var export = export(owner, 500);
        assertEquals(List.of("exportedAt", "account", "decks", "documents", "notes", "cards", "reviews"), export.propertyNames().stream().toList());
        assertEquals(owner, export.get("account").get("id").asString());
        assertEquals(List.of(mine.getId()), ids(export.get("decks")));
        assertEquals(List.of(note.getId()), ids(export.get("notes")));
        assertEquals(1, export.get("cards").size());
        assertEquals(1, export.get("reviews").size());

        accounts.delete(owner);
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM users WHERE id=?", Integer.class, owner));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM decks WHERE user_id=?", Integer.class, owner));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM cards WHERE id=?", Integer.class, card.getId()));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM reviews WHERE card_id=?", Integer.class, card.getId()));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE user_id=?", Integer.class, owner));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM decks WHERE user_id=?", Integer.class, other));
    }

    @Test void removingAClozeHoleSuspendsItsCardAndRestoringItBringsBackTheSameCardWithItsReviews() {
        var deck = deck(owner);
        var note = note(deck, "cloze", "{\"text\":\"{{c1::uno}} {{c2::dos}}\"}");
        var second = cardRepository.findByNoteId(note.getId()).stream().filter(c -> c.getCardOrdinal() == 2).findFirst().orElseThrow();
        second.setState("review"); second.setIntervalDays(30.0); second.setRepetitions(4); cardRepository.save(second);
        jdbc.update("INSERT INTO reviews(id,card_id,rating) VALUES (?,?,3)", UUID.randomUUID().toString(), second.getId());

        cards.updateNote(owner, note.getId(), new CardService.UpdateNoteRequest("{\"text\":\"{{c1::uno}}\"}", null));
        var suspended = cardRepository.findById(second.getId()).orElseThrow();
        assertTrue(suspended.isSuspended());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM reviews WHERE card_id=?", Integer.class, second.getId()));
        assertEquals(2, cardRepository.findByNoteId(note.getId()).size());

        cards.updateNote(owner, note.getId(), new CardService.UpdateNoteRequest("{\"text\":\"{{c1::uno}} {{c2::dos otra vez}}\"}", null));
        var back = cardRepository.findByNoteId(note.getId());
        assertEquals(2, back.size());
        var restored = back.stream().filter(c -> c.getCardOrdinal() == 2).findFirst().orElseThrow();
        assertEquals(second.getId(), restored.getId());
        assertFalse(restored.isSuspended());
        assertEquals("review", restored.getState());
        assertEquals(30.0, restored.getIntervalDays());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM reviews WHERE card_id=?", Integer.class, restored.getId()));
    }

    @Test void aNoteCannotHaveTwoCardsWithTheSameOrdinal() {
        var deck = deck(owner);
        var note = note(deck, "cloze", "{\"text\":\"{{c1::uno}}\"}");
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
            () -> cardRepository.saveAndFlush(Card.builder().noteId(note.getId()).deckId(deck.getId()).cardOrdinal(1).build()));
    }

    @Test void simultaneousClozeEditsNeverLeaveDuplicateOrInconsistentCards() throws Exception {
        var deck = deck(owner);
        var note = note(deck, "cloze", "{\"text\":\"{{c1::uno}}\"}");
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < 5; round++) {
                var barrier = new java.util.concurrent.CyclicBarrier(2);
                String textA = "{{c1::uno}} {{c2::dos}} {{c" + (10 + round) + "::a}}", textB = "{{c1::uno}} {{c3::tres}} {{c" + (20 + round) + "::b}}";
                var tasks = List.of(textA, textB).stream().map(text -> (java.util.concurrent.Callable<Boolean>) () -> {
                    barrier.await();
                    try { cards.updateNote(owner, note.getId(), new CardService.UpdateNoteRequest("{\"text\":\"" + text + "\"}", null)); return true; }
                    catch (org.springframework.dao.OptimisticLockingFailureException | org.springframework.dao.DataIntegrityViolationException conflict) { return false; }
                }).toList();
                var results = new ArrayList<Boolean>();
                for (var future : pool.invokeAll(tasks)) results.add(future.get());
                assertTrue(results.contains(true), "al menos una edición debe aplicarse");
                // Quien gana deja las tarjetas activas exactamente como pide el texto final; nunca hay dos tarjetas por hueco.
                var text = notes.findById(note.getId()).orElseThrow().getFieldsJson();
                var active = new TreeSet<Integer>();
                var all = cardRepository.findByNoteId(note.getId());
                for (var card : all) if (!card.isSuspended()) active.add(card.getCardOrdinal());
                assertEquals(NoteContent.clozeIndices(new tools.jackson.databind.ObjectMapper().readTree(text).get("text").asText()), active);
                assertEquals(all.size(), all.stream().map(Card::getCardOrdinal).distinct().count());
            }
        } finally { pool.shutdownNow(); }
    }

    @Test @org.springframework.transaction.annotation.Transactional
    void migrationV25SetsDuplicateCardsAsideWithoutLosingAnyHistoryAndThenEnforcesUniqueness() {
        jdbc.execute("ALTER TABLE cards DROP CONSTRAINT uq_cards_note_ordinal");
        jdbc.execute("ALTER TABLE notes DROP COLUMN version");
        String deckId = UUID.randomUUID().toString(), noteId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO decks(id,user_id,name) VALUES (?,?,'Mazo')", deckId, owner);
        jdbc.update("INSERT INTO notes(id,user_id,deck_id,note_type,fields_json) VALUES (?,?,?,'cloze','{}')", noteId, owner, deckId);
        String older = "00000000-0000-0000-0000-00000000000a", studied = "00000000-0000-0000-0000-00000000000b", newer = "00000000-0000-0000-0000-00000000000c";
        String otherOlder = "00000000-0000-0000-0000-00000000000d", otherNewer = "00000000-0000-0000-0000-00000000000e";
        jdbc.update("INSERT INTO cards(id,note_id,deck_id,card_ordinal,repetitions,created_at) VALUES (?,?,?,2,0,'2026-01-01'),(?,?,?,2,5,'2026-02-01'),(?,?,?,2,0,'2026-03-01')",
            older, noteId, deckId, studied, noteId, deckId, newer, noteId, deckId);
        jdbc.update("INSERT INTO cards(id,note_id,deck_id,card_ordinal,repetitions,created_at) VALUES (?,?,?,3,0,'2026-01-01'),(?,?,?,3,0,'2026-02-01')",
            otherOlder, noteId, deckId, otherNewer, noteId, deckId);
        for (String card : List.of(older, studied, newer, otherNewer)) jdbc.update("INSERT INTO reviews(id,card_id,rating) VALUES (?,?,3)", UUID.randomUUID().toString(), card);

        new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
            new org.springframework.core.io.ClassPathResource("db/migration/V25__notas_version_y_tarjeta_unica_por_ordinal.sql")).execute(dataSource);

        assertEquals(2, jdbc.queryForObject("SELECT card_ordinal FROM cards WHERE id=?", Integer.class, studied));
        assertEquals(3, jdbc.queryForObject("SELECT card_ordinal FROM cards WHERE id=?", Integer.class, otherOlder));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM cards WHERE id IN (?,?) AND suspended", Integer.class, studied, otherOlder));
        var moved = jdbc.queryForList("SELECT card_ordinal FROM cards WHERE id IN (?,?,?) ORDER BY card_ordinal", Integer.class, older, newer, otherNewer);
        assertEquals(3, new HashSet<>(moved).size());
        assertTrue(moved.stream().allMatch(ordinal -> ordinal < 0));
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM cards WHERE id IN (?,?,?) AND suspended", Integer.class, older, newer, otherNewer));
        assertEquals(5, jdbc.queryForObject("SELECT count(*) FROM cards WHERE note_id=?", Integer.class, noteId));
        assertEquals(4, jdbc.queryForObject("SELECT count(*) FROM reviews WHERE card_id IN (?,?,?,?,?)", Integer.class, older, studied, newer, otherOlder, otherNewer));
        assertEquals(0L, jdbc.queryForObject("SELECT version FROM notes WHERE id=?", Long.class, noteId));
        jdbc.execute("SAVEPOINT antes_del_duplicado");
        assertThrows(org.springframework.dao.DuplicateKeyException.class,
            () -> jdbc.update("INSERT INTO cards(id,note_id,deck_id,card_ordinal) VALUES (?,?,?,2)", UUID.randomUUID().toString(), noteId, deckId));
        jdbc.execute("ROLLBACK TO SAVEPOINT antes_del_duplicado");
    }

    @Test void learningCardsDueNowComeBeforeNewAndReviewCardsInEveryStudyQueue() {
        var deck = deck(owner);
        var body = java.util.stream.IntStream.range(0, 24).mapToObj(i -> new CardService.CreateNoteRequest(deck.getId(), "basic", "{\"front\":\"f\",\"back\":\"b\"}", "")).toList();
        imports.importNotes(owner, deck.getId(), body, UUID.randomUUID().toString());
        var all = cardRepository.findByDeckId(deck.getId());
        // 20 nuevas, 3 de repaso vencidas desde hace días y 1 en aprendizaje que vence ahora.
        for (int i = 0; i < 3; i++) { var card = all.get(i); card.setState("review"); card.setDue(Instant.now().minusSeconds(86_400L * (i + 2))); cardRepository.save(card); }
        for (String state : List.of("learning", "relearning")) {
            var learning = all.get(3);
            learning.setState(state); learning.setDue(Instant.now().minusSeconds(60)); cardRepository.save(learning);
            for (String order : List.of("new_first", "review_first", "mixed")) {
                assertEquals(learning.getId(), cards.getStudyBatch(owner, deck.getId(), 5, order).items().get(0).card().getId(), state + " " + order);
                assertEquals(learning.getId(), preparation.prepare(owner, List.of(deck.getId()), order).get(deck.getId()).batch().items().get(0).card().getId(), state + " preparada " + order);
            }
            assertEquals(learning.getId(), cards.getDueCards(owner, deck.getId(), 5).get(0).card().getId(), state + " pendientes");
        }
    }
}
