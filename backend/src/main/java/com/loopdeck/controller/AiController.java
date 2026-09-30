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
        if (word == null || word.trim().isEmpty() || word.length() > 50) {
            throw new IllegalArgumentException("Palabra inválida o demasiado larga");
        }
        String definition = aiService.getDefinition(word);
        
        Map<String, String> response = new HashMap<>();
        response.put("definition", definition);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/image")
    public ResponseEntity<Map<String, String>> getImage(@RequestParam String word) {
        if (word == null || word.trim().isEmpty() || word.length() > 50) {
            throw new IllegalArgumentException("Palabra inválida o demasiado larga");
        }
        String imageUrl = aiService.getImageUrl(word);
        
        if (imageUrl != null) {
            Map<String, String> response = new HashMap<>();
            response.put("imageUrl", imageUrl);
            return ResponseEntity.ok(response);
        }
        
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> payload) {
        String prompt = payload.get("prompt");
        String context = payload.get("context");
        
        if (prompt == null || prompt.trim().isEmpty() || prompt.length() > 2000) {
            throw new IllegalArgumentException("El prompt es inválido o excede los 2000 caracteres");
        }
        if (context != null && context.length() > 5000) {
            throw new IllegalArgumentException("El contexto excede el límite permitido");
        }
        
        String responseText = aiService.getChatResponse(prompt, context);
        
        Map<String, String> response = new HashMap<>();
        response.put("response", responseText);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mass-define")
    public ResponseEntity<String> massDefine(@RequestBody Map<String, String> payload) {
        String words = payload.get("words");
        if (words == null || words.trim().isEmpty() || words.length() > 5000) {
            throw new IllegalArgumentException("La lista de palabras es inválida o excede los 5000 caracteres");
        }
        String jsonArray = aiService.generateMassDefinitions(words);
        return ResponseEntity.ok(jsonArray);
    }
}
