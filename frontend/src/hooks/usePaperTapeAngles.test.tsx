import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePaperTapeAngles } from './usePaperTapeAngles';

function Paper({ count }: { count: number }) {
  usePaperTapeAngles();
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="landing-tape" data-testid={`paper-${index}`} />
      ))}
    </>
  );
}

describe('paper tape', () => {
  it('initializes late sheets and keeps visible sheets stable through rerenders', async () => {
    const view = render(<Paper count={1} />);
    const first = view.getByTestId('paper-0');
    const angle = first.style.getPropertyValue('--tape-angle');
    expect(Math.abs(parseFloat(angle))).toBeLessThanOrEqual(6);
    view.rerender(<Paper count={2} />);
    await waitFor(() =>
      expect(view.getByTestId('paper-1').style.getPropertyValue('--tape-angle')).not.toBe(''),
    );
    expect(first.style.getPropertyValue('--tape-angle')).toBe(angle);
    expect(
      Math.abs(parseFloat(view.getByTestId('paper-1').style.getPropertyValue('--tape-angle'))),
    ).toBeLessThanOrEqual(6);
  });
});
