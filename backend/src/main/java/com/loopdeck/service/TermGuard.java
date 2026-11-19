package com.loopdeck.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Detecta y oculta el término definido dentro de su propia definición
 * (incluidas formas derivadas: «perro» → «perrito», «perra»).
 */
final class TermGuard {

    static final String MASK = "…";
    private static final Pattern WORD = Pattern.compile("[\\p{L}\\p{N}]+");
    private static final int MIN_TOKEN = 3;
    private static final Set<String> STOPWORDS = Set.of(
        "del", "las", "los", "una", "uno", "unos", "unas", "con", "sin", "por", "para", "que", "sus", "the", "and", "of");

    private TermGuard() {}

    static boolean containsTerm(String definition, String term) {
        if (definition == null || term == null) return false;
        List<Stem> stems = stems(term);
        if (stems.isEmpty()) return false;
        Matcher m = WORD.matcher(definition);
        while (m.find()) {
            if (matches(normalize(m.group()), stems)) return true;
        }
        return false;
    }

    static String mask(String definition, String term) {
        if (definition == null || term == null) return definition;
        List<Stem> stems = stems(term);
        if (stems.isEmpty()) return definition;
        Matcher m = WORD.matcher(definition);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(out, matches(normalize(m.group()), stems) ? MASK : Matcher.quoteReplacement(m.group()));
        }
        m.appendTail(out);
        return out.toString().replaceAll("…(\\s*…)+", MASK);
    }

    /** Palabras cortas: forma exacta o plural. Largas: cualquier palabra que empiece por su raíz. */
    private record Stem(String root, boolean exact) {}

    private static boolean matches(String token, List<Stem> stems) {
        for (Stem stem : stems) {
            boolean hit = stem.exact()
                ? token.equals(stem.root()) || token.equals(stem.root() + "s") || token.equals(stem.root() + "es")
                : token.startsWith(stem.root());
            if (hit) return true;
        }
        return false;
    }

    /** Raíz aproximada de cada palabra significativa del término. */
    private static List<Stem> stems(String term) {
        List<Stem> stems = new ArrayList<>();
        Matcher m = WORD.matcher(term);
        while (m.find()) {
            String token = normalize(m.group());
            if (token.length() < MIN_TOKEN || STOPWORDS.contains(token)) continue;
            if (token.length() <= 4) {
                stems.add(new Stem(token, true));
            } else {
                int cut = token.length() >= 7 ? 2 : 1;
                stems.add(new Stem(token.substring(0, token.length() - cut), false));
            }
        }
        return stems;
    }

    private static String normalize(String s) {
        return Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
