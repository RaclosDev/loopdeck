import { Link } from 'react-router-dom';
import { AUTH_PATHS } from '../../lib/authRedirect';

/** Pie de las páginas públicas: marca a la izquierda y enlaces a la derecha, como en la familia. */
export default function PublicFooter() {
  return (
    <footer className="fam-container fam-footer">
      <span className="fam-brand">
        <img src="/loopdeck-brush-192.png" alt="" width={32} height={32} />
        <span>LoopDeck</span>
      </span>
      <p className="fam-footer__links">
        <span>Un repaso cada día.</span>
        <a className="fam-link" href="/demo">
          Demo
        </a>
        <Link className="fam-link" to={AUTH_PATHS.login}>
          Entrar
        </Link>
      </p>
    </footer>
  );
}
