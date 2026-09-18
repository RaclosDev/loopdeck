import toast from 'react-hot-toast';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decksApi, studyApi, notesApi } from '../services/api';
import DocxViewerModal from '../components/DocxViewerModal';
import { Deck } from '../types';

function StudyHub() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
    const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({ due: 0, total: 0 });
  const [hasDocument, setHasDocument] = useState<boolean>(false);
  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadDeckInfo = async () => {
      setLoading(true);
      try {
        const decks = await decksApi.getAll();
        const d = decks.find(d => d.id === deckId);
        if (!d) {
          toast.error('Mazo no encontrado');
          navigate('/');
          return;
        }
        setDeck(d);

        // Fetch counts (we just need a rough idea to show recommendations)
        const dueCards = await studyApi.getDueCards(deckId!, 1000);
        const allNotes = await notesApi.getByDeck(deckId!);
        
        setStats({
          due: dueCards.length,
          total: allNotes.length
        });

        try {
          const docInfo = await decksApi.hasDocument(deckId!);
          setHasDocument(docInfo?.hasDocument || false);
        } catch (err) {
          console.warn("No se pudo obtener info del documento", err);
        }

      } catch (e) {
        toast.error('Error cargando mazo');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDeckInfo();
  }, [deckId, navigate]);

  const handleUploadDocument = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.docx')) {
      toast.error('Solo se permiten archivos .docx');
      return;
    }
    
    setUploadingDoc(true);
    try {
      toast('Subiendo documento...');
      await decksApi.uploadDocument(deckId!, file);
      setHasDocument(true);
      toast.success('Documento vinculado correctamente');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando datos');
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
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '8rem', opacity: 0.03, pointerEvents: 'none' }}>📚</div>
        
        <div>
          <button className="icon-btn" onClick={() => navigate('/')} style={{ padding: '4px 12px', fontSize: '0.85rem', marginBottom: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)' }}>
            ← Volver a Mazos
          </button>
          
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {deck.name}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, border: '1px solid var(--border-medium)' }}>
              📝 {stats.total} notas totales
            </span>
            <span style={{ background: stats.due > 0 ? 'rgba(0, 133, 255, 0.15)' : 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', color: stats.due > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, border: stats.due > 0 ? '1px solid rgba(0, 133, 255, 0.3)' : '1px solid var(--border-medium)' }}>
              🎯 {stats.due} tarjetas pendientes
            </span>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            {hasDocument ? (
              <button 
                className="btn" 
                onClick={() => setShowDocModal(true)}
                style={{ padding: '8px 16px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-light)', border: '1px solid var(--accent-color)', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem' }}
              >
                📄 Ver Documento Original
              </button>
            ) : (
              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                style={{ padding: '8px 16px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem' }}
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
        <div className="card" style={{ cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
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
        <div className="card" style={{ cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
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
        <div className="card" style={{ cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
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
        <div className="card" style={{ cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
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
        <div className="card" style={{ cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
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
        <div className="card" style={{ cursor: 'pointer', border: '2px solid var(--border-color)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
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
        deckId={deckId || null} 
      />
    </div>
  );
}

export default StudyHub;

