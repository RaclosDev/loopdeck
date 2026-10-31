import { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
import { decksApi } from '../services/api';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

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
      } catch {
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={isFullscreen ? 'p-0 w-screen max-w-none h-dvh max-h-dvh' : 'p-0 max-w-[1200px]'}
      >
        <div
          className={`modal-content card docx-modal-content ${isFullscreen ? 'fullscreen' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="docx-modal-header">
            <DialogTitle asChild>
              <h2
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginRight: '10px',
                }}
              >
                Documento Original
              </h2>
            </DialogTitle>
            <div
              className="docx-modal-actions"
              style={{ flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <button
                className="icon-btn"
                onClick={toggleFullscreen}
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 mr-1" />
                ) : (
                  <Maximize2 className="w-4 h-4 mr-1" />
                )}
                {isFullscreen ? 'Contraer' : 'Pantalla Completa'}
              </button>
            </div>
          </div>

          <div className="docx-modal-body">
            {loading && (
              <div className="docx-loading">
                Cargando documento... <span className="spinner-sm"></span>
              </div>
            )}
            {error && <div className="docx-error">{error}</div>}
            <div
              ref={containerRef}
              className="docx-viewer-container"
              style={{ display: loading || error ? 'none' : 'block' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DocxViewerModal;
