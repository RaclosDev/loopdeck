import { useState, useEffect } from 'react';
import { decksApi, notesApi, studyApi } from '../services/api';
import useStore from '../store/useStore';

function Stats() {
  const { addToast } = useStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCards: 0, totalNotes: 0, totalDecks: 0,
    byState: { new: 0, learning: 0, review: 0, relearning: 0 },
    avgEase: 0, totalLapses: 0, mature: 0, young: 0, suspended: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const decks = await decksApi.getAll();
        if (decks.length === 0) { setLoading(false); return; }

        // Load all notes and all due-cards per deck in parallel
        const [noteResults, cardResults] = await Promise.all([
          Promise.allSettled(decks.map(d => notesApi.getByDeck(d.id))),
          Promise.allSettled(decks.map(d => studyApi.getDueCards(d.id, 9999))),
        ]);

        const allNotes = noteResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);
        const allCards = cardResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);

        const byState = {
          new: allCards.filter(c => c.state === 'new').length,
          learning: allCards.filter(c => c.state === 'learning').length,
          review: allCards.filter(c => c.state === 'review').length,
          relearning: allCards.filter(c => c.state === 'relearning').length,
        };

        const reviewCards = allCards.filter(c => c.state === 'review');
        const avgEase = reviewCards.length > 0
          ? reviewCards.reduce((s, c) => s + (c.easeFactor || 2.5), 0) / reviewCards.length
          : 2.5;

        setStats({
          totalCards: allCards.length,
          totalNotes: allNotes.length,
          totalDecks: decks.length,
          byState,
          avgEase,
          totalLapses: allCards.reduce((s, c) => s + (c.lapses || 0), 0),
          mature: allCards.filter(c => c.state === 'review' && (c.intervalDays || 0) >= 21).length,
          young: allCards.filter(c => c.state === 'review' && (c.intervalDays || 0) < 21).length,
          suspended: allCards.filter(c => c.suspended).length,
        });
      } catch {
        addToast('Error cargando estadísticas', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  const stateBarTotal = stats.totalCards || 1;

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-sm" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
          <p style={{ color: 'var(--text-muted)' }}>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Estadísticas</h1>
        <p>Resumen de tu colección y progreso de estudio</p>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-value">{stats.totalDecks}</div>
          <div className="stat-card-label">Mazos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.totalNotes}</div>
          <div className="stat-card-label">Notas</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.totalCards}</div>
          <div className="stat-card-label">Tarjetas</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{(stats.avgEase * 100).toFixed(0)}%</div>
          <div className="stat-card-label">Ease Promedio</div>
        </div>
      </div>

      {/* Card States Distribution */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, marginBottom: 16 }}>
          Distribución de Tarjetas
        </h3>

        <div style={{ display: 'flex', height: 28, borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 20, background: 'rgba(255,255,255,0.04)' }}>
          {stats.byState.new > 0 && <div style={{ width: `${(stats.byState.new / stateBarTotal) * 100}%`, background: 'var(--srs-new)', transition: 'width 0.5s ease' }} />}
          {stats.byState.learning > 0 && <div style={{ width: `${(stats.byState.learning / stateBarTotal) * 100}%`, background: 'var(--srs-learning)', transition: 'width 0.5s ease' }} />}
          {stats.young > 0 && <div style={{ width: `${(stats.young / stateBarTotal) * 100}%`, background: 'var(--srs-review)', transition: 'width 0.5s ease' }} />}
          {stats.mature > 0 && <div style={{ width: `${(stats.mature / stateBarTotal) * 100}%`, background: 'var(--accent-color)', transition: 'width 0.5s ease' }} />}
          {stats.suspended > 0 && <div style={{ width: `${(stats.suspended / stateBarTotal) * 100}%`, background: 'var(--text-dim)', transition: 'width 0.5s ease' }} />}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <LegendItem color="var(--srs-new)" label="Nuevas" count={stats.byState.new} />
          <LegendItem color="var(--srs-learning)" label="Aprendiendo" count={stats.byState.learning + stats.byState.relearning} />
          <LegendItem color="var(--srs-review)" label="Jóvenes (< 21d)" count={stats.young} />
          <LegendItem color="var(--accent-color)" label="Maduras (≥ 21d)" count={stats.mature} />
          <LegendItem color="var(--text-dim)" label="Suspendidas" count={stats.suspended} />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--srs-review)' }}>{stats.mature}</div>
          <div className="stat-card-label">Tarjetas Maduras</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--warning-color)' }}>{stats.totalLapses}</div>
          <div className="stat-card-label">Lapsos Totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--danger-color)' }}>{stats.suspended}</div>
          <div className="stat-card-label">Suspendidas</div>
        </div>
      </div>

      {stats.totalCards === 0 && (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <div className="empty-state-icon">📊</div>
          <h3>Sin datos aún</h3>
          <p>Añade tarjetas y empieza a estudiar para ver tus estadísticas aquí.</p>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {label}: <strong style={{ color: 'var(--text-main)' }}>{count}</strong>
      </span>
    </div>
  );
}

export default Stats;
