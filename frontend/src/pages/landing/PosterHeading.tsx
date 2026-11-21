import { Fragment } from 'react';
import { motionStyle, useReveal } from './motion';

/** Cada palabra sube desde debajo de su renglón, una detrás de otra. */
const wordStyle = (index: number, base: number) =>
  motionStyle({
    '--from-y': '0.9em',
    '--dur': '0.6s',
    '--step': '60ms',
    '--base': `${base}ms`,
    '--i': index,
  });

/**
 * Titular de cartel que se escribe palabra a palabra; `marked` va al final, en el color de tinta
 * de acento. `lines` parte el texto en renglones propios (p. ej. «Apréndelo.» / «Repásalo.»).
 */
export default function PosterHeading({
  lines,
  marked,
  as: Tag = 'h2',
  id,
  className = '',
  onLoad = false,
  base = 0,
}: {
  lines: string[];
  marked?: string;
  as?: 'h1' | 'h2';
  id?: string;
  className?: string;
  onLoad?: boolean;
  base?: number;
}) {
  const ref = useReveal<HTMLDivElement>(onLoad);
  const label = [...lines, marked].filter(Boolean).join(' ');
  let index = 0;
  const word = (text: string, extra = '') => (
    <span className="ld-word" key={`${text}-${index}`}>
      <span className={`ld-reveal ${extra}`} style={wordStyle(index++, base)}>
        {text}
      </span>
    </span>
  );
  return (
    <div ref={ref}>
      <Tag id={id} className={className} aria-label={label}>
        <span aria-hidden="true">
          {lines.map((line, l) => (
            <Fragment key={line}>
              {l > 0 && (
                <>
                  {' '}
                  <br />
                </>
              )}
              {line.split(' ').map((w, i) => (
                <Fragment key={i}>
                  {i > 0 && ' '}
                  {word(w)}
                </Fragment>
              ))}
            </Fragment>
          ))}
          {marked && (
            <>
              {' '}
              <br />
              {marked.split(' ').map((w, i) => (
                <Fragment key={`m${i}`}>
                  {i > 0 && ' '}
                  {word(w, 'fam-mark')}
                </Fragment>
              ))}
            </>
          )}
        </span>
      </Tag>
    </div>
  );
}
