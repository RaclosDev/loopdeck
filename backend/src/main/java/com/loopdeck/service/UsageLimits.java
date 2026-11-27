package com.loopdeck.service;

import com.loopdeck.exception.ConflictException;

/**
 * Topes de uso por cuenta, para que una sola no pueda llenar la base de datos. Son holgados: ninguna persona
 * que estudia de verdad los toca. Se comprueban justo antes de crear, así que ante peticiones simultáneas
 * pueden pasarse por unas pocas filas, lo que no importa para este fin.
 */
final class UsageLimits {
    static final int MAX_DECKS = 1_000;
    static final int MAX_NOTES = 100_000;
    static final long MAX_DOCUMENT_BYTES_TOTAL = 100L * 1024 * 1024;

    private UsageLimits() {}

    static void checkDecks(long current) {
        if (current >= MAX_DECKS) {
            throw new ConflictException("Has alcanzado el máximo de " + MAX_DECKS + " mazos. Borra alguno para crear otro");
        }
    }

    static void checkNotes(long current, int adding) {
        if (current + adding > MAX_NOTES) {
            throw new ConflictException("Has alcanzado el máximo de " + MAX_NOTES + " notas. Borra alguna para añadir más");
        }
    }

    static void checkDocumentBytes(long currentWithoutThisDeck, long adding) {
        if (currentWithoutThisDeck + adding > MAX_DOCUMENT_BYTES_TOTAL) {
            throw new ConflictException("Has alcanzado el máximo de " + (MAX_DOCUMENT_BYTES_TOTAL / (1024 * 1024))
                    + " MB en documentos. Borra alguno para subir otro");
        }
    }
}
