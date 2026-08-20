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

    public String getChatResponse(String prompt, String context) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || "TU_CLAVE_AQUI".equals(geminiApiKey)) {
            return "Error: Clave de IA no configurada.";
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + geminiApiKey;

        String fullPrompt = "Eres un tutor experto. Responde a la pregunta del usuario utilizando este contexto como base de conocimiento:\n\nCONTEXTO:\n" + context + "\n\nPREGUNTA DEL USUARIO:\n" + prompt;

        Map<String, Object> parts = new HashMap<>();
        parts.put("text", fullPrompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(parts));
        
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("maxOutputTokens", 500);

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
            System.err.println("Error llamando a Gemini Chat: " + e.getMessage());
        }
        
        return "Hubo un error al procesar tu solicitud con la IA.";
    }

    public String generateMassDefinitions(String words) {
        if (words == null || words.trim().isEmpty()) {
            return "[]";
        }

        if (geminiApiKey == null || geminiApiKey.trim().isEmpty() || "TU_CLAVE_AQUI".equals(geminiApiKey)) {
            return "[]";
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + geminiApiKey;

        String prompt = "Actúa como un creador de tarjetas de estudio (flashcards). Te voy a dar una lista de conceptos. Para CADA concepto, genera una definición súper breve (máximo 15 palabras).\n"
                + "DEVUELVE ÚNICAMENTE un array JSON válido, sin Markdown ni texto extra. El formato debe ser estrictamente este:\n"
                + "[\n  {\"front\": \"concepto 1\", \"back\": \"definición súper breve\"},\n  {\"front\": \"concepto 2\", \"back\": \"definición súper breve\"}\n]\n\n"
                + "Conceptos a definir:\n" + words;

        Map<String, Object> parts = new HashMap<>();
        parts.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(parts));
        
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("maxOutputTokens", 2000);
        generationConfig.put("temperature", 0.1);

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
                            if (text != null) {
                                // Clean up markdown json block if Gemini includes it
                                text = text.trim();
                                if (text.startsWith("```json")) {
                                    text = text.substring(7);
                                } else if (text.startsWith("```")) {
                                    text = text.substring(3);
                                }
                                if (text.endsWith("```")) {
                                    text = text.substring(0, text.length() - 3);
                                }
                                return text.trim();
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error llamando a Gemini Mass Define: " + e.getMessage());
        }
        
        return "[]";
    }

    /**
     * Fetch the main image of a Wikipedia article for a given word.
     * Uses the Wikipedia API directly (pageimages) — guaranteed to return real, valid URLs.
     */
    public String getImageUrl(String word) {
        if (word == null || word.trim().isEmpty()) return null;

        try {
            // Buscar directamente en la Wikipedia en español
            String wikiUrl = "https://es.wikipedia.org/w/api.php?action=query"
                    + "&generator=search&gsrsearch=" + java.net.URLEncoder.encode(word.trim(), java.nio.charset.StandardCharsets.UTF_8)
                    + "&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "LoopDeck/1.0 (flashcard app)");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(wikiUrl, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> query = (Map<String, Object>) response.getBody().get("query");
                if (query != null) {
                    Map<String, Map<String, Object>> pages = (Map<String, Map<String, Object>>) query.get("pages");
                    if (pages != null && !pages.isEmpty()) {
                        Map<String, Object> page = pages.values().iterator().next();
                        Map<String, Object> thumbnail = (Map<String, Object>) page.get("thumbnail");
                        if (thumbnail != null) {
                            String source = (String) thumbnail.get("source");
                            if (source != null && !source.isEmpty()) {
                                return source;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error buscando imagen en Wikipedia: " + e.getMessage());
        }
        return null;
    }
}

