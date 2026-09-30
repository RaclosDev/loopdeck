import toast from 'react-hot-toast';
import { useState, useRef, ChangeEvent, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { decksApi, notesApi } from '../services/api';
import DocxViewerModal from '../components/DocxViewerModal';
import { Skeleton } from '../components/ui/skeleton';
import { useDecks, useDeckStats } from '../hooks/useDecks';

function StudyHub() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const { data: decks = [], isLoading: loadingDecks } = useDecks();
  const deck = decks.find(d => d.id === deckId);
  const { data: allStats = {}, isLoading: loadingStats } = useDeckStats([deckId || '']);

  const { data: allNotes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['notes', deckId],
    queryFn: () => notesApi.getByDeck(deckId!),
    enabled: !!deckId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: docInfo, isLoading: loadingDoc } = useQuery({
    queryKey: ['deckDoc', deckId],
    queryFn: () => decksApi.hasDocument(deckId!),
    enabled: !!deckId,
    staleTime: 5 * 60 * 1000,
  });

  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive stats
  const stats = useMemo(() => {
    const myStats = allStats[deckId!] || { newCount: 0, learningCount: 0, reviewCount: 0 };
    const dueCount = myStats.newCount + myStats.learningCount + myStats.reviewCount;
    return { due: dueCount, total: allNotes.length };
  }, [allStats, deckId, allNotes.length]);

  const hasDocument = docInfo?.hasDocument || false;
  const loading = loadingDecks || loadingStats || loadingNotes || loadingDoc;

  useEffect(() => {
    if (!loadingDecks && !deck) {
      toast.error('Mazo no encontrado');
      navigate('/');
    }
  }, [loadingDecks, deck, navigate]);

  const queryClient = useQueryClient();

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
      queryClient.setQueryData(['deckDoc', deckId], { hasDocument: true });
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
      <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
        <Skeleton className="h-40 w-full mb-8" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!deck) return null;

  return (
    <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
        
        
        <div>
          <button className="icon-btn" onClick={() => navigate('/')} style={{ padding: '6px 14px', fontSize: '0.85rem', marginBottom: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
            <span>←</span>
            <span>Mazos</span>
          </button>
          
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {deck.name}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, border: '1px solid var(--border-medium)' }}>
               {stats.total} notas totales
            </span>
            <span style={{ background: stats.due > 0 ? 'rgba(0, 133, 255, 0.15)' : 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', color: stats.due > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, border: stats.due > 0 ? '1px solid rgba(0, 133, 255, 0.3)' : '1px solid var(--border-medium)' }}>
               {stats.due} tarjetas pendientes
            </span>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            {hasDocument ? (
              <button 
                className="btn" 
                onClick={() => setShowDocModal(true)}
                style={{ padding: '8px 16px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-light)', border: '1px solid var(--accent-color)', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem' }}
              >
                 Ver Documento Original
              </button>
            ) : (
              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                style={{ padding: '8px 16px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem' }}
              >
                {uploadingDoc ? 'Subiendo...' : ' Vincular Apuntes (DOCX)'}
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
          
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
             Repaso Espaciado
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
          
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
             Guía de Estudio
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
          
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
             Modo Paseo
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
          
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
             Test por Bloques
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
          
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
             Test de Opciones
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
          
          <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
             Tutor IA
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

