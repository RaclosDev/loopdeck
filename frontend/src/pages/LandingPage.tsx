import { useEffect, useState, type MouseEvent } from 'react';
import { ArrowLeft, Layers, Repeat, Sparkles } from 'lucide-react';
import LoginPage from './LoginPage';
import PosterHeading from './landing/PosterHeading';
import Reveal from './landing/Reveal';
import ReviewLoop from './landing/ReviewLoop';
import SampleDeck from './landing/SampleDeck';
import { motionStyle } from './landing/motion';
import './landing.css';

/*
 * Portada pública: lo que ve quien llega sin sesión. Explica el producto con una tarjeta de
 * ejemplo de verdad y abre la entrada en su propia vista, /login, como PorrApp y Portfolio Tracker.
 */

export const AUTH_PATH = '/login';
type Mode = 'login' | 'register';
const onAuthPath = () => window.location.pathname === AUTH_PATH;

/** La entrada vive en /login: se abre sin bajar por la página y «atrás» vuelve a la portada. */
function useAuthView() {
  const [open, setOpen] = useState(onAuthPath);
  const [mode, setMode] = useState<Mode>('login');
  useEffect(() => {
    const sync = () => setOpen(onAuthPath());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (open)
      document
        .querySelector<HTMLInputElement>('.ld-auth input[name="email"]')
        ?.focus({ preventScroll: true });
  }, [open, mode]);
  const enter = (next: Mode) => (event?: MouseEvent) => {
    event?.preventDefault();
    setMode(next);
    if (!onAuthPath()) window.history.pushState({ ld: 'auth' }, '', AUTH_PATH);
    setOpen(true);
  };
  const leave = (event?: MouseEvent) => {
    event?.preventDefault();
    if ((window.history.state as { ld?: string } | null)?.ld === 'auth') {
      window.history.back();
      return;
    }
    window.history.replaceState(null, '', '/');
    setOpen(false);
  };
  return { open, mode, enter, leave };
}

const Brand = ({ onClick }: { onClick?: (event: MouseEvent) => void }) => (
  <a className="brand ld-brand" href="/" onClick={onClick} aria-label="LoopDeck, inicio">
    <img src="/loopdeck-brush-192.png" alt="" width={36} height={36} />
    <span>Loop</span>
    <span>Deck</span>
  </a>
);

const STEPS = [
  {
    title: 'Escribe el término',
    text: 'Pon la palabra o la pregunta. La IA te propone la definición y, si quieres, una foto para el frente.',
  },
  {
    title: 'Dale la vuelta',
    text: 'Intenta recordarla, gira la tarjeta y di cómo te ha ido: otra vez, difícil, bien o fácil.',
  },
  {
    title: 'Vuelve cuando toca',
    text: 'El algoritmo FSRS calcula el siguiente repaso de cada tarjeta. Lo que fallas vuelve pronto; lo que sabes, cada vez más tarde.',
  },
];

const METHODS = [
  {
    name: 'Repaso espaciado',
    text: 'Las tarjetas que tocan hoy, en el orden que más te ayuda a retenerlas.',
  },
  {
    name: 'Guía de estudio',
    text: 'Lee las preguntas y sus respuestas antes de ponerte a prueba.',
  },
  { name: 'Modo paseo', text: 'Recorre las tarjetas a tu ritmo, sin calificaciones.' },
  { name: 'Test de opciones', text: 'Elige la respuesta correcta entre cuatro opciones.' },
  { name: 'Test por bloques', text: 'Divide el temario en grupos y avanza paso a paso.' },
  { name: 'Tutor IA', text: 'Pregunta sobre el temario y resuelve tus dudas.' },
];

const BATCH = [
  {
    term: 'Polimorfismo',
    def: 'Un mismo mensaje se comporta distinto según el objeto que lo recibe.',
  },
  { term: 'Herencia', def: 'Una clase reutiliza y amplía lo que define otra.' },
  { term: 'Encapsulación', def: 'Ocultar el estado interno y exponer solo lo necesario.' },
];

