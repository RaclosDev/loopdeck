import { Link } from 'react-router-dom';
import { AUTH_PATHS } from '../../lib/authRedirect';

const SECTIONS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#metodos', label: 'Métodos' },
];

/**
 * Cabecera de las páginas públicas, la misma que en Ascension y PorrApp: marca a la izquierda,
 * secciones y «Demo» en medio, «Entrar» a la derecha. En /login y /registro, solo «← Volver».
 */
export default function PublicHeader({ auth = false }: { auth?: boolean }) {
  return (
    <header className="fam-container fam-header">
      <Link className="fam-brand" to="/" aria-label="LoopDeck, inicio">
        <img src="/loopdeck-brush-192.png" alt="" width={32} height={32} />
        <span>LoopDeck</span>
      </Link>
      <div className="fam-header__end">
        {auth ? (
          <Link className="fam-navlink" to="/">
            ← Volver
          </Link>
        ) : (
          <>
            <nav className="fam-nav" aria-label="Secciones">
              {SECTIONS.map((section) => (
                <a key={section.href} className="fam-navlink" href={section.href}>
                  {section.label}
                </a>
              ))}
              <a className="fam-navlink" href="/demo">
                Demo
              </a>
            </nav>
            <Link className="fam-btn fam-btn--ink" to={AUTH_PATHS.login}>
              Entrar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
