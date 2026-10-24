import { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
import { decksApi } from '../services/api';
import { FileText, Maximize2, Minimize2, X } from 'lucide-react';

interface DocxViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string | null;
}

function DocxViewerModal({ isOpen, onClose, deckId }: DocxViewerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !deckId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadDocx = async () => {
      try {
        const blob = await decksApi.downloadDocument(deckId);
        
        if (isMounted && containerRef.current) {

          await docx.renderAsync(blob, containerRef.current, undefined, {
            className: 'docx-viewer',
            inWrapper: false,
            ignoreWidth: true,
            ignoreHeight: true,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true,
          });
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
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
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);


  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay docx-modal-overlay ${isFullscreen ? 'fullscreen-overlay' : ''}`} onClick={onClose}>
      <div 
        className={`modal-content card docx-modal-content ${isFullscreen ? 'fullscreen' : ''}`}
        onClick={e => e.stopPropagation()} 
      >
        <div className="docx-modal-header">
          <h2 style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>Documento Original</h2>
          <div className="docx-modal-actions" style={{ flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="icon-btn" onClick={toggleFullscreen} style={{ minHeight: '44px', minWidth: '44px' }}>
              {isFullscreen ? <Minimize2 className="w-4 h-4 mr-1" /> : <Maximize2 className="w-4 h-4 mr-1" />}
              {isFullscreen ? 'Contraer' : 'Pantalla Completa'}
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar modal" style={{ minHeight: '44px', minWidth: '44px' }}>
              <X className="w-4 h-4 mr-1" />
              Cerrar
            </button>
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


