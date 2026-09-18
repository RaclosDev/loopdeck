import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { decksApi, notesApi } from '../services/api';
import { Loader2, BarChart2 } from 'lucide-react';

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
  
  useEffect(() => {
    async function loadStats() {
      try {
        const decks = await decksApi.getAll();
        const deckStats = await decksApi.getStats();
        
        let totalNotes = 0;
        const notesPromises = decks.map(d => notesApi.getByDeck(d.id));
        const allNotesArrs = await Promise.all(notesPromises);
        totalNotes = allNotesArrs.reduce((acc, notes) => acc + notes.length, 0);

        const cardsByState = { new: 0, learning: 0, review: 0 };
        Object.values(deckStats).forEach(stat => {
          cardsByState.new += stat.newCount || 0;
          cardsByState.learning += stat.learningCount || 0;
          cardsByState.review += stat.reviewCount || 0;
        });

        setStats({
          totalDecks: decks.length,
          totalNotes,
          totalCards: cardsByState.new + cardsByState.learning + cardsByState.review,
          cardsByState,
          avgEase: 2.5,
          totalLapses: 0,
          mature: 0,
          suspended: 0
        });
      } catch (e) {
        toast.error('Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="fade-in pb-10">
      {stats.totalCards === 0 ? (
        <div className="card flex flex-col items-center justify-center border-dashed text-center p-12 gap-3">
          <BarChart2 className="w-12 h-12 opacity-50 text-muted-foreground" />
          <h3 className="m-0 text-xl font-bold">Sin datos aún</h3>
          <p className="text-muted-foreground m-0">Añade tarjetas para ver tus estadísticas.</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid mb-6">
            <div className="kpi-card accent">
              <div className="kpi-label">MAZOS</div>
              <div className="kpi-value accent">{stats.totalDecks}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">NOTAS</div>
              <div className="kpi-value">{stats.totalNotes}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">TARJETAS</div>
              <div className="kpi-value">{stats.totalCards}</div>
            </div>
            <div className="kpi-card info">
              <div className="kpi-label">EASE AVG</div>
              <div className="kpi-value info">{(stats.avgEase * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="card mb-6">
            <h3 className="text-xl font-bold m-0 mb-4">Distribución</h3>
            <div className="flex w-full h-6 rounded-full overflow-hidden mb-4">
              <div style={{ width: `${(stats.cardsByState.new / Math.max(1, stats.totalCards)) * 100}%`, background: 'var(--accent-primary)' }} />
              <div style={{ width: `${(stats.cardsByState.learning / Math.max(1, stats.totalCards)) * 100}%`, background: '#F59E0B' }} />
              <div style={{ width: `${(stats.cardsByState.review / Math.max(1, stats.totalCards)) * 100}%`, background: '#10B981' }} />
            </div>
            <div className="flex justify-between text-sm font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--accent-primary)]" />
                <span>Nuevas {((stats.cardsByState.new / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span>Aprendizaje {((stats.cardsByState.learning / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span>Revisión {((stats.cardsByState.review / Math.max(1, stats.totalCards)) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}