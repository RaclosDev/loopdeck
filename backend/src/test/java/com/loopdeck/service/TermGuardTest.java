package com.loopdeck.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TermGuardTest {

    @Test
    void detectsTermAndItsFamilyIgnoringCaseAndAccents() {
        assertThat(TermGuard.containsTerm("Un perrito pequeño", "perro")).isTrue();
        assertThat(TermGuard.containsTerm("Proceso de FOTOSINTESIS vegetal", "fotosíntesis")).isTrue();
        assertThat(TermGuard.containsTerm("Las bicicletas tienen dos ruedas", "bicicleta")).isTrue();
        assertThat(TermGuard.containsTerm("Astro que da luz y calor; los soles", "sol")).isTrue();
    }

    @Test
    void ignoresLookalikesAndStopwords() {
        assertThat(TermGuard.containsTerm("Mamífero doméstico que ladra", "perro")).isFalse();
        assertThat(TermGuard.containsTerm("Vivienda familiar, casi siempre con tejado", "casa")).isFalse();
        assertThat(TermGuard.containsTerm("Capital del país norteamericano", "Ciudad de México")).isFalse();
    }

    @Test
    void masksEveryOccurrenceKeepingPunctuation() {
        assertThat(TermGuard.mask("El perro, o perra, ladra.", "perro")).isEqualTo("El …, o …, ladra.");
        assertThat(TermGuard.mask("Torre Eiffel de París", "Torre Eiffel")).isEqualTo("… de París");
    }
}
