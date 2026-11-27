package com.loopdeck.service;

import com.loopdeck.exception.ReauthenticationException;
import com.loopdeck.repository.PasskeyChallengeRepository;
import com.loopdeck.repository.PasskeyRepository;
import com.loopdeck.repository.UserRepository;
import com.yubico.webauthn.RelyingParty;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

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

    @Test
    void registrationOptionsAreNotIssuedWithoutConfirmingTheIdentity() {
        RelyingParty relyingParty = mock(RelyingParty.class);
        PasskeyChallengeRepository challenges = mock(PasskeyChallengeRepository.class);
        PasskeyRepository passkeys = mock(PasskeyRepository.class);
        UserRepository users = mock(UserRepository.class);
        AuthService auth = mock(AuthService.class);
        doThrow(new ReauthenticationException("Confirma tu identidad para continuar"))
                .when(auth).confirmIdentity("u1", null, null);
        PasskeyService service = new PasskeyService(relyingParty, passkeys, challenges, users, auth);

        assertThatThrownBy(() -> service.startRegistration("u1", null, null))
                .isInstanceOf(ReauthenticationException.class);

        verifyNoInteractions(relyingParty, challenges);
    }
}
