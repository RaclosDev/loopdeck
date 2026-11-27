import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { studyApi } from '../services/api';
import { invalidateStudyData } from '../lib/queryInvalidation';
import { replayReviews } from '../lib/reviewOutbox';

/** Cada cuánto se reintenta mientras queden repasos sin enviar y el navegador diga que hay red. */
const RETRY_MS = 60_000;

/**
 * Envía los repasos que quedaron guardados (recarga, pestaña cerrada o sin conexión) al arrancar y
 * cada vez que vuelve la red. Solo envía los de la cuenta con sesión abierta. Un repaso que el
 * servidor rechaza (409 u otro 4xx permanente) se descarta, igual que en la pantalla de estudio.
 */
export function useReviewOutbox(account: string | undefined) {
  const client = useQueryClient();
  useEffect(() => {
    if (!account) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      clearTimeout(timer);
      const result = await replayReviews(account, async (review) => {
        await studyApi.reviewCard(review.cardId, review.body);
      });
      if (stopped) return;
      if (result.sent || result.conflicts || result.rejected) void invalidateStudyData(client);
      const dropped = result.conflicts + result.rejected;
      if (dropped)
        toast(
          dropped === 1
            ? 'Se ha omitido un repaso guardado que el servidor ya no necesitaba.'
            : `Se han omitido ${dropped} repasos guardados que el servidor ya no necesitaba.`,
        );
      if (result.failed) timer = setTimeout(() => void run(), RETRY_MS);
    };
    const onOnline = () => void run();
    void run();
    window.addEventListener('online', onOnline);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [account, client]);
}
