import { useState } from 'react';
import LoginPage from './LoginPage';
import './landing.css';

export default function LandingPage({ googleEnabled }: { googleEnabled: boolean }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="brand" href="#inicio" aria-label="LoopDeck, inicio">
          <span>Loop</span>
          <span>Deck</span>
        </a>
        <a href="#acceso" className="landing-access">
          Entrar a mi cuenta
        </a>
      </header>
      <section id="inicio" className="landing-intro" aria-labelledby="landing-title">
        <div className="landing-copy paper-panel landing-tape">
          <p className="marker-ink">Tu memoria se entrena.</p>
          <h1 id="landing-title">
            Apréndelo.
            <br />
            Repásalo.
            <br />
            <span>Hazlo tuyo.</span>
          </h1>
          <p className="landing-description">
            Convierte lo que estudias en tarjetas. Revisa tus mazos con repetición espaciada y
            vuelve a cada concepto cuando toque repasarlo.
          </p>
          <a className="btn btn-primary" href="#acceso">
            Empezar a estudiar
          </a>
          <a className="landing-text-link" href="#cuaderno">
            Así funciona tu cuaderno
          </a>
        </div>
        <div className="landing-sample">
          <p className="marker-ink">Una pregunta. Dale la vuelta.</p>
          <button
            className="landing-example paper-panel landing-tape"
            aria-pressed={revealed}
            onClick={() => setRevealed(!revealed)}
          >
            <span className="landing-example-label">Tarjeta de ejemplo · Biología</span>
            <span className="landing-example-content">
              {revealed
                ? 'La mitocondria produce la mayor parte de la energía que utiliza la célula.'
                : '¿Qué función tiene la mitocondria?'}
            </span>
            <span className="landing-example-action">
              {revealed ? 'Volver a la pregunta' : 'Mostrar respuesta'}
            </span>
          </button>
          <p className="landing-sample-note">Empieza por una idea. Construye tu colección.</p>
        </div>
      </section>
      <section
        className="landing-notes paper-panel landing-tape"
        id="cuaderno"
        aria-labelledby="notebook-title"
      >
        <div>
          <p className="marker-ink">Todo en tu cuaderno</p>
          <h2 id="notebook-title">Estudia a tu manera.</h2>
        </div>
        <dl>
          <div>
            <dt>Tus mazos, a mano</dt>
            <dd>Agrupa preguntas y respuestas por asignatura, idioma o tema.</dd>
          </div>
          <div>
            <dt>Un repaso con sentido</dt>
            <dd>Valora lo que recuerdas para organizar los próximos repasos.</dd>
          </div>
          <div>
            <dt>Más de una forma de aprender</dt>
            <dd>Consulta la guía, recorre tus tarjetas o practica con cuestionarios.</dd>
          </div>
        </dl>
      </section>
      <section id="acceso" className="landing-account" aria-label="Tu cuenta de estudio">
        <div className="landing-account-copy">
          <p className="marker-ink">La próxima página es tuya.</p>
          <h2>
            Abre tu
            <br />
            cuaderno.
          </h2>
          <p>Crea tu cuenta o retoma tus mazos donde los dejaste.</p>
        </div>
        <LoginPage googleEnabled={googleEnabled} embedded />
      </section>
      <footer className="landing-footer">LoopDeck · Un repaso cada día.</footer>
    </div>
  );
}
