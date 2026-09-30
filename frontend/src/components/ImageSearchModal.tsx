import { useState, useRef, useEffect, useCallback } from 'react';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  initialQuery?: string;
}

export interface ImageResult {
  url: string;
  thumbnail: string;
  title: string;
}

interface WikimediaPage {
  title: string;
  imageinfo?: { url: string; thumburl?: string; descriptionurl?: string }[];
}

export default function ImageSearchModal({ isOpen, onClose, onSelect, initialQuery = '' }: ImageSearchModalProps) {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|size|mime&generator=search&gsrsearch=filetype:bitmap|drawing ${encodeURIComponent(searchQuery)}&gsrlimit=20&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      if (data.query && data.query.pages) {
        const pages = data.query.pages as Record<string, WikimediaPage>;
        const images: ImageResult[] = Object.values(pages)
          .filter((page: WikimediaPage) => page.imageinfo && page.imageinfo.length > 0)
          .map((page: WikimediaPage) => {
            const info = page.imageinfo![0];
            const cleanTitle = page.title.replace(/^File:/, '').replace(/\.\w+$/, '');
            return {
              url: info.url,
              thumbnail: info.thumburl || info.url,
              title: cleanTitle
            };
          });

        setResults(images);
        if (images.length === 0) {
          setError('No se encontraron imágenes para esta búsqueda.');
        }
      } else {
        setResults([]);
        setError('No se encontraron imágenes para esta búsqueda.');
      }
    } catch {
      setError('Error al buscar imágenes. Comprueba tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialQuery) {
        setQuery(initialQuery);
        handleSearch(initialQuery);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialQuery, handleSearch]);

  const searchImages = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose} style={{ zIndex: 9999, padding: '12px' }}>
      <div
        className="modal animate-slide-up"
        onClick={e => e.stopPropagation()}
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
          <h3 className="modal-title">🖼️ Buscar Imagen</h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ padding: '8px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>

        <div className="modal-body" style={{ padding: '0 20px 20px', overflowY: 'auto', flex: 1 }}>
          <form onSubmit={searchImages} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', paddingTop: 16 }}>
            <input
              ref={inputRef}
              className="glass-input"
              type="text"
              placeholder="Ej: Ceviche, Perro, Madrid..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ flex: 1, minWidth: '150px' }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
              {loading ? <span className="spinner-sm" /> : '🔍 Buscar'}
            </button>
          </form>

          {error && (
            <div style={{
              color: 'var(--color-danger)',
              marginBottom: 16,
              fontSize: '0.9rem',
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {error}
            </div>
          )}

          {loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div className="spinner-sm" style={{ width: 32, height: 32, margin: '0 auto 12px', borderWidth: 3 }} />
              <p>Buscando imágenes...</p>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                {results.length} imágenes encontradas · Toca para seleccionar
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 10,
              }}>
                {results.map((img, i) => (
                  <div
                    key={i}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: '2px solid transparent',
                      aspectRatio: '1',
                      position: 'relative',
                      transition: 'border-color 0.15s, transform 0.1s',
                    }}
                    onClick={() => onSelect(img.url)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
                    onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                    onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                      color: 'white',
                      fontSize: '0.65rem',
                      padding: '12px 6px 4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {img.title}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
