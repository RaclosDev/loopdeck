import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { Deck, DeckStats } from '../types';
import StudyCounts, { pendingCards } from './StudyCounts';

export default function DeckSheet({
  deck,
  stats,
  menu,
  children,
}: {
  deck: Deck;
  stats?: DeckStats;
  menu?: ReactNode;
  children: ReactNode;
}) {
  const due = stats && pendingCards(stats);
  return (
    <article
      className="paper-sheet deck-sheet"
      aria-labelledby={`deck-${deck.id}`}
      data-deck-id={deck.id}
    >
      <header className="deck-sheet-heading">
        <div>
          <h2 id={`deck-${deck.id}`}>
            <Link to={`/hub/${deck.id}`}>{deck.name}</Link>
          </h2>
        </div>
        {menu}
      </header>
      <div className="deck-sheet-meta">
        <span>
          {stats
            ? `${stats.totalCount.toLocaleString('es-ES')} ${stats.totalCount === 1 ? 'tarjeta' : 'tarjetas'}`
            : 'Recuento no disponible'}
        </span>
        {stats && (
          <span className={due === 0 && stats.totalCount > 0 ? 'deck-up-to-date' : ''}>
            {stats.totalCount === 0 ? (
              'Sin tarjetas'
            ) : due === 0 ? (
              <>
                <CheckCircle2 size={14} aria-hidden="true" /> Al día
              </>
            ) : null}
          </span>
        )}
      </div>
      <StudyCounts stats={stats} compact />
      <footer className="deck-sheet-actions">{children}</footer>
    </article>
  );
}

export function DeckSheetsLoading() {
  return (
    <div className="deck-grid" role="status" aria-label="Cargando mazos">
      {[1, 2, 3].map((n) => (
        <div className="paper-sheet sheet-loading" key={n}>
          <div className="animate-pulse sheet-placeholder" />
          <div className="animate-pulse sheet-placeholder" />
          <div className="animate-pulse sheet-placeholder" />
        </div>
      ))}
    </div>
  );
}
