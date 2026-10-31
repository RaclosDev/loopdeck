package com.loopdeck.service;

import com.loopdeck.exception.InvalidInputException;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class NoteContentTest {
    @Test void rejectsInvalidJsonShapesAndFieldTypes() {
        for (String json : List.of("null", "[]", "1", "{", "{\"front\":42,\"back\":\"ok\"}", "{\"front\":\"ok\",\"back\":null}")) {
            assertThrows(InvalidInputException.class, () -> NoteContent.validate("basic", json, ""), json);
        }
        assertThrows(InvalidInputException.class, () -> NoteContent.validate("unknown", "{}", ""));
    }
    @Test void generatesOneCardForEachDistinctClozeIndex() {
        var content = NoteContent.validate("cloze", "{\"text\":\"{{c3::tres}} y {{c1::uno}} y {{c3::repetido::pista}}\"}", " bio, bio , repaso ");
        assertEquals(List.of(1, 3), content.ordinals());
        assertEquals("bio,repaso", content.tags());
        assertThrows(InvalidInputException.class, () -> NoteContent.validate("cloze", "{\"text\":\"sin huecos\"}", ""));
    }
    @Test void preservesBasicAndReverseOrdinals() {
        assertEquals(List.of(0), NoteContent.validate(null, "{\"front\":\"f\",\"back\":\"b\"}", null).ordinals());
        assertEquals(List.of(0, 1), NoteContent.validate("reverse", "{\"front\":\"f\",\"back\":\"b\"}", "").ordinals());
    }
}
