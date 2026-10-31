import type { DeckStats } from '../types';

export default function StudySummary({ stats }: { stats: DeckStats[] }) {
  const states = [
    { label: 'Nuevas', key: 'newCount', tone: 'new' },
    { label: 'Aprendiendo', key: 'learningCount', tone: 'learning' },
    { label: 'Revisión', key: 'reviewCount', tone: 'review' },
  ] as const;
  return (
    <section className="study-summary" aria-labelledby="study-summary-title">
      <div className="canvas-section-heading">
        <h2 id="study-summary-title">Para hoy</h2>
        <span>Todos tus mazos</span>
      </div>
      <dl className="study-summary-grid">
        {states.map(({ label, key, tone }) => (
          <div className={`paper-sheet summary-sheet study-count--${tone}`} key={key}>
            <dt>{label}</dt>
            <dd>
              <span className="summary-value">
                {stats.reduce((sum, deck) => sum + deck[key], 0).toLocaleString('es-ES')}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
