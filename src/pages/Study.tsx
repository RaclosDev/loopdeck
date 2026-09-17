import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FlashCard from '../components/FlashCard';
import useStore from '../store/useStore';
import { studyApi, decksApi } from '../services/api';
import { Button } from '../components/ui/button';

const RATING_COLORS = {
  1: 'text-destructive border-destructive hover:bg-destructive/10',     // Again
  2: 'text-orange-500 border-orange-500 hover:bg-orange-500/10', // Hard
  3: 'text-green-500 border-green-500 hover:bg-green-500/10',   // Good
  4: 'text-blue-500 border-blue-500 hover:bg-blue-500/10'       // Easy
};

const RATING_LABELS = { 1: 'Otra vez', 2: 'Difícil', 3: 'Bien', 4: 'Fácil' };

function RatingButtons({ intervals, onRate }) {
  if (!intervals) return null;
  return (
    <div className="grid grid-cols-4 gap-2 w-full mt-4">
      {[1, 2, 3, 4].map(rating => (
        <Button
          key={rating}
          variant="outline"
          className={`flex flex-col gap-1 h-auto py-3 ${RATING_COLORS[rating]}`}
          onClick={() => onRate(rating)}
        >
          <span className="text-xs opacity-80">{intervals[rating]}</span>
          <span className="font-bold">{RATING_LABELS[rating]}</span>
          <span className="hidden sm:inline text-[10px] opacity-50 mt-1">{rating}</span>
        </Button>
      ))}
    </div>
  );
}

