package com.loopdeck.controller;

import com.loopdeck.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/definition")
    public ResponseEntity<Map<String, String>> getDefinition(@RequestParam String word) {
        String definition = aiService.getDefinition(word);
        
        Map<String, String> response = new HashMap<>();
        response.put("definition", definition);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/image")
    public ResponseEntity<Map<String, String>> getImage(@RequestParam String word) {
        String imageUrl = aiService.getImageUrl(word);
        
        if (imageUrl != null) {
            Map<String, String> response = new HashMap<>();
            response.put("imageUrl", imageUrl);
            return ResponseEntity.ok(response);
        }
        
        return ResponseEntity.notFound().build();
    }
}
