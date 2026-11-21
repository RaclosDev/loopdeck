import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthForm, { type AuthMode } from '../../components/AuthForm';
import { AUTH_PATHS } from '../../lib/authRedirect';
import PublicFooter from './PublicFooter';
import PublicHeader from './PublicHeader';
import Reveal from './Reveal';
import { motionStyle } from './motion';
import './family.css';
import '../landing.css';

const COPY: Record<AuthMode, { title: string; sub: string }> = {
  login: {
    title: 'Inicia sesión en LoopDeck',
    sub: 'Tus mazos y tus repasos te esperan donde los dejaste.',
  },
  register: {
    title: 'Crea tu cuenta en LoopDeck',
    sub: 'Gratis. Tu progreso se guarda en el móvil y en el ordenador.',
  },
};

/** Página de acceso compartida por /login y /registro: la tarjeta común de la familia. */
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
      .querySelector<HTMLInputElement>('.fam-auth input[name="email"]')
      ?.focus({ preventScroll: true });
  }, [mode]);

  // Cambiar de modo cambia de ruta sin apilar historial: «atrás» sigue llevando a la portada.
  const changeMode = (next: AuthMode) =>
    navigate({ pathname: AUTH_PATHS[next], search }, { replace: true });

  return (
    <div className="landing-page ld-page fam">
      <PublicHeader auth />
      <main className="fam-container fam-auth">
        <Reveal
          as="section"
          onLoad
          className="fam-card"
          aria-labelledby="auth-title"
          style={motionStyle({ '--from-y': '24px', '--dur': '0.6s' })}
        >
          <h1 id="auth-title" className="fam-card__title">
            {COPY[mode].title}
          </h1>
          <p className="fam-card__sub">{COPY[mode].sub}</p>
          <AuthForm googleEnabled={googleEnabled} mode={mode} onModeChange={changeMode} />
        </Reveal>
        <a href="/demo" className="fam-btn fam-auth__demo">
          Probar la demo sin registrarte
        </a>
      </main>
      <PublicFooter />
    </div>
  );
}
