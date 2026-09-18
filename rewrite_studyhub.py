import re

with open('src/pages/StudyHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the return block. I will just rewrite the entire file since it's cleaner.
new_file = '''import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { decksApi, studyApi } from '../services/api';
import DocxViewerModal from '../components/DocxViewerModal';

export default function StudyHub() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [loading, setLoading] = useState(true);
  const [deckName, setDeckName] = useState('');
  const [stats, setStats] = useState({ due: 0, total: 0 });
  const [hasDocument, setHasDocument] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!deckId) return;
    Promise.all([
      decksApi.getAll().then(ds => {
        const d = ds.find(x => x.id === deckId);
        if (d) {
          setDeckName(d.name);
          setHasDocument(!!d.documentUrl);
        }
      }),
      studyApi.getDueCards(deckId, 1000).then(c => setStats(prev => ({ ...prev, due: c.length })))
    ]).finally(() => setLoading(false));
  }, [deckId]);

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !deckId) return;
    try {
      setUploadingDoc(true);
      const file = e.target.files[0];
      await decksApi.uploadDocument(deckId, file);
      setHasDocument(true);
      addToast('Apuntes vinculados', 'success');
    } catch (err) {
      addToast('Error al subir', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="fade-in pb-12" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem' }}>{deckName || 'Mazo'}</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Centro de estudio avanzado
          </p>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            {hasDocument ? (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDocModal(true)}
                style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary-light)', border: '1px solid var(--accent-primary)', fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderRadius: '10px' }}
              >
                📖 Ver Apuntes Originales
              </button>
            ) : (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderRadius: '10px' }}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        {/* REPASO ESPACIADO */}
        <div className="card start-workout-option start-workout-option-primary" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => navigate(/study/)}>
          <div className="start-workout-option-icon" style={{ background: 'var(--accent-primary)' }}>🧠</div>
          <div style={{ flex: 1 }}>
            <div className="start-workout-option-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Repaso Espaciado
              {stats.due > 0 && <span style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary-light)', borderRadius: '9999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>{stats.due} DUE</span>}
            </div>
            <div className="start-workout-option-desc">
              Algoritmo inteligente de LoopDeck.
            </div>
          </div>
        </div>

        {/* GUÍA DE ESTUDIO */}
        <div className="card start-workout-option start-workout-option-secondary" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => navigate(/hub//guide)}>
          <div className="start-workout-option-icon" style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)' }}>📖</div>
          <div style={{ flex: 1 }}>
            <div className="start-workout-option-title">Guía de Estudio</div>
            <div className="start-workout-option-desc">
              Lee todas las tarjetas del tirón.
            </div>
          </div>
        </div>

        {/* MODO PASEO */}
        <div className="card start-workout-option start-workout-option-secondary" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => navigate(/hub//explore)}>
          <div className="start-workout-option-icon" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>🚶</div>
          <div style={{ flex: 1 }}>
            <div className="start-workout-option-title">Modo Paseo</div>
            <div className="start-workout-option-desc">
              Navega sin presión ni estadísticas.
            </div>
          </div>
        </div>

        {/* TEST POR BLOQUES */}
        <div className="card start-workout-option start-workout-option-secondary" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => navigate(/hub//chunked)}>
          <div className="start-workout-option-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>📦</div>
          <div style={{ flex: 1 }}>
            <div className="start-workout-option-title">Test por Bloques</div>
            <div className="start-workout-option-desc">
              Estudia configurando bloques (10, 20...).
            </div>
          </div>
        </div>

        {/* TEST DE OPCIONES */}
        <div className="card start-workout-option start-workout-option-secondary" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => navigate(/hub//quiz)}>
          <div className="start-workout-option-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>📝</div>
          <div style={{ flex: 1 }}>
            <div className="start-workout-option-title">Test de Opciones</div>
            <div className="start-workout-option-desc">
              Adivina la respuesta entre 4 opciones.
            </div>
          </div>
        </div>

        {/* TUTOR IA */}
        <div className="card start-workout-option start-workout-option-secondary" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => navigate(/hub//tutor)}>
          <div className="start-workout-option-icon" style={{ color: '#06b6d4', background: 'rgba(6, 182, 212, 0.1)' }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div className="start-workout-option-title">Tutor IA</div>
            <div className="start-workout-option-desc">
              Chatea con la IA sobre el temario.
            </div>
          </div>
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
'''

with open('src/pages/StudyHub.tsx', 'w', encoding='utf-8') as f:
    f.write(new_file)
