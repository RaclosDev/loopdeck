import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Repeat, Sparkles } from 'lucide-react';
import AuthForm, { type AuthMode } from '../../components/AuthForm';
import { AUTH_PATHS } from '../../lib/authRedirect';
import Brand from './Brand';
import PosterHeading from './PosterHeading';
import Reveal from './Reveal';
import { motionStyle } from './motion';
import '../landing.css';

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

/** Página de acceso compartida por /login y /registro. */
export default function AuthLayout({
  mode,
  googleEnabled,
}: {
  mode: AuthMode;
  googleEnabled: boolean;
}) {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document
      .querySelector<HTMLInputElement>('.ld-auth input[name="email"]')
      ?.focus({ preventScroll: true });
  }, [mode]);

  // Cambiar de pestaña cambia de ruta sin apilar historial: «atrás» sigue llevando a la portada.
  const changeMode = (next: AuthMode) =>
    navigate({ pathname: AUTH_PATHS[next], search }, { replace: true });

  return (
    <div className="landing-page ld-page ld-page--auth">
      <header className="ld-top">
        <Brand />
        <nav className="ld-top__nav" aria-label="Acceso">
          <Link className="ld-btn ld-btn--ghost" to="/">
            <ArrowLeft size={18} aria-hidden="true" />
            Volver
          </Link>
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
          <AuthForm googleEnabled={googleEnabled} mode={mode} onModeChange={changeMode} />
        </Reveal>
      </main>
    </div>
  );
}
