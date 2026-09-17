import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { decksApi, notesApi, studyApi } from '../services/api';

export default function Stats() {
  const [stats, setStats] = useState({
    totalDecks: 0,
    totalNotes: 0,
    totalCards: 0,
    cardsByState: { new: 0, learning: 0, review: 0 },
    avgEase: 0,
    totalLapses: 0,
    mature: 0,
    suspended: 0
  });
  const [loading, setLoading] = useState(true);
  const { addToast } = useStore();

  useEffect(() => {
    async function loadStats() {
      try {
        const decks = await decksApi.getAll();
        const allCards = [];
        let totalNotes = 0;
        
        for (const d of decks) {
          const notes = await notesApi.getByDeck(d.id);
          totalNotes += notes.length;
          const dueCards = await studyApi.getDueCards(d.id, 10000);
          allCards.push(...dueCards.map(c => c.card));
        }

        const cardsByState = { new: 0, learning: 0, review: 0 };
        let totalEase = 0;
        let easeCount = 0;
        let totalLapses = 0;
        let mature = 0;
        let suspended = 0;

        allCards.forEach(c => {
          if (c.state === 'new') cardsByState.new++;
          else if (c.state === 'learning' || c.state === 'relearning') cardsByState.learning++;
          else if (c.state === 'review') cardsByState.review++;
          
          if (c.easeFactor) {
            totalEase += c.easeFactor;
            easeCount++;
          }
          totalLapses += (c.lapses || 0);
          if (c.interval >= 21) mature++;
          if (c.suspended) suspended++;
        });

        setStats({
          totalDecks: decks.length,
          totalNotes,
          totalCards: allCards.length,
          cardsByState,
          avgEase: easeCount > 0 ? totalEase / easeCount : 0,
          totalLapses,
          mature,
          suspended
        });
      } catch (e) {
        addToast('Error al cargar estadísticas', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [addToast]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="fade-in pb-10">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1>📊 Estadísticas</h1>
        <p>Resumen de tu colección y progreso</p>
      </div>

      {stats.totalCards === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
          <h3>Sin datos aún</h3>
          <p style={{ color: 'var(--text-muted)' }}>Añade tarjetas para ver tus estadísticas.</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <div className="kpi-card accent" style={{ padding: '1rem', textAlign: 'center' }}>
              <div className="kpi-value accent">{stats.totalDecks}</div>
              <div className="kpi-label">MAZOS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div className="kpi-value">{stats.totalNotes}</div>
              <div className="kpi-label">NOTAS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div className="kpi-value">{stats.totalCards}</div>
              <div className="kpi-label">TARJETAS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div className="kpi-value">{(stats.avgEase * 100).toFixed(0)}%</div>
              <div className="kpi-label">EASE</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Distribución</h3>
            <div style={{ display: 'flex', width: '100%', height: '24px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ width: `${(stats.cardsByState.new / stats.totalCards) * 100}%`, background: 'var(--srs-new)' }} />
              <div style={{ width: `${(stats.cardsByState.learning / stats.totalCards) * 100}%`, background: 'var(--srs-learning)' }} />
              <div style={{ width: `${(stats.cardsByState.review / stats.totalCards) * 100}%`, background: 'var(--srs-review)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
              <div style={{ color: 'var(--srs-new)' }}>Nuevas: {stats.cardsByState.new}</div>
              <div style={{ color: 'var(--srs-learning)' }}>Aprender: {stats.cardsByState.learning}</div>
              <div style={{ color: 'var(--srs-review)' }}>Revisión: {stats.cardsByState.review}</div>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card info" style={{ padding: '1rem', textAlign: 'center' }}>
              <div className="kpi-value info" style={{ color: 'var(--srs-review)' }}>{stats.mature}</div>
              <div className="kpi-label">MADURAS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div className="kpi-value" style={{ color: '#f97316' }}>{stats.totalLapses}</div>
              <div className="kpi-label">LAPSOS</div>
            </div>
            <div className="kpi-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div className="kpi-value" style={{ color: '#ef4444' }}>{stats.suspended}</div>
              <div className="kpi-label">SUSPENDIDAS</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

