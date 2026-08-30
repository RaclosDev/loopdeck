package com.loopdeck.service;

import com.loopdeck.config.FarmCropConfig;
import com.loopdeck.config.FarmCropConfig.*;
import com.loopdeck.model.*;
import com.loopdeck.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FarmService {

    private final UserFarmRepository farmRepo;
    private final FarmPlotRepository plotRepo;
    private final FarmInventoryRepository inventoryRepo;
    private final FarmHarvestRepository harvestRepo;
    private final UserRepository userRepo;

    // ── DTOs ──────────────────────────────────────────────────────

    public record FarmDto(
        int level, int xp, int xpToNextLevel, int totalPlotsUnlocked,
        int coins, List<String> ownedTools, List<String> ownedDecorations
    ) {}

    public record PlotDto(
        int index, String status, String cropId, String cropName, String cropEmoji,
        String plantedAt, String readyAt, Double progressPercent,
        int sellValue, boolean hasFertilizer, boolean hasGoldenCompost, boolean isProtected,
        Integer unlockCost, Integer requiredLevel
    ) {}

    public record InventoryItemDto(String itemId, String name, String emoji, int quantity) {}

    public record SiloItemDto(String cropId, String name, String emoji, int quantity) {}

    public record FarmViewDto(FarmDto farm, List<PlotDto> plots, List<InventoryItemDto> inventory, List<SiloItemDto> silo) {}

    public record HarvestResultDto(int coinsEarned, int xpEarned, int totalCoins, String cropName, boolean leveledUp, int newLevel) {}

    public record HarvestAllResultDto(int harvested, int totalCoinsEarned, int totalXpEarned, int totalCoins, boolean leveledUp, int newLevel) {}

    // ── Get Farm ──────────────────────────────────────────────────

    @Transactional
    public FarmViewDto getFarm(String userId) {
        UserFarm farm = getOrCreateFarm(userId);
        User user = userRepo.findById(userId).orElseThrow();

        // Update last visit
        farm.setLastVisit(Instant.now());
        farmRepo.save(farm);

        // Recalculate level from XP (in case it drifted)
        int calculatedLevel = FarmCropConfig.levelForXp(farm.getFarmXp());
        if (calculatedLevel != farm.getFarmLevel()) {
            farm.setFarmLevel(calculatedLevel);
            farmRepo.save(farm);
        }

        // Get plots and update statuses (wilting/dead/ready)
        List<FarmPlot> plots = plotRepo.findByFarmIdOrderByPlotIndex(farm.getId());
        boolean hasWateringCan = hasTool(farm, "watering_can");
        for (FarmPlot plot : plots) {
            updatePlotStatus(plot, farm);
        }
        plotRepo.saveAll(plots);

        // Build response
        FarmDto farmDto = new FarmDto(
            farm.getFarmLevel(),
            farm.getFarmXp(),
            FarmCropConfig.xpToNextLevel(farm.getFarmLevel()),
            farm.getTotalPlotsUnlocked(),
            user.getPoints() != null ? user.getPoints() : 0,
            parseCSV(farm.getOwnedTools()),
            parseCSV(farm.getOwnedDecorations())
        );

        List<PlotDto> plotDtos = new ArrayList<>();
        // Add unlocked plots
        for (FarmPlot plot : plots) {
            plotDtos.add(toPlotDto(plot, farm));
        }
        // Add locked plots (up to 20 max)
        for (int i = farm.getTotalPlotsUnlocked(); i < 20; i++) {
            PlotCost pc = FarmCropConfig.getPlotCost(i);
            plotDtos.add(new PlotDto(i, "locked", null, null, null, null, null, null, 0,
                false, false, false, pc.cost(), pc.requiredLevel()));
        }

        List<FarmInventory> inv = inventoryRepo.findByFarmId(farm.getId());
        List<InventoryItemDto> invDtos = inv.stream()
            .filter(item -> item.getQuantity() > 0)
            .map(item -> {
                ItemDef def = FarmCropConfig.getItem(item.getItemId());
                return new InventoryItemDto(
                    item.getItemId(),
                    def != null ? def.name() : item.getItemId(),
                    def != null ? def.emoji() : "📦",
                    item.getQuantity()
                );
            }).toList();

        List<FarmHarvest> harvests = harvestRepo.findByFarmId(farm.getId());
        List<SiloItemDto> siloDtos = harvests.stream()
            .filter(h -> h.getQuantity() > 0)
            .map(h -> {
                CropDef def = FarmCropConfig.getCrop(h.getCropId());
                return new SiloItemDto(
                    h.getCropId(),
                    def != null ? def.name() : h.getCropId(),
                    def != null ? def.emoji() : "🌾",
                    h.getQuantity()
                );
            }).toList();

        return new FarmViewDto(farmDto, plotDtos, invDtos, siloDtos);
    }

    // ── Plant ─────────────────────────────────────────────────────

    @Transactional
    public PlotDto plant(String userId, int plotIndex, String cropId) {
        UserFarm farm = getOrCreateFarm(userId);
        User user = userRepo.findById(userId).orElseThrow();

        CropDef crop = FarmCropConfig.getCrop(cropId);
        if (crop == null) throw new IllegalArgumentException("Cultivo no encontrado: " + cropId);
        if (crop.requiredLevel() > farm.getFarmLevel())
            throw new IllegalArgumentException("Necesitas nivel " + crop.requiredLevel() + " para plantar " + crop.name());

        int coins = user.getPoints() != null ? user.getPoints() : 0;
        if (coins < crop.seedCost())
            throw new IllegalArgumentException("No tienes suficientes monedas. Necesitas " + crop.seedCost());

        FarmPlot plot = plotRepo.findByFarmIdAndPlotIndex(farm.getId(), plotIndex)
            .orElseThrow(() -> new IllegalArgumentException("Parcela no encontrada"));

        if (!"empty".equals(plot.getStatus()))
            throw new IllegalArgumentException("La parcela no está vacía");

        // Deduct coins
        user.setPoints(coins - crop.seedCost());
        userRepo.save(user);

        // Plant
        Instant now = Instant.now();
        plot.setCropId(cropId);
        plot.setPlantedAt(now);
        plot.setReadyAt(now.plus(Duration.ofMinutes(crop.growthMinutes())));
        plot.setStatus("growing");
        plot.setHasFertilizer(false);
        plot.setHasGoldenCompost(false);
        plotRepo.save(plot);

        return toPlotDto(plot, farm);
    }

    // ── Harvest ───────────────────────────────────────────────────

    @Transactional
    public HarvestResultDto harvest(String userId, int plotIndex) {
        UserFarm farm = getOrCreateFarm(userId);
        User user = userRepo.findById(userId).orElseThrow();

        FarmPlot plot = plotRepo.findByFarmIdAndPlotIndex(farm.getId(), plotIndex)
            .orElseThrow(() -> new IllegalArgumentException("Parcela no encontrada"));

        // Auto-update status
        updatePlotStatus(plot, farm);

        String status = plot.getStatus();
        if (!"ready".equals(status) && !"wilting".equals(status))
            throw new IllegalArgumentException("La parcela no tiene un cultivo listo para cosechar");

        CropDef crop = FarmCropConfig.getCrop(plot.getCropId());
        if (crop == null) throw new IllegalArgumentException("Cultivo desconocido");

        // Calculate sell value
        int sellValue = crop.sellValue();
        if ("wilting".equals(status)) sellValue = sellValue / 2; // -50%
        if (Boolean.TRUE.equals(plot.getHasGoldenCompost())) sellValue = (int)(sellValue * 1.5); // +50%
        if (hasTool(farm, "windmill")) sellValue = (int)(sellValue * 1.1); // +10%

        int xpEarned = crop.xpReward();

        // Give rewards
        int newCoins = (user.getPoints() != null ? user.getPoints() : 0) + sellValue;
        user.setPoints(newCoins);
        userRepo.save(user);
        
        // Record in Silo (Stats)
        FarmHarvest siloRecord = harvestRepo.findByFarmIdAndCropId(farm.getId(), crop.id())
            .orElseGet(() -> FarmHarvest.builder().farmId(farm.getId()).cropId(crop.id()).quantity(0).build());
        siloRecord.setQuantity(siloRecord.getQuantity() + 1);
        harvestRepo.save(siloRecord);

        int newXp = farm.getFarmXp() + xpEarned;
        farm.setFarmXp(newXp);
        int oldLevel = farm.getFarmLevel();
        int newLevel = FarmCropConfig.levelForXp(newXp);
        boolean leveledUp = newLevel > oldLevel;
        farm.setFarmLevel(newLevel);
        farmRepo.save(farm);

        // Reset plot
        plot.setStatus("empty");
        plot.setCropId(null);
        plot.setPlantedAt(null);
        plot.setReadyAt(null);
        plot.setHasFertilizer(false);
        plot.setHasGoldenCompost(false);
        plotRepo.save(plot);

        return new HarvestResultDto(sellValue, xpEarned, newCoins, crop.name(), leveledUp, newLevel);
    }

    // ── Harvest All ───────────────────────────────────────────────

    @Transactional
    public HarvestAllResultDto harvestAll(String userId) {
        UserFarm farm = getOrCreateFarm(userId);
        User user = userRepo.findById(userId).orElseThrow();
        boolean hasWateringCan = hasTool(farm, "watering_can");
        boolean hasWindmill = hasTool(farm, "windmill");

        List<FarmPlot> plots = plotRepo.findByFarmIdOrderByPlotIndex(farm.getId());
        int totalCoins = 0;
        int totalXp = 0;
        int harvested = 0;

        for (FarmPlot plot : plots) {
            updatePlotStatus(plot, farm);
            if ("ready".equals(plot.getStatus()) || "wilting".equals(plot.getStatus())) {
                CropDef crop = FarmCropConfig.getCrop(plot.getCropId());
                if (crop == null) continue;

                int sellValue = crop.sellValue();
                if ("wilting".equals(plot.getStatus())) sellValue = sellValue / 2;
                if (Boolean.TRUE.equals(plot.getHasGoldenCompost())) sellValue = (int)(sellValue * 1.5);
                if (hasWindmill) sellValue = (int)(sellValue * 1.1);

                totalCoins += sellValue;
                totalXp += crop.xpReward();
                harvested++;

                // Record in Silo
                FarmHarvest siloRecord = harvestRepo.findByFarmIdAndCropId(farm.getId(), crop.id())
                    .orElseGet(() -> FarmHarvest.builder().farmId(farm.getId()).cropId(crop.id()).quantity(0).build());
                siloRecord.setQuantity(siloRecord.getQuantity() + 1);
                harvestRepo.save(siloRecord);

                plot.setStatus("empty");
                plot.setCropId(null);
                plot.setPlantedAt(null);
                plot.setReadyAt(null);
                plot.setHasFertilizer(false);
                plot.setHasGoldenCompost(false);
            }
        }

        if (harvested == 0) throw new IllegalArgumentException("No hay cultivos listos para cosechar");

        plotRepo.saveAll(plots);

        int newCoins = (user.getPoints() != null ? user.getPoints() : 0) + totalCoins;
        user.setPoints(newCoins);
        userRepo.save(user);

        int newXp = farm.getFarmXp() + totalXp;
        farm.setFarmXp(newXp);
        int oldLevel = farm.getFarmLevel();
        int newLevel = FarmCropConfig.levelForXp(newXp);
        boolean leveledUp = newLevel > oldLevel;
        farm.setFarmLevel(newLevel);
        farmRepo.save(farm);

        return new HarvestAllResultDto(harvested, totalCoins, totalXp, newCoins, leveledUp, newLevel);
    }

    // ── Buy Plot ──────────────────────────────────────────────────

    @Transactional
    public FarmViewDto buyPlot(String userId) {
        UserFarm farm = getOrCreateFarm(userId);
        User user = userRepo.findById(userId).orElseThrow();

        int nextIndex = farm.getTotalPlotsUnlocked();
        if (nextIndex >= 20) throw new IllegalArgumentException("Ya tienes el máximo de parcelas");

        PlotCost pc = FarmCropConfig.getPlotCost(nextIndex);
        if (farm.getFarmLevel() < pc.requiredLevel())
            throw new IllegalArgumentException("Necesitas nivel " + pc.requiredLevel());

        int coins = user.getPoints() != null ? user.getPoints() : 0;
        if (coins < pc.cost())
            throw new IllegalArgumentException("No tienes suficientes monedas. Necesitas " + pc.cost());

        // Deduct coins
        user.setPoints(coins - pc.cost());
        userRepo.save(user);

        // Add XP for unlocking
        farm.setFarmXp(farm.getFarmXp() + 15);
        farm.setFarmLevel(FarmCropConfig.levelForXp(farm.getFarmXp()));

        // Create new plot
        farm.setTotalPlotsUnlocked(nextIndex + 1);
        farmRepo.save(farm);

        FarmPlot newPlot = FarmPlot.builder()
            .farmId(farm.getId())
            .plotIndex(nextIndex)
            .status("empty")
            .hasFertilizer(false)
            .hasGoldenCompost(false)
            .isProtected(false)
            .build();
        plotRepo.save(newPlot);

        return getFarm(userId);
    }

    // ── Buy Item ──────────────────────────────────────────────────

    @Transactional
    public FarmViewDto buyItem(String userId, String itemId, int quantity) {
        UserFarm farm = getOrCreateFarm(userId);
        User user = userRepo.findById(userId).orElseThrow();

        ItemDef item = FarmCropConfig.getItem(itemId);
        if (item == null) throw new IllegalArgumentException("Item no encontrado: " + itemId);

        int totalCost = item.cost() * quantity;

        // Apply well discount (-30% on fertilizers)
        if (hasTool(farm, "well") && itemId.startsWith("fertilizer")) {
            totalCost = (int)(totalCost * 0.7);
        }

        int coins = user.getPoints() != null ? user.getPoints() : 0;
        if (coins < totalCost)
            throw new IllegalArgumentException("No tienes suficientes monedas. Necesitas " + totalCost);

        user.setPoints(coins - totalCost);
        userRepo.save(user);

        FarmInventory inv = inventoryRepo.findByFarmIdAndItemId(farm.getId(), itemId)
            .orElseGet(() -> FarmInventory.builder().farmId(farm.getId()).itemId(itemId).quantity(0).build());
        inv.setQuantity(inv.getQuantity() + quantity);
        inventoryRepo.save(inv);

        return getFarm(userId);
    }

    // ── Use Item ──────────────────────────────────────────────────

    @Transactional
    public FarmViewDto useItem(String userId, String itemId, Integer plotIndex) {
        UserFarm farm = getOrCreateFarm(userId);

        FarmInventory inv = inventoryRepo.findByFarmIdAndItemId(farm.getId(), itemId)
            .orElseThrow(() -> new IllegalArgumentException("No tienes ese item"));
        if (inv.getQuantity() <= 0)
            throw new IllegalArgumentException("No tienes ese item");

        switch (itemId) {
            case "fertilizer_basic", "fertilizer_premium" -> {
                if (plotIndex == null) throw new IllegalArgumentException("Debes especificar una parcela");
                FarmPlot plot = plotRepo.findByFarmIdAndPlotIndex(farm.getId(), plotIndex)
                    .orElseThrow(() -> new IllegalArgumentException("Parcela no encontrada"));
                if (!"growing".equals(plot.getStatus()))
                    throw new IllegalArgumentException("Solo puedes fertilizar cultivos en crecimiento");
                if (Boolean.TRUE.equals(plot.getHasFertilizer()))
                    throw new IllegalArgumentException("Esta planta ya tiene fertilizante");

                // Reduce growth time
                double reduction = "fertilizer_premium".equals(itemId) ? 0.5 : 0.25;
                Duration totalGrowth = Duration.between(plot.getPlantedAt(), plot.getReadyAt());
                Duration reduced = Duration.ofMillis((long)(totalGrowth.toMillis() * reduction));
                plot.setReadyAt(plot.getReadyAt().minus(reduced));
                plot.setHasFertilizer(true);
                plotRepo.save(plot);
            }
            case "golden_compost" -> {
                if (plotIndex == null) throw new IllegalArgumentException("Debes especificar una parcela");
                FarmPlot plot = plotRepo.findByFarmIdAndPlotIndex(farm.getId(), plotIndex)
                    .orElseThrow(() -> new IllegalArgumentException("Parcela no encontrada"));
                if (!"growing".equals(plot.getStatus()) && !"ready".equals(plot.getStatus()))
                    throw new IllegalArgumentException("Solo puedes abonar cultivos en crecimiento o listos");
                if (Boolean.TRUE.equals(plot.getHasGoldenCompost()))
                    throw new IllegalArgumentException("Esta planta ya tiene abono dorado");
                plot.setHasGoldenCompost(true);
                plotRepo.save(plot);
            }
            case "revitalizer_small" -> {
                if (plotIndex == null) throw new IllegalArgumentException("Debes especificar una parcela");
                FarmPlot plot = plotRepo.findByFarmIdAndPlotIndex(farm.getId(), plotIndex)
                    .orElseThrow(() -> new IllegalArgumentException("Parcela no encontrada"));
                if (!"wilting".equals(plot.getStatus()) && !"dead".equals(plot.getStatus()))
                    throw new IllegalArgumentException("Esta planta no necesita revitalización");
                plot.setStatus("ready");
                plot.setReadyAt(Instant.now()); // Reset ready time to now
                plotRepo.save(plot);
            }
            case "revitalizer_large" -> {
                List<FarmPlot> plots = plotRepo.findByFarmIdOrderByPlotIndex(farm.getId());
                boolean revived = false;
                for (FarmPlot p : plots) {
                    if ("wilting".equals(p.getStatus()) || "dead".equals(p.getStatus())) {
                        p.setStatus("ready");
                        p.setReadyAt(Instant.now());
                        revived = true;
                    }
                }
                if (!revived) throw new IllegalArgumentException("No hay plantas que revitalizar");
                plotRepo.saveAll(plots);
            }
            case "miracle_water" -> {
                // Set all growing/ready plots' readyAt forward by 48h to delay wilting
                List<FarmPlot> plots = plotRepo.findByFarmIdOrderByPlotIndex(farm.getId());
                for (FarmPlot p : plots) {
                    if ("ready".equals(p.getStatus()) && p.getReadyAt() != null) {
                        // Push readyAt forward to delay wilting calculation
                        p.setReadyAt(Instant.now());
                    }
                    if ("wilting".equals(p.getStatus())) {
                        p.setStatus("ready");
                        p.setReadyAt(Instant.now());
                    }
                }
                plotRepo.saveAll(plots);
            }
            default -> throw new IllegalArgumentException("Item no utilizable: " + itemId);
        }

        inv.setQuantity(inv.getQuantity() - 1);
        inventoryRepo.save(inv);

        return getFarm(userId);
    }

    // ── Buy Tool ──────────────────────────────────────────────────

    @Transactional
    public FarmViewDto buyTool(String userId, String toolId) {
        UserFarm farm = getOrCreateFarm(userId);
        User user = userRepo.findById(userId).orElseThrow();

        ToolDef tool = FarmCropConfig.getTool(toolId);
        if (tool == null) throw new IllegalArgumentException("Herramienta no encontrada: " + toolId);

        if (hasTool(farm, toolId))
            throw new IllegalArgumentException("Ya tienes esta herramienta");

        int coins = user.getPoints() != null ? user.getPoints() : 0;
        if (coins < tool.cost())
            throw new IllegalArgumentException("No tienes suficientes monedas. Necesitas " + tool.cost());

        user.setPoints(coins - tool.cost());
        userRepo.save(user);

        String tools = farm.getOwnedTools();
        if (tools == null || tools.isEmpty()) tools = toolId;
        else tools = tools + "," + toolId;
        farm.setOwnedTools(tools);
        farmRepo.save(farm);

        return getFarm(userId);
    }

    // ── Buy Decoration ────────────────────────────────────────────

    @Transactional
    public FarmViewDto buyDecoration(String userId, String decorationId) {
        UserFarm farm = getOrCreateFarm(userId);
        User user = userRepo.findById(userId).orElseThrow();

        var deco = FarmCropConfig.ALL_DECORATIONS.stream()
            .filter(d -> d.id().equals(decorationId)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Decoración no encontrada"));

        List<String> owned = parseCSV(farm.getOwnedDecorations());
        if (owned.contains(decorationId))
            throw new IllegalArgumentException("Ya tienes esta decoración");

        int coins = user.getPoints() != null ? user.getPoints() : 0;
        if (coins < deco.cost())
            throw new IllegalArgumentException("No tienes suficientes monedas. Necesitas " + deco.cost());

        user.setPoints(coins - deco.cost());
        userRepo.save(user);

        String decos = farm.getOwnedDecorations();
        if (decos == null || decos.isEmpty()) decos = decorationId;
        else decos = decos + "," + decorationId;
        farm.setOwnedDecorations(decos);
        farmRepo.save(farm);

        return getFarm(userId);
    }

    // ── Shop Catalog ──────────────────────────────────────────────

    public record ShopDto(
        List<CropDef> crops, List<ItemDef> items,
        List<ToolDef> tools, List<FarmCropConfig.DecorationDef> decorations,
        List<String> ownedTools, List<String> ownedDecorations
    ) {}

    public ShopDto getShop(String userId) {
        UserFarm farm = getOrCreateFarm(userId);
        return new ShopDto(
            FarmCropConfig.ALL_CROPS,
            FarmCropConfig.ALL_ITEMS,
            FarmCropConfig.ALL_TOOLS,
            FarmCropConfig.ALL_DECORATIONS,
            parseCSV(farm.getOwnedTools()),
            parseCSV(farm.getOwnedDecorations())
        );
    }

    // ── Clear Dead Plot ───────────────────────────────────────────

    @Transactional
    public FarmViewDto clearPlot(String userId, int plotIndex) {
        UserFarm farm = getOrCreateFarm(userId);
        FarmPlot plot = plotRepo.findByFarmIdAndPlotIndex(farm.getId(), plotIndex)
            .orElseThrow(() -> new IllegalArgumentException("Parcela no encontrada"));

        if (!"dead".equals(plot.getStatus()) && !"wilting".equals(plot.getStatus()))
            throw new IllegalArgumentException("La parcela no necesita limpieza");

        plot.setStatus("empty");
        plot.setCropId(null);
        plot.setPlantedAt(null);
        plot.setReadyAt(null);
        plot.setHasFertilizer(false);
        plot.setHasGoldenCompost(false);
        plotRepo.save(plot);

        return getFarm(userId);
    }

    // ── Create Farm for New User ──────────────────────────────────

    @Transactional
    public UserFarm createFarmForUser(String userId) {
        Optional<UserFarm> existing = farmRepo.findByUserId(userId);
        if (existing.isPresent()) return existing.get();

        UserFarm farm = UserFarm.builder()
            .userId(userId)
            .farmLevel(1)
            .farmXp(0)
            .totalPlotsUnlocked(2)
            .ownedTools("")
            .ownedDecorations("")
            .lastVisit(Instant.now())
            .build();
        farmRepo.save(farm);

        // Create 2 starter plots
        for (int i = 0; i < 2; i++) {
            FarmPlot plot = FarmPlot.builder()
                .farmId(farm.getId())
                .plotIndex(i)
                .status("empty")
                .hasFertilizer(false)
                .hasGoldenCompost(false)
                .isProtected(false)
                .build();
            plotRepo.save(plot);
        }

        return farm;
    }

    // ── Helpers ───────────────────────────────────────────────────

    private UserFarm getOrCreateFarm(String userId) {
        return farmRepo.findByUserId(userId)
            .orElseGet(() -> createFarmForUser(userId));
    }

    private void updatePlotStatus(FarmPlot plot, UserFarm farm) {
        if (plot.getReadyAt() == null) return;
        Instant now = Instant.now();

        boolean hasWateringCan = hasTool(farm, "watering_can");
        boolean hasScarecrow = hasTool(farm, "scarecrow");
        boolean hasGreenhouse = hasTool(farm, "greenhouse");

        boolean isProtected = false;
        if (hasScarecrow && plot.getPlotIndex() == 0) isProtected = true;
        if (hasGreenhouse && (plot.getPlotIndex() == 0 || plot.getPlotIndex() == 1)) isProtected = true;

        if ("growing".equals(plot.getStatus()) && !now.isBefore(plot.getReadyAt())) {
            plot.setStatus("ready");
        }

        if ("ready".equals(plot.getStatus())) {
            long hoursSinceReady = Duration.between(plot.getReadyAt(), now).toHours();
            long wiltThreshold = hasWateringCan ? 36 : 24;
            long deadThreshold = hasWateringCan ? 84 : 72;

            if (isProtected || Boolean.TRUE.equals(plot.getIsProtected())) return; // Protected plots don't wilt

            if (hoursSinceReady >= deadThreshold) {
                plot.setStatus("dead");
            } else if (hoursSinceReady >= wiltThreshold) {
                plot.setStatus("wilting");
            }
        }
    }

    private PlotDto toPlotDto(FarmPlot plot, UserFarm farm) {
        CropDef crop = plot.getCropId() != null ? FarmCropConfig.getCrop(plot.getCropId()) : null;

        Double progress = null;
        int sellValue = 0;
        
        boolean hasScarecrow = hasTool(farm, "scarecrow");
        boolean hasGreenhouse = hasTool(farm, "greenhouse");
        boolean isProtected = Boolean.TRUE.equals(plot.getIsProtected());
        if (hasScarecrow && plot.getPlotIndex() == 0) isProtected = true;
        if (hasGreenhouse && (plot.getPlotIndex() == 0 || plot.getPlotIndex() == 1)) isProtected = true;

        if (crop != null && plot.getPlantedAt() != null && plot.getReadyAt() != null) {
            long total = Duration.between(plot.getPlantedAt(), plot.getReadyAt()).toMillis();
            long elapsed = Duration.between(plot.getPlantedAt(), Instant.now()).toMillis();
            if (total > 0) {
                progress = Math.min(100.0, (elapsed * 100.0) / total);
            }
            sellValue = crop.sellValue();
            if ("wilting".equals(plot.getStatus())) sellValue = sellValue / 2;
        }

        return new PlotDto(
            plot.getPlotIndex(),
            plot.getStatus(),
            plot.getCropId(),
            crop != null ? crop.name() : null,
            crop != null ? crop.emoji() : null,
            plot.getPlantedAt() != null ? plot.getPlantedAt().toString() : null,
            plot.getReadyAt() != null ? plot.getReadyAt().toString() : null,
            progress,
            sellValue,
            Boolean.TRUE.equals(plot.getHasFertilizer()),
            Boolean.TRUE.equals(plot.getHasGoldenCompost()),
            isProtected,
            null, null
        );
    }

    private boolean hasTool(UserFarm farm, String toolId) {
        return farm.getOwnedTools() != null && Arrays.asList(farm.getOwnedTools().split(",")).contains(toolId);
    }

    private List<String> parseCSV(String csv) {
        if (csv == null || csv.trim().isEmpty()) return new ArrayList<>();
        return Arrays.stream(csv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toCollection(ArrayList::new));
    }
}