const PERKS = [
  {
    icon: Layers,
    title: 'Tus mazos, privados. ',
    text: 'Agrupa tarjetas por asignatura, idioma o tema.',
  },
  {
    icon: Repeat,
    title: 'Un repaso con sentido. ',
    text: 'Cada tarjeta vuelve cuando empieza a olvidarse.',
  },
  {
    icon: Sparkles,
    title: 'IA cuando la necesitas. ',
    text: 'Definiciones, cuestionarios y un tutor del temario.',
  },
];

export default function LandingPage({ googleEnabled }: { googleEnabled: boolean }) {
  const { open, mode, enter, leave } = useAuthView();

  if (open) {
    return (
      <div className="landing-page ld-page ld-page--auth">
        <header className="ld-top">
          <Brand onClick={leave} />
          <nav className="ld-top__nav" aria-label="Acceso">
            <a className="ld-btn ld-btn--ghost" href="/" onClick={leave}>
              <ArrowLeft size={18} aria-hidden="true" />
              Volver
            </a>
          </nav>
        </header>
        <main className="ld-auth">
          <div className="ld-auth__copy">
            <PosterHeading
              as="h1"
              onLoad
              lines={['Abre tu']}
              marked="cuaderno."
              className="ld-auth__title"
            />
            <Reveal as="p" onLoad className="ld-lede" style={motionStyle({ '--base': '260ms' })}>
              Crea tu cuenta o retoma tus mazos donde los dejaste. Tu progreso se guarda y te espera
              en el móvil y en el ordenador.
            </Reveal>
            <Reveal as="ul" onLoad group className="ld-auth__perks">
              {PERKS.map(({ icon: Icon, title, text }, i) => (
                <li
                  key={title}
                  className="ld-reveal"
                  style={motionStyle({ '--base': '340ms', '--i': i })}
                >
                  <span className="ld-auth__icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    {text}
                  </span>
                </li>
              ))}
            </Reveal>
            <Reveal
              as="p"
              onLoad
              className="ld-auth__demo"
              style={motionStyle({ '--base': '620ms' })}
            >
              ¿Prefieres verla antes con mazos de ejemplo? <a href="/demo">Abre la demo</a>
            </Reveal>
          </div>
          <Reveal
            onLoad
            className="ld-auth__form"
            style={motionStyle({ '--from-y': '36px', '--base': '180ms', '--dur': '0.7s' })}
          >
            <LoginPage key={mode} googleEnabled={googleEnabled} embedded initialMode={mode} />
          </Reveal>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-page ld-page">
      <Reveal as="div" onLoad className="ld-top-wrap" style={motionStyle({ '--from-y': '-12px' })}>
        <header className="ld-top">
          <Brand />
          <nav className="ld-top__nav" aria-label="Portada">
            <a className="ld-btn ld-btn--ghost ld-top__link" href="#como-funciona">
              Cómo funciona
            </a>
            <a className="ld-btn ld-btn--ghost ld-top__link" href="#metodos">
              Métodos
            </a>
            <a className="ld-btn ld-btn--ghost" href="/demo">
              Demo
            </a>
            <a className="ld-btn ld-btn--ink" href={AUTH_PATH} onClick={enter('login')}>
              Entrar
            </a>
          </nav>
        </header>
      </Reveal>

      <main>
        <section className="ld-hero" aria-labelledby="landing-title">
          <div className="ld-hero__copy">
            <PosterHeading
              as="h1"
              id="landing-title"
              onLoad
              base={60}
              lines={['Apréndelo.', 'Repásalo.']}
              marked="Hazlo tuyo."
              className="ld-hero__title"
            />
            <p className="ld-lede">
              LoopDeck convierte lo que estudias en tarjetas y te las devuelve justo cuando empiezas
              a olvidarlas. Escribe un término, deja que la IA proponga la definición y repasa unos
              minutos al día.
            </p>
            <Reveal onLoad className="ld-actions" style={motionStyle({ '--base': '420ms' })}>
              <a
                className="ld-btn ld-btn--ink ld-btn--lg"
                href={AUTH_PATH}
                onClick={enter('register')}
              >
                Empezar a estudiar
              </a>
              <a className="ld-btn ld-btn--lg" href="/demo">
                Probar la demo
              </a>
            </Reveal>
            <Reveal as="p" onLoad className="ld-note" style={motionStyle({ '--base': '520ms' })}>
              Gratis. La demo abre sin registro, con mazos de ejemplo.
            </Reveal>
          </div>
          <Reveal
            onLoad
            className="ld-hero__deck"
            style={motionStyle({ '--from-y': '48px', '--base': '320ms', '--dur': '0.8s' })}
          >
            <SampleDeck />
          </Reveal>
        </section>

        <section id="como-funciona" className="ld-section" aria-labelledby="steps-title">
          <PosterHeading
            id="steps-title"
            lines={['Tres pasos.']}
            marked="Cada día."
            className="ld-section__title"
          />
          <Reveal as="ol" group className="ld-steps">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="ld-reveal"
                style={motionStyle({ '--i': i, '--step': '110ms' })}
              >
                <span className="ld-steps__n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </Reveal>
        </section>

        <section className="ld-section ld-section--loop" aria-labelledby="loop-title">
          <div className="ld-split">
            <PosterHeading
              id="loop-title"
              lines={['Cada repaso,']}
              marked="más lejos."
              className="ld-section__title"
            />
            <Reveal as="p" className="ld-lede">
              Repasar justo antes de olvidar es lo que fija un recuerdo. Así se espacian los repasos
              de una tarjeta que vas acertando; si fallas, vuelve antes.
            </Reveal>
          </div>
          <ReviewLoop />
          <p className="ld-note">
            Ejemplo orientativo: FSRS ajusta cada intervalo a tu memoria y a tus respuestas.
          </p>
        </section>

        <section id="metodos" className="ld-section" aria-labelledby="methods-title">
          <PosterHeading
            id="methods-title"
            lines={['Más de una forma']}
            marked="de estudiar."
            className="ld-section__title"
          />
          <div className="ld-methods">
            <Reveal as="dl" group className="ld-methods__list">
              {METHODS.map((method, i) => (
                <div
                  key={method.name}
                  className="ld-reveal"
                  style={motionStyle({ '--i': i, '--step': '60ms' })}
                >
                  <dt>{method.name}</dt>
                  <dd>{method.text}</dd>
                </div>
              ))}
            </Reveal>
            <Reveal as="article" className="ld-sheet ld-batch" aria-labelledby="batch-title">
              <h3 id="batch-title">Un mazo entero, de una vez</h3>
              <p>
                Pega una lista de términos, uno por línea, y LoopDeck prepara una tarjeta por cada
                uno.
              </p>
              <div className="ld-batch__flow">
                <ul className="ld-batch__terms" aria-label="Términos de ejemplo">
                  {BATCH.map((b) => (
                    <li key={b.term}>{b.term}</li>
                  ))}
                </ul>
                <ul className="ld-batch__cards" aria-label="Tarjetas generadas de ejemplo">
                  {BATCH.map((b, i) => (
                    <li key={b.term} style={motionStyle({ '--i': i })}>
                      <strong>{b.term}</strong>
                      <span>{b.def}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="ld-note">
                ¿Sin ideas? Empieza con una de las plantillas de mazos, como las capitales del
                mundo.
              </p>
            </Reveal>
          </div>
        </section>

        <Reveal as="section" className="ld-sheet ld-cta" aria-labelledby="cta-title">
          <div>
            <h2 id="cta-title" className="ld-poster">
              La próxima página <span className="ld-marked">es tuya.</span>
            </h2>
            <p className="ld-lede">Crea tu cuenta gratis o retoma tus mazos donde los dejaste.</p>
          </div>
          <div className="ld-actions">
            <a
              className="ld-btn ld-btn--ink ld-btn--lg"
              href={AUTH_PATH}
              onClick={enter('register')}
            >
              Crear cuenta
            </a>
            <a className="ld-btn ld-btn--lg" href={AUTH_PATH} onClick={enter('login')}>
              Ya tengo cuenta
            </a>
          </div>
        </Reveal>
      </main>

      <footer className="ld-foot">
        <span>LoopDeck · Un repaso cada día.</span>
        <nav aria-label="Enlaces del pie">
          <a href="/demo">Demo</a>
          <a href={AUTH_PATH} onClick={enter('login')}>
            Entrar
          </a>
        </nav>
      </footer>
    </div>
  );
}
