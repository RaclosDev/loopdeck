export function parseNoteFields(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) =>
        typeof value === 'string'
          ? [[key, value]]
          : typeof value === 'number' || typeof value === 'boolean'
            ? [[key, String(value)]]
            : [],
      ),
    );
  } catch {
    return {};
  }
}

export function renderCloze(html: string, ordinal: number, revealed: boolean) {
  const indices = [...html.matchAll(/{{c(\d+)::/g)]
    .map((match) => Number(match[1]))
    .filter((index) => index > 0);
  const target = ordinal > 0 ? ordinal : Math.min(...indices);
  return html.replace(/{{c(\d+)::([\s\S]*?)}}/g, (_match, index: string, content: string) => {
    const [answer, ...hint] = content.split('::');
    if (Number(index) !== target) return answer;
    return revealed
      ? `<span class="cloze-revealed">${answer}</span>`
      : `<span class="cloze">[${hint.join('::') || '…'}]</span>`;
  });
}

/**
 * Las dos caras de una nota como texto (markdown o HTML), sea cual sea su tipo. Las notas
 * cloze solo guardan `text`: el anverso es el texto con el hueco de la tarjeta indicada
 * (`[pista]` o `[…]`) y el reverso, la respuesta o respuestas de ese hueco. Los modos que
 * no son la tarjeta clásica (test, guía, explorar, tutor) las usan en vez de leer `front` y `back`.
 */
export function noteSides(
  note: { noteType: string; fieldsJson: string },
  ordinal = 0,
): { front: string; back: string } {
  const fields = parseNoteFields(note.fieldsJson || '{}');
  if (note.noteType !== 'cloze') return { front: fields.front ?? '', back: fields.back ?? '' };
  const text = fields.text ?? '';
  const indices = [...text.matchAll(/{{c(\d+)::/g)]
    .map((match) => Number(match[1]))
    .filter(Boolean);
  const target = ordinal > 0 ? ordinal : indices.length ? Math.min(...indices) : 0;
  const answers: string[] = [];
  const front = text.replace(
    /{{c(\d+)::([\s\S]*?)}}/g,
    (_match, index: string, content: string) => {
      const [answer, ...hint] = content.split('::');
      if (Number(index) !== target) return answer;
      answers.push(answer);
      return `[${hint.join('::') || '…'}]`;
    },
  );
  return { front, back: answers.join(', ') };
}

const LONG_CARD_TEXT_LENGTH = 300;

/**
 * Una cara es «larga» si lleva bloques de código o tablas, o más texto del que
 * cabe en una tarjeta de vocabulario. Las imágenes no cuentan.
 */
export function isLongCardContent(html: string): boolean {
  if (/<(pre|table)\b/i.test(html)) return true;
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > LONG_CARD_TEXT_LENGTH;
}
