import type { ReactNode } from 'react';
import type { DeckStats } from '../types';
import PhaseInfo from './PhaseInfo';

const STATES = [
  { label: 'Nuevas', key: 'newCount', tone: 'new' },
  { label: 'Aprendiendo', key: 'learningCount', tone: 'learning' },
  { label: 'Revisión', key: 'reviewCount', tone: 'review' },
] as const;

/** Lo pendiente de hoy entre todos los mazos, con la acción para empezar a repasar. */
export default function StudySummary({
  stats,
  action,
}: {
  stats: DeckStats[];
  action?: ReactNode;
}) {
  const counts = STATES.map((state) => ({
    ...state,
    count: stats.reduce((sum, deck) => sum + deck[state.key], 0),
  }));
  const total = counts.reduce((sum, state) => sum + state.count, 0);
  return (
    <section className="paper-sheet today-sheet" aria-labelledby="study-summary-title">
      <h2 id="study-summary-title" className="sheet-eyebrow">
        Para hoy
      </h2>
      <p className="today-total">
        {total === 0 ? (
          'Todo al día'
        ) : (
          <>
            <strong>{total.toLocaleString('es-ES')}</strong>{' '}
            {total === 1 ? 'tarjeta pendiente' : 'tarjetas pendientes'}
          </>
        )}
      </p>
      {total > 0 && (
        <div className="today-bar" aria-hidden="true">
          {counts.map(
            ({ key, tone, count }) =>
              count > 0 && (
                <span key={key} className={`study-count--${tone}`} style={{ flexGrow: count }} />
              ),
          )}
        </div>
      )}
      <div className="today-legend-row">
        <dl className="today-legend">
          {counts.map(({ key, label, tone, count }) => (
            <div className={`study-count--${tone}`} key={key}>
              <dd>{count.toLocaleString('es-ES')}</dd>
              <dt>{label}</dt>
            </div>
          ))}
        </dl>
        <PhaseInfo />
      </div>
      {action}
    </section>
  );
}
