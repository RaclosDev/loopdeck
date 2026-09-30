import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RatingButtons from './RatingButtons';

describe('RatingButtons Component', () => {
  const mockIntervals = {
    1: '< 10m',
    2: '1d',
    3: '3d',
    4: '7d',
  };

  it('does not render if intervals are null', () => {
    const { container } = render(<RatingButtons intervals={null} onRate={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly with given intervals', () => {
    render(<RatingButtons intervals={mockIntervals} onRate={() => {}} />);
    
    expect(screen.getByText('< 10m')).toBeInTheDocument();
    expect(screen.getByText('1d')).toBeInTheDocument();
    expect(screen.getByText('3d')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
  });

  it('calls onRate with correct rating when clicked', () => {
    const onRateMock = vi.fn();
    render(<RatingButtons intervals={mockIntervals} onRate={onRateMock} />);
    
    const goodButton = screen.getByText('3d').closest('button');
    fireEvent.click(goodButton!);
    
    expect(onRateMock).toHaveBeenCalledWith(3);
  });

  it('disables buttons when disabled prop is true', () => {
    render(<RatingButtons intervals={mockIntervals} onRate={() => {}} disabled={true} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});
