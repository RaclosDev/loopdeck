package com.loopdeck.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.loopdeck.exception.InvalidInputException;
import java.util.Arrays;
import java.util.List;
import java.util.TreeSet;
import java.util.regex.Pattern;

public record NoteContent(String type, String fieldsJson, String tags, List<Integer> ordinals) {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Pattern CLOZE = Pattern.compile("\\{\\{c(\\d+)::(.*?)}}", Pattern.DOTALL);

    public static NoteContent validate(String noteType, String fieldsJson, String tags) {
        String type = noteType == null ? "basic" : noteType;
        if (!List.of("basic", "reverse", "cloze").contains(type)) throw invalid("Tipo de nota no permitido");
        if (fieldsJson == null || fieldsJson.isBlank() || fieldsJson.length() > 5_000_000) throw invalid("Contenido de tarjeta vacío o demasiado grande");
        JsonNode fields;
        try { fields = JSON.readTree(fieldsJson); }
        catch (JsonProcessingException ex) { throw invalid("El contenido debe ser un objeto JSON válido"); }
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
            var matcher = CLOZE.matcher(text);
            var indices = new TreeSet<Integer>();
            while (matcher.find()) {
                try {
                    int index = Integer.parseInt(matcher.group(1));
                    if (index < 1 || matcher.group(2).isBlank()) throw invalid("Los huecos deben tener índice positivo y contenido");
                    indices.add(index);
                } catch (NumberFormatException ex) { throw invalid("Índice de hueco no válido"); }
            }
            if (indices.isEmpty() || indices.size() > 100) throw invalid("La nota debe contener entre 1 y 100 huecos distintos");
            ordinals = List.copyOf(indices);
        } else {
            required(fields, "front"); required(fields, "back");
            ordinals = type.equals("reverse") ? List.of(0, 1) : List.of(0);
        }
        return new NoteContent(type, fields.toString(), normalizedTags, ordinals);
    }

    private static String required(JsonNode fields, String key) {
        JsonNode value = fields.get(key);
        if (value == null || !value.isTextual() || value.asText().isBlank()) throw invalid("Falta contenido en " + key);
        return value.asText();
    }
    private static InvalidInputException invalid(String message) { return new InvalidInputException(message); }
}
