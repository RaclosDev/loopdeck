package com.loopdeck.service;

import com.loopdeck.repository.CardRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class NoteStates {
    private NoteStates() {}
    public static Map<String, String> aggregate(List<CardRepository.CardStateProjection> rows) {
        Map<String, String> states = new HashMap<>();
        for (var row : rows) {
            String state = "relearning".equals(row.getState()) ? "learning" : row.getState();
            if (!List.of("learning", "new", "review").contains(state == null ? "" : state)) state = "new";
            states.merge(row.getNoteId(), state, (left, right) -> rank(left) <= rank(right) ? left : right);
        }
        return states;
    }
    private static int rank(String state) { return switch (state) { case "learning" -> 0; case "new" -> 1; default -> 2; }; }
}
