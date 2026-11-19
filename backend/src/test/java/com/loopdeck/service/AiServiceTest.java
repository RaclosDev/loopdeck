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
        service = new AiService(builder.build(), "test-key", "gemini-3.8-flash", "low");
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
            .andExpect(jsonPath("$.generationConfig.thinkingConfig.thinkingLevel").value("low"))
            .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(1024))
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

        AiService withoutKey = new AiService(RestClient.create(), "", "gemini-3.8-flash", "low");
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
}
