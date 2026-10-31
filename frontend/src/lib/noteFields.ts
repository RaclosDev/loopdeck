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
