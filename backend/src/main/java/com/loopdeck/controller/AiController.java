package com.loopdeck.controller;

import com.loopdeck.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    public record DefinitionResponse(String definition) {}

    public record ImageResponse(String imageUrl) {}

    public record ChatRequest(String prompt, String context) {}

    public record ChatResponse(String response) {}

    public record MassDefineRequest(String words) {}

    @GetMapping("/definition")
    public ResponseEntity<DefinitionResponse> getDefinition(@RequestParam String word) {
        if (word == null || word.trim().isEmpty() || word.length() > 50) {
            throw new IllegalArgumentException("Palabra inválida o demasiado larga");
        }
        return ResponseEntity.ok(new DefinitionResponse(aiService.getDefinition(word)));
    }

    @GetMapping("/image")
    public ResponseEntity<ImageResponse> getImage(@RequestParam String word) {
        if (word == null || word.trim().isEmpty() || word.length() > 50) {
            throw new IllegalArgumentException("Palabra inválida o demasiado larga");
        }
        String imageUrl = aiService.getImageUrl(word);
        
        if (imageUrl != null) {
            return ResponseEntity.ok(new ImageResponse(imageUrl));
        }
        
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest payload) {
        String prompt = payload.prompt();
        String context = payload.context();
        
        if (prompt == null || prompt.trim().isEmpty() || prompt.length() > 2000) {
            throw new IllegalArgumentException("El prompt es inválido o excede los 2000 caracteres");
        }
        if (context != null && context.length() > 50000) {
            throw new IllegalArgumentException("El contexto excede el límite permitido");
        }
        
        return ResponseEntity.ok(new ChatResponse(aiService.getChatResponse(prompt, context)));
    }

    @PostMapping("/mass-define")
    public ResponseEntity<String> massDefine(@RequestBody MassDefineRequest payload) {
        String words = payload.words();
        if (words == null || words.trim().isEmpty() || words.length() > 5000) {
            throw new IllegalArgumentException("La lista de palabras es inválida o excede los 5000 caracteres");
        }
        String jsonArray = aiService.generateMassDefinitions(words);
        return ResponseEntity.ok(jsonArray);
    }
}
