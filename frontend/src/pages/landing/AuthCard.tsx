import type { ReactNode } from 'react';
import PublicFooter from './PublicFooter';
import PublicHeader from './PublicHeader';
import Reveal from './Reveal';
import { motionStyle } from './motion';
import './family.css';
import '../landing.css';

/** Tarjeta común de las pantallas de cuenta sin sesión (recuperar y cambiar la contraseña). */
export default function AuthCard({ title, children }: { title: string; children: ReactNode }) {
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
            {title}
          </h1>
          {children}
        </Reveal>
      </main>
      <PublicFooter />
    </div>
  );
}
