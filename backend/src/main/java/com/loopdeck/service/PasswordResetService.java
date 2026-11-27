package com.loopdeck.service;

import com.loopdeck.exception.InvalidResetTokenException;
import com.loopdeck.model.PasswordResetToken;
import com.loopdeck.model.User;
import com.loopdeck.repository.PasswordResetTokenRepository;
import com.loopdeck.repository.UserRepository;
import com.loopdeck.security.LoginThrottle;
import com.loopdeck.security.SecureTokens;
import com.loopdeck.security.SlidingWindowLimiter;
import com.loopdeck.service.mail.EmailSender;
import com.loopdeck.util.Emails;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.util.HtmlUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * Recuperar la contraseña por correo.
 *
 * <ul>
 *   <li>Pedirlo responde siempre lo mismo y tarda lo mismo exista o no la cuenta: el trabajo (consulta,
 *       token y envío) va a otro hilo y quien llama solo comprueba el límite por correo.</li>
 *   <li>El token es aleatorio de 256 bits, de un solo uso, caduca a los {@value #TOKEN_MINUTES} minutos y
 *       solo se guarda su hash. Pedir uno nuevo invalida los anteriores.</li>
 *   <li>Una cuenta sin contraseña (entra con Google) no recibe enlace: el correo le dice que entre con
 *       Google. Dar contraseña a esa cuenta por correo abriría una segunda vía de entrada que su dueño no
 *       ha pedido.</li>
 *   <li>Confirmar cambia la contraseña y revoca todas las sesiones y los enlaces pendientes.</li>
 * </ul>
 */
@Service
public class PasswordResetService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    static final int TOKEN_MINUTES = 30;
    static final Duration TOKEN_LIFETIME = Duration.ofMinutes(TOKEN_MINUTES);
    static final int MAX_REQUESTS_PER_EMAIL_PER_HOUR = 3;
    private static final long HOUR_MS = 60 * 60_000L;
    private static final String RESET_PATH = "/reset-password?token=";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final RefreshTokenService refreshTokenService;
    private final PasswordEncoder passwordEncoder;
    private final LoginThrottle loginThrottle;
    private final EmailSender emailSender;
    private final TransactionTemplate transactions;
    private final Executor executor;
    private final String publicUrl;
    private final SlidingWindowLimiter perEmail = new SlidingWindowLimiter(HOUR_MS);

    @Autowired
    public PasswordResetService(UserRepository userRepository, PasswordResetTokenRepository tokenRepository,
                                RefreshTokenService refreshTokenService, PasswordEncoder passwordEncoder,
                                LoginThrottle loginThrottle, EmailSender emailSender,
                                PlatformTransactionManager transactionManager,
                                @Value("${app.public-url:http://localhost:5173}") String publicUrl) {
        this(userRepository, tokenRepository, refreshTokenService, passwordEncoder, loginThrottle, emailSender,
                transactionManager, publicUrl, newExecutor());
    }

    PasswordResetService(UserRepository userRepository, PasswordResetTokenRepository tokenRepository,
                         RefreshTokenService refreshTokenService, PasswordEncoder passwordEncoder,
                         LoginThrottle loginThrottle, EmailSender emailSender,
                         PlatformTransactionManager transactionManager, String publicUrl, Executor executor) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.refreshTokenService = refreshTokenService;
        this.passwordEncoder = passwordEncoder;
        this.loginThrottle = loginThrottle;
        this.emailSender = emailSender;
        this.transactions = new TransactionTemplate(transactionManager);
        this.publicUrl = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
        this.executor = executor;
    }

    private static Executor newExecutor() {
        return new ThreadPoolExecutor(1, 2, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(50), runnable -> {
            Thread thread = new Thread(runnable, "password-reset");
            thread.setDaemon(true);
            return thread;
        });
    }

    @PreDestroy
    void shutdown() {
        if (executor instanceof ThreadPoolExecutor pool) {
            pool.shutdown();
        }
    }

    /**
     * Pide el correo de recuperación. No devuelve nada ni lanza nada según exista o no la cuenta; pasado el
     * límite por correo tampoco avisa (el límite por IP, que responde 429, está en el interceptor).
     */
    public void request(String rawEmail) {
        String email = Emails.normalize(rawEmail);
        if (email == null || email.isBlank()) {
            return;
        }
        if (!perEmail.tryAcquire(email, MAX_REQUESTS_PER_EMAIL_PER_HOUR, System.currentTimeMillis())) {
            log.info("Recuperación de contraseña omitida: demasiadas peticiones para un mismo correo");
            return;
        }
        try {
            executor.execute(() -> process(email));
        } catch (RejectedExecutionException e) {
            log.warn("Recuperación de contraseña descartada: cola de envío llena");
        }
    }

    /** Trabajo de fondo de {@link #request}: nunca propaga errores, que solo se registran sin datos personales. */
    void process(String email) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                log.info("Recuperación de contraseña pedida para una cuenta inexistente");
                return;
            }
            if (user.getPasswordHash() == null) {
                emailSender.send(googleOnlyEmail(user));
                return;
            }
            String plain = SecureTokens.generate();
            Instant expires = Instant.now().plus(TOKEN_LIFETIME);
            transactions.executeWithoutResult(status -> {
                tokenRepository.deleteByUserId(user.getId());
                tokenRepository.save(new PasswordResetToken(user.getId(), SecureTokens.hash(plain), expires));
            });
            emailSender.send(resetEmail(user, plain));
        } catch (RuntimeException e) {
            log.error("No se pudo procesar una recuperación de contraseña: {}", e.getClass().getSimpleName());
        }
    }

    /**
     * Cambia la contraseña con el token del correo. Un token inexistente, caducado, usado o sustituido por
     * otro más reciente lanza {@link InvalidResetTokenException}. Revoca todas las sesiones de la cuenta.
     */
    public void confirm(String plainToken, String newPassword) {
        if (plainToken == null || plainToken.isBlank()) {
            throw new InvalidResetTokenException();
        }
        String hash = SecureTokens.hash(plainToken.trim());
        // Todo en una transacción: si algo falla (p. ej. la cuenta ya no tiene contraseña) el token no se gasta.
        transactions.executeWithoutResult(status -> {
            PasswordResetToken found = tokenRepository.findByTokenHash(hash).orElseThrow(InvalidResetTokenException::new);
            String userId = found.getUserId();
            // Gasto atómico: si dos peticiones llegan con el mismo enlace, solo una lo consigue.
            if (tokenRepository.consume(hash, Instant.now()) != 1) {
                throw new InvalidResetTokenException();
            }
            User user = userRepository.findById(userId).orElseThrow(InvalidResetTokenException::new);
            if (user.getPasswordHash() == null) {
                // La cuenta pasó a entrar con Google después de pedir el enlace: ya no tiene contraseña.
                throw new InvalidResetTokenException();
            }
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            refreshTokenService.deleteByUserId(userId);
            tokenRepository.deleteByUserId(userId);
            loginThrottle.reset(user.getEmail());
            loginThrottle.reset("reauth:" + userId);
        });
    }

    /** Purga diaria de enlaces caducados. */
    @Scheduled(cron = "0 40 4 * * *", zone = "UTC")
    public void purgeExpired() {
        Integer deleted = transactions.execute(status -> tokenRepository.deleteExpiredBefore(Instant.now()));
        if (deleted != null && deleted > 0) {
            log.info("Enlaces de recuperación caducados eliminados: {}", deleted);
        }
    }

    private EmailSender.Email resetEmail(User user, String plainToken) {
        String link = publicUrl + RESET_PATH + plainToken;
        String name = displayName(user);
        String text = "Hola, " + name + ".\n\n"
                + "Has pedido cambiar la contraseña de tu cuenta de LoopDeck. Abre este enlace para elegir una nueva "
                + "(caduca en " + TOKEN_MINUTES + " minutos y solo sirve una vez):\n\n"
                + link + "\n\n"
                + "Si no lo has pedido tú, ignora este correo: tu contraseña no cambia.";
        String html = "<p>Hola, " + HtmlUtils.htmlEscape(name) + ".</p>"
                + "<p>Has pedido cambiar la contraseña de tu cuenta de LoopDeck. Pulsa el botón para elegir una nueva "
                + "(el enlace caduca en " + TOKEN_MINUTES + " minutos y solo sirve una vez).</p>"
                + "<p><a href=\"" + HtmlUtils.htmlEscape(link) + "\" style=\"display:inline-block;padding:10px 18px;"
                + "background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px\">Elegir nueva contraseña</a></p>"
                + "<p>Si no lo has pedido tú, ignora este correo: tu contraseña no cambia.</p>";
        return new EmailSender.Email(user.getEmail(), "Recupera tu contraseña de LoopDeck", text, html);
    }

    private EmailSender.Email googleOnlyEmail(User user) {
        String name = displayName(user);
        String link = publicUrl + "/login";
        String text = "Hola, " + name + ".\n\n"
                + "Alguien ha pedido recuperar la contraseña de tu cuenta de LoopDeck, pero tu cuenta no tiene "
                + "contraseña: entra con Google. Puedes hacerlo aquí:\n\n"
                + link + "\n\n"
                + "Si no lo has pedido tú, ignora este correo.";
        String html = "<p>Hola, " + HtmlUtils.htmlEscape(name) + ".</p>"
                + "<p>Alguien ha pedido recuperar la contraseña de tu cuenta de LoopDeck, pero tu cuenta no tiene "
                + "contraseña: entra con Google.</p>"
                + "<p><a href=\"" + HtmlUtils.htmlEscape(link) + "\">Ir a iniciar sesión</a></p>"
                + "<p>Si no lo has pedido tú, ignora este correo.</p>";
        return new EmailSender.Email(user.getEmail(), "Tu cuenta de LoopDeck entra con Google", text, html);
    }

    private static String displayName(User user) {
        return user.getName() == null || user.getName().isBlank() ? "" : user.getName();
    }
}
