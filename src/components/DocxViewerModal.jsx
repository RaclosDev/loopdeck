import { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
import { decksApi } from '../services/api';

function DocxViewerModal({ isOpen, onClose, deckId }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !deckId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadDocx = async () => {
      try {
        const url = decksApi.getDocumentUrl(deckId);
        const response = await fetch(url);
        
        if (!response.ok) {
           throw new Error('No se pudo cargar el documento');
        }

        const blob = await response.blob();
        
        if (isMounted && containerRef.current) {
          // Render docx
          await docx.renderAsync(blob, containerRef.current, null, {
            className: 'docx-viewer',
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true,
          });
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError('El documento no se pudo cargar. Asegúrate de haber subido uno.');
          setLoading(false);
        }
      }
    };

    loadDocx();

    return () => {
      isMounted = false;
      if (containerRef.current) {
         containerRef.current.innerHTML = '';
      }
    };
  }, [isOpen, deckId]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay docx-modal-overlay ${isFullscreen ? 'fullscreen-overlay' : ''}`} onClick={onClose}>
      <div 
        className={`modal-content glass-panel docx-modal-content ${isFullscreen ? 'fullscreen' : ''}`}
        onClick={e => e.stopPropagation()} 
      >
        <div className="docx-modal-header">
          <h2 style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>📄 Documento Original</h2>
          <div className="docx-modal-actions" style={{ flexShrink: 0, display: 'flex', gap: '8px' }}>
            <button className="glass-btn" onClick={toggleFullscreen}>
              {isFullscreen ? 'Contraer' : 'Pantalla Completa'}
            </button>
            <button className="glass-btn" onClick={onClose}>Cerrar</button>
          </div>
        </div>
        
        <div className="docx-modal-body">
          {loading && <div className="docx-loading">Cargando documento... <span className="spinner-sm"></span></div>}
          {error && <div className="docx-error">{error}</div>}
          <div 
            ref={containerRef} 
            className="docx-viewer-container"
            style={{ display: loading || error ? 'none' : 'block' }} 
          />
        </div>
      </div>
    </div>
  );
}

export default DocxViewerModal;
