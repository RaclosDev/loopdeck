import { useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

/** Google no pinta su botón a más de 400 px. */
const GOOGLE_MAX_WIDTH = 400;

/**
 * El botón «Continuar con Google» de Google, incrustado al ancho de la tarjeta como en PorrApp y
 * Ascension: un solo clic abre la cuenta, sin diálogo intermedio.
 */
export default function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => Promise<void>;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => setWidth(Math.floor(row.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const handleSuccess = async ({ credential }: CredentialResponse) => {
    if (!credential) {
      setError('Google no ha devuelto ninguna credencial.');
      return;
    }
    setError('');
    setPending(true);
    try {
      await onCredential(credential);
    } catch {
      setError('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.');
    } finally {
      setPending(false);
    }
  };

  const googleWidth = Math.min(GOOGLE_MAX_WIDTH, width);

  return (
    <div ref={rowRef} className="flex w-full flex-col items-center gap-2" aria-busy={pending}>
      <div className="flex h-10 w-full min-w-0 justify-center overflow-hidden">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() =>
            setError('Inicio de sesión cancelado o fallido. Puedes volver a intentarlo.')
          }
          theme="outline"
          size="large"
          shape="rectangular"
          text="continue_with"
          width={googleWidth > 0 ? String(googleWidth) : undefined}
          // FedCM: «Continuar como…» con nombre y foto aunque el navegador bloquee cookies de terceros.
          use_fedcm_for_button
        />
      </div>
      {pending && (
        <p role="status" className="text-sm">
          Iniciando sesión…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-[#b91c1c]">
          {error}
        </p>
      )}
    </div>
  );
}
