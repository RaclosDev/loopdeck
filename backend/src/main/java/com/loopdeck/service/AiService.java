package com.loopdeck.service;

import com.loopdeck.exception.AiUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);
    private static final String API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final ObjectMapper JSON = new ObjectMapper();
    /** Pasado este tiempo desde que empezó una petición a Gemini no se prueban más modelos de reserva. */
    private static final long TOTAL_BUDGET_MS = 100_000;

    private static final String CARD_RULES = """
        Reglas obligatorias para cada definición:
        - El estudiante tendrá que adivinar el término a partir de la definición, así que NUNCA escribas el término, \
        ni parte de él, ni palabras de su misma familia (plurales, diminutivos, derivados, verbos o adjetivos relacionados).
        - No empieces con «El término es…» ni con fórmulas como «X es…»; empieza directamente por lo que es.
        - No des pistas de forma (inicial, número de letras, rima).
        - Una sola frase en español, de 6 a 20 palabras, precisa y suficiente para deducir el término sin ambigüedad.
        - Si tiene varios sentidos, usa el más habitual.
        Ejemplos correctos:
        perro → Mamífero doméstico carnívoro, compañero habitual del ser humano, que ladra para avisar.
        fotosíntesis → Proceso con el que las plantas transforman luz, agua y dióxido de carbono en azúcares y oxígeno.
        París → Capital de Francia, atravesada por el Sena y famosa por la Torre Eiffel.
        Ejemplo INCORRECTO (usa el término): perro → Un perro es un animal.
        """;

    private static final String DEFINITION_SYSTEM =
        "Eres un lexicógrafo que redacta el anverso de tarjetas de estudio. El usuario te da un término "
            + "y respondes solo con su definición, sin comillas ni texto adicional.\n" + CARD_RULES;

    private static final String MASS_SYSTEM =
        "Eres un lexicógrafo que crea tarjetas de estudio. Recibes una lista de términos, uno por línea. "
            + "Para cada término devuelve un objeto con \"front\" (el término exactamente como lo escribió el usuario) "
            + "y \"back\" (su definición). Mantén el orden y no añadas ni omitas términos.\n" + CARD_RULES;

    private static final String CHAT_SYSTEM =
        "Eres un tutor experto y paciente. Responde en español a la pregunta del estudiante apoyándote en el contexto "
            + "que te da como base de conocimiento. Si el contexto no basta, dilo y responde con lo que sepas con seguridad.";

    private static final Map<String, Object> MASS_SCHEMA = Map.of(
        "type", "array",
        "items", Map.of(
            "type", "object",
            "properties", Map.of("front", Map.of("type", "string"), "back", Map.of("type", "string")),
            "required", List.of("front", "back")));

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final String thinkingLevel;
    /** Modelos que se prueban, en orden, si el principal está saturado o caído. */
    private final List<String> fallbackModels;
    /** Modelo rápido para definiciones sueltas, donde la latencia importa más que la capacidad. */
    private final String definitionModel;

    @Autowired
    public AiService(
        @Value("${gemini.api.key:}") String apiKey,
        @Value("${gemini.api.model:gemini-3.8-flash}") String model,
        @Value("${gemini.api.thinking-level:medium}") String thinkingLevel,
        @Value("${gemini.api.fallback-models:gemini-3.5-flash-lite,gemini-3.6-flash}") String fallbackModels,
        @Value("${gemini.api.definition-model:gemini-3.5-flash-lite}") String definitionModel) {
        this(defaultClient(), apiKey, model, thinkingLevel, parseModels(fallbackModels), definitionModel);
    }

    AiService(RestClient restClient, String apiKey, String model, String thinkingLevel) {
        this(restClient, apiKey, model, thinkingLevel, List.of());
    }

    AiService(RestClient restClient, String apiKey, String model, String thinkingLevel, List<String> fallbackModels) {
        this(restClient, apiKey, model, thinkingLevel, fallbackModels, model);
    }

    AiService(RestClient restClient, String apiKey, String model, String thinkingLevel, List<String> fallbackModels,
              String definitionModel) {
        this.definitionModel = definitionModel == null || definitionModel.isBlank() ? model : definitionModel.trim();
        this.restClient = restClient;
        this.apiKey = apiKey;
        this.model = model;
        this.thinkingLevel = thinkingLevel;
        this.fallbackModels = fallbackModels.stream().filter(m -> !m.equals(model)).distinct().toList();
    }

    private static long elapsedMs(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }

    private static List<String> parseModels(String models) {
        return models == null ? List.of()
            : Arrays.stream(models.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    private static RestClient defaultClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(90000);
        return RestClient.builder().requestFactory(factory).build();
    }

    public String getDefinition(String word) {
        if (word == null || word.isBlank()) return "";
        String term = word.trim();

        String definition = cleanDefinition(generate(definitionModel, DEFINITION_SYSTEM, "Término: " + term, 4096, null, false));
        if (TermGuard.containsTerm(definition, term)) {
            log.info("La definición repetía el término; se pide otra vez");
            String retry = "Término: " + term + "\nTu definición anterior era «" + definition
                + "» y usaba el término o una palabra de su familia. Escribe otra que no la use.";
            definition = cleanDefinition(generate(definitionModel, DEFINITION_SYSTEM, retry, 4096, null, false));
        }
        if (definition.isEmpty()) throw new AiUnavailableException("Definición vacía");
        return TermGuard.mask(definition, term);
    }

    public String getChatResponse(String prompt, String context) {
        String userText = "CONTEXTO:\n" + (context == null ? "" : context) + "\n\nPREGUNTA DEL ESTUDIANTE:\n" + prompt;
        return generate(CHAT_SYSTEM, userText, 8192, null, true);
    }

    public String generateMassDefinitions(String words) {
        List<String> terms = words == null ? List.of()
            : Arrays.stream(words.split("\\R")).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList();
        if (terms.isEmpty()) return "[]";

        List<Map<String, String>> cards = requestCards(terms);
        List<String> leaking = cards.stream()
            .filter(c -> TermGuard.containsTerm(c.get("back"), c.get("front")))
            .map(c -> c.get("front")).toList();
        if (!leaking.isEmpty()) {
            log.info("{} definiciones repetían su término; se piden otra vez", leaking.size());
            try {
                Map<String, String> fixed = new LinkedHashMap<>();
                requestCards(leaking).forEach(c -> fixed.put(c.get("front"), c.get("back")));
                cards.forEach(c -> {
                    String replacement = fixed.get(c.get("front"));
                    if (replacement != null && !replacement.isBlank()) c.put("back", replacement);
                });
            } catch (AiUnavailableException e) {
                log.warn("No se pudieron regenerar las definiciones: {}", e.getMessage());
            }
        }
        cards.forEach(c -> c.put("back", TermGuard.mask(c.get("back"), c.get("front"))));
        try {
            return JSON.writeValueAsString(cards);
        } catch (JacksonException e) {
            throw new AiUnavailableException("No se pudo serializar la respuesta");
        }
    }

    private List<Map<String, String>> requestCards(List<String> terms) {
        String text = generate(MASS_SYSTEM, "Términos:\n" + String.join("\n", terms), 32768, MASS_SCHEMA, false);
        try {
            JsonNode array = JSON.readTree(stripFences(text));
            List<Map<String, String>> cards = new ArrayList<>();
            if (array != null && array.isArray()) {
                for (JsonNode item : array) {
                    String front = item.path("front").asString("").trim();
                    String back = cleanDefinition(item.path("back").asString(""));
                    if (!front.isEmpty() && !back.isEmpty()) {
                        Map<String, String> card = new LinkedHashMap<>();
                        card.put("front", front);
                        card.put("back", back);
                        cards.add(card);
                    }
                }
            }
            if (cards.isEmpty()) throw new AiUnavailableException("Respuesta sin tarjetas");
            return cards;
        } catch (JacksonException e) {
            throw new AiUnavailableException("JSON inválido de Gemini");
        }
    }

    @SuppressWarnings("unchecked")
    private String generate(String system, String userText, int maxOutputTokens, Map<String, Object> schema, boolean allowTruncated) {
        return generate(model, system, userText, maxOutputTokens, schema, allowTruncated);
    }

    /** Prueba {@code primary} y, si está saturado, el modelo principal y los de reserva. */
    private String generate(String primary, String system, String userText, int maxOutputTokens,
                            Map<String, Object> schema, boolean allowTruncated) {
        if (apiKey == null || apiKey.isBlank() || "TU_CLAVE_AQUI".equals(apiKey) || "CHANGE_ME".equals(apiKey)) {
            throw new AiUnavailableException("Clave de Gemini no configurada");
        }

        Map<String, Object> response = null;
        List<String> models = new ArrayList<>();
        models.add(primary);
        if (!models.contains(model)) models.add(model);
        fallbackModels.stream().filter(m -> !models.contains(m)).forEach(models::add);
        long budgetStart = System.nanoTime();
        for (String current : models) {
            if (!current.equals(models.get(0)) && elapsedMs(budgetStart) > TOTAL_BUDGET_MS) {
                log.warn("Gemini: se agotó el tiempo total ({} ms); no se prueban más modelos", elapsedMs(budgetStart));
                break;
            }
            // El nivel de razonamiento se ajusta al modelo principal; los de reserva usan el suyo por defecto.
            Map<String, Object> body = requestBody(system, userText, maxOutputTokens, schema, current.equals(model));
            long start = System.nanoTime();
            try {
                ResponseEntity<Map> entity = restClient.post()
                    .uri(API_BASE + current + ":generateContent")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("x-goog-api-key", apiKey)
                    .body(body)
                    .retrieve()
                    .toEntity(Map.class);
                if (entity.getStatusCode() != HttpStatus.OK || entity.getBody() == null) {
                    throw new AiUnavailableException("Respuesta vacía de Gemini");
                }
                response = entity.getBody();
                log.info("Gemini ({}) respondió en {} ms", current, elapsedMs(start));
                break;
            } catch (HttpServerErrorException | HttpClientErrorException.TooManyRequests e) {
                log.warn("Gemini ({}) saturado o caído tras {} ms: {}", current, elapsedMs(start), e.getStatusCode());
            } catch (RestClientException e) {
                log.error("Error llamando a Gemini ({}): {}", current, e.getMessage());
                throw new AiUnavailableException("Gemini no responde");
            }
        }
        if (response == null) throw new AiUnavailableException("Gemini no responde");

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        if (candidates == null || candidates.isEmpty()) throw new AiUnavailableException("Gemini sin candidatos");
        Map<String, Object> candidate = candidates.get(0);
        String finishReason = String.valueOf(candidate.get("finishReason"));
        Map<String, Object> content = (Map<String, Object>) candidate.get("content");
        List<Map<String, Object>> parts = content == null ? null : (List<Map<String, Object>>) content.get("parts");

        StringBuilder text = new StringBuilder();
        if (parts != null) {
            for (Map<String, Object> part : parts) {
                if (Boolean.TRUE.equals(part.get("thought"))) continue;
                Object partText = part.get("text");
                if (partText instanceof String s) text.append(s);
            }
        }
        if ("MAX_TOKENS".equals(finishReason) && !allowTruncated) {
            throw new AiUnavailableException("Respuesta de Gemini cortada por límite de tokens");
        }
        if (text.isEmpty()) throw new AiUnavailableException("Gemini sin texto (" + finishReason + ")");
        return text.toString().trim();
    }

    private Map<String, Object> requestBody(String system, String userText, int maxOutputTokens,
                                            Map<String, Object> schema, boolean withThinkingLevel) {
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("maxOutputTokens", maxOutputTokens);
        if (withThinkingLevel && thinkingLevel != null && !thinkingLevel.isBlank()) {
            generationConfig.put("thinkingConfig", Map.of("thinkingLevel", thinkingLevel));
        }
        if (schema != null) {
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("responseJsonSchema", schema);
        }
        return Map.of(
            "systemInstruction", Map.of("parts", List.of(Map.of("text", system))),
            "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userText)))),
            "generationConfig", generationConfig);
    }

    private static String stripFences(String text) {
        return text.trim().replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
    }

    private static String cleanDefinition(String raw) {
        if (raw == null) return "";
        String line = raw.trim().lines().filter(l -> !l.isBlank()).findFirst().orElse("").trim();
        line = line.replaceFirst("(?i)^(definición|término)\\s*:\\s*", "");
        return line.replaceAll("^[\"«“']+|[\"»”']+$", "").trim();
    }

    /**
     * Fetch the main image of a Wikipedia article for a given word.
     * Uses the Wikipedia API directly (pageimages), guaranteed to return real, valid URLs.
     */
    @SuppressWarnings("unchecked")
    public String getImageUrl(String word) {
        if (word == null || word.trim().isEmpty()) return null;

        try {
            String wikiUrl = "https://es.wikipedia.org/w/api.php?action=query"
                    + "&generator=search&gsrsearch=" + java.net.URLEncoder.encode(word.trim(), java.nio.charset.StandardCharsets.UTF_8)
                    + "&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json";

            ResponseEntity<Map> response = restClient.get().uri(wikiUrl)
                .header(HttpHeaders.USER_AGENT, "LoopDeck/1.0 (flashcard app)")
                .retrieve().toEntity(Map.class);

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
        } catch (RestClientException e) {
            log.error("Error buscando imagen en Wikipedia: {}", e.getMessage(), e);
        }
        return null;
    }
}
