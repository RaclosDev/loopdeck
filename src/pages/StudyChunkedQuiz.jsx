import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, notesApi } from '../services/api';
import { marked } from 'marked';

function shuffleArray(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function StudyChunkedQuiz() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();
  
  const [deck, setDeck] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [chunkSize, setChunkSize] = useState(10);
  const [currentChunkStart, setCurrentChunkStart] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  
  // Track scores for the current chunk
  const [chunkScore, setChunkScore] = useState(0);
  
  const [isChunkFinished, setIsChunkFinished] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

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

        const allNotes = await notesApi.getByDeck(deckId);
        if (allNotes.length < 2) {
           addToast('Necesitas al menos 2 tarjetas para el modo Test', 'warning');
           navigate(`/hub/${deckId}`);
           return;
        }
        
        // Progressive, so we DO NOT shuffle the main notes array. We keep it in order.
        setNotes(allNotes);
        generateOptions(allNotes, 0);

      } catch (e) {
        addToast('Error cargando mazo', 'error');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [deckId, navigate, addToast]);

  const generateOptions = (allNotes, targetIndex) => {
    const targetNote = allNotes[targetIndex];
    if (!targetNote) return;

    const targetFields = JSON.parse(targetNote.fieldsJson || '{}');
    const correctBack = targetFields.back || '';

    // Pick 3 random wrong answers
    const otherNotes = allNotes.filter((_, idx) => idx !== targetIndex);
    const shuffledOthers = shuffleArray(otherNotes);
    
    // Take up to 3 wrong answers
    const wrongAnswers = shuffledOthers.slice(0, 3).map(n => {
      const f = JSON.parse(n.fieldsJson || '{}');
      return f.back || '';
    });

    // Combine and shuffle
    const allOptions = shuffleArray([{ text: correctBack, isCorrect: true }, ...wrongAnswers.map(text => ({ text, isCorrect: false }))]);
    
    setOptions(allOptions);
    setSelectedOption(null);
  };

  const handleOptionClick = (option) => {
    if (selectedOption !== null) return; // already answered
    setSelectedOption(option);
    
    if (option.isCorrect) {
      setChunkScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= notes.length || nextIndex >= currentChunkStart + chunkSize) {
      // Reached the end of the chunk OR end of the deck
      setIsChunkFinished(true);
      if (nextIndex >= notes.length) {
         setIsFinished(true);
      }
    } else {
      setCurrentIndex(nextIndex);
      generateOptions(notes, nextIndex);
    }
  };

  const handleRepeatChunk = () => {
    setCurrentIndex(currentChunkStart);
    setChunkScore(0);
    setIsChunkFinished(false);
    generateOptions(notes, currentChunkStart);
  };

  const handleNextChunk = () => {
    const nextStart = currentChunkStart + chunkSize;
    setCurrentChunkStart(nextStart);
    setCurrentIndex(nextStart);
    setChunkScore(0);
    setIsChunkFinished(false);
    generateOptions(notes, nextStart);
  };

  const handleChunkSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setChunkSize(newSize);
  };

  if (loading) {
    return (
      <div className="study-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Current Chunk Length Calculation (in case it's the last chunk and it's smaller than chunkSize)
  const currentChunkLength = Math.min(chunkSize, notes.length - currentChunkStart);

  if (isChunkFinished) {
    return (
      <div className="study-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{isFinished ? '🎉' : '🧱'}</div>
        <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem', textAlign: 'center' }}>
          {isFinished ? '¡Mazo Completado!' : '¡Bloque Completado!'}
        </h2>
        
        <p style={{ color: 'var(--text-dim)', fontSize: '1.2rem', marginBottom: '2rem', textAlign: 'center' }}>
          Aciertos en este bloque: <strong style={{ color: 'var(--accent-color)' }}>{chunkScore}</strong> de {currentChunkLength}
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="glass-btn" onClick={handleRepeatChunk} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            🔄 Repetir estas {currentChunkLength}
          </button>
          
          {isFinished ? (
            <button className="primary-btn" onClick={() => navigate(`/hub/${deckId}`)} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Volver al Centro
            </button>
          ) : (
            <button className="primary-btn" onClick={handleNextChunk} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Siguiente Bloque →
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentNote = notes[currentIndex];
  const fields = JSON.parse(currentNote?.fieldsJson || '{}');

  return (
    <div className="study-container">
      <div className="study-header">
        <button className="glass-btn" onClick={() => navigate(`/hub/${deckId}`)}>
          ✕ Salir
        </button>
        
        <div className="study-progress" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Bloque:</span>
            <select 
              value={chunkSize} 
              onChange={handleChunkSizeChange}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value={5} style={{color: '#000'}}>5</option>
              <option value={10} style={{color: '#000'}}>10</option>
              <option value={20} style={{color: '#000'}}>20</option>
              <option value={50} style={{color: '#000'}}>50</option>
            </select>
          </div>
          
          <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
            {currentIndex - currentChunkStart + 1} / {currentChunkLength}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            (Total: {currentIndex + 1}/{notes.length})
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', margin: '0 auto', padding: '0 20px', paddingTop: '20px' }}>
        
        {/* Question Card */}
        <div className="glass-panel" style={{ width: '100%', padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem', fontWeight: 600, letterSpacing: '1px' }}>PREGUNTA</div>
          <div className="flashcard-content" style={{ fontSize: '1.2rem' }} dangerouslySetInnerHTML={{ __html: marked.parse(fields.front || '') }} />
        </div>

        {/* Options Grid */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {options.map((option, idx) => {
            let bgColor = 'rgba(255, 255, 255, 0.05)';
            let borderColor = 'var(--border-color)';
            let textColor = 'var(--text-main)';

            if (selectedOption !== null) {
              if (option.isCorrect) {
                bgColor = 'rgba(16, 185, 129, 0.15)';
                borderColor = '#10b981';
              } else if (selectedOption === option && !option.isCorrect) {
                bgColor = 'rgba(239, 68, 68, 0.15)';
                borderColor = '#ef4444';
              }
            }

            return (
              <button 
                key={idx}
                className="quiz-option-btn"
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.2rem',
                  textAlign: 'left',
                  color: textColor,
                  cursor: selectedOption === null ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  opacity: (selectedOption !== null && !option.isCorrect && selectedOption !== option) ? 0.4 : 1
                }}
                onClick={() => handleOptionClick(option)}
                disabled={selectedOption !== null}
              >
                <div className="flashcard-content" style={{ fontSize: '1rem', margin: 0 }} dangerouslySetInnerHTML={{ __html: marked.parse(option.text) }} />
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        {selectedOption !== null && (
          <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s' }}>
            <button className="primary-btn" onClick={handleNext} style={{ padding: '0.8rem 3rem', fontSize: '1.1rem' }}>
              {currentIndex + 1 >= currentChunkStart + chunkSize || currentIndex + 1 >= notes.length ? 'Finalizar Bloque' : 'Siguiente →'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default StudyChunkedQuiz;
