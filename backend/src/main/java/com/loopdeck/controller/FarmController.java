package com.loopdeck.controller;

import com.loopdeck.service.FarmService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/farm")
@RequiredArgsConstructor
public class FarmController {

    private final FarmService farmService;

    @GetMapping
    public ResponseEntity<FarmService.FarmViewDto> getFarm(Authentication auth) {
        return ResponseEntity.ok(farmService.getFarm(auth.getName()));
    }

    @PostMapping("/plant")
    public ResponseEntity<FarmService.PlotDto> plant(
            Authentication auth, @RequestBody Map<String, Object> body) {
        int plotIndex = ((Number) body.get("plotIndex")).intValue();
        String cropId = (String) body.get("cropId");
        return ResponseEntity.ok(farmService.plant(auth.getName(), plotIndex, cropId));
    }

    @PostMapping("/harvest")
    public ResponseEntity<FarmService.HarvestResultDto> harvest(
            Authentication auth, @RequestBody Map<String, Object> body) {
        int plotIndex = ((Number) body.get("plotIndex")).intValue();
        return ResponseEntity.ok(farmService.harvest(auth.getName(), plotIndex));
    }

    @PostMapping("/harvest-all")
    public ResponseEntity<FarmService.HarvestAllResultDto> harvestAll(Authentication auth) {
        return ResponseEntity.ok(farmService.harvestAll(auth.getName()));
    }

    @PostMapping("/buy-plot")
    public ResponseEntity<FarmService.FarmViewDto> buyPlot(Authentication auth) {
        return ResponseEntity.ok(farmService.buyPlot(auth.getName()));
    }

    @PostMapping("/buy-item")
    public ResponseEntity<FarmService.FarmViewDto> buyItem(
            Authentication auth, @RequestBody Map<String, Object> body) {
        String itemId = (String) body.get("itemId");
        int quantity = body.containsKey("quantity") ? ((Number) body.get("quantity")).intValue() : 1;
        return ResponseEntity.ok(farmService.buyItem(auth.getName(), itemId, quantity));
    }

    @PostMapping("/use-item")
    public ResponseEntity<FarmService.FarmViewDto> useItem(
            Authentication auth, @RequestBody Map<String, Object> body) {
        String itemId = (String) body.get("itemId");
        Integer plotIndex = body.get("plotIndex") != null ? ((Number) body.get("plotIndex")).intValue() : null;
        return ResponseEntity.ok(farmService.useItem(auth.getName(), itemId, plotIndex));
    }

    @PostMapping("/buy-tool")
    public ResponseEntity<FarmService.FarmViewDto> buyTool(
            Authentication auth, @RequestBody Map<String, Object> body) {
        String toolId = (String) body.get("toolId");
        return ResponseEntity.ok(farmService.buyTool(auth.getName(), toolId));
    }

    @PostMapping("/buy-decoration")
    public ResponseEntity<FarmService.FarmViewDto> buyDecoration(
            Authentication auth, @RequestBody Map<String, Object> body) {
        String decorationId = (String) body.get("decorationId");
        return ResponseEntity.ok(farmService.buyDecoration(auth.getName(), decorationId));
    }

    @GetMapping("/shop")
    public ResponseEntity<FarmService.ShopDto> getShop(Authentication auth) {
        return ResponseEntity.ok(farmService.getShop(auth.getName()));
    }

    @PostMapping("/clear-plot")
    public ResponseEntity<FarmService.FarmViewDto> clearPlot(
            Authentication auth, @RequestBody Map<String, Object> body) {
        int plotIndex = ((Number) body.get("plotIndex")).intValue();
        return ResponseEntity.ok(farmService.clearPlot(auth.getName(), plotIndex));
    }
}
