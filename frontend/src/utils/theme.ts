import { useSyncExternalStore } from 'react';
import { DEMO } from '../demo/mode';

export type Theme = 'dark' | 'light';

const KEY = 'loopdeck_theme';
const EVENT = 'loopdeck:theme';

/** Sin elección guardada: papel claro en la app y pizarra oscura en la demo. */
export function getTheme(): Theme {
  const saved = localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return DEMO ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  document.body.classList.remove('dark-mode', 'light-mode');
  document.body.classList.add(theme === 'light' ? 'light-mode' : 'dark-mode');
  // El fondo inicial de index.html sigue al tema elegido.
  document.documentElement.classList.toggle('boot-light', theme === 'light');
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** El tema activo; se actualiza lo cambie quien lo cambie (cabecera o Configuración). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme);
}
