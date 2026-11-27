package com.loopdeck.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        return buildErrorResponse("Revisa los campos de la solicitud", HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<?> handleSecurityException(SecurityException ex) {
        log.warn("Security exception: {}", ex.getMessage());
        return buildErrorResponse("No tienes acceso a este recurso", HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(ReauthenticationException.class)
    public ResponseEntity<?> handleReauthentication(ReauthenticationException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(TokenRefreshException.class)
    public ResponseEntity<?> handleTokenRefreshException(TokenRefreshException ex) {
        log.warn("Refresh token error: {}", ex.getMessage());
        return buildErrorResponse("La sesión ha caducado. Inicia sesión de nuevo", HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(InvalidInputException.class)
    public ResponseEntity<?> handleInvalidInputException(InvalidInputException ex) {
        log.warn("Invalid input: {}", ex.getMessage());
        return buildErrorResponse("La solicitud contiene datos no válidos", HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.web.bind.MissingServletRequestParameterException.class,
        org.springframework.web.multipart.support.MissingServletRequestPartException.class})
    public ResponseEntity<?> handleMalformedRequest(Exception ex) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof com.loopdeck.config.RequestBodyLimitFilter.BodyTooLargeException) {
                return buildErrorResponse("La petición es demasiado grande", HttpStatus.PAYLOAD_TOO_LARGE);
            }
        }
        return buildErrorResponse("La solicitud contiene datos no válidos", HttpStatus.BAD_REQUEST);
    }
    
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return buildErrorResponse("La solicitud contiene datos no válidos", HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleOversizedDocument(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        return buildErrorResponse("El archivo supera el límite de 15 MB", HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @ExceptionHandler(AiUnavailableException.class)
    public ResponseEntity<?> handleAiUnavailable(AiUnavailableException ex) {
        log.warn("AI unavailable: {}", ex.getMessage());
        return buildErrorResponse("La IA no ha podido responder. Inténtalo de nuevo en un momento", HttpStatus.SERVICE_UNAVAILABLE);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<?> handleTooManyRequests(TooManyRequestsException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.TOO_MANY_REQUESTS);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<?> handleConflict(ConflictException ex) { return buildErrorResponse(ex.getMessage(), HttpStatus.CONFLICT); }

    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ResponseEntity<?> handleOptimisticLock(org.springframework.dao.OptimisticLockingFailureException ex) {
        return buildErrorResponse("Los datos han cambiado mientras los editabas; recarga e inténtalo de nuevo", HttpStatus.CONFLICT);
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<?> handleMethodNotSupported(org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON);
        if (ex.getSupportedHttpMethods() != null && !ex.getSupportedHttpMethods().isEmpty()) {
            response.allow(ex.getSupportedHttpMethods().toArray(new org.springframework.http.HttpMethod[0]));
        }
        return response.body(Map.of("error", "Método no permitido"));
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<?> handleUnsupportedMediaType(org.springframework.web.HttpMediaTypeNotSupportedException ex) {
        return jsonError("Tipo de contenido no admitido", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<?> handleNotAcceptable(org.springframework.web.HttpMediaTypeNotAcceptableException ex) {
        return jsonError("Formato de respuesta no disponible", HttpStatus.NOT_ACCEPTABLE);
    }

    @ExceptionHandler(org.springframework.dao.PessimisticLockingFailureException.class)
    public ResponseEntity<?> handleLockTimeout(org.springframework.dao.PessimisticLockingFailureException ex) {
        log.warn("Lock timeout: {}", ex.getMessage());
        return jsonError("El recurso está ocupado; inténtalo de nuevo en un momento", HttpStatus.CONFLICT);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataConflict(org.springframework.dao.DataIntegrityViolationException ex) {
        return buildErrorResponse("La operación entra en conflicto con los datos actuales", HttpStatus.CONFLICT);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResource(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return buildErrorResponse("No encontrado", HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGlobalException(Exception ex) {
        log.error("Unhandled exception occurred", ex);
        return buildErrorResponse("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private ResponseEntity<?> jsonError(String message, HttpStatus status) {
        return ResponseEntity.status(status).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .body(Map.of("error", message));
    }

    private ResponseEntity<?> buildErrorResponse(String message, HttpStatus status) {
        Map<String, String> body = new HashMap<>();
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}
