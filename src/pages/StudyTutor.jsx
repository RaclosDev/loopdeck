import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, notesApi, aiApi } from '../services/api';

function StudyTutor() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();
  
  const [deck, setDeck] = useState(null);
  const [contextString, setContextString] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [messages, setMessages] = useState([
    { role: 'ai', text: '¡Hola! Soy tu Tutor IA. He leído las tarjetas de este mazo. ¿En qué concepto quieres que te ayude o profundice?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

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
        
        // Build the context string
        let context = `Mazo: ${d.name}\n\n`;
        allNotes.forEach(n => {
          const f = JSON.parse(n.fieldsJson || '{}');
          const front = f.front ? f.front.replace(/<[^>]+>/g, '') : '';
          const back = f.back ? f.back.replace(/<[^>]+>/g, '') : '';
          context += `Pregunta: ${front}\nRespuesta: ${back}\n\n`;
        });
        
        // Limit context size just in case (Gemini handles 1M tokens, but we shouldn't send megabytes of text)
        if (context.length > 50000) {
          context = context.substring(0, 50000) + "... (contexto truncado)";
        }
        
        setContextString(context);

      } catch (e) {
        addToast('Error cargando mazo', 'error');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [deckId, navigate, addToast]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const res = await aiApi.chat(userMessage, contextString);
      setMessages(prev => [...prev, { role: 'ai', text: res.response }]);
    } catch (error) {
      addToast('Error al comunicar con la IA', 'error');
      setMessages(prev => [...prev, { role: 'ai', text: 'Lo siento, hubo un error al conectar con el servidor de IA.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="study-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="study-container" style={{ display: 'flex', flexDirection: 'column' }}>
      
      <div className="study-header" style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--panel-bg)' }}>
        <button className="glass-btn" onClick={() => navigate(`/study/${deckId}`)} style={{ padding: '4px 12px' }}>
          ← Volver
        </button>
        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
          🤖 Tutor IA - {deck?.name}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            background: msg.role === 'user' ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.05)',
            border: msg.role === 'ai' ? '1px solid var(--border-color)' : 'none',
            color: msg.role === 'user' ? '#fff' : 'var(--text-main)',
            padding: '12px 16px',
            borderRadius: '16px',
            borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
            borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '16px',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-dim)', padding: '12px 16px', fontStyle: 'italic', fontSize: '0.9rem' }}>
            La IA está escribiendo...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--panel-bg)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="modern-input"
            style={{ flex: 1, margin: 0 }}
            placeholder="Pregunta a la IA sobre este mazo..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button type="submit" className="primary-btn" disabled={!input.trim() || isTyping}>
            Enviar
          </button>
        </form>
      </div>

    </div>
  );
}

export default StudyTutor;
