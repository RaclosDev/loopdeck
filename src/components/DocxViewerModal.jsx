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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 1000 }}>
      <div 
        className="modal-content glass-panel" 
        onClick={e => e.stopPropagation()} 
        style={{ width: '90vw', height: '90vh', maxWidth: '1000px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'var(--bg-color)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--panel-bg)', alignItems: 'center', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>📄 Documento Original</h2>
          <button className="glass-btn" onClick={onClose}>Cerrar</button>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', background: '#cbd5e1', padding: '20px', display: 'flex', justifyContent: 'center' }}>
          {loading && <div style={{ color: '#1e293b', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 10 }}>Cargando documento... <span className="spinner-sm" style={{borderColor: '#1e293b', borderTopColor: 'transparent'}}></span></div>}
          {error && <div style={{ color: '#dc2626', alignSelf: 'center', background: 'white', padding: '10px 20px', borderRadius: '8px' }}>{error}</div>}
          <div 
            ref={containerRef} 
            style={{ 
              display: loading || error ? 'none' : 'block',
              width: '100%',
              maxWidth: '850px',
              color: 'black'
            }} 
          />
        </div>
      </div>
    </div>
  );
}

export default DocxViewerModal;
