package com.loopdeck.security;

import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/** Ventana deslizante en memoria: cuenta eventos por clave durante {@code windowMs}. */
public class SlidingWindowLimiter {

    private static final int MAX_TRACKED_ENTRIES = 2000;

    private final long windowMs;
    private final Map<String, Deque<Long>> events = new ConcurrentHashMap<>();

    public SlidingWindowLimiter(long windowMs) {
        this.windowMs = windowMs;
    }

    /** Registra el evento si la clave aún no ha llegado a {@code limit}; si no, devuelve false sin registrar. */
    public boolean tryAcquire(String key, int limit, long now) {
        pruneIfLarge(now);
        Deque<Long> timestamps = events.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        expire(timestamps, now);
        if (timestamps.size() >= limit) {
            return false;
        }
        timestamps.addLast(now);
        return true;
    }

    public int count(String key, long now) {
        Deque<Long> timestamps = events.get(key);
        if (timestamps == null) return 0;
        expire(timestamps, now);
        return timestamps.size();
    }

    public void record(String key, long now) {
        pruneIfLarge(now);
        events.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>()).addLast(now);
    }

    public void clear(String key) {
        events.remove(key);
    }

    private void expire(Deque<Long> timestamps, long now) {
        Long first;
        while ((first = timestamps.peekFirst()) != null && now - first > windowMs) {
            timestamps.pollFirst();
        }
    }

    // Evita que el mapa crezca sin límite podando entradas inactivas.
    private void pruneIfLarge(long now) {
        if (events.size() > MAX_TRACKED_ENTRIES) {
            events.entrySet().removeIf(entry -> {
                Long last = entry.getValue().peekLast();
                return last == null || now - last > windowMs;
            });
        }
    }
}
