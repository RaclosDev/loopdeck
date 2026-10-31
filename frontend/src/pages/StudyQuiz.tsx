import StudyLoadError from '../components/StudyLoadError';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decksApi, notesApi } from '../services/api';
import { marked } from 'marked';
import { Note } from '../types';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { sanitizeHtml } from '../lib/utils';

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

interface QuizOption {
  text: string;
  html: string;
  isCorrect: boolean;
}

function StudyQuiz() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<QuizOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<QuizOption | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const decks = await decksApi.getAll();
        const d = decks.find((d) => d.id === deckId);
        if (!d) {
          toast.error('Mazo no encontrado');
          navigate('/');
          return;
        }

        const allNotes = await notesApi.getByDeck(deckId!);
        if (allNotes.length < 2) {
          toast('Necesitas al menos 2 tarjetas para el modo Quiz');
          navigate(`/hub/${deckId}`);
          return;
        }

        const shuffledNotes = shuffleArray(allNotes);
        setNotes(shuffledNotes);
        generateOptions(shuffledNotes, 0);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [deckId, navigate, reloadKey]);

  const generateOptions = (allNotes: Note[], targetIndex: number) => {
    const targetNote = allNotes[targetIndex];
    const targetFields = JSON.parse(targetNote.fieldsJson || '{}');
    const correctBack = targetFields.back || '';

    // Pick 3 random wrong answers
    const otherNotes = allNotes.filter((_, idx) => idx !== targetIndex);
    const shuffledOthers = shuffleArray(otherNotes);

    // Take up to 3 wrong answers
    const wrongAnswers = shuffledOthers.slice(0, 3).map((n) => {
      const f = JSON.parse(n.fieldsJson || '{}');
      return f.back || '';
    });

    // Combine and shuffle
    const correctHtml = sanitizeHtml(marked.parse(correctBack) as string);
    const wrongOptions = wrongAnswers.map((text) => ({
      text,
      html: sanitizeHtml(marked.parse(text) as string),
      isCorrect: false,
    }));
    const allOptions = shuffleArray([
      { text: correctBack, html: correctHtml, isCorrect: true },
      ...wrongOptions,
    ]);

    setOptions(allOptions);
    setSelectedOption(null);
  };

  const handleOptionClick = (option: QuizOption) => {
    if (selectedOption !== null) return; // already answered
    setSelectedOption(option);

    if (option.isCorrect) {
      setScore((prev) => prev + 1);
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

  if (loadError)
    return <StudyLoadError deckId={deckId} onRetry={() => setReloadKey((key) => key + 1)} />;

  if (loading) {
    return (
      <div
        className="study-container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (isFinished) {
    return (
      <div
        className="study-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>¡Quiz Terminado!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '2rem' }}>
          Has acertado <strong>{score}</strong> de {notes.length}
        </p>
        <button className="btn btn-primary" onClick={() => navigate(`/hub/${deckId}`)}>
          Volver al Centro de Estudio
        </button>
      </div>
    );
  }

  const currentNote = notes[currentIndex];
  const fields = JSON.parse(currentNote?.fieldsJson || '{}');
  const questionHtml = sanitizeHtml(marked.parse(fields.front || '') as string);

  return (
    <div className="study-container">
      <div className="study-header">
        <button className="icon-btn" onClick={() => navigate(`/hub/${deckId}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Salir
        </button>
        <div className="study-progress">
          <h1 className="study-title">Test de opciones</h1>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
            {currentIndex + 1} / {notes.length}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 20px',
          paddingTop: '20px',
        }}
      >
        {/* Question Card */}
        <div
          className="card"
          style={{ width: '100%', padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '1rem',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            PREGUNTA
          </div>
          <div
            className="flashcard-content"
            style={{ fontSize: '1.2rem' }}
            dangerouslySetInnerHTML={{ __html: questionHtml }}
          />
        </div>

        {/* Options Grid */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {options.map((option, idx) => {
            let bgColor = 'var(--bg-glass-strong)';
            let borderColor = 'var(--border-subtle)';
            let textColor = 'var(--text-primary)';

            if (selectedOption !== null) {
              if (option.isCorrect) {
                bgColor = 'var(--color-success-bg)';
                borderColor = 'var(--color-success)';
              } else if (selectedOption === option && !option.isCorrect) {
                bgColor = 'var(--color-danger-bg)';
                borderColor = 'var(--color-danger)';
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
                  opacity:
                    selectedOption !== null && !option.isCorrect && selectedOption !== option
                      ? 0.4
                      : 1,
                }}
                onClick={() => handleOptionClick(option)}
                disabled={selectedOption !== null}
              >
                <div
                  className="flashcard-content"
                  style={{ fontSize: '1rem', margin: 0 }}
                  dangerouslySetInnerHTML={{ __html: option.html }}
                />
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        {selectedOption !== null && (
          <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s' }}>
            <button
              className="btn btn-primary"
              onClick={handleNext}
              style={{ padding: '0.8rem 3rem', fontSize: '1.1rem' }}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudyQuiz;
