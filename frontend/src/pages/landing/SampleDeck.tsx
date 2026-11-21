import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './motion';

const SAMPLE = [
  {
    topic: 'Biología',
    front: '¿Qué función tiene la mitocondria?',
    back: 'Produce la mayor parte de la energía que utiliza la célula.',
    short: 'Mitocondria',
  },
  {
    topic: 'Inglés',
    front: '¿Cómo se dice «sin embargo»?',
    back: '«However». Al empezar la frase va seguido de coma.',
    short: '«Sin embargo»',
  },
  {
    topic: 'Historia',
    front: '¿En qué año cayó Constantinopla?',
    back: 'En 1453, cuando la tomó el ejército otomano de Mehmed II.',
    short: 'Constantinopla',
  },
];
const RATINGS = [
  { label: 'Otra vez', due: 'en 10 minutos' },
  { label: 'Bien', due: 'en 3 días' },
  { label: 'Fácil', due: 'en 8 días' },
];
/** Lo que tarda la tarjeta valorada en salir del mazo antes de que suba la siguiente. */
const LEAVE_MS = 560;

/**
 * Tarjeta de ejemplo de la portada: se voltea como una ficha de verdad y, al valorarla, se
 * archiva con su próximo repaso sellado y sube la siguiente del mazo.
 */
export default function SampleDeck() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [log, setLog] = useState<{ card: string; due: string }[]>([]);
  const flip = useRef<HTMLButtonElement>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const card = SAMPLE[index]!;
  const rate = (due: string) => {
    if (leaving) return;
    setLog((entries) => [{ card: card.short, due }, ...entries].slice(0, SAMPLE.length));
    const next = () => {
      setLeaving(null);
      setRevealed(false);
      setIndex((i) => (i + 1) % SAMPLE.length);
      flip.current?.focus({ preventScroll: true });
    };
    if (reduced) return next();
    setLeaving(due);
    timer.current = window.setTimeout(next, LEAVE_MS);
  };

  return (
    <div className="ld-deck">
      <div className="ld-deck__stack" data-left={SAMPLE.length - index - 1}>
        <div
          key={index}
          className={`ld-card${revealed ? ' is-flipped' : ''}${leaving ? ' is-leaving' : ''}`}
        >
          <button
            ref={flip}
            type="button"
            className="landing-example-flip ld-card__inner"
            aria-pressed={revealed}
            onClick={() => setRevealed(!revealed)}
            disabled={leaving !== null}
          >
            <span className="ld-card__face ld-card__front" aria-hidden={revealed}>
              <span className="ld-card__label">
                Tarjeta de ejemplo · {card.topic} · {index + 1} de {SAMPLE.length}
              </span>
              <span className="ld-card__text">{card.front}</span>
              <span className="ld-card__action">Mostrar respuesta</span>
            </span>
            <span className="ld-card__face ld-card__back" aria-hidden={!revealed}>
              <span className="ld-card__label">Respuesta · {card.topic}</span>
              <span className="ld-card__text">{card.back}</span>
              <span className="ld-card__action">Volver a la pregunta</span>
            </span>
          </button>
          {leaving && (
            <span className="ld-stamp" aria-hidden="true">
              Vuelve {leaving}
            </span>
          )}
        </div>
      </div>
      <div
        className="ld-deck__rate"
        role="group"
        aria-label="¿Cuánto la recordabas?"
        data-open={revealed || undefined}
      >
        {RATINGS.map((rating) => (
          <button
            key={rating.label}
            type="button"
            onClick={() => rate(rating.due)}
            tabIndex={revealed ? undefined : -1}
            aria-hidden={!revealed}
            disabled={!revealed || leaving !== null}
          >
            {rating.label}
            <small>{rating.due}</small>
          </button>
        ))}
      </div>
      <div className="ld-deck__log" aria-live="polite">
        {log.length === 0 ? (
          <p>Dale la vuelta y di cuánto la recordabas: LoopDeck decide cuándo vuelve.</p>
        ) : (
          <ol aria-label="Próximos repasos">
            {log.map((entry, i) => (
              <li key={`${entry.card}-${log.length - i}`}>
                <span>{entry.card}</span>
                <span>vuelve {entry.due}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
