import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { studyApi } from '../services/api';
import { invalidateStudyData } from '../lib/queryInvalidation';
import type { DueCardDto, ReviewBody, StudyBatch, PreparedStudy } from '../types';
import { studyBatchOptions } from '../lib/studyQuery';
import { preparedStudy, previewKey } from '../lib/studyPreparation';

type UndoAction = { pair: DueCardDto; reviewId: string; rating: number };
type PendingReview = { pair: DueCardDto; body: ReviewBody };

export function useStudySession(deckId: string | undefined, order: string, account?: string) {
  const client = useQueryClient();
  const [queue, setQueueState] = useState<DueCardDto[]>([]);
  const queueRef = useRef<DueCardDto[]>([]);
  const revealed = useRef<string | null>(null);
  const setQueue = useCallback((value: SetStateAction<DueCardDto[]>) => {
    queueRef.current = typeof value === 'function' ? value(queueRef.current) : value;
    setQueueState(queueRef.current);
  }, []);
  const [counts, setCounts] = useState({ new: 0, learning: 0, review: 0 });
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    startTime: Date.now(),
  });
  const busy = useRef(false);
  const pending = useRef<PendingReview[]>([]);
  const restored = useRef<DueCardDto | null>(null);
  const started = useRef(Date.now());
  const generation = useRef(0);
  const writeEpoch = useRef(0);
  const retryOnLeave = useRef<(() => void) | null>(null);
  const initialPreview = useRef<{ key: string; value: PreparedStudy } | null>(null);

  const fillRemaining = useCallback(
    async (version: number, epoch: number) => {
      if (!deckId) return;
      try {
        const batch = await client.fetchQuery({
          ...studyBatchOptions(deckId, account, order),
          staleTime: 0,
        });
        if (version !== generation.current || epoch !== writeEpoch.current || busy.current) return;
        setQueue((items) => {
          const ids = new Set(items.map((item) => item.card.id));
          return [...items, ...batch.items.filter((item) => !ids.has(item.card.id))];
        });
        setCounts({
          new: batch.counts.newCount,
          learning: batch.counts.learningCount,
          review: batch.counts.reviewCount,
        });
      } catch {
        // The two prepared cards remain usable; the normal refill exposes failures when needed.
      }
    },
    [client, deckId, account, order],
  );

  const loadNext = useCallback(
    async (version = generation.current, allowPrepared = false) => {
      if (!deckId) return;
      setLoading(true);
      setLoadError(false);
      try {
        const key = JSON.stringify(previewKey(deckId, account, order));
        if (initialPreview.current?.key !== key) initialPreview.current = null;
        const candidate = allowPrepared
          ? initialPreview.current?.value || preparedStudy(client, deckId, account, order)
          : undefined;
        const preview =
          candidate?.batch.hasMore && !candidate.batch.items.length ? undefined : candidate;
        if (preview) initialPreview.current = { key, value: preview };
        const batch: StudyBatch =
          preview?.batch ??
          (await client.fetchQuery<StudyBatch>({
            ...studyBatchOptions(deckId, account, order),
            staleTime: allowPrepared ? 10_000 : 0,
          }));
        if (version !== generation.current) return;
        if (!batch.items.length && batch.hasMore)
          throw new Error('La cola ha cambiado; vuelve a cargarla');
        if (preview)
          void client.invalidateQueries({
            queryKey: previewKey(deckId, account, order),
            refetchType: 'none',
          });
        void client.invalidateQueries({
          queryKey: ['studyBatch', deckId, account, order],
          refetchType: 'none',
        });
        const items = restored.current
          ? [
              restored.current,
              ...batch.items.filter((item) => item.card.id !== restored.current?.card.id),
            ]
          : batch.items;
        restored.current = null;
        setQueue(items);
        revealed.current = null;
        setIsFlipped(false);
        setCounts({
          new: batch.counts.newCount,
          learning: batch.counts.learningCount,
          review: batch.counts.reviewCount,
        });
        setIsComplete(items.length === 0);
        started.current = Date.now();
        if (preview && batch.hasMore) void fillRemaining(version, writeEpoch.current);
      } catch {
        if (version === generation.current) setLoadError(true);
      } finally {
        if (version === generation.current) setLoading(false);
      }
    },
    [deckId, order, account, client, fillRemaining],
  );

  useEffect(() => {
    const version = ++generation.current;
    pending.current = [];
    revealed.current = null;
    retryOnLeave.current = null;
    restored.current = null;
    writeEpoch.current++;
    busy.current = false;
    setSaving(false);
    setSaveError(false);
    setUndoStack([]);
    setIsFlipped(false);
    setIsComplete(false);
    setSessionStats({ reviewed: 0, correct: 0, startTime: Date.now() });
    void loadNext(version, true);
    return () => {
      generation.current++;
      retryOnLeave.current?.();
    };
  }, [loadNext]);

  const flushReviews = async () => {
    if (busy.current) return;
    const actions = pending.current;
    const version = generation.current;
    busy.current = true;
    setSaving(true);
    setSaveError(false);
    retryOnLeave.current = null;
    try {
      await client.cancelQueries({ queryKey: ['studyBatch', deckId, account, order] });
      while (actions.length) {
        const action = actions[0];
        const result = await studyApi.reviewCard(action.pair.card.id, action.body);
        actions.shift();
        void invalidateStudyData(client, deckId);
        if (version !== generation.current) continue;
        setUndoStack((stack) => [
          ...stack,
          { pair: action.pair, reviewId: result.reviewId, rating: action.body.rating },
        ]);
        setSessionStats((stats) => ({
          ...stats,
          reviewed: stats.reviewed + 1,
          correct: stats.correct + Number(action.body.rating >= 3),
        }));
      }
      if (version === generation.current && !queueRef.current.length) await loadNext(version);
    } catch (error) {
      if (version === generation.current) {
        setSaveError(true);
        retryOnLeave.current = offerRetry;
        if (isAxiosError(error) && error.response && error.response.status < 500)
          toast.error('No se ha podido guardar la respuesta. Reintenta o comprueba la tarjeta.');
      } else {
        offerRetry();
      }
    } finally {
      if (version === generation.current) {
        busy.current = false;
        setSaving(false);
      }
    }
    // The captured outbox must survive leaving the study screen.
    function offerRetry() {
      toast(
        (notification) =>
          createElement(
            'button',
            {
              onClick: () => {
                toast.dismiss(notification.id);
                void retryDetached();
              },
            },
            'Hay repasos sin confirmar. Reintentar guardado',
          ),
        { duration: Infinity },
      );
    }
    async function retryDetached() {
      try {
        while (actions.length) {
          const action = actions[0];
          await studyApi.reviewCard(action.pair.card.id, action.body);
          actions.shift();
          void invalidateStudyData(client, deckId);
        }
      } catch {
        offerRetry();
      }
    }
  };

  const handleRate = (rating: number, customIntervalMinutes?: number) => {
    if (saveError) return flushReviews();
    const pair = queueRef.current[0];
    if (
      loading ||
      loadError ||
      (busy.current && !pending.current.length) ||
      !pair ||
      revealed.current !== pair.card.id
    )
      return Promise.resolve();
    revealed.current = null;
    pending.current.push({
      pair,
      body: {
        rating,
        timeTakenMs: Math.min(2_147_483_647, Date.now() - started.current),
        requestId: crypto.randomUUID(),
        ...(customIntervalMinutes ? { customIntervalMinutes } : {}),
      },
    });
    writeEpoch.current++;
    const state = pair.card.state;
    setCounts((previous) => {
      const key = state === 'new' ? 'new' : state.includes('learn') ? 'learning' : 'review';
      return { ...previous, [key]: Math.max(0, previous[key] - 1) };
    });
    setIsFlipped(false);
    setQueue((items) => items.slice(1));
    started.current = Date.now();
    return flushReviews();
  };

  const handleUndo = async () => {
    const action = undoStack[undoStack.length - 1];
    if (!action || busy.current || pending.current.length) return;
    busy.current = true;
    writeEpoch.current++;
    setLoading(true);
    setSaving(true);
    const version = generation.current;
    try {
      await client.cancelQueries({ queryKey: ['studyBatch', deckId, account, order] });
      if (version !== generation.current) return;
      const result = await studyApi.restoreCard(
        action.pair.card.id,
        action.pair.card,
        action.reviewId,
      );
      void invalidateStudyData(client, deckId);
      if (version !== generation.current) return;
      setUndoStack((stack) => stack.slice(0, -1));
      setSessionStats((stats) => ({
        ...stats,
        reviewed: Math.max(0, stats.reviewed - 1),
        correct: Math.max(0, stats.correct - Number(action.rating >= 3)),
      }));
      setQueue([]);
      restored.current =
        !result.alreadyUndone &&
        !result.card.suspended &&
        !result.card.buried &&
        (result.card.state === 'new' || new Date(result.card.due).getTime() <= Date.now())
          ? { ...action.pair, card: result.card }
          : null;
      setIsComplete(false);
      setLoadError(false);
      setIsFlipped(false);
      started.current = Date.now();
      toast('Deshecho');
      await loadNext(version);
    } catch {
      if (version === generation.current)
        toast.error('No se pudo deshacer. Puedes reintentarlo sin duplicar la acción.');
    } finally {
      if (version === generation.current) {
        busy.current = false;
        setSaving(false);
        setLoading(false);
      }
    }
  };

  return {
    queue,
    counts,
    undoStack,
    loading,
    loadError,
    saving,
    saveError,
    isComplete,
    isFlipped,
    sessionStats,
    loadNext,
    handleRate,
    handleCustomInterval: (minutes: number) => handleRate(3, minutes),
    handleUndo,
    handleFlip: () => {
      if (
        !saveError &&
        !loading &&
        (!busy.current || pending.current.length > 0) &&
        queueRef.current[0]
      ) {
        revealed.current = queueRef.current[0].card.id;
        setIsFlipped(true);
      }
    },
  };
}
