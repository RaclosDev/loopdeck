package com.loopdeck.service.mail;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ResendEmailSenderTest {

    private static final EmailSender.Email EMAIL = new EmailSender.Email(
            "ana@example.com", "Asunto", "texto con https://x/reset?token=secreto", "<p>html</p>");

    @SuppressWarnings("unchecked")
    private final HttpClient client = mock(HttpClient.class);
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void withoutApiKeyItIsDisabledAndSendsNothing() {
        ResendEmailSender sender = new ResendEmailSender("", "LoopDeck <no-reply@raclos.es>", mapper, client);

        assertFalse(sender.enabled());
        sender.send(EMAIL);

        verify(client, never()).sendAsync(any(), any());
    }

    @Test
    void aBlankApiKeyCountsAsMissing() {
        assertFalse(new ResendEmailSender("   ", "x", mapper, client).enabled());
        assertFalse(new ResendEmailSender(null, "x", mapper, client).enabled());
    }

    @Test
    @SuppressWarnings("unchecked")
    void withApiKeyItPostsToResendWithBearerAuthAndTheMessage() {
        when(client.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(HttpResponse.class)));
        ResendEmailSender sender = new ResendEmailSender("re_clave", "LoopDeck <no-reply@raclos.es>", mapper, client);

        assertTrue(sender.enabled());
        sender.send(EMAIL);

        org.mockito.ArgumentCaptor<HttpRequest> captor = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(client).sendAsync(captor.capture(), any(HttpResponse.BodyHandler.class));
        HttpRequest request = captor.getValue();
        assertEquals("https://api.resend.com/emails", request.uri().toString());
        assertEquals("POST", request.method());
        assertEquals("Bearer re_clave", request.headers().firstValue("Authorization").orElseThrow());
    }

    @Test
    void theBodyCarriesSenderRecipientSubjectAndBothFormats() {
        ResendEmailSender sender = new ResendEmailSender("re_clave", "LoopDeck <no-reply@raclos.es>", mapper, client);

        var json = mapper.readTree(sender.body(EMAIL));

        assertEquals("LoopDeck <no-reply@raclos.es>", json.get("from").asString());
        assertEquals("ana@example.com", json.get("to").get(0).asString());
        assertEquals("Asunto", json.get("subject").asString());
        assertTrue(json.get("text").asString().contains("secreto"));
        assertEquals("<p>html</p>", json.get("html").asString());
    }

    @Test
    @SuppressWarnings("unchecked")
    void aFailingProviderNeverThrowsToTheCaller() {
        when(client.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(CompletableFuture.failedFuture(new java.io.IOException("sin red")));
        ResendEmailSender sender = new ResendEmailSender("re_clave", "x", mapper, client);

        assertDoesNotThrow(() -> sender.send(EMAIL));
    }

    @Test
    void theEmailRecordNeverPrintsAddressOrLink() {
        String printed = EMAIL.toString();

        assertFalse(printed.contains("ana@example.com"));
        assertFalse(printed.contains("secreto"));
    }
}
