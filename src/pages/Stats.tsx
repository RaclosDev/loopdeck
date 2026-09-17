import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Estadísticas</h1>
        <p className="text-muted-foreground text-sm">Resumen de tu colección y progreso de estudio</p>
      </div>

      {stats.totalCards === 0 ? (
        <Card className="bg-card flex flex-col items-center justify-center p-12 mt-8 text-center border-dashed">
          <div className="text-5xl mb-4 opacity-80">📊</div>
          <h3 className="text-xl font-bold mb-2">Sin datos aún</h3>
          <p className="text-muted-foreground text-sm max-w-md">Añade tarjetas y empieza a estudiar para ver tus estadísticas aquí.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-bold text-foreground mb-1">{stats.totalDecks}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Mazos</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-bold text-foreground mb-1">{stats.totalNotes}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Notas</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-bold text-foreground mb-1">{stats.totalCards}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Tarjetas</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-bold text-foreground mb-1">{(stats.avgEase * 100).toFixed(0)}%</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Ease Promedio</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Distribución de Tarjetas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex w-full h-8 rounded-full overflow-hidden mb-4">
                <div style={{ width: `${(stats.cardsByState.new / stats.totalCards) * 100}%` }} className="bg-blue-500 transition-all" title="Nuevas" />
                <div style={{ width: `${(stats.cardsByState.learning / stats.totalCards) * 100}%` }} className="bg-amber-500 transition-all" title="Aprendiendo" />
                <div style={{ width: `${(stats.cardsByState.review / stats.totalCards) * 100}%` }} className="bg-emerald-500 transition-all" title="Revisión" />
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> <span className="font-semibold">{stats.cardsByState.new}</span> <span className="text-muted-foreground text-xs hidden sm:inline">Nuevas</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> <span className="font-semibold">{stats.cardsByState.learning}</span> <span className="text-muted-foreground text-xs hidden sm:inline">Aprendiendo</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> <span className="font-semibold">{stats.cardsByState.review}</span> <span className="text-muted-foreground text-xs hidden sm:inline">Revisión</span></div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-bold text-emerald-500 mb-1">{stats.mature}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Maduras (&gt;21d)</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-bold text-orange-500 mb-1">{stats.totalLapses}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Lapsos Totales</div>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-bold text-destructive mb-1">{stats.suspended}</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Suspendidas</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
