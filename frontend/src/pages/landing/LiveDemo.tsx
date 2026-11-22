import { useEffect, useRef, useState } from 'react';
import PosterHeading from './PosterHeading';
import Reveal from './Reveal';

const START = '/demo';
const POSTER = '/landing/demo';
const DESKTOP = '(min-width: 1024px)';

// La /demo de verdad, dentro de un móvil. Hasta que se acerca a la pantalla (y siempre en móviles y tabletas)
// el móvil enseña una captura de la misma pantalla; en el ordenador la app carga detrás y aparece cuando ya se ha
// pintado. En el móvil va un botón: allí la demo a pantalla completa ya tiene tamaño de móvil.
export default function LiveDemo() {
  const phone = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => setDesktop(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const el = phone.current;
    if (!desktop || near || !el) return;
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [desktop, near]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Se enseña cuando la app ya ha pintado su pantalla, no la página en blanco de antes.
  const waitForApp = (frame: HTMLIFrameElement, tries = 0) => {
    const painted = frame.contentDocument?.querySelector('.main-content');
    if (painted || tries >= 50) {
      timer.current = window.setTimeout(() => setReady(true), 200);
      return;
    }
    timer.current = window.setTimeout(() => waitForApp(frame, tries + 1), 120);
  };

  const live = desktop && near;

  return (
    <section id="demo-en-vivo" className="ld-section" aria-labelledby="live-title">
      <div className="ld-live">
        <div>
          <PosterHeading
            id="live-title"
            lines={['La app entera,']}
            marked="para tocarla."
            className="fam-h2 ld-section__title"
          />
          <Reveal as="p" className="fam-lede">
            Es la demo de verdad, con cinco mazos de ejemplo. Repasa uno, crea una tarjeta o mira
            tus estadísticas. Nada de lo que hagas se guarda.
          </Reveal>
          <p className="ld-live__cta">
            <a className="fam-btn fam-btn--lg" href={START}>
              {desktop ? 'Abrir a pantalla completa' : 'Abrir la demo'}
            </a>
          </p>
        </div>

        <div ref={phone} className="ld-live__phone">
          <div className="ld-live__screen">
            <img
              src={`${POSTER}-390.webp`}
              srcSet={`${POSTER}-390.webp 390w, ${POSTER}.webp 780w`}
              sizes="390px"
              alt={live ? '' : 'Inicio de la demo: lo que toca repasar hoy y tus mazos'}
              width="780"
              height="1560"
              loading="lazy"
              className="ld-live__poster"
            />
            {!desktop && (
              // En el móvil la captura también abre la demo; el botón de al lado es la entrada accesible.
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
      </div>
    </section>
  );
}
