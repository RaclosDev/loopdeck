package com.loopdeck.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PasskeyServiceTest {

    @Test
    void blankNamesGetADefault() {
        assertThat(PasskeyService.cleanName(null)).isEqualTo("Llave de acceso");
        assertThat(PasskeyService.cleanName("  ")).isEqualTo("Llave de acceso");
    }

    @Test
    void namesAreTrimmedStrippedOfControlCharactersAndCapped() {
        assertThat(PasskeyService.cleanName("  Mi Mac ")).isEqualTo("Mi Mac");
        assertThat(PasskeyService.cleanName("x".repeat(100))).hasSize(PasskeyService.MAX_NAME_LENGTH);
    }
}
