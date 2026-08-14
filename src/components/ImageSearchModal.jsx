import { useState, useRef, useEffect } from 'react';

export default function ImageSearchModal({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  const searchImages = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // Use Wikipedia API to search for images (free, no key required)
      const url = `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrnamespace=0&gsrsearch=${encodeURIComponent(query)}&gsrlimit=20&prop=pageimages&pithumbsize=800&format=json&origin=*`;
      const response = await fetch(url);
      const data = await response.json();
      
      const pages = data.query?.pages || {};
      const images = Object.values(pages)
        .filter(page => page.thumbnail && page.thumbnail.source)
        .map(page => ({
          url: page.thumbnail.source,
          title: page.title,
          width: page.thumbnail.width,
          height: page.thumbnail.height
        }));

      setResults(images);
      if (images.length === 0) {
        setError('No se encontraron imágenes para esta búsqueda.');
      }
    } catch (err) {
      setError('Error al buscar imágenes. Comprueba tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>🖼️ Buscar Imagen (Wikipedia)</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={searchImages} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <input
            ref={inputRef}
            className="glass-input"
            type="text"
            placeholder="Ej: Ceviche, Perro, Madrid..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : 'Buscar'}
          </button>
        </form>

        {error && <div className="text-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
          gap: 12, 
          maxHeight: '50vh', 
          overflowY: 'auto',
          paddingRight: 8
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
                position: 'relative'
              }}
              onClick={() => onSelect(img.url)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            >
              <img 
                src={img.url} 
                alt={img.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '0.7rem',
                padding: '4px 8px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {img.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