function Study() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { user, updateUser, settings, addToast } = useStore();
  
  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState({ new: 0, learning: 0, review: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [intervals, setIntervals] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  
  // Metrics
  const [startMs, setStartMs] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionStats, setSessionStats] = useState({ startTime: Date.now(), reviewed: 0, correct: 0, coinsEarned: 0 });
  const [coinFloat, setCoinFloat] = useState(null);

  const loadDeckAndCards = useCallback(async () => {
    try {
      const d = await decksApi.get(deckId);
      setDeck(d);
      const cards = await studyApi.getDueCards(deckId, 100); // chunk size
      if (cards.length === 0) {
        setIsComplete(true);
      } else {
        setQueue(cards);
        
        const c = { new: 0, learning: 0, review: 0 };
        const now = new Date();
        cards.forEach(card => {
          if (card.card.state === 'new') c.new++;
          else if ((card.card.state === 'learning' || card.card.state === 'relearning') && new Date(card.card.due) <= now) c.learning++;
          else if (card.card.state === 'review' && new Date(card.card.due) <= now) c.review++;
        });
        setCounts(c);
      }
    } catch (e) {
      addToast('Error cargando tarjetas: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setStartMs(Date.now());
    }
  }, [deckId, addToast]);

  useEffect(() => { loadDeckAndCards(); }, [loadDeckAndCards]);

  useEffect(() => {
    if (!loading && !isComplete && settings?.showTimer) {
      const timer = setInterval(() => setElapsedTime(Math.floor((Date.now() - sessionStats.startTime) / 1000)), 1000);
      return () => clearInterval(timer);
    }
  }, [loading, isComplete, settings?.showTimer, sessionStats.startTime]);

  const pair = queue[currentIndex];
  const card = pair?.card;
  const note = pair?.note;

  const getFront = () => {
    if (!note || !card) return '';
    const fields = JSON.parse(note.fieldsJson || '{}');
    if (note.noteType === 'reverse' && card.templateId === 1) return fields.back;
    return fields.front;
  };

  const getBack = () => {
    if (!note || !card) return '';
    const fields = JSON.parse(note.fieldsJson || '{}');
    if (note.noteType === 'reverse' && card.templateId === 1) return fields.front;
    return fields.back;
  };

  const handleFlip = async () => {
    if (isFlipped) return;
    setIsFlipped(true);
    try {
      const ints = await studyApi.getNextIntervals(card.id);
      setIntervals(ints);
    } catch (e) {
      console.error(e);
      setIntervals({ 1: '<1m', 2: '6m', 3: '10m', 4: '4d' });
    }
  };

  const handleRate = async (rating) => {
    if (!isFlipped) return;
    
    setUndoStack([...undoStack, { pair, counts: { ...counts } }]);
    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (rating >= 3 ? 1 : 0)
    }));

    setCounts(prev => {
      const n = { ...prev };
      if (card.state === 'new') n.new = Math.max(0, n.new - 1);
      else if (card.state === 'learning' || card.state === 'relearning') n.learning = Math.max(0, n.learning - 1);
      else if (card.state === 'review') n.review = Math.max(0, n.review - 1);
      return n;
    });

    setTimeout(() => {
      const remaining = queue.filter((_, i) => i !== currentIndex);
      if (remaining.length === 0) {
        setIsComplete(true);
      } else {
        setQueue(remaining);
        setCurrentIndex(0);
      }
      setIsFlipped(false);
      setStartMs(Date.now());
    }, 100);

    try {
      const timeTakenMs = Date.now() - startMs;
      const result = await studyApi.reviewCard(card.id, { rating, timeTakenMs });
      if (result && result.coinsEarned) {
        setCoinFloat({ amount: result.coinsEarned, key: Date.now() });
        setSessionStats(prev => ({ ...prev, coinsEarned: prev.coinsEarned + result.coinsEarned }));
        if (user) updateUser({ ...user, points: result.totalCoins });
        setTimeout(() => setCoinFloat(null), 1500);
      }
    } catch (e) {
      addToast('Error guardando revisión: ' + e.message, 'error');
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    const newQueue = [...queue];
    newQueue.splice(currentIndex, 0, last.pair);
    setQueue(newQueue);
    setIsFlipped(false);
    setUndoStack(prev => prev.slice(0, -1));
    setSessionStats(prev => ({ ...prev, reviewed: Math.max(0, prev.reviewed - 1) }));
    setIsComplete(false);
    addToast('Deshecho', 'info');
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!isFlipped) handleFlip(); }
      else if (isFlipped && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); handleRate(parseInt(e.key)); }
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleUndo(); }
      else if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFlipped, card, queue, currentIndex, undoStack]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Preparando sesión...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;

    return (
      <div className="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold mb-2">¡Sesión Completada!</h2>
        <p className="text-muted-foreground mb-8">Has terminado todas las tarjetas pendientes de <strong>{deck?.name}</strong>.</p>
        
        <div className="grid grid-cols-2 gap-4 w-full mb-8">
          <div className="bg-secondary/50 p-4 rounded-2xl flex flex-col items-center">
            <span className="text-3xl font-bold text-foreground">{sessionStats.reviewed}</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Tarjetas</span>
          </div>
          <div className="bg-secondary/50 p-4 rounded-2xl flex flex-col items-center">
            <span className="text-3xl font-bold text-emerald-500">{accuracy}%</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Precisión</span>
          </div>
          <div className="bg-secondary/50 p-4 rounded-2xl flex flex-col items-center">
            <span className="text-3xl font-bold text-foreground">{minutes}:{seconds.toString().padStart(2, '0')}</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Tiempo</span>
          </div>
          <div className="bg-secondary/50 p-4 rounded-2xl flex flex-col items-center">
            <span className="text-3xl font-bold text-amber-400">+{sessionStats.coinsEarned}</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Monedas</span>
          </div>
        </div>

        <div className="flex flex-col w-full gap-3">
          <Button size="lg" onClick={() => navigate('/')}>Volver a Mazos</Button>
          <Button size="lg" variant="secondary" onClick={() => navigate(`/add/${deckId}`)}>Añadir más tarjetas</Button>
        </div>
      </div>
    );
  }

  if (!card || !note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4">
        <div className="text-6xl mb-6 opacity-50">📭</div>
        <h3 className="text-xl font-bold mb-2">No hay tarjetas pendientes</h3>
        <p className="text-muted-foreground mb-8">Añade tarjetas a este mazo o espera a que haya revisiones pendientes.</p>
        <Button size="lg" onClick={() => navigate(`/add/${deckId}`)}>Añadir Tarjetas</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto min-h-[calc(100vh-100px)] relative">
      {coinFloat && (
        <div 
          key={coinFloat.key} 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-amber-400 animate-out fade-out slide-out-to-top-8 duration-1000 z-50 pointer-events-none"
        >
          +{coinFloat.amount} 🪙
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate('/')} className="h-8 w-8">🔙</Button>
          <span className="font-semibold text-lg">{deck?.name}</span>
          {settings?.showTimer && (
            <span className="text-xs text-muted-foreground ml-2 font-mono bg-secondary/50 px-2 py-1 rounded-md">
              ⏱️ {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <span className="text-sm font-bold text-blue-500 border-b-2 border-blue-500 pb-1 px-1">{counts.new}</span>
          <span className="text-sm font-bold text-amber-500 border-b-2 border-amber-500 pb-1 px-1">{counts.learning}</span>
          <span className="text-sm font-bold text-emerald-500 border-b-2 border-emerald-500 pb-1 px-1">{counts.review}</span>
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex flex-col justify-center mb-8 min-h-[300px]">
        <FlashCard
          front={getFront()}
          back={getBack()}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          animationsEnabled={settings?.animationsEnabled ?? true}
        />
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-col">
        {!isFlipped ? (
          <Button size="lg" className="w-full text-lg h-14" onClick={handleFlip}>
            Mostrar Respuesta
            <span className="opacity-60 ml-2 text-xs hidden sm:inline font-mono">Espacio</span>
          </Button>
        ) : (
          <RatingButtons intervals={intervals} onRate={handleRate} />
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-center gap-4 mt-8 pt-4">
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoStack.length === 0} className="text-muted-foreground hover:text-foreground">
            ↩️ Deshacer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            🏠 Salir
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Study;
