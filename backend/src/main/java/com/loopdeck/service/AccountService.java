package com.loopdeck.service;

import com.loopdeck.model.Card;
import com.loopdeck.model.Deck;
import com.loopdeck.model.Note;
import com.loopdeck.model.Review;
import com.loopdeck.model.User;
import com.loopdeck.repository.CardRepository;
import com.loopdeck.repository.DeckDocumentRepository;
import com.loopdeck.repository.DeckRepository;
import com.loopdeck.repository.NoteRepository;
import com.loopdeck.repository.RefreshTokenRepository;
import com.loopdeck.repository.ReviewRepository;
import com.loopdeck.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.List;

/** Derechos sobre los datos personales: descargar todo lo que hay de un usuario y borrar su cuenta. */
@Service
public class AccountService {
    private static final Logger log = LoggerFactory.getLogger(AccountService.class);
    /** Postgres admite como mucho 32767 parámetros por consulta. */
    private static final int ID_CHUNK = 1000;
    /** Filas por página al escribir la descarga. */
    static final int PAGE_SIZE = 500;

    private final UserRepository userRepository;
    private final DeckRepository deckRepository;
    private final NoteRepository noteRepository;
    private final CardRepository cardRepository;
    private final ReviewRepository reviewRepository;
    private final DeckDocumentRepository deckDocumentRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ObjectMapper objectMapper;
    private final PlatformTransactionManager transactionManager;
    private final EntityManager entityManager;

    public AccountService(UserRepository userRepository, DeckRepository deckRepository, NoteRepository noteRepository,
                          CardRepository cardRepository, ReviewRepository reviewRepository,
                          DeckDocumentRepository deckDocumentRepository, RefreshTokenRepository refreshTokenRepository,
                          ObjectMapper objectMapper, PlatformTransactionManager transactionManager,
                          EntityManager entityManager) {
        this.userRepository = userRepository;
        this.deckRepository = deckRepository;
        this.noteRepository = noteRepository;
        this.cardRepository = cardRepository;
        this.reviewRepository = reviewRepository;
        this.deckDocumentRepository = deckDocumentRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.objectMapper = objectMapper;
        this.transactionManager = transactionManager;
        this.entityManager = entityManager;
    }

    public record AccountInfo(String id, String email, String name, boolean googleLinked, boolean hasPassword, Instant createdAt) {}
    public record DocumentInfo(String deckId, String fileName, String contentType) {}

    /** Falla con {@link IllegalArgumentException} si la cuenta no existe. Se llama antes de empezar a escribir. */
    @Transactional(readOnly = true)
    public void requireAccount(String userId) {
        if (!userRepository.existsById(userId)) throw new IllegalArgumentException("User not found");
    }

    /**
     * Escribe la descarga en {@code out} como JSON, por páginas de {@value #PAGE_SIZE} filas y con una
     * instantánea coherente de la base de datos (una transacción de solo lectura con aislamiento repetible), de
     * modo que la memoria usada no crece con el tamaño de la cuenta.
     */
    public void exportTo(String userId, OutputStream out) throws IOException {
        exportTo(userId, out, PAGE_SIZE);
    }

    void exportTo(String userId, OutputStream out, int pageSize) throws IOException {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setReadOnly(true);
        tx.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        try {
            tx.executeWithoutResult(status -> {
                try {
                    writeExport(userId, out, pageSize);
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            });
        } catch (UncheckedIOException e) {
            throw e.getCause();
        }
    }

    private void writeExport(String userId, OutputStream out, int pageSize) throws IOException {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        List<Deck> decks = deckRepository.findByUserIdOrderByNameAsc(userId);
        List<String> deckIds = decks.stream().map(Deck::getId).toList();
        AccountInfo account = new AccountInfo(user.getId(), user.getEmail(), user.getName(),
                user.getGoogleId() != null, user.getPasswordHash() != null, user.getCreatedAt());

        try (JsonGenerator json = objectMapper.createGenerator(out)) {
            json.writeStartObject();
            json.writeName("exportedAt");
            objectMapper.writeValue(json, Instant.now());
            json.writeName("account");
            objectMapper.writeValue(json, account);
            json.writeName("decks");
            objectMapper.writeValue(json, decks);

            json.writeName("documents");
            json.writeStartArray();
            for (int i = 0; i < deckIds.size(); i += ID_CHUNK) {
                for (var d : deckDocumentRepository.findInfoByDeckIdIn(deckIds.subList(i, Math.min(i + ID_CHUNK, deckIds.size())))) {
                    objectMapper.writeValue(json, new DocumentInfo(d.getDeckId(), d.getFileName(), d.getContentType()));
                }
            }
            json.writeEndArray();

            json.writeName("notes");
            json.writeStartArray();
            String after = "";
            List<Note> notes;
            while (!(notes = noteRepository.findByUserIdAndIdGreaterThanOrderByIdAsc(userId, after, Pageable.ofSize(pageSize))).isEmpty()) {
                for (Note note : notes) objectMapper.writeValue(json, note);
                after = notes.get(notes.size() - 1).getId();
                entityManager.clear();
            }
            json.writeEndArray();

            json.writeName("cards");
            json.writeStartArray();
            for (String deckId : deckIds) {
                after = "";
                List<Card> cards;
                while (!(cards = cardRepository.findByDeckIdAndIdGreaterThanOrderByIdAsc(deckId, after, Pageable.ofSize(pageSize))).isEmpty()) {
                    for (Card card : cards) objectMapper.writeValue(json, card);
                    after = cards.get(cards.size() - 1).getId();
                    entityManager.clear();
                }
            }
            json.writeEndArray();

            json.writeName("reviews");
            json.writeStartArray();
            for (String deckId : deckIds) {
                after = "";
                List<String> cardIds;
                while (!(cardIds = cardRepository.findIdsByDeckIdAfter(deckId, after, Pageable.ofSize(pageSize))).isEmpty()) {
                    for (Review review : reviewRepository.findByCardIdInOrderByReviewedAtAsc(cardIds)) {
                        objectMapper.writeValue(json, review);
                    }
                    after = cardIds.get(cardIds.size() - 1);
                    entityManager.clear();
                }
            }
            json.writeEndArray();
            json.writeEndObject();
        }
    }

    /** Borra la cuenta y, en cascada desde la base de datos, sus mazos, notas, tarjetas, repasos y documentos. */
    @Transactional
    public void delete(String userId) {
        refreshTokenRepository.deleteByUserId(userId);
        userRepository.findById(userId).ifPresent(userRepository::delete);
        log.info("Cuenta eliminada a petición del usuario");
    }
}
