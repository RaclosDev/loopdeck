import { createElement, type CSSProperties, type HTMLAttributes } from 'react';
import { useReveal } from './motion';

interface RevealProps extends Omit<HTMLAttributes<HTMLElement>, 'onLoad'> {
  as?: 'div' | 'section' | 'ol' | 'ul' | 'dl' | 'p' | 'article';
  /** Se anima al cargar en vez de al entrar en pantalla. */
  onLoad?: boolean;
  /** Contenedor de elementos `.ld-reveal`: se animan ellos, en cascada, y no él. */
  group?: boolean;
  style?: CSSProperties;
}

/** Bloque que sube y aparece una sola vez (ver `.ld-reveal` en `landing.css`). */
export default function Reveal({
  as = 'div',
  onLoad = false,
  group = false,
  className = '',
  ...rest
}: RevealProps) {
  const ref = useReveal<HTMLElement>(onLoad);
  return createElement(as, {
    ...rest,
    ref,
    className: group ? className : `ld-reveal ${className}`,
  });
}
