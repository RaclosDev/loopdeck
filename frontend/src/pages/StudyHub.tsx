import toast from 'react-hot-toast';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { decksApi } from '../services/api';
import DocxViewerModal from '../components/DocxViewerModal';
import StudyCounts, { CountsNotice, pendingCards } from '../components/StudyCounts';
import { DeckSheetsLoading } from '../components/DeckSheet';
import {
  ArrowLeft,
  ArrowUpRight,
  Repeat,
  BookOpen,
  Compass,
  Layers,
  ListChecks,
  Bot,
  FileText,
} from 'lucide-react';
import { useDecks, useDeckStats } from '../hooks/useDecks';

function StudyHub() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const {
    data: decks = [],
    isLoading: loadingDecks,
    isError: errorDecks,
    refetch: retryDecks,
  } = useDecks();
  const deck = decks.find((d) => d.id === deckId);
  const {
    data: allStats = {},
    isLoading: loadingStats,
    isError: errorStats,
    refetch: retryStats,
  } = useDeckStats([deckId || '']);

  const { data: docInfo } = useQuery({
    queryKey: ['deckDoc', deckId],
    queryFn: () => decksApi.hasDocument(deckId!),
    enabled: !!deckId,
    staleTime: 5 * 60 * 1000,
  });

  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = !errorStats ? allStats[deckId || ''] : undefined;
  const hasDocument = docInfo?.hasDocument || false;

  useEffect(() => {
    if (!loadingDecks && !errorDecks && !deck) {
      toast.error('Mazo no encontrado');
      navigate('/');
    }
  }, [loadingDecks, errorDecks, deck, navigate]);

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

  if (errorDecks)
    return (
      <div className="paper-sheet sheet-empty" role="alert">
        <h1>El mazo no se ha podido cargar</h1>
        <button className="sheet-action" onClick={() => void retryDecks()}>
          Reintentar
        </button>
      </div>
    );
  if (loadingDecks) return <DeckSheetsLoading />;
  if (!deck) return null;

  const methods = [
    {
      title: 'Guía de estudio',
      description: 'Lee las preguntas y sus respuestas antes de ponerte a prueba.',
      path: 'guide',
      icon: BookOpen,
    },
    {
      title: 'Modo paseo',
      description: 'Recorre las tarjetas a tu ritmo, sin calificaciones.',
      path: 'explore',
      icon: Compass,
    },
    {
      title: 'Test por bloques',
      description: 'Divide el temario en grupos y avanza paso a paso.',
      path: 'chunked',
      icon: Layers,
    },
    {
      title: 'Test de opciones',
      description: 'Elige la respuesta correcta entre cuatro opciones.',
      path: 'quiz',
      icon: ListChecks,
    },
    {
      title: 'Tutor IA',
      description: 'Pregunta sobre el temario y resuelve tus dudas.',
      path: 'tutor',
      icon: Bot,
    },
  ];

  return (
    <div className="fade-in study-canvas-page">
      <Link className="canvas-back" to="/hub">
        <ArrowLeft size={17} aria-hidden="true" /> Centro de estudio
      </Link>
      <header className="canvas-heading">
        <div>
          <h1>{deck.name}</h1>
        </div>
      </header>
      <CountsNotice loading={loadingStats} error={errorStats} onRetry={() => void retryStats()} />
      <section className="paper-sheet landing-tape deck-study-summary" aria-label="Estado del mazo">
        <div className="deck-study-summary-heading">
          <div>
            <h2>{stats?.totalCount === 0 ? 'Tu mazo está vacío' : 'Listo para repasar'}</h2>
            <p>
              {stats
                ? `${stats.totalCount.toLocaleString('es-ES')} tarjetas en este mazo`
                : 'Recuentos no disponibles'}
            </p>
          </div>
          {stats && (
            <span className="ink-status">
              {stats.totalCount === 0
                ? 'Sin tarjetas'
                : pendingCards(stats) === 0
                  ? 'Al día'
                  : `${pendingCards(stats).toLocaleString('es-ES')} pendientes`}
            </span>
          )}
        </div>
        <StudyCounts stats={stats} compact />
        <div className="deck-document-action">
          <FileText size={18} aria-hidden="true" />
          <span>Apuntes del mazo</span>
          {hasDocument ? (
            <button className="sheet-action" onClick={() => setShowDocModal(true)}>
              Ver Documento Original
            </button>
          ) : (
            <button
              className="sheet-action"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDoc}
            >
              {uploadingDoc ? 'Subiendo…' : 'Vincular apuntes (DOCX)'}
            </button>
          )}
          <input
            type="file"
            accept=".docx"
            ref={fileInputRef}
            hidden
            onChange={handleUploadDocument}
          />
        </div>
      </section>
      {stats?.totalCount === 0 ? (
        <section className="paper-sheet page-state">
          <h2>Añade tus primeras tarjetas</h2>
          <p>Después podrás elegir cómo estudiarlas.</p>
          <Link className="sheet-action sheet-action--primary" to={`/add/${deckId}`}>
            Añadir tarjetas
          </Link>
        </section>
      ) : (
        <section aria-labelledby="study-methods-title">
          <div className="canvas-section-heading">
            <h2 id="study-methods-title">Cómo quieres estudiar</h2>
          </div>
          <div className="study-method-grid">
            <Link
              className="paper-sheet study-method study-method--primary"
              to={`/study/${deckId}`}
            >
              <Repeat size={25} aria-hidden="true" />
              <div>
                <p className="sheet-eyebrow">Tu repaso de hoy</p>
                <h3>Repaso espaciado</h3>
                <p>Responde las tarjetas pendientes y programa tu siguiente repaso.</p>
              </div>
              <span className="method-link-label">
                {stats
                  ? pendingCards(stats) > 0
                    ? `Repasar ${pendingCards(stats).toLocaleString('es-ES')} tarjetas`
                    : 'Abrir repaso'
                  : 'Abrir repaso'}
                <ArrowUpRight size={20} aria-hidden="true" />
              </span>
            </Link>
            {methods.map(({ title, description, path, icon: Icon }) => (
              <Link className="paper-sheet study-method" key={path} to={`/hub/${deckId}/${path}`}>
                <Icon size={24} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <ArrowUpRight className="method-arrow" size={19} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
      <DocxViewerModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        deckId={deckId || null}
      />
    </div>
  );
}

export default StudyHub;
