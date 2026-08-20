import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, notesApi } from '../services/api';

function shuffleArray(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function StudyQuiz() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();
  
  const [deck, setDeck] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
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
           addToast('Necesitas al menos 2 tarjetas para el modo Quiz', 'warning');
           navigate(`/study/${deckId}`);
           return;
        }
        
        const shuffledNotes = shuffleArray(allNotes);
        setNotes(shuffledNotes);
        generateOptions(shuffledNotes, 0);

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
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= notes.length) {
      setIsFinished(true);
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      generateOptions(notes, nextIndex);
    }
  };

  if (loading) {
    return (
      <div className="study-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="study-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>¡Quiz Terminado!</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '1.2rem', marginBottom: '2rem' }}>
          Has acertado <strong>{score}</strong> de {notes.length}
        </p>
        <button className="primary-btn" onClick={() => navigate(`/study/${deckId}`)}>
          Volver al Centro de Estudio
        </button>
      </div>
    );
  }

  const currentNote = notes[currentIndex];
  const fields = JSON.parse(currentNote?.fieldsJson || '{}');

  return (
    <div className="study-container">
      <div className="study-header">
        <button className="glass-btn" onClick={() => navigate(`/study/${deckId}`)}>
          ✕ Salir
        </button>
        <div className="study-progress">
          <span>Test de Opciones</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '12px' }}>
            {currentIndex + 1} / {notes.length}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', margin: '0 auto', padding: '0 20px', paddingTop: '20px' }}>
        
        {/* Question Card */}
        <div className="glass-panel" style={{ width: '100%', padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem', fontWeight: 600, letterSpacing: '1px' }}>PREGUNTA</div>
          <div className="flashcard-content" style={{ fontSize: '1.2rem' }} dangerouslySetInnerHTML={{ __html: fields.front || '' }} />
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
                <div className="flashcard-content" style={{ fontSize: '1rem', margin: 0 }} dangerouslySetInnerHTML={{ __html: option.text }} />
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        {selectedOption !== null && (
          <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s' }}>
            <button className="primary-btn" onClick={handleNext} style={{ padding: '0.8rem 3rem', fontSize: '1.1rem' }}>
              Siguiente →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default StudyQuiz;
