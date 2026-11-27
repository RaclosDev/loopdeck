import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { studyApi } from '../services/api';
import { queueReview, storedReviews } from '../lib/reviewOutbox';
import { useStudySession } from './useStudySession';
import type { DueCardDto, StudyBatch } from '../types';

vi.mock('../services/api', () => ({
  studyApi: { getBatch: vi.fn(), reviewCard: vi.fn(), restoreCard: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn() }) }));

const pair = { card: { id: 'one', state: 'new' }, note: { id: 'note' } } as DueCardDto;
const batch = (items = [pair]): StudyBatch => ({
  items,
  counts: { newCount: items.length, learningCount: 0, reviewCount: 0, totalCount: items.length },
  hasMore: false,
});
const httpError = (status: number) =>
  new AxiosError('fail', 'ERR', undefined, undefined, { status } as AxiosResponse);

function session() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useStudySession('deck', 'new_first', 'account-a'), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  globalThis.indexedDB = new IDBFactory();
});

it('stores the review before sending it and removes it once the server confirms', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValueOnce(batch()).mockResolvedValue(batch([]));
  vi.mocked(studyApi.reviewCard).mockImplementation(async () => {
    expect(await storedReviews('account-a')).toHaveLength(1);
    return { card: pair.card, reviewId: 'ok' };
  });
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  expect(studyApi.reviewCard).toHaveBeenCalledTimes(1);
  expect(await storedReviews('account-a')).toEqual([]);
});

it('keeps the review stored when the network fails so a reload can still send it', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValueOnce(batch()).mockResolvedValue(batch([]));
  vi.mocked(studyApi.reviewCard).mockRejectedValue(new Error('offline'));
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  expect(result.current.saveError).toBe(true);
  const [stored] = await storedReviews('account-a');
  expect(stored).toMatchObject({ cardId: 'one', deckId: 'deck', account: 'account-a' });
});

it('discards a review the server answers with 409 and does not keep it stored', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValueOnce(batch()).mockResolvedValue(batch([]));
  vi.mocked(studyApi.reviewCard).mockRejectedValue(httpError(409));
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  expect(result.current.saveError).toBe(false);
  expect(await storedReviews('account-a')).toEqual([]);
  expect(toast).toHaveBeenCalled();
});

it('discards a review the server rejects permanently instead of retrying it forever', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValueOnce(batch()).mockResolvedValue(batch([]));
  vi.mocked(studyApi.reviewCard).mockRejectedValue(httpError(404));
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  expect(result.current.saveError).toBe(false);
  expect(studyApi.reviewCard).toHaveBeenCalledTimes(1);
  expect(await storedReviews('account-a')).toEqual([]);
  expect(toast).toHaveBeenCalledWith(expect.stringContaining('descartado'));
});

it('does not show again a card whose review is still waiting in the outbox', async () => {
  const second = { ...pair, card: { ...pair.card, id: 'two' } };
  await queueReview({
    requestId: 'pending',
    account: 'account-a',
    deckId: 'deck',
    cardId: 'one',
    body: { rating: 3, timeTakenMs: 1, requestId: 'pending' },
  });
  vi.mocked(studyApi.getBatch).mockResolvedValue(batch([pair, second]));
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.queue.map((item) => item.card.id)).toEqual(['two']);
});

it('retries the pending save when the network comes back', async () => {
  vi.mocked(studyApi.getBatch).mockResolvedValueOnce(batch()).mockResolvedValue(batch([]));
  vi.mocked(studyApi.reviewCard)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ card: pair.card, reviewId: 'ok' });
  const { result } = session();
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.handleFlip());
  await act(() => result.current.handleRate(3));
  expect(result.current.saveError).toBe(true);
  await act(async () => {
    window.dispatchEvent(new Event('online'));
  });
  await waitFor(() => expect(studyApi.reviewCard).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.saveError).toBe(false));
  expect(await storedReviews('account-a')).toEqual([]);
});
