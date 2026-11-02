import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDecks, useDeckStats } from '../hooks/useDecks';
import useStore from '../store/useStore';
import { loadStudy } from '../lib/studyQuery';
import { preparedStudy, prepareStudyGroup } from '../lib/studyPreparation';

export default function StudyPreparation() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { data: decks = [] } = useDecks();
  const { data: stats, isLoading, isError } = useDeckStats(decks.map((deck) => deck.id));
  const order = useStore((state) => state.settings?.studyOrder || 'new_first');
  useEffect(() => {
    if (!user?.id || !stats || isLoading || isError || !decks.length) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const account = user.id;
    const run = async () => {
      if (stopped) return;
      if (document.hidden) {
        timer = setTimeout(run, 30_000);
        return;
      }
      const visible = new Set(
        Array.from(document.querySelectorAll<HTMLElement>('[data-deck-id]'))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.bottom > 0 && rect.top < innerHeight;
          })
          .map((element) => element.dataset.deckId),
      );
      const ids = decks
        .filter((deck) => (stats[deck.id]?.totalCount || 0) > 0)
        .sort(
          (a, b) =>
            Number(visible.has(b.id) || pathname === `/hub/${b.id}`) -
            Number(visible.has(a.id) || pathname === `/hub/${a.id}`),
        )
        .map((deck) => deck.id)
        .filter((id) => !preparedStudy(client, id, account, order));
      if (ids.length) {
        // Failed speculative imports are retried by the normal study route on entry.
        void loadStudy().catch(() => undefined);
        try {
          for (let i = 0; i < ids.length && !stopped && !document.hidden; i += 12) {
            await prepareStudyGroup(client, ids.slice(i, i + 12), account, order);
          }
        } catch {
          // A cancelled or failed warm-up leaves normal study entry available.
        }
      }
      if (!stopped) timer = setTimeout(run, 5_000);
    };
    // Let the collection paint before starting any speculative reads.
    timer = setTimeout(run, 300);
    return () => {
      stopped = true;
      clearTimeout(timer);
      void client.cancelQueries({ queryKey: ['studyPreparation', account] });
    };
  }, [client, user?.id, decks, stats, isLoading, isError, order, pathname]);
  return null;
}
