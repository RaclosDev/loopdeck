package com.loopdeck.util;

import java.util.Locale;

/** Forma única de comparar y guardar emails: sin espacios y en minúsculas independientes del locale. */
public final class Emails {

    private Emails() {
    }

    /** Devuelve el email normalizado, o {@code null} si no hay email. */
    public static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
