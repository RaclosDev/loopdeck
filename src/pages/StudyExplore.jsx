import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, notesApi } from '../services/api';
import FlashCard from '../components/FlashCard';

function StudyExplore() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast, settings } = useStore();
  
  const [deck, setDeck] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const decks = await decksApi.getAll();
        const d = decks.find(d => d.id === deckId);
        if (!d) {
          addToast('Mazo no encontrado', 'error');
          navigate('/');
          return;
        }
        setDeck(d);

        // For explore mode, we just load all notes and display them.
        const allNotes = await notesApi.getByDeck(deckId);
        // Shuffle them slightly to make it fun, or keep them ordered? Let's keep them ordered for now.
        setNotes(allNotes);

      } catch (e) {
        addToast('Error cargando mazo', 'error');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [deckId, navigate, addToast]);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % notes.length);
    }, settings?.animationsEnabled !== false ? 150 : 0);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + notes.length) % notes.length);
    }, settings?.animationsEnabled !== false ? 150 : 0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes.length, settings?.animationsEnabled]);

  if (loading) {
    return (
      <div className="study-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!deck || notes.length === 0) {
    return (
      <div className="study-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>No hay tarjetas en este mazo.</p>
        <button className="primary-btn" onClick={() => navigate(`/study/${deckId}`)}>Volver al Hub</button>
      </div>
    );
  }

  const currentNote = notes[currentIndex];
  const fields = JSON.parse(currentNote.fieldsJson || '{}');

  return (
    <div className="study-container">
      <div className="study-header">
        <button className="glass-btn" onClick={() => navigate(`/study/${deckId}`)}>
          ✕ Salir
        </button>
        <div className="study-progress">
          <span>Paseo Libre</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '12px' }}>
            {currentIndex + 1} / {notes.length}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        
        <div style={{ width: '100%', maxWidth: '600px', padding: '0 20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          
          <button 
            className="glass-btn" 
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%' }}
            onClick={handlePrev}
          >
            ←
          </button>
          
          <div style={{ flex: 1 }}>
            <FlashCard
              front={fields.front || ''}
              back={fields.back || ''}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
              animationsEnabled={settings?.animationsEnabled}
            />
          </div>

          <button 
            className="glass-btn" 
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '50%' }}
            onClick={handleNext}
          >
            →
          </button>

        </div>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Toca la tarjeta o pulsa <kbd>Espacio</kbd> para girar<br/>
          Usa <kbd>←</kbd> y <kbd>→</kbd> para navegar
        </div>
      </div>
    </div>
  );
}

export default StudyExplore;
