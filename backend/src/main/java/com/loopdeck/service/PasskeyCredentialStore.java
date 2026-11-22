package com.loopdeck.service;

import com.loopdeck.model.Passkey;
import com.loopdeck.model.User;
import com.loopdeck.repository.PasskeyRepository;
import com.loopdeck.repository.UserRepository;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Acceso de la librería WebAuthn a las llaves guardadas. El «username» de WebAuthn es el email de
 * la cuenta, que es único.
 */
@Component
@RequiredArgsConstructor
public class PasskeyCredentialStore implements CredentialRepository {

    private final PasskeyRepository passkeyRepository;
    private final UserRepository userRepository;

    @Override
    public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String email) {
        return userRepository.findByEmail(email)
                .map(user -> passkeyRepository.findCredentialIdsByUserId(user.getId()).stream()
                        .map(id -> PublicKeyCredentialDescriptor.builder().id(new ByteArray(id)).build())
                        .collect(Collectors.toSet()))
                .orElse(Set.of());
    }

    @Override
    public Optional<ByteArray> getUserHandleForUsername(String email) {
        return userRepository.findByEmail(email)
                .flatMap(user -> passkeyRepository.findFirstByUserId(user.getId()))
                .map(passkey -> new ByteArray(passkey.getUserHandle()));
    }

    @Override
    public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
        return passkeyRepository.findFirstByUserHandle(userHandle.getBytes())
                .flatMap(passkey -> userRepository.findById(passkey.getUserId()))
                .map(User::getEmail);
    }

    @Override
    public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
        return passkeyRepository.findByCredentialId(credentialId.getBytes())
                .filter(passkey -> Arrays.equals(passkey.getUserHandle(), userHandle.getBytes()))
                .map(PasskeyCredentialStore::toRegistered);
    }

    @Override
    public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
        return passkeyRepository.findByCredentialId(credentialId.getBytes())
                .map(PasskeyCredentialStore::toRegistered)
                .map(Set::of)
                .orElse(Set.of());
    }

    private static RegisteredCredential toRegistered(Passkey passkey) {
        return RegisteredCredential.builder()
                .credentialId(new ByteArray(passkey.getCredentialId()))
                .userHandle(new ByteArray(passkey.getUserHandle()))
                .publicKeyCose(new ByteArray(passkey.getPublicKeyCose()))
                .signatureCount(passkey.getSignatureCount())
                .build();
    }
}
