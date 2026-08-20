import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, studyApi, notesApi } from '../services/api';

function StudyHub() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ due: 0, total: 0 });

  useEffect(() => {
    const loadDeckInfo = async () => {
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

        // Fetch counts (we just need a rough idea to show recommendations)
        const dueCards = await studyApi.getDueCards(deckId, 1000);
        const allNotes = await notesApi.getByDeck(deckId);
        
        setStats({
          due: dueCards.length,
          total: allNotes.length
        });

      } catch (e) {
        addToast('Error cargando mazo', 'error');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDeckInfo();
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
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <button className="glass-btn" onClick={() => navigate('/')} style={{ padding: '4px 12px', fontSize: '0.85rem', marginBottom: '8px' }}>
            ← Volver
          </button>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>{deck.name}</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-dim)' }}>
            {stats.total} notas totales · <span style={{ color: stats.due > 0 ? 'var(--accent-color)' : 'inherit' }}>{stats.due} tarjetas pendientes</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* REPASO ESPACIADO (Clásico) */}
        <div className="glass-panel" style={{ padding: '20px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/study/${deckId}`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '8rem', opacity: 0.05, pointerEvents: 'none' }}>🧠</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            🧠 Repaso Espaciado
            {stats.due > 0 && <span style={{ background: 'var(--accent-color)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px' }}>{stats.due} DUE</span>}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '80%' }}>
            El método tradicional de flashcards. Responde para optimizar tu memoria a largo plazo basándose en el algoritmo de LoopDeck.
          </p>
        </div>

        {/* GUÍA DE ESTUDIO */}
        <div className="glass-panel" style={{ padding: '20px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/guide`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--purple-accent)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '8rem', opacity: 0.05, pointerEvents: 'none' }}>📖</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            📖 Guía de Estudio
            <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px' }}>Recomendado para empezar</span>
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '80%' }}>
            Lee todas las preguntas y respuestas del tirón, como si fuera un documento de apuntes. Ideal para el primer contacto con el temario.
          </p>
        </div>

        {/* MODO PASEO */}
        <div className="glass-panel" style={{ padding: '20px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/explore`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '8rem', opacity: 0.05, pointerEvents: 'none' }}>🎡</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            🎡 Modo Paseo
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '80%' }}>
            Navega por las tarjetas libremente, sin la presión de acertar y sin afectar a las estadísticas. Solo hojea y familiarízate.
          </p>
        </div>

        {/* TEST DE OPCIONES */}
        <div className="glass-panel" style={{ padding: '20px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/quiz`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '8rem', opacity: 0.05, pointerEvents: 'none' }}>🎯</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            🎯 Test de Opciones
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '80%' }}>
            Adivina la respuesta correcta entre 4 opciones aleatorias del mismo mazo. Un escalón intermedio perfecto.
          </p>
        </div>

        {/* TUTOR IA */}
        <div className="glass-panel" style={{ padding: '20px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/tutor`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = '#06b6d4'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '8rem', opacity: 0.05, pointerEvents: 'none' }}>🤖</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            🤖 Tutor IA
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '80%' }}>
            Charla con tu mazo. Pídele a la IA que te explique conceptos complejos o que te haga preguntas estilo examen.
          </p>
        </div>

      </div>
    </div>
  );
}

export default StudyHub;
