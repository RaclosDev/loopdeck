import { useCallback, useRef, type CSSProperties } from 'react';
import { useReducedMotion, useScrollProgress } from './motion';

/** Ejemplo de una tarjeta que se va recordando bien: cada repaso la aleja un poco más. */
const STOPS = [
  { when: 'Hoy', note: 'La creas' },
  { when: '10 min', note: 'Primer repaso' },
  { when: '1 día', note: 'Aún fresca' },
  { when: '3 días', note: 'Empieza a costar' },
  { when: '8 días', note: 'La recuerdas' },
  { when: '3 semanas', note: 'Ya es tuya' },
  { when: '2 meses', note: 'Un vistazo' },
];
/** Posición de cada parada en el eje: crece como los intervalos, pero sin aplastar las primeras. */
const X = [3, 12, 23, 36, 51, 71, 97];
const BASE = 150;

/** Un bucle por repaso, cada vez más ancho y más alto: el «loop» del nombre. */
const loops = X.slice(1)
  .map((x, i) => {
    const from = X[i]! * 10;
    const to = x * 10;
    const height = 34 + i * 16;
    return `M${from} ${BASE} C${from + (to - from) * 0.1} ${BASE - height * 1.35}, ${to - (to - from) * 0.1} ${BASE - height * 1.35}, ${to} ${BASE}`;
  })
  .join(' ');

/** Fracción de la línea dibujada al llegar a cada parada (longitud aproximada de cada bucle). */
const lengths = X.slice(1).map((x, i) => (x - X[i]!) * 10 + (34 + i * 16) * 2);
const total = lengths.reduce((a, b) => a + b, 0);
const REACHED = X.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0) / total);

/**
 * Línea de repasos: los bucles se dibujan con el scroll y cada parada se enciende cuando la
 * línea llega a ella. En el móvil la línea va en vertical.
 */
export default function ReviewLoop() {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const drawn = useRef(0);
  /** La línea solo avanza: al volver a subir no se borra lo ya recorrido. */
  const draw = useCallback((value: number) => {
    const progress = Math.max(drawn.current, value);
    drawn.current = progress;
    path.current?.style.setProperty('stroke-dasharray', `${progress} 1`);
    root.current?.style.setProperty('--progress', String(progress));
    root.current?.querySelectorAll<HTMLElement>('[data-at]').forEach((stop) => {
      stop.toggleAttribute('data-on', progress >= Number(stop.dataset.at));
    });
  }, []);
  useScrollProgress(root, draw, { start: 0.85, end: 0.3, enabled: !reduced });

  return (
    <div ref={root} className="ld-loop">
      <svg
        className="ld-loop__svg"
        viewBox="0 0 1000 170"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0" y1={BASE} x2="1000" y2={BASE} className="ld-loop__axis" />
        <path ref={path} d={loops} pathLength={1} className="ld-loop__path" />
      </svg>
      <ol className="ld-loop__stops">
        {STOPS.map((stop, i) => (
          <li
            key={stop.when}
            data-at={Math.max(0, REACHED[i]! - 0.01)}
            style={{ '--x': `${X[i]}%` } as CSSProperties}
          >
            <span className="ld-loop__dot" aria-hidden="true" />
            <strong>{stop.when}</strong>
            <span>{stop.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
