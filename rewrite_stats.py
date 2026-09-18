import re

with open('src/pages/Stats.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace return block
new_file = '''import { useState, useEffect } from 'react';
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
          if (c.intervalDays >= 21) mature++;
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
    <div className="fade-in pb-12">
      {stats.totalCards === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Sin datos aún</h3>
          <p style={{ color: 'var(--text-muted)' }}>Añade tarjetas para ver tus estadísticas.</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="kpi-card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--accent-primary)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{stats.totalDecks}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mazos</div>
            </div>
            <div className="kpi-card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--accent-primary)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{stats.totalNotes}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notas</div>
            </div>
            <div className="kpi-card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--accent-primary)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{stats.totalCards}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tarjetas</div>
            </div>
            <div className="kpi-card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--accent-primary)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{(stats.avgEase * 100).toFixed(0)}%</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ease Medio</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 className="card-title" style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Distribución</h3>
            <div style={{ display: 'flex', width: '100%', height: '24px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ width: ${(stats.cardsByState.new / Math.max(1, stats.totalCards)) * 100}%, background: 'var(--accent-primary)' }} />
              <div style={{ width: ${(stats.cardsByState.learning / Math.max(1, stats.totalCards)) * 100}%, background: '#F59E0B' }} />
              <div style={{ width: ${(stats.cardsByState.review / Math.max(1, stats.totalCards)) * 100}%, background: '#10B981' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                <span>Nuevas {((stats.cardsByState.new / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <span>Aprend. {((stats.cardsByState.learning / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                <span>Revisión {((stats.cardsByState.review / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card" style={{ padding: '1.25rem' }}>
              <div style={{ color: 'var(--accent-primary)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{stats.mature}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Maduras</div>
            </div>
            <div className="kpi-card" style={{ padding: '1.25rem' }}>
              <div style={{ color: '#F59E0B', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{stats.totalLapses}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lapsos</div>
            </div>
            <div className="kpi-card" style={{ padding: '1.25rem' }}>
              <div style={{ color: '#EF4444', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{stats.suspended}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suspend.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
'''

with open('src/pages/Stats.tsx', 'w', encoding='utf-8') as f:
    f.write(new_file)
