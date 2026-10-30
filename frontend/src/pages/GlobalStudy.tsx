import { Link } from 'react-router-dom';
import { useDecks, useDeckStats } from '../hooks/useDecks';
import DeckSheet, { DeckSheetsLoading, StudyMethodLink } from '../components/DeckSheet';
import { CountsNotice } from '../components/StudyCounts';

export default function GlobalStudy() {
  const { data: decks = [], isLoading, isError, refetch } = useDecks();
  const {
    data: stats = {},
    isLoading: loadingStats,
    isError: errorStats,
    refetch: retryStats,
  } = useDeckStats(decks.map((deck) => deck.id));
  return (
    <div className="fade-in study-canvas-page">
      <header className="canvas-heading">
        <div>
          <p className="canvas-eyebrow">Tu sesión de hoy</p>
          <h1>Centro de estudio</h1>
          <p>Primero el mazo. Después, la forma de estudiarlo.</p>
        </div>
      </header>
      {isError ? (
        <div className="paper-sheet sheet-empty" role="alert">
          <h2>No se han podido cargar tus mazos</h2>
          <button className="sheet-action" onClick={() => void refetch()}>
            Reintentar
          </button>
        </div>
      ) : isLoading ? (
        <DeckSheetsLoading />
      ) : (
        <>
          <CountsNotice
            loading={loadingStats}
            error={errorStats}
            onRetry={() => void retryStats()}
          />
          <div className="canvas-section-heading">
            <h2>Elige un mazo</h2>
            <span>
              {decks.length} {decks.length === 1 ? 'mazo' : 'mazos'}
            </span>
          </div>
          <div className="deck-grid">
            {decks.map((deck) => (
              <DeckSheet key={deck.id} deck={deck} stats={!errorStats ? stats[deck.id] : undefined}>
                <StudyMethodLink deck={deck} />
              </DeckSheet>
            ))}
            {decks.length === 0 && (
              <div className="paper-sheet sheet-empty">
                <h2>Tu primer repaso empieza con un mazo</h2>
                <p>Crea un mazo y añade las tarjetas que quieres estudiar.</p>
                <Link className="sheet-action sheet-action--primary" to="/">
                  Ir a Mis Mazos
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
