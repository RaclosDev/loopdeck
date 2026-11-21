import { Link } from 'react-router-dom';
import { AUTH_PATHS } from '../lib/authRedirect';
import PosterHeading from './landing/PosterHeading';
import PublicFooter from './landing/PublicFooter';
import PublicHeader from './landing/PublicHeader';
import Reveal from './landing/Reveal';
import ReviewLoop from './landing/ReviewLoop';
import SampleDeck from './landing/SampleDeck';
import { motionStyle } from './landing/motion';
import './landing/family.css';
import './landing.css';

/*
 * Portada pública: lo que ve quien llega sin sesión. Explica el producto con una tarjeta de
 * ejemplo de verdad y enlaza con las páginas de acceso, /login y /registro.
 */

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

export default function LandingPage() {
  return (
    <div className="landing-page ld-page fam">
      <PublicHeader />

      <main className="fam-container">
        <section className="ld-hero" aria-labelledby="landing-title">
          <div className="ld-hero__copy">
            <PosterHeading
              as="h1"
              id="landing-title"
              onLoad
              base={60}
              lines={['Apréndelo.', 'Repásalo.']}
              marked="Hazlo tuyo."
              className="fam-h1"
            />
            <p className="fam-lede">
              LoopDeck convierte lo que estudias en tarjetas y te las devuelve justo cuando empiezas
              a olvidarlas. Escribe un término, deja que la IA proponga la definición y repasa unos
              minutos al día.
            </p>
            <Reveal onLoad className="fam-cta-row" style={motionStyle({ '--base': '420ms' })}>
              <Link className="fam-btn fam-btn--ink fam-btn--lg" to={AUTH_PATHS.register}>
                Empezar a estudiar
              </Link>
              <a className="fam-btn fam-btn--lg" href="/demo">
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
            className="fam-h2 ld-section__title"
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
              className="fam-h2 ld-section__title"
            />
            <Reveal as="p" className="fam-lede">
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
            className="fam-h2 ld-section__title"
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
            <h2 id="cta-title" className="fam-h2">
              La próxima página <span className="fam-mark">es tuya.</span>
            </h2>
            <p className="fam-lede">Crea tu cuenta gratis o retoma tus mazos donde los dejaste.</p>
          </div>
          <div className="fam-cta-row">
            <Link className="fam-btn fam-btn--ink fam-btn--lg" to={AUTH_PATHS.register}>
              Crear cuenta
            </Link>
            <Link className="fam-btn fam-btn--lg" to={AUTH_PATHS.login}>
              Ya tengo cuenta
            </Link>
          </div>
        </Reveal>
      </main>

      <PublicFooter />
    </div>
  );
}
