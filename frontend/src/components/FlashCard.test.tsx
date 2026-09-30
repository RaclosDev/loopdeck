import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FlashCard from './FlashCard';

describe('FlashCard Component', () => {
  it('renders front text when not flipped', () => {
    render(<FlashCard front="Question" back="Answer" isFlipped={false} onFlip={() => {}} cardState="new" />);
    expect(screen.getByText('Question')).toBeInTheDocument();
  });

  it('calls onFlip when clicked and not flipped', () => {
    const onFlipMock = vi.fn();
    render(<FlashCard front="Question" back="Answer" isFlipped={false} onFlip={onFlipMock} cardState="new" />);
    
    // Using test-id or text to click
    const frontSide = screen.getByText('Question').parentElement;
    fireEvent.click(frontSide!);
    
    expect(onFlipMock).toHaveBeenCalled();
  });

  it('does not call onFlip when clicked and already flipped', () => {
    const onFlipMock = vi.fn();
    render(<FlashCard front="Question" back="Answer" isFlipped={true} onFlip={onFlipMock} cardState="new" />);
    
    const card = screen.getByText('Question').closest('div[style*="perspective"]');
    fireEvent.click(card!);
    
    expect(onFlipMock).not.toHaveBeenCalled();
  });
});
