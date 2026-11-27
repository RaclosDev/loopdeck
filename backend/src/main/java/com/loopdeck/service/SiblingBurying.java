package com.loopdeck.service;

import com.loopdeck.repository.CardRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;

/**
 * Entierra las tarjetas hermanas (de la misma nota) de la que se acaba de repasar, para que no salgan seguidas
 * el mismo día, y las devuelve al empezar el siguiente día de estudio. Solo se entierran las nuevas y las de
 * repaso: las que están en aprendizaje siguen su calendario y las suspendidas no se tocan.
 */
@Component
public class SiblingBurying {
    private final CardRepository cards;
    private final ZoneId zone;

    public SiblingBurying(CardRepository cards, @Value("${loopdeck.study.zone:Europe/Madrid}") String zone) {
        this.cards = cards;
        this.zone = ZoneId.of(zone);
    }

    /** Entierra las hermanas de {@code cardId}; se llama dentro de la transacción del repaso. */
    public int buryAfterReview(String noteId, String cardId, Instant now) {
        return cards.burySiblings(noteId, cardId, now);
    }

    /** Devuelve las enterradas antes del inicio del día de estudio actual. Se revisa cada hora. */
    @Scheduled(cron = "0 5 * * * *")
    @Transactional
    public int unburyForNewStudyDay() {
        return unburyForNewStudyDay(Instant.now());
    }

    @Transactional
    public int unburyForNewStudyDay(Instant now) {
        return cards.unburyBefore(StudyDay.startOf(now, zone));
    }
}
