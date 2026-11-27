package com.loopdeck.service;

import com.loopdeck.exception.InvalidInputException;
import org.junit.jupiter.api.Test;
import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;
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

    private static String cloze(String text) {
        return "{\"text\":\"" + text + "\"}";
    }

    @Test void manyUnclosedHolesDoNotBlockTheThread() {
        // Con la expresión regular anterior, esto (cientos de miles de "{{c1::" sin cerrar) tardaba minutos.
        String hostile = "{{c1::".repeat(150_000);
        assertTimeoutPreemptively(Duration.ofSeconds(2), () ->
            assertThrows(InvalidInputException.class, () -> NoteContent.validate("cloze", cloze(hostile), "")));
        String closedLate = hostile + "x}}";
        assertTimeoutPreemptively(Duration.ofSeconds(2), () ->
            assertEquals(List.of(1), NoteContent.validate("cloze", cloze(closedLate), "").ordinals()));
    }

    @Test void rejectsTextOverTheClozeLimitAndMoreThanOneHundredHoles() {
        String tooLong = "{{c1::a}} " + "x".repeat(NoteContent.MAX_CLOZE_TEXT);
        assertThrows(InvalidInputException.class, () -> NoteContent.validate("cloze", cloze(tooLong), ""));
        StringBuilder many = new StringBuilder();
        for (int i = 1; i <= 101; i++) many.append("{{c").append(i).append("::a}} ");
        assertThrows(InvalidInputException.class, () -> NoteContent.validate("cloze", cloze(many.toString()), ""));
        assertEquals(100, NoteContent.validate("cloze", cloze(many.substring(0, many.lastIndexOf("{{c101"))), "").ordinals().size());
    }

    @Test void theScannerGivesTheSameResultAsTheOriginalRegexInNormalCases() {
        Pattern original = Pattern.compile("\\{\\{c(\\d+)::(.*?)}}", Pattern.DOTALL);
        for (String text : List.of(
            "{{c1::uno}}", "a {{c2::dos}} b {{c1::uno::pista}} c", "{{c1::a}}{{c2::b}}", "{{c1::a}}}", "{{c1::a}} {{c1::b}}",
            "sin huecos {{c::x}} {{cx1::y}} {{c1:x}}", "{{{c1::dentro}}", "{{c1::a\nb}}", "{{c1::{{c2::anidado}}}}",
            "{{c1::sin cerrar", "{{c1::a}} {{c2::sin cerrar", "{{c7::siete}} y {{c03::tres}}", "{{c1::}}", "{{c0::cero}}")) {
            var expected = new java.util.TreeSet<Integer>();
            RuntimeException expectedError = null;
            var matcher = original.matcher(text);
            while (matcher.find()) {
                int index = Integer.parseInt(matcher.group(1));
                if (index < 1 || matcher.group(2).isBlank()) { expectedError = new RuntimeException(); break; }
                expected.add(index);
            }
            if (expectedError != null) {
                assertThrows(InvalidInputException.class, () -> NoteContent.clozeIndices(text), text);
            } else {
                assertEquals(expected, NoteContent.clozeIndices(text), text);
            }
        }
    }
}
