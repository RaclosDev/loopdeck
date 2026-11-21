import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';

/**
 * Movimiento de la portada, sin librería: las transiciones viven en `landing.css` y aquí solo se
 * decide cuándo empiezan. Cada animación ocurre una sola vez y, con «reducir movimiento», todo
 * aparece ya en su sitio.
 */
const REDUCED = '(prefers-reduced-motion: reduce)';

const subscribeReduced = (notify: () => void) => {
  const query = window.matchMedia?.(REDUCED);
  query?.addEventListener?.('change', notify);
  return () => query?.removeEventListener?.('change', notify);
};
const readReduced = () => window.matchMedia?.(REDUCED).matches ?? false;

export const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, readReduced, () => false);

const splashGone = () => !document.getElementById('boot-splash');

/** Con la pantalla de arranque delante las animaciones no se verían: esperan a que se retire. */
export function useSplashGone() {
  const [gone, setGone] = useState(splashGone);
  useEffect(() => {
    if (gone) return;
    const observer = new MutationObserver(() => {
      if (splashGone()) {
        setGone(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, [gone]);
  return gone;
}

/**
 * Marca el elemento con `data-in` cuando toca animarlo: al cargar (`onLoad`) o la primera vez que
 * entra en pantalla. Lo que ya quedó por encima (al recargar a media página) se enseña sin esperar.
 */
export function useReveal<T extends HTMLElement>(onLoad = false) {
  const ref = useRef<T>(null);
  const ready = useSplashGone();
  useEffect(() => {
    const element = ref.current;
    if (!element || !ready) return;
    if (onLoad || typeof IntersectionObserver === 'undefined') {
      element.dataset.in = '';
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || (!entry.isIntersecting && entry.boundingClientRect.top >= 0)) return;
        element.dataset.in = '';
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -6% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onLoad, ready]);
  return ref;
}

/**
 * Avance del scroll (0 → 1) mientras el elemento cruza la pantalla, entre `start` y `end`
 * (fracciones del alto de la ventana en las que su borde superior empieza y termina).
 */
export function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
  { start = 0.9, end = 0.35, enabled = true } = {},
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) {
      onProgress(1);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = element.getBoundingClientRect().top / window.innerHeight;
      onProgress(Math.min(1, Math.max(0, (start - top) / (start - end))));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref, onProgress, start, end, enabled]);
}

/** Variables de una animación: su posición en la cascada y sus ajustes. */
export const motionStyle = (vars: Record<string, string | number>) => vars as CSSProperties;
