import { useEffect, useRef, useState } from 'react';

const START = '/demo';
const POSTER = '/landing/demo';
const DESKTOP = '(min-width: 1024px)';

// La /demo de verdad, dentro de un móvil, al lado del texto del hero. En el ordenador la app carga desde el
// principio, sin una captura delante que luego haya que cambiar por ella. En móviles y tabletas el móvil enseña una
// captura de la misma pantalla que abre la demo: allí a pantalla completa ya es de móvil.
export default function LiveDemo() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => setDesktop(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // La app ve un iPhone 17 de verdad (402 px de ancho) y aquí se reduce al tamaño del móvil dibujado.
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = screen.current;
    if (!el || !desktop) return;
    const fit = () => el.style.setProperty('--live-scale', String(el.clientWidth / 402));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [desktop]);
  return (
    <figure className="ld-live">
      <div className="ld-live__phone">
        <div ref={screen} className="ld-live__screen">
          {desktop ? (
            <iframe src={START} title="Demo de LoopDeck" className="ld-live__frame" />
          ) : (
            <>
              <img
                src={`${POSTER}-390.webp`}
                srcSet={`${POSTER}-390.webp 390w, ${POSTER}.webp 780w`}
                sizes="390px"
                alt="Inicio de la demo: lo que toca repasar hoy y tus mazos"
                width="780"
                height="1560"
                fetchPriority="high"
                className="ld-live__poster"
              />
              {/* En el móvil la captura también abre la demo; «Probar la demo», al lado, es la entrada accesible. */}
              <a href={START} className="ld-live__tap" tabIndex={-1} aria-hidden="true">
                <span className="sr-only">Abrir la demo</span>
              </a>
            </>
          )}
        </div>
      </div>
    </figure>
  );
}
