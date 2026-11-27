import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FlashCard from './FlashCard';

describe('FlashCard Component', () => {
  it('exposes only the visible side to assistive technology', () => {
    const { rerender } = render(
      <FlashCard
        front="<h2>Question</h2>"
        back="<h2>Answer</h2>"
        isFlipped={false}
        onFlip={() => {}}
        cardState="new"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Question' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Answer' })).not.toBeInTheDocument();
    rerender(
      <FlashCard
        front="<h2>Question</h2>"
        back="<h2>Answer</h2>"
        isFlipped
        onFlip={() => {}}
        cardState="new"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Answer' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Question' })).not.toBeInTheDocument();
  });
  it('renders front text when not flipped', () => {
    render(
      <FlashCard
        front="Question"
        back="Answer"
        isFlipped={false}
        onFlip={() => {}}
        cardState="new"
      />,
    );
    expect(screen.getByText('Question')).toBeInTheDocument();
    expect(screen.queryByText('Toca para voltear')).not.toBeInTheDocument();
  });

  it('calls onFlip when clicked and not flipped', () => {
    const onFlipMock = vi.fn();
    render(
      <FlashCard
        front="Question"
        back="Answer"
        isFlipped={false}
        onFlip={onFlipMock}
        cardState="new"
      />,
    );

    // Using test-id or text to click
    const frontSide = screen.getByText('Question').parentElement;
    fireEvent.click(frontSide!);

    expect(onFlipMock).toHaveBeenCalled();
  });

  it('does not call onFlip when clicked and already flipped', () => {
    const onFlipMock = vi.fn();
    render(
      <FlashCard
        front="Question"
        back="Answer"
        isFlipped={true}
        onFlip={onFlipMock}
        cardState="new"
      />,
    );

    const card = screen.getByText('Question').closest('div[style*="perspective"]');
    fireEvent.click(card!);

    expect(onFlipMock).not.toHaveBeenCalled();
  });

  it('keeps the card text outside the button so screen readers can read it', () => {
    render(
      <FlashCard
        front="<p>Capital de Francia</p>"
        back="París"
        isFlipped={false}
        onFlip={() => {}}
        cardState="new"
      />,
    );
    const button = screen.getByRole('button', { name: 'Voltear tarjeta' });
    expect(button.textContent).toBe('');
    expect(button.contains(screen.getByText('Capital de Francia'))).toBe(false);
    expect(screen.getByText('Capital de Francia').closest('[role="button"]')).toBeNull();
    expect(screen.getByText('Capital de Francia').closest('[aria-hidden="true"]')).toBeNull();
  });

  it('flips from the button, which a keyboard activates with Enter or Space', () => {
    const onFlip = vi.fn();
    render(
      <FlashCard
        front="Question"
        back="Answer"
        isFlipped={false}
        onFlip={onFlip}
        cardState="new"
      />,
    );
    const button = screen.getByRole('button', { name: 'Voltear tarjeta' });
    expect(button.tagName).toBe('BUTTON');
    fireEvent.click(button);
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('keeps a disabled button named after the state once flipped, without flipping again', () => {
    const onFlip = vi.fn();
    render(<FlashCard front="Question" back="Answer" isFlipped onFlip={onFlip} cardState="new" />);
    const button = screen.getByRole('button', { name: 'Tarjeta volteada' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(onFlip).not.toHaveBeenCalled();
    expect(screen.getByText('Answer').closest('[aria-hidden="true"]')).toBeNull();
  });
});
