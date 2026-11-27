import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../context/AuthContext';
import { accountApi } from '../services/api';

const MIN_PASSWORD_LENGTH = 6;

/** Texto para un fallo al cambiar la contraseña, según lo que responde el servidor. */
function changePasswordMessage(err: unknown): string | null {
  if (!isAxiosError(err)) return null;
  switch (err.response?.status) {
    case 403:
      return 'La contraseña actual no es correcta.';
    case 429:
      return 'Demasiados intentos. Espera unos minutos antes de volver a probar.';
    case 409:
      return 'Tu cuenta entra con Google y no tiene contraseña que cambiar.';
    case 400:
      return `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    default:
      return null;
  }
}

/** Contraseña y sesiones de la cuenta: cambiarla y cerrar la sesión en todos los dispositivos. */
export default function AccountSecuritySettings() {
  const { logout, updateToken } = useAuth();
  const [changing, setChanging] = useState(false);
  const [ending, setEnding] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const closePasswordDialog = () => {
    setChanging(false);
    setCurrent('');
    setNext('');
    setRepeat('');
    setError('');
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (next !== repeat) {
      setError('Las dos contraseñas nuevas no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // El servidor cierra las demás sesiones y abre una nueva para este dispositivo.
      updateToken(await accountApi.renewSession(current, next));
      toast.success('Contraseña cambiada. Se ha cerrado la sesión en los demás dispositivos.');
      closePasswordDialog();
    } catch (err) {
      const message = changePasswordMessage(err);
      if (message) setError(message);
      else {
        toast.error('No se ha podido cambiar la contraseña. Inténtalo de nuevo.');
        closePasswordDialog();
      }
    } finally {
      // Las contraseñas no se quedan en el estado una vez enviadas.
      setCurrent('');
      setNext('');
      setRepeat('');
      setBusy(false);
    }
  };

  const logoutEverywhere = async () => {
    setBusy(true);
    try {
      await accountApi.logoutEverywhere();
    } catch {
      toast.error('No se ha podido cerrar las sesiones. Inténtalo de nuevo.');
      setBusy(false);
      return;
    }
    // Las sesiones ya no valen en el servidor; aquí se borra también lo local.
    await logout();
    window.location.href = '/';
  };

  return (
    <section
      className="mt-8 pt-6 border-t border-[var(--border-subtle)]"
      aria-labelledby="security-title"
    >
      <h3 id="security-title" className="font-semibold text-foreground">
        Contraseña y sesiones
      </h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Cambia tu contraseña o cierra la sesión en todos tus dispositivos si has perdido uno.
      </p>
      <div className="flex flex-col gap-3">
        <Button variant="secondary" className="w-full" onClick={() => setChanging(true)}>
          Cambiar contraseña
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => setEnding(true)}>
          Cerrar sesión en todos los dispositivos
        </Button>
      </div>

      <Dialog open={changing} onOpenChange={(open) => !open && !busy && closePasswordDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm my-2">
            Al cambiarla se cierra la sesión en tus otros dispositivos; en este seguirás dentro.
          </p>
          <form onSubmit={changePassword} className="flex flex-col gap-3">
            <label htmlFor="current-password" className="text-sm text-foreground">
              Contraseña actual
            </label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={busy}
            />
            <label htmlFor="new-password" className="text-sm text-foreground">
              Contraseña nueva
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={busy}
            />
            <label htmlFor="repeat-password" className="text-sm text-foreground">
              Repite la contraseña nueva
            </label>
            <Input
              id="repeat-password"
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
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
                onClick={closePasswordDialog}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={busy || current === '' || next === '' || repeat === ''}
              >
                {busy ? 'Un momento…' : 'Cambiar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ending} onOpenChange={(open) => !busy && setEnding(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar sesión en todos los dispositivos</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm my-2">
            Se cerrará tu sesión aquí y en el resto de dispositivos. Un dispositivo ya conectado
            puede tardar hasta 15 minutos en notarlo. Tendrás que volver a entrar.
          </p>
          <DialogFooter className="mt-4 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={() => setEnding(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={busy}
              onClick={() => void logoutEverywhere()}
            >
              {busy ? 'Cerrando…' : 'Cerrar todas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
