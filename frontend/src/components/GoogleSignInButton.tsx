import { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

/** La «G» de Google con sus colores oficiales, como pide su guía de marca para los botones de acceso. */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const handleSuccess = async ({ credential }: CredentialResponse) => {
    if (!credential) {
      setError('Google no ha devuelto ninguna credencial.');
      return;
    }
    setError('');
    setPending(true);
    try {
      await onCredential(credential);
      setOpen(false);
    } catch {
      setError('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.');
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        setError('');
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2" style={{ paddingInline: '1rem' }}>
          <GoogleLogo />
          Continuar con Google
        </Button>
      </DialogTrigger>
      <DialogContent style={{ padding: '1.5rem' }}>
        <DialogHeader>
          <DialogTitle>Iniciar sesión con Google</DialogTitle>
          <DialogDescription>Elige tu cuenta para continuar.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center" style={{ paddingBlock: '1rem' }} aria-busy={pending}>
          {pending ? (
            <p role="status">Iniciando sesión…</p>
          ) : (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() =>
                setError('Inicio de sesión cancelado o fallido. Puedes volver a intentarlo.')
              }
              theme="outline"
              shape="pill"
              text="continue_with"
              // FedCM: «Continuar como…» con nombre y foto aunque el navegador bloquee cookies de terceros.
              use_fedcm_for_button
            />
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
