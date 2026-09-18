import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { ArrowLeft, Undo2, Eye, Timer, CheckCircle2 } from 'lucide-react';
import FlashCard from '../components/FlashCard';
import RatingButtons from '../components/RatingButtons';
import { studyApi, decksApi } from '../services/api';
import { Deck, DueCardDto, Card } from '../types';

function getIntervalLabel(card: Card, rating: number) {
  if (!card) return '';
  const ease = card.easeFactor || 2.5;
  const interval = card.intervalDays || 0;
  const step = card.learningStep || 0;
  const learningSteps = [1, 10]; // default steps in minutes

  if (card.state === 'new' || card.state === 'learning') {
    if (rating === 1) return formatMinutes(learningSteps[0]); // back to first step
    if (rating === 2) {
      const curr = learningSteps[step] || learningSteps[0] || 1;
      const next = learningSteps[step + 1] || curr * 2;
      return formatMinutes(Math.round((curr + next) / 2));
    }
    if (rating === 3) {
      const nextStep = step + 1;
      if (nextStep >= learningSteps.length) return '1d'; // graduate
      return formatMinutes(learningSteps[nextStep]);
    }
    return '4d'; // EASY: graduate immediately
  }
  if (card.state === 'relearning') {
    if (rating === 1) return '10m';
    if (rating === 2) return '10m';
    if (rating === 3) return `${Math.max(1, Math.round(interval * 0.7))}d`;
    return `${Math.max(1, Math.round(interval))}d`;
  }
  // Review state
  if (rating === 1) return '10m';
  if (rating === 2) return `${Math.max(1, Math.round(interval * 1.2))}d`;
  if (rating === 3) return `${Math.max(1, Math.round(interval * ease))}d`;
  return `${Math.max(1, Math.round(interval * ease * 1.3))}d`;
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

export default function Study() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { settings } = useStore();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [queue, setQueue] = useState<DueCardDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [undoStack, setUndoStack] = useState<{ pair: DueCardDto, index: number }[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  
  const [counts, setCounts] = useState({ new: 0, learning: 0, review: 0 });
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, startTime: Date.now() });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startMs, setStartMs] = useState(Date.now());

  useEffect(() => {
    if (!settings?.showTimer || isComplete) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStats.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [settings?.showTimer, isComplete, sessionStats.startTime]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const decks = await decksApi.getAll();
      const d = decks.find(x => x.id === deckId);
      if (!d) { toast.error('Mazo no encontrado'); navigate('/'); return; }
      setDeck(d);
      
      const pairs = await studyApi.getDueCards(deckId!, 1000); // get pairs {card, note}
      if (pairs.length === 0) { setIsComplete(true); setLoading(false); return; }

      // Sort
      const order = settings?.studyOrder || 'new_first';
      if (order === 'new_first') {
        pairs.sort((a, b) => {
          if (a.card.state === 'new' && b.card.state !== 'new') return -1;
          if (a.card.state !== 'new' && b.card.state === 'new') return 1;
          return 0;
        });
      } else if (order === 'review_first') {
        pairs.sort((a, b) => {
          if (a.card.state === 'review' && b.card.state !== 'review') return -1;
          if (a.card.state !== 'review' && b.card.state === 'review') return 1;
          return 0;
        });
      } else if (order === 'mixed') {
        pairs.sort(() => Math.random() - 0.5);
      }

      const now = new Date();
      setCounts({
        new: pairs.filter(p => p.card.state === 'new').length,
        learning: pairs.filter(p => (p.card.state === 'learning' || p.card.state === 'relearning') && new Date(p.card.due) <= now).length,
        review: pairs.filter(p => p.card.state === 'review' && new Date(p.card.due) <= now).length,
      });

      setQueue(pairs);
      setCurrentIndex(0);
      setIsFlipped(false);
      setStartMs(Date.now());
    } catch (e) {
      toast.error('Error al cargar sesión');
    } finally {
      setLoading(false);
    }
  }, [deckId, navigate, settings?.studyOrder]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const current = queue[currentIndex];
  const card = current?.card;
  const note = current?.note;

  const getFields = () => {
    if (!note) return { front: '', back: '' };
    try {
      return JSON.parse(note.fieldsJson);
    } catch { return { front: note.fieldsJson || '', back: '' }; }
  };

  const getFront = () => {
    const f = getFields();
    if (card?.cardOrdinal === 1) return marked.parse(f.back || '') as string;
    if (note?.noteType === 'cloze') {
      return (f.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '<span style="color:var(--accent-primary);border-bottom:2px dashed var(--accent-primary);padding:0 4px">[...]</span>');
    }
    return marked.parse(f.front || f.text || '') as string;
  };

  const getBack = () => {
    const f = getFields();
    if (card?.cardOrdinal === 1) return marked.parse(f.front || '') as string;
    if (note?.noteType === 'cloze') {
      const text = (f.text || '').replace(/\{\{c\d+::(.*?)\}\}/g, '<span style="color:var(--accent-primary);border-bottom:2px dashed var(--accent-primary);padding:0 4px">$1</span>');
      return marked.parse(text) + (f.extra ? `<div style="width: 60%; height: 1px; background: var(--border-subtle); margin: 16px auto;"></div><div style="font-size: 0.95rem; color: var(--text-muted);">${marked.parse(f.extra)}</div>` : '');
    }
    return marked.parse(f.back || f.extra || '') as string;
  };

  const intervals = useMemo(() => {
    if (!isFlipped || !card) return null;
    return {
      1: getIntervalLabel(card, 1),
      2: getIntervalLabel(card, 2),
      3: getIntervalLabel(card, 3),
      4: getIntervalLabel(card, 4),
    };
  }, [isFlipped, card]);

  const handleFlip = () => {
    if (isFlipped || !card) return;
    setIsFlipped(true);
  };

  const handleRate = async (rating: number) => {
    if (!card) return;
    
    // Save undo state
    setUndoStack(prev => [...prev, { pair: current, index: currentIndex }]);
    
    setIsFlipped(false);
    
    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: rating >= 3 ? prev.correct + 1 : prev.correct,
    }));

    setCounts(prev => {
      const n = { ...prev };
      if (card.state === 'new') n.new = Math.max(0, n.new - 1);
      else if (card.state === 'learning' || card.state === 'relearning') n.learning = Math.max(0, n.learning - 1);
      else if (card.state === 'review') n.review = Math.max(0, n.review - 1);
      return n;
    });

    const remaining = queue.filter((_, i) => i !== currentIndex);
    if (remaining.length === 0) {
      setIsComplete(true);
    } else {
      setQueue(remaining);
      setCurrentIndex(0);
      setStartMs(Date.now());
    }

    try {
      const timeTakenMs = Date.now() - startMs;
      await studyApi.reviewCard(card.id, { rating, timeTakenMs });
    } catch (e) {
      toast.error('Error guardando revisión');
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
    setCounts(prev => {
      const n = { ...prev };
      const s = last.pair.card.state;
      if (s === 'new') n.new++;
      else if (s === 'learning' || s === 'relearning') n.learning++;
      else if (s === 'review') n.review++;
      return n;
    });
    setIsComplete(false);
    toast('Deshecho');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!isFlipped) handleFlip(); }
      else if (isFlipped && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); handleRate(parseInt(e.key)); }
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleUndo(); }
      else if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFlipped, card, queue, currentIndex, undoStack, navigate]);

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (isComplete) {
    const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0;

    return (
      <div className="empty-state" style={{ minHeight: "80vh", border: "none", background: "transparent" }}>
        <div className="empty-state-icon">🎉</div>
        <h2 className="empty-state-title">¡Sesión Completada!</h2>
        <p className="empty-state-desc">Has terminado todas las tarjetas de <strong style={{ color: "var(--text-primary)" }}>{deck?.name}</strong>.</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem", marginBottom: "2rem", width: "100%", maxWidth: "600px" }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                <CheckCircle2 className="text-primary mb-2" size={24} />
                <div className="text-2xl font-bold">{sessionStats.reviewed}</div>
                <div className="text-xs text-muted-foreground tracking-wider font-semibold mt-1">TARJETAS</div>
            </div>
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                <div className="text-2xl font-bold text-emerald-500">{accuracy}%</div>
                <div className="text-xs text-muted-foreground tracking-wider font-semibold mt-1">PRECISIÓN</div>
            </div>
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                <Timer className="text-muted-foreground mb-2" size={24} />
                <div className="text-2xl font-bold">{minutes}:{seconds.toString().padStart(2, '0')}</div>
                <div className="text-xs text-muted-foreground tracking-wider font-semibold mt-1">TIEMPO</div>
            </div>
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                  <div className="text-2xl font-bold">{sessionStats.reviewed}</div>
                  <div className="text-xs text-muted-foreground tracking-wider font-semibold mt-1">TOTAL TARJETAS</div>
              </div>
          </div>

        <button 
          className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.1rem" }} 
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={20} /> Volver a Mazos
        </button>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="text-6xl mb-6">📭</div>
        <h2 className="text-2xl font-bold mb-2">¡Al día!</h2>
        <p className="empty-state-desc">No hay más tarjetas pendientes en este mazo.</p>
        <button 
          className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.1rem" }} 
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={20} /> Volver a Mazos
        </button>
      </div>
    );
  }

    return (
      <div className="fade-in flex flex-col h-full p-4 overflow-hidden max-w-3xl mx-auto w-full">
        {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", padding: "0 0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ padding: "0.5rem", marginLeft: "-0.5rem", color: "var(--text-muted)", borderRadius: "50%", transition: "all 0.2s" }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>{deck?.name}</h2>
            {settings?.showTimer && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Timer size={12} />
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", fontWeight: 700 }}>
          <div className="pill" style={{ color: "var(--accent-primary-light)", borderColor: "var(--accent-primary)" }}>{counts.new}</div>
          <div className="pill" style={{ color: "var(--color-warning)", borderColor: "var(--color-warning)" }}>{counts.learning}</div>
          <div className="pill" style={{ color: "var(--color-success)", borderColor: "var(--color-success)" }}>{counts.review}</div>
        </div>
      </div>

      {/* Card area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 0, padding: "1rem 0", width: "100%" }}>
            <FlashCard 
              front={getFront()} 
              back={getBack()} 
              isFlipped={isFlipped}
              onFlip={handleFlip}
              cardState={card.state}
            />
        </div>
        
        {/* Controls */}
        <div style={{ marginTop: "1rem", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "1rem" }}>
          {!isFlipped ? (
            <button 
              className="btn btn-primary" style={{ width: "100%", padding: "1.25rem", fontSize: "1.25rem", borderRadius: "var(--radius-xl)" }}
              onClick={handleFlip}
            >
              <Eye size={20} /> Mostrar Respuesta
            </button>
          ) : (
            <RatingButtons intervals={intervals} onRate={handleRate} />
          )}

          <div className="flex justify-center mt-2">
            <button 
              onClick={handleUndo} 
              disabled={undoStack.length === 0}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${undoStack.length === 0 
                  ? 'text-muted-foreground/30 cursor-not-allowed' 
                  : 'text-muted-foreground hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground cursor-pointer'}
              `}
            >
              <Undo2 size={16} /> Deshacer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


