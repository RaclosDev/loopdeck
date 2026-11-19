package com.loopdeck.service;

import com.loopdeck.exception.AiUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiServiceTest {

    private static final String URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
    private static final ObjectMapper JSON = new ObjectMapper();

    private MockRestServiceServer server;
    private AiService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new AiService(builder.build(), "test-key", "gemini-3.8-flash", "medium");
    }

    private static String reply(String finishReason, Map<String, Object>... parts) {
        return JSON.writeValueAsString(Map.of("candidates", List.of(Map.of(
            "finishReason", finishReason, "content", Map.of("role", "model", "parts", List.of(parts))))));
    }

    private static String reply(String text) {
        return reply("STOP", Map.of("text", text));
    }

    @Test
    void sendsConfiguredModelThinkingLevelAndSystemRules() {
        server.expect(requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andExpect(header("x-goog-api-key", "test-key"))
            .andExpect(jsonPath("$.generationConfig.thinkingConfig.thinkingLevel").value("medium"))
            .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(4096))
            .andExpect(jsonPath("$.generationConfig.temperature").doesNotExist())
            .andExpect(jsonPath("$.systemInstruction.parts[0].text").value(org.hamcrest.Matchers.containsString("NUNCA escribas el término")))
            .andExpect(jsonPath("$.contents[0].parts[0].text").value("Término: perro"))
            .andRespond(withSuccess(reply("«Mamífero doméstico que ladra.»"), MediaType.APPLICATION_JSON));

        assertThat(service.getDefinition(" perro ")).isEqualTo("Mamífero doméstico que ladra.");
        server.verify();
    }

    @Test
    void retriesOnceWhenTheDefinitionUsesTheTermAndMasksAsLastResort() {
        server.expect(requestTo(URL)).andRespond(withSuccess(reply("Un perro es un animal."), MediaType.APPLICATION_JSON));
        server.expect(requestTo(URL))
            .andExpect(jsonPath("$.contents[0].parts[0].text").value(org.hamcrest.Matchers.containsString("Escribe otra que no la use")))
            .andRespond(withSuccess(reply("Animal doméstico; la perra es la hembra."), MediaType.APPLICATION_JSON));

        assertThat(service.getDefinition("perro")).isEqualTo("Animal doméstico; la … es la hembra.");
        server.verify();
    }

    @Test
    void ignoresThoughtPartsAndRejectsTruncatedAnswers() {
        server.expect(requestTo(URL)).andRespond(withSuccess(
            reply("STOP", Map.of("text", "razonando sobre perro", "thought", true), Map.of("text", "Mamífero que ladra.")),
            MediaType.APPLICATION_JSON));
        server.expect(requestTo(URL)).andRespond(withSuccess(reply("MAX_TOKENS", Map.of("text", "Mamífero")), MediaType.APPLICATION_JSON));

        assertThat(service.getDefinition("perro")).isEqualTo("Mamífero que ladra.");
        assertThatThrownBy(() -> service.getDefinition("gato")).isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void failuresBecomeAiUnavailableInsteadOfFakeDefinitions() {
        server.expect(requestTo(URL)).andRespond(withServerError());
        assertThatThrownBy(() -> service.getDefinition("perro")).isInstanceOf(AiUnavailableException.class);

        AiService withoutKey = new AiService(RestClient.create(), "", "gemini-3.8-flash", "medium");
        assertThatThrownBy(() -> withoutKey.getDefinition("perro")).isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void massDefinitionsUseJsonSchemaAndFixLeakingCards() throws Exception {
        server.expect(requestTo(URL))
            .andExpect(jsonPath("$.generationConfig.responseMimeType").value("application/json"))
            .andExpect(jsonPath("$.generationConfig.responseJsonSchema.type").value("array"))
            .andExpect(jsonPath("$.contents[0].parts[0].text").value("Términos:\nperro\nsol"))
            .andRespond(withSuccess(reply(
                "[{\"front\":\"perro\",\"back\":\"El perro ladra\"},{\"front\":\"sol\",\"back\":\"Estrella del sistema solar\"}]"),
                MediaType.APPLICATION_JSON));
        server.expect(requestTo(URL))
            .andExpect(jsonPath("$.contents[0].parts[0].text").value("Términos:\nperro"))
            .andRespond(withSuccess(reply("[{\"front\":\"perro\",\"back\":\"Mamífero doméstico que ladra\"}]"), MediaType.APPLICATION_JSON));

        String json = service.generateMassDefinitions("perro\n\nsol\nperro");
        List<Object> cards = JSON.readValue(json, List.class);
        assertThat(cards).containsExactly(
            Map.of("front", "perro", "back", "Mamífero doméstico que ladra"),
            Map.of("front", "sol", "back", "Estrella del sistema solar"));
        server.verify();
    }

    @Test
    void fallsBackToNextModelWhenPrimaryIsOverloaded() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer fallbackServer = MockRestServiceServer.bindTo(builder).build();
        AiService withFallbacks = new AiService(builder.build(), "test-key", "gemini-3.8-flash", "medium",
            List.of("gemini-3.6-flash", "gemini-3.5-flash-lite"));
        String base = "https://generativelanguage.googleapis.com/v1beta/models/";

        fallbackServer.expect(requestTo(URL))
            .andRespond(withStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE));
        fallbackServer.expect(requestTo(base + "gemini-3.6-flash:generateContent"))
            .andRespond(withStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS));
        fallbackServer.expect(requestTo(base + "gemini-3.5-flash-lite:generateContent"))
            .andExpect(jsonPath("$.generationConfig.thinkingConfig").doesNotExist())
            .andRespond(withSuccess(reply("Insecto nocturno de cuerpo aplanado y antenas largas."), MediaType.APPLICATION_JSON));

        assertThat(withFallbacks.getDefinition("cucaracha"))
            .isEqualTo("Insecto nocturno de cuerpo aplanado y antenas largas.");
        fallbackServer.verify();
    }

    @Test
    void failsWhenEveryModelIsOverloaded() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer fallbackServer = MockRestServiceServer.bindTo(builder).build();
        AiService withFallbacks = new AiService(builder.build(), "test-key", "gemini-3.8-flash", "medium",
            List.of("gemini-3.6-flash"));

        fallbackServer.expect(requestTo(URL)).andRespond(withServerError());
        fallbackServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"))
            .andRespond(withServerError());

        assertThatThrownBy(() -> withFallbacks.getDefinition("cucaracha")).isInstanceOf(AiUnavailableException.class);
        fallbackServer.verify();
    }
}
