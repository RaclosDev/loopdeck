import { studyBatchOptions } from '../lib/studyQuery';
import { invalidateStudyData } from '../lib/queryInvalidation';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { studyApi } from '../services/api';
import { useStudySession } from './useStudySession';
import type { DueCardDto, StudyBatch } from '../types';

vi.mock('../services/api', () => ({
  studyApi: { getBatch: vi.fn(), reviewCard: vi.fn(), restoreCard: vi.fn() },
}));
const pair = { card: { id: 'one', state: 'new' }, note: { id: 'note' } } as DueCardDto;
const batch = (items = [pair]): StudyBatch => ({
  items,
  counts: { newCount: items.length, learningCount: 0, reviewCount: 0, totalCount: items.length },
  hasMore: false,
});
function session(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return renderHook(() => useStudySession('deck', 'new_first'), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
beforeEach(() => vi.resetAllMocks());

it('keeps a failed review visible and retries the exact action only once', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValueOnce(batch()).mockResolvedValue(batch([]));
  vi.mocked(studyApi.reviewCard)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ card: pair.card, reviewId: 'action' });
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  expect(result.current.queue).toHaveLength(1);
  expect(result.current.sessionStats.reviewed).toBe(0);
  expect(result.current.saveError).toBe(true);
  await act(() => result.current.handleRate(0));
  expect(studyApi.reviewCard).toHaveBeenNthCalledWith(
    2,
    'one',
    vi.mocked(studyApi.reviewCard).mock.calls[0][1],
  );
  expect(result.current.sessionStats.reviewed).toBe(1);
  expect(result.current.isComplete).toBe(true);
});

it('blocks duplicate clicks and never advances until the server confirms', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValueOnce(batch()).mockResolvedValue(batch([]));
  let confirm!: (value: { card: DueCardDto['card']; reviewId: string }) => void;
  vi.mocked(studyApi.reviewCard).mockReturnValue(
    new Promise((resolve) => {
      confirm = resolve;
    }),
  );
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  let request!: Promise<void>;
  act(() => {
    request = result.current.handleRate(4);
    void result.current.handleRate(4);
  });
  expect(studyApi.reviewCard).toHaveBeenCalledTimes(1);
  expect(result.current.queue).toHaveLength(1);
  await act(async () => {
    confirm({ card: pair.card, reviewId: 'action' });
    await request;
  });
  expect(result.current.sessionStats.reviewed).toBe(1);
});

it('retries a failed next block without submitting the confirmed review again', async () => {
  vi.mocked(studyApi.getBatch)
    .mockResolvedValueOnce(batch())
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(batch([{ ...pair, card: { ...pair.card, id: 'next' } }]));
  vi.mocked(studyApi.reviewCard).mockResolvedValue({ card: pair.card, reviewId: 'action' });
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  expect(result.current.loadError).toBe(true);
  await act(() => result.current.loadNext());
  expect(result.current.queue[0].card.id).toBe('next');
  expect(result.current.sessionStats.reviewed).toBe(1);
  expect(studyApi.reviewCard).toHaveBeenCalledTimes(1);
});

it('undo uses the server action and deduplicates a card already returned by the next block', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValue(batch());
  vi.mocked(studyApi.reviewCard).mockResolvedValue({ card: pair.card, reviewId: 'action' });
  vi.mocked(studyApi.restoreCard).mockResolvedValue({ card: pair.card, alreadyUndone: false });
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  await act(() => result.current.handleUndo());
  expect(studyApi.restoreCard).toHaveBeenCalledWith('one', pair.card, 'action');
  expect(result.current.queue).toHaveLength(1);
  expect(result.current.counts.new).toBe(1);
  expect(result.current.sessionStats).toMatchObject({ reviewed: 0, correct: 0 });
});

it('reloads authoritative due cards after a replayed undo instead of enqueueing a future card', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValueOnce(batch()).mockResolvedValue(batch([]));
  vi.mocked(studyApi.reviewCard).mockResolvedValue({ card: pair.card, reviewId: 'action' });
  vi.mocked(studyApi.restoreCard).mockResolvedValue({
    card: { ...pair.card, state: 'review', due: '2099-01-01' },
    alreadyUndone: true,
  });
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(4));
  await act(() => result.current.handleUndo());
  expect(result.current.queue).toHaveLength(0);
  expect(result.current.counts.new).toBe(0);
  expect(result.current.isFlipped).toBe(false);
});

it('returns to the restored card first even when a mixed batch omits it', async () => {
  const other = { ...pair, card: { ...pair.card, id: 'other' } };
  vi.mocked(studyApi.getBatch)
    .mockResolvedValueOnce(batch())
    .mockResolvedValueOnce(batch([other]))
    .mockResolvedValue({
      ...batch([other]),
      counts: { ...batch().counts, newCount: 2, totalCount: 2 },
    });
  vi.mocked(studyApi.reviewCard).mockResolvedValue({ card: pair.card, reviewId: 'action' });
  vi.mocked(studyApi.restoreCard).mockResolvedValue({ card: pair.card, alreadyUndone: false });
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  await act(() => result.current.handleUndo());
  expect(result.current.queue.map((item) => item.card.id)).toEqual(['one', 'other']);
  expect(result.current.counts.new).toBe(2);
});

it('consumes a recent prepared batch once and still refreshes the next block', async () => {
  const client = new QueryClient();
  client.setQueryData(['studyBatch', 'deck', undefined, 'new_first'], batch());
  vi.mocked(studyApi.getBatch).mockResolvedValue(batch([]));
  vi.mocked(studyApi.reviewCard).mockResolvedValue({ card: pair.card, reviewId: 'action' });
  const { result } = session(client);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(studyApi.getBatch).not.toHaveBeenCalled();
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(4));
  expect(studyApi.getBatch).toHaveBeenCalledTimes(1);
  expect(result.current.isComplete).toBe(true);
});

it('does not reuse an expired prepared batch', async () => {
  const client = new QueryClient();
  client.setQueryData(['studyBatch', 'deck', undefined, 'new_first'], batch(), {
    updatedAt: Date.now() - 11_000,
  });
  vi.mocked(studyApi.getBatch).mockResolvedValue(batch([]));
  const { result } = session(client);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(studyApi.getBatch).toHaveBeenCalledTimes(1);
  expect(result.current.queue).toHaveLength(0);
});

it('discards prepared notes after an edit invalidates the deck data', async () => {
  const client = new QueryClient();
  client.setQueryData(['studyBatch', 'deck', undefined, 'new_first'], batch());
  await invalidateStudyData(client, 'deck');
  vi.mocked(studyApi.getBatch).mockResolvedValue(batch([]));
  const { result } = session(client);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(studyApi.getBatch).toHaveBeenCalledTimes(1);
  expect(result.current.queue).toHaveLength(0);
});

it('cancels an in-flight preparation before edits invalidate its data', async () => {
  const client = new QueryClient();
  let resolve!: (value: StudyBatch) => void;
  vi.mocked(studyApi.getBatch)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    )
    .mockResolvedValue(batch([]));
  const preparing = client.prefetchQuery(studyBatchOptions('deck', undefined, 'new_first'));
  await waitFor(() => expect(studyApi.getBatch).toHaveBeenCalledTimes(1));
  await invalidateStudyData(client, 'deck');
  resolve(batch());
  await preparing;
  const { result } = session(client);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(studyApi.getBatch).toHaveBeenCalledTimes(2);
  expect(result.current.queue).toHaveLength(0);
});
