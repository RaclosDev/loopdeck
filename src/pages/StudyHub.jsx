import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, studyApi, notesApi } from '../services/api';
import DocxViewerModal from '../components/DocxViewerModal';

function StudyHub() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ due: 0, total: 0 });
  const [hasDocument, setHasDocument] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);

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

        try {
          const docInfo = await decksApi.hasDocument(deckId);
          setHasDocument(docInfo?.hasDocument || false);
        } catch (err) {
          console.warn("No se pudo obtener info del documento", err);
        }

      } catch (e) {
        addToast('Error cargando mazo', 'error');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDeckInfo();
  }, [deckId, navigate, addToast]);

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.docx')) {
      addToast('Solo se permiten archivos .docx', 'error');
      return;
    }
    
    setUploadingDoc(true);
    try {
      addToast('Subiendo documento...', 'info');
      await decksApi.uploadDocument(deckId, file);
      setHasDocument(true);
      addToast('Documento vinculado correctamente', 'success');
    } catch(err) {
      addToast('Error subiendo documento: ' + err.message, 'error');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            {hasDocument ? (
              <button 
                className="glass-btn" 
                onClick={() => setShowDocModal(true)}
                style={{ padding: '6px 14px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-light)', border: '1px solid var(--accent-color)' }}
              >
                📄 Ver Documento Original
              </button>
            ) : (
              <button 
                className="glass-btn" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                style={{ padding: '6px 14px' }}
              >
                {uploadingDoc ? 'Subiendo...' : '📎 Vincular Apuntes (DOCX)'}
              </button>
            )}
            <input 
              type="file" 
              accept=".docx" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleUploadDocument} 
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        
        {/* REPASO ESPACIADO (Clásico) */}
        <div className="glass-panel" style={{ padding: '16px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/study/${deckId}`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', fontSize: '6rem', opacity: 0.05, pointerEvents: 'none' }}>🧠</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
            🧠 Repaso Espaciado
            {stats.due > 0 && <span style={{ background: 'var(--accent-color)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '12px' }}>{stats.due} DUE</span>}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.4, maxWidth: '90%' }}>
            Algoritmo inteligente de LoopDeck. Responde para optimizar tu memoria a largo plazo.
          </p>
        </div>

        {/* GUÍA DE ESTUDIO */}
        <div className="glass-panel" style={{ padding: '16px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/guide`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--purple-accent)'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', fontSize: '6rem', opacity: 0.05, pointerEvents: 'none' }}>📖</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
            📖 Guía de Estudio
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.4, maxWidth: '90%' }}>
            Lee todas las preguntas y respuestas del tirón. Ideal para el primer contacto.
          </p>
        </div>

        {/* MODO PASEO */}
        <div className="glass-panel" style={{ padding: '16px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/explore`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = '#10b981'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', fontSize: '6rem', opacity: 0.05, pointerEvents: 'none' }}>🎡</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
            🎡 Modo Paseo
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.4, maxWidth: '90%' }}>
            Navega por las tarjetas libremente, sin la presión de acertar y sin afectar a las estadísticas.
          </p>
        </div>

        {/* TEST POR BLOQUES */}
        <div className="glass-panel" style={{ padding: '16px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/chunked`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', fontSize: '6rem', opacity: 0.05, pointerEvents: 'none' }}>🧱</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
            🧱 Test por Bloques
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.4, maxWidth: '90%' }}>
            Estudia en orden configurando bloques (10, 20...). Perfecto para asentar conocimiento paso a paso.
          </p>
        </div>

        {/* TEST DE OPCIONES */}
        <div className="glass-panel" style={{ padding: '16px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/quiz`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', fontSize: '6rem', opacity: 0.05, pointerEvents: 'none' }}>🎯</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
            🎯 Test de Opciones
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.4, maxWidth: '90%' }}>
            Adivina la respuesta correcta entre 4 opciones aleatorias. Un escalón intermedio perfecto.
          </p>
        </div>

        {/* TUTOR IA */}
        <div className="glass-panel" style={{ padding: '16px', cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
             onClick={() => navigate(`/hub/${deckId}/tutor`)}
             onMouseEnter={(e) => e.currentTarget.style.borderColor = '#06b6d4'}
             onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
          <div style={{ position: 'absolute', right: '-15px', top: '-15px', fontSize: '6rem', opacity: 0.05, pointerEvents: 'none' }}>🤖</div>
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
            🤖 Tutor IA
          </h2>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.4, maxWidth: '90%' }}>
            Chatea con la IA sobre el temario. Resuelve tus dudas o ponte a prueba.
          </p>
        </div>
      </div>

      <DocxViewerModal 
        isOpen={showDocModal} 
        onClose={() => setShowDocModal(false)} 
        deckId={deckId} 
      />
    </div>
  );
}

export default StudyHub;
