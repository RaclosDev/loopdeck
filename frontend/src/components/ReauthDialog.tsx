import { useEffect, useState, type FormEvent } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useGoogleClientId } from '../context/GoogleClientIdContext';
import type { Reauth } from '../services/api';

/**
 * Pide volver a confirmar la identidad antes de una acción sensible. Sirve la contraseña o, en las
 * cuentas que solo entran con Google, una credencial reciente de Google. La contraseña solo vive
 * en este estado mientras se escribe: se borra al enviarla y al cerrar, y no se guarda ni se anota.
 *
 * `onConfirm` devuelve el mensaje de error que mostrar aquí (y el diálogo sigue abierto) o `null`
 * si ha terminado y se puede cerrar.
 */
export default function ReauthDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (proof: Reauth) => Promise<string | null>;
  onClose: () => void;
}) {
  const googleClientId = useGoogleClientId();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword('');
      setError('');
    }
  }, [open]);

  const submit = async (proof: Reauth) => {
    setBusy(true);
    setError('');
    try {
      const message = await onConfirm(proof);
      if (message) setError(message);
      else onClose();
    } finally {
      setPassword('');
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (password && !busy) void submit({ password });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm my-2">{description}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="reauth-password" className="text-sm text-foreground">
            Contraseña
          </label>
          <Input
            id="reauth-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          {error && (
            <p role="alert" className="text-sm text-[#b91c1c]">
              {error}
            </p>
          )}
          <DialogFooter className="mt-1 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={busy || password === ''}>
              {busy ? 'Un momento…' : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
        {googleClientId && (
          <div className="flex flex-col items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
            <p className="text-sm text-muted-foreground">
              ¿Tu cuenta entra solo con Google? Confírmalo con tu cuenta de Google.
            </p>
            <GoogleOAuthProvider clientId={googleClientId}>
              <GoogleLogin
                onSuccess={({ credential }) => {
                  if (credential) void submit({ googleCredential: credential });
                  else setError('Google no ha devuelto ninguna credencial.');
                }}
                onError={() => setError('Confirmación con Google cancelada o fallida.')}
                theme="outline"
                size="large"
                shape="rectangular"
                text="continue_with"
                width="280"
              />
            </GoogleOAuthProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
