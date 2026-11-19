import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectMenuEntry<T extends string> =
  { value: T; label: ReactNode; disabled?: boolean } | { separator: true };

export interface SelectMenuProps<T extends string> {
  options: SelectMenuEntry<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Para enlazarlo con un `<label htmlFor>`: el botón es etiquetable como un control nativo. */
  id?: string;
  'aria-label'?: string;
  /** Nombre del menú para lectores de pantalla (por defecto, el del botón). */
  menuLabel?: string;
  /** Acción extra al final del menú, tras un separador (p. ej. «Nuevo mazo…»). */
  action?: { label: ReactNode; icon?: ReactNode; onSelect: () => void; disabled?: boolean };
  /** `field`: como un campo de formulario; `pill`: compacto, dentro de barras y chips. */
  variant?: 'field' | 'pill';
  className?: string;
  disabled?: boolean;
}

/**
 * Desplegable con el aspecto de las hojas de papel de la app: el `<select>` nativo lo pinta el
 * navegador y no se deja maquetar. El menú es un popover nativo, así que Escape y el clic fuera
 * lo cierran sin código propio.
 */
export function SelectMenu<T extends string>({
  options,
  value,
  onChange,
  id,
  'aria-label': ariaLabel,
  menuLabel,
  action,
  variant = 'field',
  className,
  disabled,
}: SelectMenuProps<T>) {
  const menuId = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const escapeGuard = useRef<(() => void) | null>(null);
  useEffect(() => () => escapeGuard.current?.(), []);
  const current = options.find((o) => 'value' in o && o.value === value);
  const currentLabel = current && 'value' in current ? current.label : null;

  const place = () => {
    const b = btn.current?.getBoundingClientRect();
    const p = pop.current;
    if (!b || !p) return;
    p.style.minWidth = `${Math.max(160, b.width)}px`;
    p.style.left = `${Math.min(Math.max(8, b.left), window.innerWidth - p.offsetWidth - 8)}px`;
    const below = window.innerHeight - b.bottom - 16;
    const above = b.top - 16;
    // Si no cabe debajo y hay más sitio arriba, se abre hacia arriba.
    if (below < Math.min(p.scrollHeight, 240) && above > below) {
      p.style.maxHeight = `${above}px`;
      p.style.top = `${Math.max(8, b.top - 6 - Math.min(p.scrollHeight, above))}px`;
    } else {
      p.style.maxHeight = `${Math.max(160, below)}px`;
      p.style.top = `${b.bottom + 6}px`;
    }
  };
  const items = () => [
    ...(pop.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ??
      []),
  ];
  const pick = (fn: () => void) => {
    pop.current?.hidePopover?.();
    fn();
    btn.current?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const all = items();
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    const to =
      e.key === 'ArrowDown'
        ? i + 1
        : e.key === 'ArrowUp'
          ? i - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? all.length - 1
              : null;
    if (to == null || !all.length) return;
    e.preventDefault();
    all[(to + all.length) % all.length]?.focus();
  };

  return (
    <>
      <button
        ref={btn}
        id={id}
        type="button"
        className={cn('select-menu-btn', `select-menu-btn--${variant}`, className)}
        popoverTarget={menuId}
        aria-haspopup="menu"
        aria-expanded={false}
        aria-label={ariaLabel}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            pop.current?.showPopover?.();
          }
        }}
      >
        <span className="select-menu-value">{currentLabel}</span>
        <ChevronDown className="select-menu-chevron" size={16} aria-hidden="true" />
      </button>
      <div
        ref={pop}
        id={menuId}
        popover="auto"
        role="menu"
        aria-label={menuLabel ?? ariaLabel}
        aria-labelledby={menuLabel || ariaLabel ? undefined : id}
        className="select-menu"
        tabIndex={-1}
        onKeyDown={onKey}
        onToggle={(e) => {
          const open = (e as unknown as ToggleEvent).newState === 'open';
          btn.current?.setAttribute('aria-expanded', String(open));
          escapeGuard.current?.();
          escapeGuard.current = null;
          if (!open) return;
          // Dentro de un diálogo de Radix, su Escape (escuchado en document) cerraría también el
          // diálogo: se intercepta antes, en window, para cerrar solo el menú.
          const onEscape = (ev: globalThis.KeyboardEvent) => {
            if (ev.key !== 'Escape') return;
            ev.stopPropagation();
            ev.preventDefault();
            pop.current?.hidePopover?.();
            btn.current?.focus();
          };
          window.addEventListener('keydown', onEscape, true);
          escapeGuard.current = () => window.removeEventListener('keydown', onEscape, true);
          place();
          (items().find((el) => el.getAttribute('aria-checked') === 'true') ?? items()[0])?.focus();
        }}
      >
        {options.map((o, i) =>
          'separator' in o ? (
            <hr key={`sep-${i}`} className="select-menu-sep" />
          ) : (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              disabled={o.disabled}
              className="select-menu-item"
              onClick={() => pick(() => o.value !== value && onChange(o.value))}
            >
              <span className="select-menu-check" aria-hidden="true">
                {o.value === value && <Check size={15} strokeWidth={2.5} />}
              </span>
              <span className="select-menu-label">{o.label}</span>
            </button>
          ),
        )}
        {action && (
          <>
            <hr className="select-menu-sep" />
            <button
              type="button"
              role="menuitem"
              disabled={action.disabled}
              className="select-menu-item select-menu-item--action"
              onClick={() => pick(action.onSelect)}
            >
              <span className="select-menu-check" aria-hidden="true">
                {action.icon}
              </span>
              <span className="select-menu-label">{action.label}</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}
