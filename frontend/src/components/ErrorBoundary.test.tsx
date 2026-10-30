import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

it('offers recovery without exposing internal exception details', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken(): never {
    throw new Error('internal database diagnostic');
  }
  try {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Recarga la aplicación');
    expect(screen.queryByText('internal database diagnostic')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recargar/ })).toBeVisible();
  } finally {
    log.mockRestore();
  }
});
