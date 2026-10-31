import StudyLoadError from '../components/StudyLoadError';
import toast from 'react-hot-toast';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decksApi, notesApi, aiApi } from '../services/api';
import { marked } from 'marked';
import { Deck } from '../types';
import { ArrowLeft } from 'lucide-react';
import { sanitizeHtml } from '../lib/utils';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

function StudyTutor() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [contextString, setContextString] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: '¡Hola! Soy tu Tutor IA. He leído las tarjetas de este mazo. ¿En qué concepto quieres que te ayude o profundice?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        setDeck(d);

        const allNotes = await notesApi.getByDeck(deckId!);

        // Build the context string
        let context = `Mazo: ${d.name}\n\n`;
        const reversedNotes = [...allNotes].reverse();
        reversedNotes.forEach((n) => {
          const f = JSON.parse(n.fieldsJson || '{}');
          const front = f.front ? f.front.replace(/<[^>]+>/g, '') : '';
          const back = f.back ? f.back.replace(/<[^>]+>/g, '') : '';
          context += `Pregunta: ${front}\nRespuesta: ${back}\n\n`;
        });

        // Limit context size just in case (Gemini handles 1M tokens, but we shouldn't send megabytes of text)
        if (context.length > 50000) {
          context = context.substring(0, 50000) + '... (contexto truncado)';
        }

        setContextString(context);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [deckId, navigate, reloadKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const res = await aiApi.chat(userMessage, contextString);
      setMessages((prev) => [...prev, { role: 'ai', text: res.response }]);
    } catch {
      toast.error('Error al comunicar con la IA');
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Lo siento, hubo un error al conectar con el servidor de IA.' },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loadError)
    return <StudyLoadError deckId={deckId} onRetry={() => setReloadKey((key) => key + 1)} />;

  if (loading) {
    return (
      <div
        className="study-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100dvh',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div
      className="study-container tutor-session"
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div className="study-header" style={{ padding: '15px 20px', flexShrink: 0 }}>
        <button
          className="icon-btn"
          onClick={() => navigate(`/hub/${deckId}`)}
          style={{ padding: '4px 12px' }}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </button>
        <h1 className="study-title" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          Tutor IA · {deck?.name}
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-card)',
              border: msg.role === 'ai' ? '1px solid var(--border-subtle)' : 'none',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              padding: '12px 16px',
              borderRadius: '16px',
              borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
              borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '16px',
              lineHeight: 1.5,
              wordBreak: 'break-word',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {msg.role === 'ai' ? (
              <div
                className="flashcard-content"
                style={{ fontSize: '0.95rem' }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(marked.parse(msg.text) as string) }}
              />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{msg.text}</div>
            )}
          </div>
        ))}
        {isTyping && (
          <div
            style={{
              alignSelf: 'flex-start',
              color: 'var(--text-muted)',
              padding: '12px 16px',
              fontStyle: 'italic',
              fontSize: '0.9rem',
            }}
          >
            La IA está escribiendo...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '15px 20px', flexShrink: 0 }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input-field"
            style={{
              flex: 1,
              margin: 0,
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
            aria-label="Pregunta al tutor IA"
            placeholder="Pregunta a la IA sobre este mazo..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ borderRadius: 'var(--radius-md)', padding: '0 20px' }}
            disabled={!input.trim() || isTyping}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudyTutor;
