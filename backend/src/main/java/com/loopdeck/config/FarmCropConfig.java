package com.loopdeck.config;

import java.util.*;

/**
 * Static configuration for all farm game data:
 * crops, items, tools, decorations, levels, and plot costs.
 */
public final class FarmCropConfig {

    private FarmCropConfig() {}

    // ── Crop Definition ───────────────────────────────────────────
    public record CropDef(
        String id, String name, String emoji, int tier,
        int seedCost, long growthMinutes, int sellValue, int xpReward,
        int requiredLevel
    ) {}

    public static final List<CropDef> ALL_CROPS = List.of(
        // Tier 1 — Iniciación (Level 1+)
        new CropDef("parsley",  "Perejil",    "🌿", 1,  4,  20,   9,  2, 1),
        new CropDef("lettuce",  "Lechuga",    "🥬", 1,  5,  30,  12,  3, 1),
        new CropDef("spinach",  "Espinaca",   "🥗", 1,  6,  35,  14,  3, 1),
        new CropDef("chive",    "Cebolleta",  "🧅", 1,  7,  40,  16,  4, 1),
        new CropDef("radish",   "Rabanito",   "🫑", 1,  8,  45,  18,  4, 1),

        // Tier 2 — Aprendiz (Level 3+)
        new CropDef("potato",   "Patata",     "🥔", 2, 10,  60,  24,  6, 3),
        new CropDef("garlic",   "Ajo",        "🧄", 2, 11,  70,  28,  6, 3),
        new CropDef("carrot",   "Zanahoria",  "🥕", 2, 12,  75,  30,  7, 3),
        new CropDef("onion",    "Cebolla",    "🧅", 2, 13,  90,  32,  7, 3),
        new CropDef("cucumber", "Pepino",     "🥒", 2, 14,  80,  35,  7, 3),
        new CropDef("tomato",   "Tomate",     "🍅", 2, 15,  90,  38,  8, 3),
        new CropDef("pepper",   "Pimiento",   "🫑", 2, 18, 105,  45,  9, 3),

        // Tier 3 — Granjero (Level 6+)
        new CropDef("peas",      "Guisantes",  "🫛", 3, 18, 105,  46,  9, 6),
        new CropDef("cabbage",   "Col",        "🥬", 3, 20, 120,  52, 10, 6),
        new CropDef("zucchini",  "Calabacín",  "🫛", 3, 22, 120,  56, 11, 6),
        new CropDef("corn",      "Maíz",       "🌽", 3, 25, 150,  65, 12, 6),
        new CropDef("eggplant",  "Berenjena",  "🍆", 3, 28, 165,  72, 14, 6),
        new CropDef("strawberry","Fresa",      "🍓", 3, 30, 180,  80, 15, 6),
        new CropDef("broccoli",  "Brócoli",    "🥦", 3, 35, 210,  90, 16, 6),

        // Tier 4 — Experto (Level 10+)
        new CropDef("asparagus", "Espárrago",  "🌱", 4, 40, 240, 110, 18, 10),
        new CropDef("beet",      "Remolacha",  "🫐", 4, 42, 255, 115, 19, 10),
        new CropDef("artichoke", "Alcachofa",  "🌻", 4, 45, 270, 125, 20, 10),
        new CropDef("pumpkin",   "Calabaza",   "🎃", 4, 50, 300, 140, 22, 10),
        new CropDef("melon",     "Melón",      "🍈", 4, 55, 330, 155, 23, 10),
        new CropDef("watermelon","Sandía",     "🍉", 4, 60, 360, 170, 25, 10),

        // Tier 5 — Maestro (Level 15+)
        new CropDef("cherry",    "Cereza",     "🍒", 5,  90,  600, 275, 36, 15),
        new CropDef("peach",     "Melocotón",  "🍑", 5,  95,  660, 290, 38, 15),
        new CropDef("grape",     "Uvas",       "🍇", 5, 100,  720, 310, 40, 15),
        new CropDef("mango",     "Mango",      "🥭", 5, 110,  780, 345, 44, 15),
        new CropDef("pineapple", "Piña",       "🍍", 5, 120,  840, 380, 48, 15),
        new CropDef("avocado",   "Aguacate",   "🥑", 5, 130,  960, 420, 52, 15),

        // Tier 6 — Legendario (Level 20+)
        new CropDef("dragon_flower", "Flor de Dragón",  "🌺", 6, 300, 1080, 900,  75, 20),
        new CropDef("lunar_plant",   "Planta Lunar",    "🌙", 6, 400, 1200, 1200, 90, 20),
        new CropDef("golden_truffle","Trufa Dorada",    "🍄", 6, 500, 1440, 1500, 100, 20),
        new CropDef("crystal_veg",   "Cristal Vegetal", "💎", 6, 600, 2160, 2000, 120, 20)
    );

