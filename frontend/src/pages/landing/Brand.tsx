import { Link } from 'react-router-dom';

/** Marca de la cabecera pública: siempre lleva a la portada. */
export default function Brand() {
  return (
    <Link className="brand ld-brand" to="/" aria-label="LoopDeck, inicio">
      <img src="/loopdeck-brush-192.png" alt="" width={36} height={36} />
      <span>Loop</span>
      <span>Deck</span>
    </Link>
  );
}
