import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, notesApi } from '../services/api';
import { marked } from 'marked';

function StudyGuide() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [deck, setDeck] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setNotes(allNotes.reverse());

      } catch (e) {
        addToast('Error cargando mazo', 'error');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [deckId, navigate, addToast]);

  if (loading) {
    return (
      <div className="study-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!deck) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      
      <div className="study-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--panel-bg)', padding: '15px 20px', borderBottom: '1px solid var(--border-color)', margin: '-20px -20px 20px -20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="glass-btn" onClick={() => navigate(`/hub/${deckId}`)} style={{ padding: '4px 12px' }}>
            ← Volver
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.2rem' }}>
              📖 {deck.name} (Guía)
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 600 }}>
              {notes.length} conceptos
            </div>
          </div>
        </div>
      </div>

      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '4rem' }}>
          Este mazo está vacío. Añade algunas tarjetas primero.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {notes.map((note, index) => {
            const fields = JSON.parse(note.fieldsJson || '{}');
            
            return (
              <div key={note.id} style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '4px 12px', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-dim)', 
                  fontWeight: 600,
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  #{index + 1}
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px' }}>PREGUNTA</div>
                    <div className="flashcard-content" style={{ fontSize: '1.1rem' }} dangerouslySetInnerHTML={{ __html: marked.parse(fields.front || '') }} />
                  </div>
                  
                  <div style={{ width: '40%', height: '1px', background: 'var(--border-color)', margin: '0 auto 16px auto' }} />
                  
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-light)', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px' }}>RESPUESTA</div>
                    <div className="flashcard-content" dangerouslySetInnerHTML={{ __html: marked.parse(fields.back || '') }} style={{ color: 'var(--text-main)', fontSize: '1.1rem' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>¿Ya te suenan los conceptos?</p>
        <button className="primary-btn" onClick={() => navigate(`/study/${deckId}`)}>
          🧠 Empezar a Memorizar
        </button>
      </div>

    </div>
  );
}

export default StudyGuide;
