package com.loopdeck.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.loopdeck.exception.InvalidInputException;
import java.util.Arrays;
import java.util.List;
import java.util.TreeSet;

public record NoteContent(String type, String fieldsJson, String tags, List<Integer> ordinals) {
    private static final ObjectMapper JSON = new ObjectMapper();
    /** Tope del texto de una nota cloze; el análisis es lineal, pero no tiene sentido admitir megabytes de huecos. */
    static final int MAX_CLOZE_TEXT = 1_000_000;
    static final int MAX_CLOZE_HOLES = 100;

    public static NoteContent validate(String noteType, String fieldsJson, String tags) {
        String type = noteType == null ? "basic" : noteType;
        if (!List.of("basic", "reverse", "cloze").contains(type)) throw invalid("Tipo de nota no permitido");
        if (fieldsJson == null || fieldsJson.isBlank() || fieldsJson.length() > 5_000_000) throw invalid("Contenido de tarjeta vacío o demasiado grande");
        JsonNode fields;
        try { fields = JSON.readTree(fieldsJson); }
        catch (JacksonException ex) { throw invalid("El contenido debe ser un objeto JSON válido"); }
        if (fields == null || !fields.isObject()) throw invalid("El contenido debe ser un objeto JSON válido");
        for (String key : List.of("front", "back", "text")) {
            if (fields.has(key) && !fields.get(key).isTextual()) throw invalid("Los campos de la tarjeta deben ser texto");
        }
        String tagText = tags == null ? "" : tags;
        if (tagText.length() > 1000) throw invalid("Las etiquetas son demasiado largas");
        String normalizedTags = String.join(",", Arrays.stream(tagText.split(",")).map(String::strip).filter(t -> !t.isEmpty()).distinct().toList());
        List<Integer> ordinals;
        if (type.equals("cloze")) {
            String text = required(fields, "text");
            if (text.length() > MAX_CLOZE_TEXT) throw invalid("El texto de la nota es demasiado largo");
            var indices = clozeIndices(text);
            if (indices.isEmpty() || indices.size() > MAX_CLOZE_HOLES) throw invalid("La nota debe contener entre 1 y 100 huecos distintos");
            ordinals = List.copyOf(indices);
        } else {
            required(fields, "front"); required(fields, "back");
            ordinals = type.equals("reverse") ? List.of(0, 1) : List.of(0);
        }
        return new NoteContent(type, fields.toString(), normalizedTags, ordinals);
    }

    /**
     * Índices de los huecos {{cN::contenido}} del texto, de menor a mayor. Recorrido lineal con
     * indexOf: una expresión regular con ".*?" y miles de "{{c1::" sin cerrar tardaba un tiempo
     * cuadrático. Un hueco acaba en el primer "}}" posterior; si no hay ninguno, ningún hueco
     * posterior podría cerrarse tampoco, así que se termina.
     */
    static TreeSet<Integer> clozeIndices(String text) {
        var indices = new TreeSet<Integer>();
        int from = 0;
        while (true) {
            int open = text.indexOf("{{c", from);
            if (open < 0) break;
            int digitsStart = open + 3;
            int digitsEnd = digitsStart;
            while (digitsEnd < text.length() && text.charAt(digitsEnd) >= '0' && text.charAt(digitsEnd) <= '9') digitsEnd++;
            if (digitsEnd == digitsStart || !text.startsWith("::", digitsEnd)) { from = open + 1; continue; }
            int contentStart = digitsEnd + 2;
            int close = text.indexOf("}}", contentStart);
            if (close < 0) break;
            int index;
            try { index = Integer.parseInt(text, digitsStart, digitsEnd, 10); }
            catch (NumberFormatException ex) { throw invalid("Índice de hueco no válido"); }
            if (index < 1 || text.substring(contentStart, close).isBlank()) throw invalid("Los huecos deben tener índice positivo y contenido");
            indices.add(index);
            if (indices.size() > MAX_CLOZE_HOLES) break;
            from = close + 2;
        }
        return indices;
    }

    private static String required(JsonNode fields, String key) {
        JsonNode value = fields.get(key);
        if (value == null || !value.isTextual() || value.asText().isBlank()) throw invalid("Falta contenido en " + key);
        return value.asText();
    }
    private static InvalidInputException invalid(String message) { return new InvalidInputException(message); }
}
