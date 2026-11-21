export const AUTH_PATHS = { login: '/login', register: '/registro' } as const;

const isAuthPath = (path: string) =>
  Object.values(AUTH_PATHS).some((p) => path === p || path.startsWith(`${p}?`));

/**
 * Valida el destino de ?next= para no abrir redirecciones a otros dominios: solo rutas
 * internas absolutas ("/algo"), nunca "//host", "/\host" ni URLs con esquema.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/';
  }
  if ([...next].some((c) => c.charCodeAt(0) < 32) || isAuthPath(next)) return '/';
  return next;
}

/** /login con el destino actual como ?next= (sin él si es la portada). */
export function loginPathFor(path: string): string {
  const next = safeNext(path);
  return next === '/' ? AUTH_PATHS.login : `${AUTH_PATHS.login}?next=${encodeURIComponent(next)}`;
}
