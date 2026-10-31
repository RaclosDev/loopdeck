package com.loopdeck.controller;

import com.loopdeck.exception.GlobalExceptionHandler;
import com.loopdeck.model.DeckDocument;
import com.loopdeck.repository.DeckDocumentRepository;
import com.loopdeck.service.DeckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DeckDocumentControllerTest {
    private final DeckService decks = mock(DeckService.class);
    private final DeckDocumentRepository documents = mock(DeckDocumentRepository.class);
    private final UsernamePasswordAuthenticationToken user = new UsernamePasswordAuthenticationToken("owner", null, List.of());
    private MockMvc mvc;

    @BeforeEach void setUp() {
        DeckController controller = new DeckController(decks, documents);
        mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test void uploadsDocumentAndReturnsTheContractUsedByTheApp() throws Exception {
        var file = new MockMultipartFile("file", "apuntes.DOCX", "text/html", new byte[]{80,75,3,4});
        mvc.perform(multipart("/api/decks/deck/document").file(file).principal(user))
            .andExpect(status().isOk()).andExpect(jsonPath("$.hasDocument").value(true));
        var saved = ArgumentCaptor.forClass(DeckDocument.class);
        verify(documents).save(saved.capture());
        assertEquals("apuntes.DOCX", saved.getValue().getFileName());
        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document", saved.getValue().getContentType());
        verify(decks).verifyOwnership("owner", "deck");
    }

    @Test void sanitizesControlCharactersAndPathsWithoutBreakingUnicode() throws Exception {
        var file = new MockMultipartFile("file", "C:\\carpeta\\apuntes\r\n\"á.docx", "application/octet-stream", new byte[]{80,75,3,4});
        mvc.perform(multipart("/api/decks/deck/document").file(file).principal(user)).andExpect(status().isOk());
        var saved = ArgumentCaptor.forClass(DeckDocument.class);
        verify(documents).save(saved.capture());
        assertFalse(saved.getValue().getFileName().matches("(?s).*[\\r\\n\"\\\\/].*"));
        assertTrue(saved.getValue().getFileName().endsWith("á.docx"));
    }

    @Test void rejectedUploadsDoNotReachStorage() throws Exception {
        mvc.perform(multipart("/api/decks/deck/document").file(new MockMultipartFile("file", "bad.exe", "application/octet-stream", new byte[]{1})).principal(user))
            .andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/decks/deck/document").file(new MockMultipartFile("file", "empty.docx", "application/octet-stream", new byte[0])).principal(user))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(documents);
    }

    @Test void downloadRetainsBytesAndUsesAnAttachment() throws Exception {
        var document = new DeckDocument();
        document.setDeckId("deck"); document.setFileName("apuntes.docx"); document.setContentType("application/octet-stream"); document.setFileData(new byte[]{1,2,3});
        when(documents.findById("deck")).thenReturn(Optional.of(document));
        mvc.perform(get("/api/decks/deck/document").principal(user)).andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment;")))
            .andExpect(content().bytes(new byte[]{1,2,3}));
    }
}
