import type { DeckStats } from '../types';

export function pendingCards(stats: DeckStats) {
  return stats.newCount + stats.learningCount + stats.reviewCount;
}

export default function StudyCounts({
  stats,
  compact = false,
}: {
  stats?: DeckStats;
  compact?: boolean;
}) {
  const states = [
    { label: 'Nuevas', count: stats?.newCount, tone: 'new' },
    { label: 'Aprendiendo', count: stats?.learningCount, tone: 'learning' },
    { label: 'Revisión', count: stats?.reviewCount, tone: 'review' },
  ];
  return (
    <dl
      className={`study-counts ${compact ? 'study-counts--compact' : ''}`}
      aria-label="Tarjetas disponibles para repasar"
    >
      {states.map(({ label, count, tone }) => (
        <div className={`study-count study-count--${tone}`} key={tone}>
          <dt>
            <span className="study-count-mark" aria-hidden="true" />
            {label}
          </dt>
          <dd>
            {count === undefined ? (
              <span aria-label="Recuento no disponible">—</span>
            ) : (
              count.toLocaleString('es-ES')
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CountsNotice({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (error)
    return (
      <div className="counts-notice" role="alert">
        <span>No se han podido cargar los recuentos.</span>
        <button type="button" onClick={onRetry}>
          Reintentar recuentos
        </button>
      </div>
    );
  if (loading)
    return (
      <p className="counts-notice" role="status">
        Cargando recuentos…
      </p>
    );
  return null;
}