    private static final Map<String, CropDef> CROP_MAP = new HashMap<>();
    static {
        for (CropDef c : ALL_CROPS) CROP_MAP.put(c.id(), c);
    }

    public static CropDef getCrop(String id) {
        return CROP_MAP.get(id);
    }

    public static List<CropDef> getCropsForLevel(int farmLevel) {
        return ALL_CROPS.stream()
                .filter(c -> c.requiredLevel() <= farmLevel)
                .toList();
    }

    // ── Item Definitions ──────────────────────────────────────────
    public record ItemDef(String id, String name, String emoji, int cost, String description) {}

    public static final List<ItemDef> ALL_ITEMS = List.of(
        new ItemDef("fertilizer_basic",   "Fertilizante Básico",   "💧", 30,  "Reduce tiempo de crecimiento un 25%"),
        new ItemDef("fertilizer_premium", "Fertilizante Premium",  "✨", 80,  "Reduce tiempo de crecimiento un 50%"),
        new ItemDef("revitalizer_small",  "Revitalizador",         "💊", 50,  "Revive 1 planta marchita o muerta"),
        new ItemDef("revitalizer_large",  "Revitalizador Grande",  "💉", 150, "Revive TODAS las plantas marchitas/muertas"),
        new ItemDef("miracle_water",      "Agua Milagrosa",        "🫧", 100, "Congela el marchitamiento 48h"),
        new ItemDef("golden_compost",     "Abono Dorado",          "🥇", 250, "+50% valor de venta en la próxima cosecha"),
        new ItemDef("super_seed",         "Súper Semilla",         "🌟", 200, "Semilla aleatoria de un tier superior")
    );

    private static final Map<String, ItemDef> ITEM_MAP = new HashMap<>();
    static {
        for (ItemDef i : ALL_ITEMS) ITEM_MAP.put(i.id(), i);
    }

    public static ItemDef getItem(String id) {
        return ITEM_MAP.get(id);
    }

    // ── Tool Definitions ──────────────────────────────────────────
    public record ToolDef(String id, String name, String emoji, int cost, String description) {}

    public static final List<ToolDef> ALL_TOOLS = List.of(
        new ToolDef("scarecrow",    "Espantapájaros",        "🎃",  300, "Decorativo + 1 parcela protegida"),
        new ToolDef("watering_can", "Regadera Automática",   "🚿",  500, "Retrasa marchitamiento +12h"),
        new ToolDef("well",         "Pozo de Agua",          "🪣",  800, "Fertilizantes cuestan -30%"),
        new ToolDef("silo",         "Silo de Almacenamiento","🏗️", 1000, "Almacena hasta 20 cosechas"),
        new ToolDef("windmill",     "Molino de Viento",      "🌪️", 1200, "+10% monedas por venta"),
        new ToolDef("greenhouse",   "Invernadero",           "🏠", 1500, "2 parcelas protegidas del marchitamiento"),
        new ToolDef("tractor",      "Tractor",               "🚜", 2000, "Cosechar Todo siempre disponible")
    );

    private static final Map<String, ToolDef> TOOL_MAP = new HashMap<>();
    static {
        for (ToolDef t : ALL_TOOLS) TOOL_MAP.put(t.id(), t);
    }

    public static ToolDef getTool(String id) {
        return TOOL_MAP.get(id);
    }

    // ── Decoration Definitions ────────────────────────────────────
    public record DecorationDef(String id, String name, String emoji, int cost) {}

