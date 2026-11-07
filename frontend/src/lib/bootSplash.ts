const FONT_WAIT_MS = 400;
const FADE_MS = 200;

/**
 * Retira el splash de index.html cuando la primera pantalla ya está pintada y sus fuentes han
 * llegado (como mucho 400 ms de espera), con un fundido corto que se omite con movimiento reducido.
 */
export function hideBootSplash(doc: Document = document): Promise<void> {
  const splash = doc.getElementById('boot-splash');
  if (!splash) return Promise.resolve();

  const fontsReady = doc.fonts?.ready ?? Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS));
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return Promise.race([fontsReady, timeout]).then(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          if (reduceMotion) {
            splash.remove();
            resolve();
            return;
          }
          splash.classList.add('is-leaving');
          setTimeout(() => {
            splash.remove();
            resolve();
          }, FADE_MS);
        });
      }),
  );
}
