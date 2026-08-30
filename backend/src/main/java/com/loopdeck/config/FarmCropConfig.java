package com.loopdeck.config;

import java.util.Map;
import java.util.HashMap;

public class FarmCropConfig {

    public record CropDef(String id, String name, String emoji, long maturationHours, long cycleHours, String unlockRequirement) {}
    public record UnlockDef(String id, String name, String emoji, String requirement) {}

    private static final Map<String, CropDef> CROPS = new HashMap<>();
    private static final Map<String, UnlockDef> DECORATIONS = new HashMap<>();

    static {
        // Crops (from PDF p. 6)
        CROPS.put("lettuce", new CropDef("lettuce", "Lechuga", "🥬", 24, 24, "default"));
        CROPS.put("tomato", new CropDef("tomato", "Tomate", "🍅", 48, 48, "default"));
        CROPS.put("corn", new CropDef("corn", "Maíz", "🌽", 72, 72, "streak_7"));
        CROPS.put("pumpkin", new CropDef("pumpkin", "Calabaza", "🎃", 96, 96, "cards_500"));
        CROPS.put("watermelon", new CropDef("watermelon", "Sandía", "🍉", 120, 120, "deck_mastered_1"));

        // Decorations (from PDF p. 6)
        DECORATIONS.put("scarecrow", new UnlockDef("scarecrow", "Espantapájaros", "🎃", "streak_14"));
        DECORATIONS.put("chickens", new UnlockDef("chickens", "Gallinas", "🐔", "streak_30"));
        DECORATIONS.put("barn", new UnlockDef("barn", "Granero", "🛖", "cards_1000"));
        DECORATIONS.put("fence", new UnlockDef("fence", "Valla de madera", "🪵", "streak_60"));
        DECORATIONS.put("well", new UnlockDef("well", "Pozo", "🪣", "deck_mastered_3"));
    }

    public static CropDef getCrop(String id) {
        return CROPS.get(id);
    }

    public static Map<String, CropDef> getAllCrops() {
        return CROPS;
    }

    public static Map<String, UnlockDef> getAllDecorations() {
        return DECORATIONS;
    }
}
