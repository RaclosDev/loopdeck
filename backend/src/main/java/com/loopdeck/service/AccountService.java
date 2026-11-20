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

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Derechos sobre los datos personales: descargar todo lo que hay de un usuario y borrar su cuenta. */
@Service
public class AccountService {
    private static final Logger log = LoggerFactory.getLogger(AccountService.class);
    /** Postgres admite como mucho 32767 parámetros por consulta. */
    private static final int ID_CHUNK = 1000;

    private final UserRepository userRepository;
    private final DeckRepository deckRepository;
    private final NoteRepository noteRepository;
    private final CardRepository cardRepository;
    private final ReviewRepository reviewRepository;
    private final DeckDocumentRepository deckDocumentRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    public AccountService(UserRepository userRepository, DeckRepository deckRepository, NoteRepository noteRepository,
                          CardRepository cardRepository, ReviewRepository reviewRepository,
                          DeckDocumentRepository deckDocumentRepository, RefreshTokenRepository refreshTokenRepository) {
        this.userRepository = userRepository;
        this.deckRepository = deckRepository;
        this.noteRepository = noteRepository;
        this.cardRepository = cardRepository;
        this.reviewRepository = reviewRepository;
        this.deckDocumentRepository = deckDocumentRepository;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public record AccountInfo(String id, String email, String name, boolean googleLinked, boolean hasPassword, Instant createdAt) {}
    public record DocumentInfo(String deckId, String fileName, String contentType) {}
    public record AccountExport(Instant exportedAt, AccountInfo account, List<Deck> decks, List<DocumentInfo> documents,
                                List<Note> notes, List<Card> cards, List<Review> reviews) {}

    @Transactional(readOnly = true)
    public AccountExport export(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        List<Deck> decks = deckRepository.findByUserIdOrderByNameAsc(userId);
        List<String> deckIds = decks.stream().map(Deck::getId).toList();

        List<Card> cards = new ArrayList<>();
        for (String deckId : deckIds) {
            cards.addAll(cardRepository.findByDeckId(deckId));
        }
        List<String> cardIds = cards.stream().map(Card::getId).toList();
        List<Review> reviews = new ArrayList<>();
        for (int i = 0; i < cardIds.size(); i += ID_CHUNK) {
            reviews.addAll(reviewRepository.findByCardIdInOrderByReviewedAtAsc(
                    cardIds.subList(i, Math.min(i + ID_CHUNK, cardIds.size()))));
        }
        List<DocumentInfo> documents = deckIds.isEmpty() ? List.of()
                : deckDocumentRepository.findInfoByDeckIdIn(deckIds).stream()
                        .map(d -> new DocumentInfo(d.getDeckId(), d.getFileName(), d.getContentType()))
                        .toList();

        AccountInfo account = new AccountInfo(user.getId(), user.getEmail(), user.getName(),
                user.getGoogleId() != null, user.getPasswordHash() != null, user.getCreatedAt());
        return new AccountExport(Instant.now(), account, decks, documents, noteRepository.findByUserId(userId), cards, reviews);
    }

    /** Borra la cuenta y, en cascada desde la base de datos, sus mazos, notas, tarjetas, repasos y documentos. */
    @Transactional
    public void delete(String userId) {
        refreshTokenRepository.deleteByUserId(userId);
        userRepository.findById(userId).ifPresent(userRepository::delete);
        log.info("Cuenta eliminada a petición del usuario");
    }
}
