import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom no trae la API Popover: se simula un navegador moderno. Las pruebas del respaldo sin
// Popover la quitan a propósito.
for (const method of ['showPopover', 'hidePopover'] as const)
  if (!HTMLElement.prototype[method]) HTMLElement.prototype[method] = () => undefined;

afterEach(() => {
  cleanup();
});
