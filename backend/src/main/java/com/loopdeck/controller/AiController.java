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
        Map<String, String> response = new HashMap<>();
        try {
            // Utilizamos HttpClient configurado para seguir redirecciones (Openverse movió su API)
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                    .followRedirects(java.net.http.HttpClient.Redirect.ALWAYS)
                    .build();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://api.openverse.org/v1/images/?q=" + java.net.URLEncoder.encode(word, java.nio.charset.StandardCharsets.UTF_8)))
                    .header("User-Agent", "LoopDeck/1.0")
                    .GET()
                    .build();

            java.net.http.HttpResponse<String> apiRes = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            
            if (apiRes.statusCode() == 200) {
                // Extracción ultra simple de la primera URL usando regex para no requerir dependencias extra de JSON
                java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\"url\":\"([^\"]+)\"").matcher(apiRes.body());
                if (matcher.find()) {
                    response.put("imageUrl", matcher.group(1));
                    return ResponseEntity.ok(response);
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching image from backend proxy: " + e.getMessage());
        }
        return ResponseEntity.notFound().build();
    }
}
