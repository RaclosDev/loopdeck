package com.loopdeck.service.mail;

/** Envío de correos transaccionales (por ahora, solo los de recuperar la contraseña). */
public interface EmailSender {

    /** Si hay proveedor configurado: sin él no se manda nada. */
    boolean enabled();

    /**
     * Manda el correo sin esperar a la respuesta del proveedor. Los fallos solo quedan en el log, sin
     * direcciones ni contenido.
     */
    void send(Email email);

    /**
     * @param to      destinatario
     * @param subject asunto
     * @param text    cuerpo en texto plano
     * @param html    el mismo cuerpo en HTML
     */
    record Email(String to, String subject, String text, String html) {

        /** Que ni la dirección ni el contenido (con el enlace de un solo uso) acaben en los logs. */
        @Override
        public String toString() {
            return "Email[subject=" + subject + "]";
        }
    }
}
