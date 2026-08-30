package com.loopdeck.service;

import com.loopdeck.config.FarmCropConfig;
import com.loopdeck.model.UserFarm;
import com.loopdeck.model.FarmPlot;
import com.loopdeck.model.FarmUnlock;
import com.loopdeck.repository.UserFarmRepository;
import com.loopdeck.repository.FarmPlotRepository;
import com.loopdeck.repository.FarmUnlockRepository;
import com.loopdeck.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FarmService {

    private final UserFarmRepository farmRepo;
    private final FarmPlotRepository plotRepo;
    private final FarmUnlockRepository unlockRepo;
    private final UserRepository userRepo;

    public record PlotDto(Long id, int index, String cropId, String status, int progressPercent, int totalHarvested, String emoji) {}
    public record SummaryEventDto(String cropId, String emoji, Integer quantity) {}
    public record FarmSummaryDto(List<SummaryEventDto> matured, List<SummaryEventDto> harvested, List<String> unlocksReached) {}
    public record FarmViewDto(int lightPoints, int pendingSeeds, int totalPlotsUnlocked, FarmSummaryDto sinceLastVisit, List<PlotDto> plots) {}
    public record AvailableCropDto(String id, String name, String emoji, String requirement, boolean unlocked) {}

    @Transactional
    public UserFarm getOrCreateFarm(String userId) {
        return farmRepo.findByUserId(userId).orElseGet(() -> {
            UserFarm newFarm = UserFarm.builder().userId(userId).build();
            newFarm = farmRepo.save(newFarm);
            
            // Initial plots: 3 total, index 0 is tomato, 1 and 2 are empty.
            for (int i = 0; i < 3; i++) {
                FarmPlot plot = FarmPlot.builder()
                    .farm(newFarm)
                    .plotIndex(i)
                    .build();
                if (i == 0) {
                    plot.setCropId("tomato");
                    plot.setPlantedAt(Instant.now().minus(Duration.ofDays(10)));
                    plot.setMaturesAt(Instant.now().minus(Duration.ofDays(8)));
                    plot.setStatus("mature");
                }
                plotRepo.save(plot);
            }
            return newFarm;
        });
    }

    @Transactional
    public FarmViewDto getFarmView(String userId) {
        UserFarm farm = getOrCreateFarm(userId);
        Instant now = Instant.now();
        
        List<FarmPlot> plots = plotRepo.findByFarm_Id(farm.getId());
        List<FarmUnlock> unlocks = unlockRepo.findByFarm_Id(farm.getId());
        
        List<SummaryEventDto> maturedSummary = new ArrayList<>();
        List<SummaryEventDto> harvestedSummary = new ArrayList<>();
        
        // Resolve growth
        for (FarmPlot p : plots) {
            if (p.getStatus().equals("growing") && p.getMaturesAt().isBefore(now)) {
                p.setStatus("mature");
                p.setLastHarvestAt(p.getMaturesAt());
                
                FarmCropConfig.CropDef d = FarmCropConfig.getCrop(p.getCropId());
                maturedSummary.add(new SummaryEventDto(p.getCropId(), d != null ? d.emoji() : "🌱", 1));
            }
            
            if (p.getStatus().equals("mature")) {
                FarmCropConfig.CropDef d = FarmCropConfig.getCrop(p.getCropId());
                if (d != null && d.cycleHours() > 0) {
                    Instant lastHarvest = p.getLastHarvestAt() != null ? p.getLastHarvestAt() : p.getMaturesAt();
                    long cycleMillis = Duration.ofHours(d.cycleHours()).toMillis();
                    long elapsed = Duration.between(lastHarvest, now).toMillis();
                    
                    if (elapsed >= cycleMillis) {
                        int cyclesCompleted = (int) (elapsed / cycleMillis);
                        p.setTotalHarvested(p.getTotalHarvested() + cyclesCompleted);
                        p.setLastHarvestAt(lastHarvest.plusMillis((long) cyclesCompleted * cycleMillis));
                        harvestedSummary.add(new SummaryEventDto(p.getCropId(), d.emoji(), cyclesCompleted));
                    }
                }
            }
        }
        
        List<String> recentUnlocks = checkMilestones(userId, farm, unlocks);
        
        FarmSummaryDto summary = null;
        if (!maturedSummary.isEmpty() || !harvestedSummary.isEmpty() || !recentUnlocks.isEmpty()) {
            summary = new FarmSummaryDto(maturedSummary, harvestedSummary, recentUnlocks);
        }
        
        farm.setLastVisit(now);
        farmRepo.save(farm);
        plotRepo.saveAll(plots);
        
        List<PlotDto> plotDtos = plots.stream().map(p -> {
            FarmCropConfig.CropDef d = FarmCropConfig.getCrop(p.getCropId());
            int progress = 100;
            if (p.getStatus().equals("growing")) {
                long totalMillis = Duration.between(p.getPlantedAt(), p.getMaturesAt()).toMillis();
                long elapsedMillis = Duration.between(p.getPlantedAt(), now).toMillis();
                progress = Math.max(0, Math.min(100, (int) (elapsedMillis * 100 / totalMillis)));
            } else if (p.getStatus().equals("empty")) {
                progress = 0;
            }
            return new PlotDto(
                p.getId(), p.getPlotIndex(), p.getCropId(), p.getStatus(), progress,
                p.getTotalHarvested(),
                d != null ? d.emoji() : (p.getStatus().equals("empty") ? "" : "🌱")
            );
        }).collect(Collectors.toList());
        
        return new FarmViewDto(farm.getLightPoints(), farm.getPendingSeeds(), farm.getTotalPlotsUnlocked(), summary, plotDtos);
    }
    
    private List<String> checkMilestones(String userId, UserFarm farm, List<FarmUnlock> unlocks) {
        List<String> newUnlocks = new ArrayList<>();
        Set<String> unlockedSet = unlocks.stream().map(FarmUnlock::getUnlockId).collect(Collectors.toSet());
        
        int streak = 0;
        int cards = 0;
        int decks = 0;
        
        for (FarmCropConfig.UnlockDef def : FarmCropConfig.getAllDecorations().values()) {
            if (!unlockedSet.contains(def.requirement()) && checkCondition(def.requirement(), streak, cards, decks)) {
                // Decoraciones: simplemente añadimos el ID. En la UI se procesa visualmente.
                FarmUnlock u = FarmUnlock.builder().farm(farm).unlockId(def.requirement()).build();
                unlockRepo.save(u);
                newUnlocks.add(def.id());
                unlockedSet.add(def.requirement());
            }
        }
        
        int previousPlots = farm.getTotalPlotsUnlocked();
        int newPlots = calculateTotalPlots(streak, cards, decks);
        if (newPlots > previousPlots) {
            farm.setTotalPlotsUnlocked(newPlots);
            for (int i = previousPlots; i < newPlots; i++) {
                FarmPlot plot = FarmPlot.builder()
                    .farm(farm)
                    .plotIndex(i)
                    .build();
                plotRepo.save(plot);
            }
            newUnlocks.add("plot_" + newPlots);
        }
        
        return newUnlocks;
    }

    private int calculateTotalPlots(int streak, int cards, int decks) {
        int plots = 3;
        if (streak >= 7) plots = 4;
        if (cards >= 500) plots = Math.max(plots, 5);
        if (streak >= 14) plots = Math.max(plots, 6);
        if (decks >= 1) plots = Math.max(plots, 7);
        if (streak >= 30) plots = Math.max(plots, 8);
        return plots;
    }

    private boolean checkCondition(String req, int streak, int cards, int decks) {
        if (req.equals("default")) return true;
        if (req.startsWith("streak_")) return streak >= Integer.parseInt(req.split("_")[1]);
        if (req.startsWith("cards_")) return cards >= Integer.parseInt(req.split("_")[1]);
        if (req.startsWith("deck_mastered_")) return decks >= Integer.parseInt(req.split("_")[2]);
        return false;
    }

    @Transactional
    public List<AvailableCropDto> getAvailableCrops(String userId) {
        UserFarm farm = getOrCreateFarm(userId);
        List<FarmUnlock> unlocks = unlockRepo.findByFarm_Id(farm.getId());
        Set<String> unlockedSet = unlocks.stream().map(FarmUnlock::getUnlockId).collect(Collectors.toSet());
        
        int streak = 0;
        int cards = 0;
        int decks = 0;
        
        return FarmCropConfig.getAllCrops().values().stream()
            .map(c -> {
                boolean unlocked = unlockedSet.contains(c.unlockRequirement()) || checkCondition(c.unlockRequirement(), streak, cards, decks);
                return new AvailableCropDto(c.id(), c.name(), c.emoji(), c.unlockRequirement(), unlocked);
            })
            .collect(Collectors.toList());
    }

    @Transactional
    public void plantSeed(String userId, int plotIndex, String cropId) {
        UserFarm farm = getOrCreateFarm(userId);
        if (farm.getPendingSeeds() <= 0) {
            throw new IllegalArgumentException("No pending seeds");
        }
        
        FarmCropConfig.CropDef def = FarmCropConfig.getCrop(cropId);
        if (def == null) {
            throw new IllegalArgumentException("Invalid crop ID");
        }
        
        List<FarmPlot> plots = plotRepo.findByFarm_Id(farm.getId());
        FarmPlot plot = plots.stream().filter(p -> p.getPlotIndex() == plotIndex).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid plot index"));
            
        if (!plot.getStatus().equals("empty")) {
            throw new IllegalArgumentException("Plot is not empty");
        }
        
        farm.setPendingSeeds(farm.getPendingSeeds() - 1);
        farmRepo.save(farm);
        
        plot.setCropId(cropId);
        plot.setPlantedAt(Instant.now());
        plot.setMaturesAt(Instant.now().plus(Duration.ofHours(def.maturationHours())));
        plot.setStatus("growing");
        plot.setLastHarvestAt(null);
        plot.setTotalHarvested(0);
        plotRepo.save(plot);
    }

    @Transactional
    public void addLightPoints(String userId, int points) {
        UserFarm farm = getOrCreateFarm(userId);
        farm.setLightPoints(farm.getLightPoints() + points);
        farmRepo.save(farm);
    }
}
