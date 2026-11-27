import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  classifyReviewError,
  clearReviewOutbox,
  dropReview,
  purgeReviewsExcept,
  queueReview,
  replayReviews,
  storedReviews,
  whileSending,
} from './reviewOutbox';
import { adoptAccount } from './offlineCache';

const review = (requestId: string, account = 'a', cardId = `card-${requestId}`) => ({
  requestId,
  account,
  deckId: 'deck',
  cardId,
  body: { rating: 3, timeTakenMs: 1000, requestId },
});
const failure = (status?: number) =>
  Object.assign(new Error('fail'), status ? { response: { status } } : {});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

describe('persistent review queue', () => {
  it('keeps reviews per account, in the order they were made, across a reload', async () => {
    await queueReview(review('r2'));
    await queueReview(review('r1'));
    await queueReview(review('other', 'b'));
    vi.resetModules();
    const reloaded = await import('./reviewOutbox');
    expect((await reloaded.storedReviews('a')).map((item) => item.requestId)).toEqual(['r2', 'r1']);
    expect((await reloaded.storedReviews('b')).map((item) => item.requestId)).toEqual(['other']);
  });

  it('drops one review, purges every other account and clears everything', async () => {
    await queueReview(review('one'));
    await queueReview(review('two'));
    await queueReview(review('three', 'b'));
    await dropReview('one');
    expect((await storedReviews('a')).map((item) => item.requestId)).toEqual(['two']);
    await purgeReviewsExcept('a');
    expect(await storedReviews('b')).toEqual([]);
    expect(await storedReviews('a')).toHaveLength(1);
    await clearReviewOutbox();
    expect(await storedReviews('a')).toEqual([]);
  });

  it('empties the queue of another account when this browser adopts a different one', async () => {
    await queueReview(review('mine', 'a'));
    await queueReview(review('theirs', 'b'));
    await adoptAccount('a');
    expect(await storedReviews('b')).toEqual([]);
    expect(await storedReviews('a')).toHaveLength(1);
  });

  it('never breaks the study session when IndexedDB is unavailable', async () => {
    // @ts-expect-error simula un navegador sin IndexedDB
    globalThis.indexedDB = undefined;
    await expect(queueReview(review('x'))).resolves.toBeUndefined();
    expect(await storedReviews('a')).toEqual([]);
    await expect(replayReviews('a', vi.fn())).resolves.toMatchObject({ sent: 0, failed: false });
  });
});

describe('classifyReviewError', () => {
  it('tells permanent rejections from recoverable failures', () => {
    expect(classifyReviewError(failure(409))).toBe('conflict');
    for (const status of [400, 403, 404, 410, 422]) {
      expect(classifyReviewError(failure(status))).toBe('rejected');
    }
    for (const status of [401, 408, 425, 429, 500, 503, undefined]) {
      expect(classifyReviewError(failure(status))).toBe('retry');
    }
    expect(classifyReviewError(null)).toBe('retry');
  });
});

describe('replayReviews', () => {
  it('sends the stored reviews of the account in order and empties the queue', async () => {
    await queueReview(review('first'));
    await queueReview(review('second'));
    await queueReview(review('foreign', 'b'));
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await replayReviews('a', send);
    expect(send.mock.calls.map(([item]) => item.requestId)).toEqual(['first', 'second']);
    expect(result).toEqual({ sent: 2, conflicts: 0, rejected: 0, failed: false });
    expect(await storedReviews('a')).toEqual([]);
    expect(await storedReviews('b')).toHaveLength(1);
  });

  it('discards a review the server answers with 409 or a permanent 4xx and carries on', async () => {
    await queueReview(review('stale'));
    await queueReview(review('deleted'));
    await queueReview(review('fine'));
    const send = vi
      .fn()
      .mockRejectedValueOnce(failure(409))
      .mockRejectedValueOnce(failure(404))
      .mockResolvedValue(undefined);
    const result = await replayReviews('a', send);
    expect(result).toEqual({ sent: 1, conflicts: 1, rejected: 1, failed: false });
    expect(send).toHaveBeenCalledTimes(3);
    expect(await storedReviews('a')).toEqual([]);
  });

  it('stops at the first recoverable failure and keeps the rest for the next attempt', async () => {
    await queueReview(review('one'));
    await queueReview(review('two'));
    const send = vi.fn().mockRejectedValueOnce(failure()).mockResolvedValue(undefined);
    const result = await replayReviews('a', send);
    expect(result.failed).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await storedReviews('a')).map((item) => item.requestId)).toEqual(['one', 'two']);
    expect(await replayReviews('a', send)).toMatchObject({ sent: 2, failed: false });
  });

  it('skips a review that a study session is sending right now', async () => {
    await queueReview(review('live'));
    await queueReview(review('idle'));
    const send = vi.fn().mockResolvedValue(undefined);
    await whileSending('live', async () => {
      await replayReviews('a', send);
    });
    expect(send.mock.calls.map(([item]) => item.requestId)).toEqual(['idle']);
    expect((await storedReviews('a')).map((item) => item.requestId)).toEqual(['live']);
  });

  it('shares one replay when two start at the same time', async () => {
    await queueReview(review('only'));
    const send = vi.fn().mockResolvedValue(undefined);
    await Promise.all([replayReviews('a', send), replayReviews('a', send)]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
