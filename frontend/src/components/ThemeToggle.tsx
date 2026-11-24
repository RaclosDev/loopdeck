import { Moon, Sun } from 'lucide-react';
import useStore from '../store/useStore';
import { setTheme, useTheme, type Theme } from '../utils/theme';

/** Cambia entre el tema oscuro y el claro. El icono enseña el tema al que se va. */
export default function ThemeToggle() {
  const theme = useTheme();
  const updateSettings = useStore((s) => s.updateSettings);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'light' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      title={label}
      aria-label={label}
      onClick={() => {
        setTheme(next);
        updateSettings({ theme: next });
      }}
    >
      {next === 'light' ? (
        <Sun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}
