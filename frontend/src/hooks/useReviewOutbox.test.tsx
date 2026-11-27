import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { studyApi } from '../services/api';
import { queueReview, storedReviews } from '../lib/reviewOutbox';
import { useReviewOutbox } from './useReviewOutbox';

vi.mock('../services/api', () => ({ studyApi: { reviewCard: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn() }) }));

const saved = (requestId: string, account = 'a') =>
  queueReview({
    requestId,
    account,
    deckId: 'deck',
    cardId: `card-${requestId}`,
    body: { rating: 3, timeTakenMs: 1, requestId },
  });
const render = (account: string | undefined) =>
  renderHook(() => useReviewOutbox(account), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    ),
  });
const pause = () => new Promise((resolve) => setTimeout(resolve, 30));

beforeEach(() => {
  vi.resetAllMocks();
  globalThis.indexedDB = new IDBFactory();
});

it('sends at startup the reviews left behind by a previous load', async () => {
  await saved('one');
  await saved('two');
  vi.mocked(studyApi.reviewCard).mockResolvedValue({} as never);
  render('a');
  await waitFor(() => expect(studyApi.reviewCard).toHaveBeenCalledTimes(2));
  await waitFor(async () => expect(await storedReviews('a')).toEqual([]));
});

it('never sends the reviews of another account', async () => {
  await saved('theirs', 'b');
  vi.mocked(studyApi.reviewCard).mockResolvedValue({} as never);
  render('a');
  await pause();
  expect(studyApi.reviewCard).not.toHaveBeenCalled();
  expect(await storedReviews('b')).toHaveLength(1);
});

it('does nothing without an open session', async () => {
  await saved('one');
  render(undefined);
  await pause();
  expect(studyApi.reviewCard).not.toHaveBeenCalled();
});

it('keeps the reviews while offline and sends them when the network returns', async () => {
  await saved('one');
  vi.mocked(studyApi.reviewCard)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({} as never);
  render('a');
  await waitFor(() => expect(studyApi.reviewCard).toHaveBeenCalledTimes(1));
  expect(await storedReviews('a')).toHaveLength(1);
  await act(async () => {
    window.dispatchEvent(new Event('online'));
  });
  await waitFor(() => expect(studyApi.reviewCard).toHaveBeenCalledTimes(2));
  await waitFor(async () => expect(await storedReviews('a')).toEqual([]));
});

it('discards a review the server answers with 409 and warns about it', async () => {
  await saved('stale');
  vi.mocked(studyApi.reviewCard).mockRejectedValue(
    new AxiosError('conflict', 'ERR', undefined, undefined, { status: 409 } as AxiosResponse),
  );
  render('a');
  await waitFor(() => expect(toast).toHaveBeenCalled());
  expect(studyApi.reviewCard).toHaveBeenCalledTimes(1);
  expect(await storedReviews('a')).toEqual([]);
});
