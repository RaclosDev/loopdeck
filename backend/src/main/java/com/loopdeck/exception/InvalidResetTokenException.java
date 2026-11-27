package com.loopdeck.exception;

/** El enlace de recuperación no existe, caducó, ya se usó o lo sustituyó otro más reciente. */
public class InvalidResetTokenException extends RuntimeException {
    public InvalidResetTokenException() {
        super("Reset token invalid, expired or already used");
    }
}
