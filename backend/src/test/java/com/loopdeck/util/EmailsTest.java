package com.loopdeck.util;

import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class EmailsTest {

    @Test
    void trimsAndLowercases() {
        assertEquals("ana@example.com", Emails.normalize("  Ana@Example.COM "));
        assertNull(Emails.normalize(null));
    }

    @Test
    void doesNotDependOnTheDefaultLocale() {
        Locale previous = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr"));
            assertEquals("info@example.com", Emails.normalize("INFO@EXAMPLE.COM"));
        } finally {
            Locale.setDefault(previous);
        }
    }
}
