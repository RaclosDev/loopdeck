import { Link } from 'react-router-dom';

export default function StudyLoadError({
  deckId,
  onRetry,
}: {
  deckId?: string;
  onRetry: () => void;
}) {
  return (
    <div className="page-state" role="alert">
      <h1 className="study-title">No se ha podido cargar el estudio</h1>
      <p>Tus tarjetas siguen guardadas. Puedes volver a intentarlo.</p>
      <button className="sheet-action" onClick={onRetry}>
        Reintentar
      </button>
      <Link className="sheet-action" to={deckId ? `/hub/${deckId}` : '/hub'}>
        Volver al mazo
      </Link>
    </div>
  );
}
