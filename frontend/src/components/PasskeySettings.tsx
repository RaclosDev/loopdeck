import { useEffect, useState } from 'react';
import { KeyRound, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import ReauthDialog from './ReauthDialog';
import { passkeysApi, type PasskeySummary, type Reauth } from '../services/api';
import { isPasskeyCancel, passkeysSupported } from '../lib/webauthn';
import { reauthMessage } from '../lib/reauth';

const dateFormat = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Llaves de acceso de la cuenta: entrar con huella, cara o el PIN del dispositivo. */
export default function PasskeySettings() {
  const supported = passkeysSupported();
  const [passkeys, setPasskeys] = useState<PasskeySummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!supported) return;
    passkeysApi
      .list()
      .then(setPasskeys)
      .catch(() => setPasskeys([]));
  }, [supported]);

  if (!supported) return null;

  /** Devuelve el mensaje si no se ha podido confirmar la identidad; `null` si ya no hay nada que pedir. */
  const add = async (proof: Reauth): Promise<string | null> => {
    setBusy(true);
    try {
      const saved = await passkeysApi.addOnThisDevice(proof);
      setPasskeys((list) => [...(list ?? []), saved]);
      toast.success('Llave de acceso añadida. La próxima vez entra con ella.');
    } catch (err) {
      const message = reauthMessage(err);
      if (message) return message;
      if (err instanceof DOMException && err.name === 'InvalidStateError') {
        toast('Este dispositivo ya tiene una llave de acceso de tu cuenta.');
      } else if (!isPasskeyCancel(err)) {
        toast.error('No se ha podido añadir la llave de acceso.');
      }
    } finally {
      setBusy(false);
    }
    return null;
  };

  const remove = async (passkey: PasskeySummary) => {
    setBusy(true);
    try {
      setPasskeys(await passkeysApi.remove(passkey.id));
      toast.success(`Llave «${passkey.name}» borrada.`);
    } catch {
      toast.error('No se ha podido borrar la llave de acceso.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="mt-8 pt-6 border-t border-[var(--border-subtle)]"
      aria-labelledby="passkeys-title"
    >
      <h3 id="passkeys-title" className="font-semibold text-foreground">
        Llaves de acceso
      </h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Entra con tu huella, tu cara o el PIN del dispositivo, sin escribir la contraseña.
      </p>
      {passkeys && passkeys.length > 0 && (
        <ul className="mb-4 flex list-none flex-col gap-2 p-0">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3"
            >
              <KeyRound size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">{passkey.name}</span>
                <span className="block text-xs text-muted-foreground">
                  Añadida el {dateFormat.format(new Date(passkey.createdAt))}
                  {passkey.lastUsedAt &&
                    ` · usada el ${dateFormat.format(new Date(passkey.lastUsedAt))}`}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Borrar la llave ${passkey.name}`}
                title="Borrar"
                disabled={busy}
                onClick={() => void remove(passkey)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => setConfirming(true)}
      >
        <KeyRound size={16} aria-hidden="true" />
        Añadir llave en este dispositivo
      </Button>
      <ReauthDialog
        open={confirming}
        title="Confirma que eres tú"
        description="Para añadir una llave de acceso, vuelve a confirmar tu identidad."
        confirmLabel="Continuar"
        onConfirm={add}
        onClose={() => setConfirming(false)}
      />
    </section>
  );
}
