package com.loopdeck.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getDefinition(String word) {
        if (word == null || word.trim().isEmpty()) {
            return "";
        }

        if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || "TU_CLAVE_AQUI".equals(geminiApiKey)) {
            return "Error: Clave de IA no configurada.";
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + geminiApiKey;

        // Prompt para la IA
        String prompt = "Actúa como un diccionario. Da una definición súper breve, de una sola línea (máximo 15 palabras) para la palabra: " + word + ". Solo responde con la definición, sin nada más.";

        // Body de la petición
        Map<String, Object> parts = new HashMap<>();
        parts.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(parts));
        
        // Optimización: Limitar tokens para que responda instantáneamente
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("maxOutputTokens", 30);

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(content));
        body.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> bodyMap = response.getBody();
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) bodyMap.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> candidate = candidates.get(0);
                    Map<String, Object> resContent = (Map<String, Object>) candidate.get("content");
                    if (resContent != null) {
                        List<Map<String, Object>> resParts = (List<Map<String, Object>>) resContent.get("parts");
                        if (resParts != null && !resParts.isEmpty()) {
                            String text = (String) resParts.get(0).get("text");
                            return text != null ? text.trim() : "";
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error llamando a Gemini: " + e.getMessage());
        }
        
        return "No se pudo obtener la definición.";
    }

    /**
     * Ask Gemini to find the best Wikipedia image URL for a given word.
     * We search in SPANISH to avoid translation issues (e.g. "ginger" = pelirrojo).
     */
    public String getImageUrl(String word) {
        if (word == null || word.trim().isEmpty()) return null;
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || "TU_CLAVE_AQUI".equals(geminiApiKey)) return null;

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + geminiApiKey;

        String prompt = "Necesito la URL directa de la imagen principal del artículo de Wikipedia en español sobre \"" + word.trim() + "\". " +
                "La URL debe ser de upload.wikimedia.org y debe ser un enlace directo a un archivo de imagen (.jpg, .png o .svg). " +
                "Responde ÚNICAMENTE con la URL. Sin explicaciones, sin comillas, sin texto adicional. Solo la URL.";

        Map<String, Object> parts = new HashMap<>();
        parts.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(parts));

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("maxOutputTokens", 150);

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(content));
        body.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> resContent = (Map<String, Object>) candidates.get(0).get("content");
                    if (resContent != null) {
                        List<Map<String, Object>> resParts = (List<Map<String, Object>>) resContent.get("parts");
                        if (resParts != null && !resParts.isEmpty()) {
                            String imageUrl = ((String) resParts.get(0).get("text")).trim();
                            // Limpiar posibles caracteres extra
                            imageUrl = imageUrl.replaceAll("[`\"'\\s]", "");
                            // Verificar que parece una URL válida de imagen
                            if (imageUrl.startsWith("https://") && 
                                    (imageUrl.contains(".jpg") || imageUrl.contains(".png") || 
                                     imageUrl.contains(".svg") || imageUrl.contains(".webp") ||
                                     imageUrl.contains(".JPG") || imageUrl.contains(".PNG"))) {
                                return imageUrl;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error buscando imagen con Gemini: " + e.getMessage());
        }
        return null;
    }
}
