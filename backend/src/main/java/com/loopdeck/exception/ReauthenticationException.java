package com.loopdeck.exception;

/** La acción exige confirmar la identidad (contraseña o Google) y no se ha confirmado. */
public class ReauthenticationException extends RuntimeException {
    public ReauthenticationException(String message) { super(message); }
}
