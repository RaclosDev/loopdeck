import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDecks, useDeckStats } from '../hooks/useDecks';
import { Skeleton } from '../components/ui/skeleton';
import StudyCounts, { CountsNotice, pendingCards } from '../components/StudyCounts';

export default function Stats() {
  const {
    data: decks = [],
    isLoading: loadingDecks,
    isError: errorDecks,
    refetch: retryDecks,
  } = useDecks();
  const {
    data: deckStats = {},
    isLoading: loadingStats,
    isError: errorStats,
    refetch: retryStats,
  } = useDeckStats(decks.map((deck) => deck.id));
  const totals = useMemo(() => {
    const counts = decks.flatMap((deck) => (deckStats[deck.id] ? [deckStats[deck.id]] : []));
    return {
      newCount: counts.reduce((sum, stat) => sum + stat.newCount, 0),
      learningCount: counts.reduce((sum, stat) => sum + stat.learningCount, 0),
      reviewCount: counts.reduce((sum, stat) => sum + stat.reviewCount, 0),
      totalCount: counts.reduce((sum, stat) => sum + stat.totalCount, 0),
      noteCount: counts.every((stat) => stat.noteCount !== undefined)
        ? counts.reduce((sum, stat) => sum + (stat.noteCount || 0), 0)
        : undefined,
    };
  }, [decks, deckStats]);
  if (errorDecks)
    return (
      <div className="card page-state" role="alert">
        <h2>No se han podido cargar tus mazos</h2>
        <button className="sheet-action" onClick={() => void retryDecks()}>
          Reintentar
        </button>
      </div>
    );
  if (loadingDecks || loadingStats)
    return (
      <div className="kpi-grid" role="status" aria-label="Cargando estadísticas">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-24 w-full" />
        ))}
      </div>
    );
  if (errorStats) return <CountsNotice loading={false} error onRetry={() => void retryStats()} />;
  if (totals.totalCount === 0)
    return (
      <div className="card page-state">
        <h2>Sin datos aún</h2>
        <p>Añade tarjetas para ver tus estadísticas.</p>
        <Link className="sheet-action" to={decks.length ? '/add' : '/'}>
          {decks.length ? 'Añadir tarjetas' : 'Ir a Mis Mazos'}
        </Link>
      </div>
    );
  const available = pendingCards(totals);
  return (
    <div className="fade-in stats-page">
      <dl className="kpi-grid">
        {[
          { label: 'Mazos', value: decks.length },
          { label: 'Notas', value: totals.noteCount },
          { label: 'Tarjetas', value: totals.totalCount },
          { label: 'Disponibles hoy', value: available },
        ].map(({ label, value }) => (
          <div className="kpi-card" key={label}>
            <dt className="kpi-label">{label}</dt>
            <dd className="kpi-value">{value?.toLocaleString('es-ES') ?? '—'}</dd>
          </div>
        ))}
      </dl>
      <section className="card stats-available" aria-labelledby="stats-today">
        <h2 id="stats-today">Para hoy</h2>
        <p>{available} tarjetas disponibles para repasar.</p>
        <StudyCounts stats={totals} />
        <p className="stats-help">
          Las nuevas están listas para empezar. Aprendiendo y Revisión muestran las que toca repasar
          ahora.
        </p>
      </section>
    </div>
  );
}