    public static final List<DecorationDef> ALL_DECORATIONS = List.of(
        new DecorationDef("wooden_fence",  "Valla de Madera",    "🪵", 100),
        new DecorationDef("lantern",       "Farola",             "🏮", 150),
        new DecorationDef("garden_bench",  "Banco de Jardín",    "🪑", 200),
        new DecorationDef("stone_path",    "Camino de Piedra",   "🪨", 250),
        new DecorationDef("fountain",      "Fuente",             "⛲", 300),
        new DecorationDef("flower_arch",   "Arco de Flores",     "🌸", 400),
        new DecorationDef("duck_pond",     "Estanque con Patos", "🦆", 500)
    );

    // ── Plot Unlock Costs ─────────────────────────────────────────
    // Index → { cost, requiredLevel }
    public record PlotCost(int cost, int requiredLevel) {}

    public static final Map<Integer, PlotCost> PLOT_COSTS = Map.ofEntries(
        Map.entry(0,  new PlotCost(0, 1)),      // Free
        Map.entry(1,  new PlotCost(0, 1)),      // Free
        Map.entry(2,  new PlotCost(50, 1)),
        Map.entry(3,  new PlotCost(100, 2)),
        Map.entry(4,  new PlotCost(200, 3)),
        Map.entry(5,  new PlotCost(350, 4)),
        Map.entry(6,  new PlotCost(500, 5)),
        Map.entry(7,  new PlotCost(750, 7)),
        Map.entry(8,  new PlotCost(1000, 9)),
        Map.entry(9,  new PlotCost(1500, 11)),
        Map.entry(10, new PlotCost(2000, 13)),
        Map.entry(11, new PlotCost(3000, 16)),
        Map.entry(12, new PlotCost(4000, 18)),
        Map.entry(13, new PlotCost(4000, 18)),
        Map.entry(14, new PlotCost(4000, 18)),
        Map.entry(15, new PlotCost(4000, 18)),
        Map.entry(16, new PlotCost(6000, 22)),
        Map.entry(17, new PlotCost(6000, 22)),
        Map.entry(18, new PlotCost(6000, 22)),
        Map.entry(19, new PlotCost(6000, 22))
    );

    public static PlotCost getPlotCost(int plotIndex) {
        return PLOT_COSTS.getOrDefault(plotIndex, new PlotCost(9999, 99));
    }

    // ── Level XP Requirements ─────────────────────────────────────
    // Level → total XP required to reach that level
    private static final int[] LEVEL_XP = {
        0,       // Level 1
        50,      // Level 2
        150,     // Level 3
        300,     // Level 4
        500,     // Level 5
        800,     // Level 6
        1200,    // Level 7
        1800,    // Level 8
        2500,    // Level 9
        3500,    // Level 10
        4700,    // Level 11
        5900,    // Level 12
        7100,    // Level 13
        8300,    // Level 14
        9500,    // Level 15
        11300,   // Level 16
        13100,   // Level 17
        14900,   // Level 18
        16700,   // Level 19
        19200,   // Level 20
        21700,   // Level 21
        24200,   // Level 22
        26700,   // Level 23
        29200,   // Level 24
        31700    // Level 25
    };

    /** Total XP needed to reach the given level */
    public static int xpForLevel(int level) {
        if (level <= 1) return 0;
        if (level > LEVEL_XP.length) return LEVEL_XP[LEVEL_XP.length - 1] + (level - LEVEL_XP.length) * 2500;
        return LEVEL_XP[level - 1];
    }

    /** XP needed to go from current level to next */
    public static int xpToNextLevel(int currentLevel) {
        return xpForLevel(currentLevel + 1) - xpForLevel(currentLevel);
    }

    /** Calculate the level for a given total XP */
    public static int levelForXp(int totalXp) {
        for (int i = LEVEL_XP.length - 1; i >= 0; i--) {
            if (totalXp >= LEVEL_XP[i]) return i + 1;
        }
        return 1;
    }

    // ── Coin rewards for card reviews ─────────────────────────────
    public static int coinsForRating(String rating) {
        return switch (rating.toLowerCase()) {
            case "again" -> 1;
            case "hard"  -> 2;
            case "good"  -> 2;
            case "easy"  -> 3;
            default      -> 1;
        };
    }
}
