import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { findImages, type ImageResult } from '../utils/imageSearch';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  initialQuery?: string;
  /** Título del diálogo; por defecto «Buscar imagen». */
  title?: string;
}

export default function ImageSearchModal({
  isOpen,
  onClose,
  onSelect,
  initialQuery = '',
  title = 'Buscar imagen',
}: ImageSearchModalProps) {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<AbortController | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const images = await findImages(searchQuery, controller.signal);
      if (controller.signal.aborted) return;
      setResults(images);
      if (images.length === 0) {
        setError('No se encontraron imágenes para esta búsqueda. Prueba con otra palabra.');
      }
    } catch {
      if (controller.signal.aborted) return;
      setError('Error al buscar imágenes. Comprueba tu conexión.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => () => searchRef.current?.abort(), []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialQuery) {
        setQuery(initialQuery);
        handleSearch(initialQuery);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
      searchRef.current?.abort();
      setLoading(false);
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen, initialQuery, handleSearch, onClose]);

  const searchImages = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 max-w-[700px]">
        <div
          className="modal animate-slide-up"
          style={{
            maxWidth: 700,
            width: '100%',
            padding: 0,
            maxHeight: 'min(90vh, 90dvh)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="modal-header" style={{ padding: '16px 20px', flexShrink: 0 }}>
            <DialogTitle className="modal-title">{title}</DialogTitle>
          </div>

          <div
            className="modal-body"
            style={{ padding: '0 20px 20px', overflowY: 'auto', flex: 1 }}
          >
            <form
              onSubmit={searchImages}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 20,
                flexWrap: 'wrap',
                paddingTop: 16,
              }}
            >
              <input
                ref={inputRef}
                aria-label="Buscar imágenes"
                className="glass-input"
                type="text"
                placeholder="Ej: Ceviche, Perro, Madrid..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ flex: 1, minWidth: '150px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ whiteSpace: 'nowrap' }}
              >
                {loading ? <span className="spinner-sm" /> : 'Buscar'}
              </button>
            </form>

            {error && (
              <div
                style={{
                  color: 'var(--color-danger)',
                  marginBottom: 16,
                  fontSize: '0.9rem',
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {error}
              </div>
            )}

            {loading && results.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <div
                  className="spinner-sm"
                  style={{ width: 32, height: 32, margin: '0 auto 12px', borderWidth: 3 }}
                />
                <p>Buscando imágenes...</p>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  {results.length} {results.length === 1 ? 'imagen' : 'imágenes'} · Toca la que
                  quieras usar
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 10,
                  }}
                >
                  {results.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      className="image-candidate"
                      aria-label={`Seleccionar imagen: ${img.title}`}
                      title={img.title}
                      onClick={() => onSelect(img.url)}
                    >
                      <img src={img.url} alt="" loading="lazy" decoding="async" />
                      <span className="image-candidate-title">{img.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
