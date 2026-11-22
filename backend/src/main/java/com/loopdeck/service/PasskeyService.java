package com.loopdeck.service;

import com.loopdeck.exception.ConflictException;
import com.loopdeck.model.Passkey;
import com.loopdeck.model.PasskeyChallenge;
import com.loopdeck.model.User;
import com.loopdeck.repository.PasskeyChallengeRepository;
import com.loopdeck.repository.PasskeyRepository;
import com.loopdeck.repository.UserRepository;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.AssertionResult;
import com.yubico.webauthn.FinishAssertionOptions;
import com.yubico.webauthn.FinishRegistrationOptions;
import com.yubico.webauthn.RegistrationResult;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.StartAssertionOptions;
import com.yubico.webauthn.StartRegistrationOptions;
import com.yubico.webauthn.data.AuthenticatorSelectionCriteria;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredential;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import com.yubico.webauthn.data.ResidentKeyRequirement;
import com.yubico.webauthn.data.UserIdentity;
import com.yubico.webauthn.data.UserVerificationRequirement;
import com.yubico.webauthn.exception.AssertionFailedException;
import com.yubico.webauthn.exception.RegistrationFailedException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * Llaves de acceso (WebAuthn): entrar con huella, cara o el PIN del dispositivo sin contraseña.
 * <ul>
 *   <li>Se añaden con la sesión ya iniciada, desde los ajustes de la cuenta.</li>
 *   <li>Son llaves «descubribles»: para entrar no hace falta escribir el email, el dispositivo
 *       ofrece las cuentas que tiene guardadas.</li>
 *   <li>Siempre se pide verificar a la persona (huella, cara o PIN), no solo tener el dispositivo.</li>
 *   <li>Cada reto vive {@link #CHALLENGE_TTL} y se gasta al comprobarlo, salga bien o mal. Los que
 *       nadie completa los borra la limpieza nocturna.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PasskeyService {

    private static final Logger log = LoggerFactory.getLogger(PasskeyService.class);

    static final Duration CHALLENGE_TTL = Duration.ofMinutes(5);
    static final int MAX_PASSKEYS = 10;
    static final int MAX_NAME_LENGTH = 60;
    private static final int RANDOM_ID_BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String EXPIRED = "Ha pasado demasiado tiempo. Vuelve a intentarlo.";

    private final RelyingParty relyingParty;
    private final PasskeyRepository passkeyRepository;
    private final PasskeyChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    /** Opciones para que el navegador cree una llave de la cuenta. */
    @Transactional
    public Ceremony startRegistration(String userId) {
        User user = requireUser(userId);
        ensureRoomForAnother(user);
        ByteArray userHandle = passkeyRepository.findFirstByUserId(user.getId())
                .map(passkey -> new ByteArray(passkey.getUserHandle()))
                .orElseGet(() -> new ByteArray(randomBytes()));
        String displayName = user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getEmail();
        PublicKeyCredentialCreationOptions options = relyingParty.startRegistration(StartRegistrationOptions.builder()
                .user(UserIdentity.builder()
                        .name(user.getEmail())
                        .displayName(displayName)
                        .id(userHandle)
                        .build())
                .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                        .residentKey(ResidentKeyRequirement.REQUIRED)
                        .userVerification(UserVerificationRequirement.REQUIRED)
                        .build())
                .timeout(CHALLENGE_TTL.toMillis())
                .build());
        try {
            return newCeremony(user.getId(), options.toJson(), options.toCredentialsCreateJson());
        } catch (IOException e) {
            throw new IllegalStateException("No se han podido serializar las opciones de registro", e);
        }
    }

    /**
     * Comprueba la llave creada por el navegador y la guarda. El reto se gasta aunque falle.
     *
     * @throws ConflictException si el reto no vale, la respuesta no es correcta o no caben más llaves
     */
    @Transactional(noRollbackFor = ConflictException.class)
    public PasskeyView finishRegistration(String userId, String requestId, String credentialJson, String name) {
        User user = requireUser(userId);
        PasskeyChallenge challenge = consume(requestId)
                .filter(found -> user.getId().equals(found.getUserId()))
                .orElseThrow(() -> new ConflictException(EXPIRED));
        ensureRoomForAnother(user);
        try {
            PublicKeyCredentialCreationOptions request = PublicKeyCredentialCreationOptions.fromJson(challenge.getRequestJson());
            RegistrationResult result = relyingParty.finishRegistration(FinishRegistrationOptions.builder()
                    .request(request)
                    .response(PublicKeyCredential.parseRegistrationResponseJson(credentialJson))
                    .build());
            Passkey saved = passkeyRepository.save(Passkey.builder()
                    .userId(user.getId())
                    .credentialId(result.getKeyId().getId().getBytes())
                    .userHandle(request.getUser().getId().getBytes())
                    .publicKeyCose(result.getPublicKeyCose().getBytes())
                    .signatureCount(result.getSignatureCount())
                    .name(cleanName(name))
                    .createdAt(Instant.now())
                    .build());
            log.info("Llave de acceso añadida (usuario {}).", user.getId());
            return PasskeyView.of(saved);
        } catch (RegistrationFailedException | IOException | IllegalArgumentException e) {
            log.info("Registro de llave de acceso rechazado (usuario {}): {}", user.getId(), e.getMessage());
            throw new ConflictException("No se ha podido guardar la llave de acceso.");
        }
    }

    /** Opciones para que el navegador ofrezca las llaves guardadas en el dispositivo. */
    @Transactional
    public Ceremony startLogin() {
        AssertionRequest request = relyingParty.startAssertion(StartAssertionOptions.builder()
                .userVerification(UserVerificationRequirement.REQUIRED)
                .timeout(CHALLENGE_TTL.toMillis())
                .build());
        try {
            return newCeremony(null, request.toJson(), request.toCredentialsGetJson());
        } catch (IOException e) {
            throw new IllegalStateException("No se han podido serializar las opciones de acceso", e);
        }
    }

    /**
     * Comprueba la firma de la llave y abre una sesión de su cuenta. Vacío si no vale: reto
     * caducado o ya usado, llave desconocida (p. ej. borrada) o firma incorrecta.
     */
    @Transactional
    public Optional<AuthService.AuthResponse> finishLogin(String requestId, String credentialJson) {
        Optional<PasskeyChallenge> challenge = consume(requestId).filter(found -> found.getUserId() == null);
        if (challenge.isEmpty()) {
            return Optional.empty();
        }
        try {
            AssertionResult result = relyingParty.finishAssertion(FinishAssertionOptions.builder()
                    .request(AssertionRequest.fromJson(challenge.get().getRequestJson()))
                    .response(PublicKeyCredential.parseAssertionResponseJson(credentialJson))
                    .build());
            if (!result.isSuccess()) {
                return Optional.empty();
            }
            Optional<Passkey> passkey = passkeyRepository.findByCredentialId(result.getCredential().getCredentialId().getBytes());
            passkey.ifPresent(used -> {
                used.setSignatureCount(result.getSignatureCount());
                used.setLastUsedAt(Instant.now());
            });
            return passkey
                    .flatMap(used -> userRepository.findById(used.getUserId()))
                    .map(user -> {
                        log.info("Inicio de sesión con llave de acceso (usuario {}).", user.getId());
                        return authService.issueSession(user);
                    });
        } catch (AssertionFailedException | IOException | IllegalArgumentException e) {
            log.info("Inicio de sesión con llave de acceso rechazado: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /** Llaves de la cuenta, de la más antigua a la más reciente. */
    @Transactional(readOnly = true)
    public List<PasskeyView> list(String userId) {
        return passkeyRepository.findByUserIdOrderByCreatedAtAsc(userId).stream().map(PasskeyView::of).toList();
    }

    /** Borra una llave de la cuenta. False si no existe o es de otra cuenta. */
    @Transactional
    public boolean delete(String userId, Long passkeyId) {
        return passkeyRepository.findByIdAndUserId(passkeyId, userId)
                .map(passkey -> {
                    passkeyRepository.delete(passkey);
                    log.info("Llave de acceso borrada (usuario {}).", userId);
                    return true;
                })
                .orElse(false);
    }

    /** Retos que nadie llegó a completar. */
    @Scheduled(cron = "0 40 4 * * *", zone = "UTC")
    @Transactional
    public void purgeExpiredChallenges() {
        int removed = challengeRepository.deleteExpired(Instant.now());
        if (removed > 0) {
            log.info("Borrados {} retos de llaves de acceso caducados.", removed);
        }
    }

    private Ceremony newCeremony(String userId, String requestJson, String browserOptionsJson) {
        String id = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes());
        challengeRepository.save(PasskeyChallenge.builder()
                .id(id)
                .userId(userId)
                .requestJson(requestJson)
                .expiresAt(Instant.now().plus(CHALLENGE_TTL))
                .build());
        return new Ceremony(id, browserOptionsJson);
    }

    /** Gasta el reto y lo devuelve si aún no había caducado. */
    private Optional<PasskeyChallenge> consume(String requestId) {
        if (requestId == null || requestId.isBlank()) {
            return Optional.empty();
        }
        Optional<PasskeyChallenge> found = challengeRepository.findByIdForUpdate(requestId);
        found.ifPresent(challengeRepository::delete);
        return found.filter(challenge -> Instant.now().isBefore(challenge.getExpiresAt()));
    }

    private void ensureRoomForAnother(User user) {
        if (passkeyRepository.countByUserId(user.getId()) >= MAX_PASSKEYS) {
            throw new ConflictException("Ya tienes " + MAX_PASSKEYS + " llaves de acceso. Borra alguna para añadir otra.");
        }
    }

    private User requireUser(String userId) {
        return Optional.ofNullable(userId)
                .flatMap(userRepository::findById)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));
    }

    static String cleanName(String name) {
        String trimmed = name == null ? "" : name.strip().replaceAll("\\p{Cntrl}", "");
        if (trimmed.isEmpty()) {
            return "Llave de acceso";
        }
        return trimmed.length() > MAX_NAME_LENGTH ? trimmed.substring(0, MAX_NAME_LENGTH) : trimmed;
    }

    private static byte[] randomBytes() {
        byte[] bytes = new byte[RANDOM_ID_BYTES];
        RANDOM.nextBytes(bytes);
        return bytes;
    }

    /**
     * Ceremonia WebAuthn en curso.
     *
     * @param requestId          identificador del reto, para la respuesta del navegador
     * @param browserOptionsJson opciones para {@code navigator.credentials}, con su clave {@code publicKey}
     */
    public record Ceremony(String requestId, String browserOptionsJson) {
    }

    /** Llave tal como la ve su dueño en los ajustes. */
    public record PasskeyView(Long id, String name, Instant createdAt, Instant lastUsedAt) {
        static PasskeyView of(Passkey passkey) {
            return new PasskeyView(passkey.getId(), passkey.getName(), passkey.getCreatedAt(), passkey.getLastUsedAt());
        }
    }
}
