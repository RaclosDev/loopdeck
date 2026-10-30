import React, { useState, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      startY.current = null;
    } else {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      setDragY(diff);
    } else {
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 80) {
      // Threshold to close
      onClose();
    } else {
      setDragY(0); // Snap back
    }
    startY.current = null;
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <div
            className="bottom-sheet-overlay"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{ opacity: dragY > 0 ? Math.max(0, 1 - dragY / 300) : 1 }}
          >
            <Dialog.Content
              asChild
              aria-describedby={undefined}
              onOpenAutoFocus={() => {
                previousFocus.current =
                  document.activeElement instanceof HTMLElement ? document.activeElement : null;
              }}
              onCloseAutoFocus={(event) => {
                if (previousFocus.current?.isConnected) {
                  event.preventDefault();
                  previousFocus.current.focus();
                }
              }}
            >
              <div
                className="bottom-sheet-content"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
                  transition: dragY > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
              >
                <div className="bottom-sheet-drag-handle" />
                <Dialog.Title asChild>
                  <h3 className="bottom-sheet-title">{title}</h3>
                </Dialog.Title>
                <Dialog.Close className="icon-btn sheet-close" aria-label="Cerrar menú">
                  ×
                </Dialog.Close>
                {children}
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default BottomSheet;
