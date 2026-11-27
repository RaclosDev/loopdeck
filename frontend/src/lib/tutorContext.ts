/** Máximo de caracteres de contexto que acepta el backend (AiController). */
export const MAX_TUTOR_CONTEXT = 50_000;

const TRUNCATED_SUFFIX = '... (contexto truncado)';

/** Recorta el contexto para que, con el aviso de recorte incluido, nunca pase del máximo. */
export function limitTutorContext(context: string): string {
  if (context.length <= MAX_TUTOR_CONTEXT) return context;
  let end = MAX_TUTOR_CONTEXT - TRUNCATED_SUFFIX.length;
  // No cortar un par sustituto por la mitad: dejaría un carácter suelto e inválido.
  const last = context.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end--;
  return context.substring(0, end) + TRUNCATED_SUFFIX;
}
