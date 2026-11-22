import { useEffect, useRef, useState } from 'react';

const START = '/demo';
const POSTER = '/landing/demo';
const DESKTOP = '(min-width: 1024px)';

// La /demo de verdad, dentro de un móvil, al lado del texto del hero. Hasta que la app ha cargado (y siempre en
// móviles y tabletas) el móvil enseña una captura de la misma pantalla; en el ordenador la app carga detrás y
// aparece cuando ya se ha pintado. En el móvil la captura abre la demo: allí a pantalla completa ya es de móvil.
export default function LiveDemo() {
  const timer = useRef(0);
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => setDesktop(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Cuando la portada ya ha cargado y el navegador está libre, la demo empieza a cargar detrás de la captura, sin
  // esperar a que se vea: cuando el visitante llega ya está lista.
  useEffect(() => {
    if (!desktop || started) return;
    let idle = 0;
    let t = 0;
    const start = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(() => setStarted(true), { timeout: 3000 });
      } else {
        t = window.setTimeout(() => setStarted(true), 1500);
      }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(t);
    };
  }, [desktop, started]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Se enseña cuando la app ya ha pintado su pantalla, no la página en blanco de antes.
  const waitForApp = (frame: HTMLIFrameElement, tries = 0) => {
    const painted = frame.contentDocument?.querySelector('.main-content');
    if (painted) {
      timer.current = window.setTimeout(() => setReady(true), 200);
      return;
    }
    // Si no llega a pintarse (bloqueada o con error), se queda la captura: mejor que la página de error del navegador.
    if (tries >= 100) return;
    timer.current = window.setTimeout(() => waitForApp(frame, tries + 1), 120);
  };

  const live = desktop && started;

  return (
    <figure className="ld-live">
      <div className="ld-live__phone">
        <div className="ld-live__screen">
          <img
            src={`${POSTER}-390.webp`}
            srcSet={`${POSTER}-390.webp 390w, ${POSTER}.webp 780w`}
            sizes="390px"
            alt={live ? '' : 'Inicio de la demo: lo que toca repasar hoy y tus mazos'}
            width="780"
            height="1560"
            fetchPriority="high"
            className="ld-live__poster"
          />
          {!desktop && (
            // En el móvil la captura también abre la demo; «Probar la demo», al lado, es la entrada accesible.
            <a href={START} className="ld-live__tap" tabIndex={-1} aria-hidden="true">
              <span className="sr-only">Abrir la demo</span>
            </a>
          )}
          {live && (
            <iframe
              src={START}
              title="Demo de LoopDeck"
              className={`ld-live__frame${ready ? ' is-ready' : ''}`}
              onLoad={(e) => waitForApp(e.currentTarget)}
            />
          )}
        </div>
      </div>
    </figure>
  );
}
