import { beforeEach, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { studyApi } from '../services/api';
import { invalidateStudyData } from './queryInvalidation';
import { preparedStudy, prepareStudyGroup, previewKey } from './studyPreparation';
import type { PreparedStudy } from '../types';

vi.mock('../services/api', () => ({ studyApi: { prepare: vi.fn() } }));
const preview: PreparedStudy = {
  batch: {
    items: [],
    counts: { newCount: 0, learningCount: 0, reviewCount: 0, totalCount: 0 },
    hasMore: false,
  },
  validForMs: 60_000,
};
beforeEach(() => vi.resetAllMocks());

it('separates account and order and discards expired or invalidated previews', async () => {
  const client = new QueryClient();
  client.setQueryData(previewKey('deck', 'a', 'mixed'), preview);
  expect(preparedStudy(client, 'deck', 'a', 'mixed')).toEqual(preview);
  expect(preparedStudy(client, 'deck', 'b', 'mixed')).toBeUndefined();
  expect(preparedStudy(client, 'deck', 'a', 'new_first')).toBeUndefined();
  await invalidateStudyData(client, 'deck');
  expect(preparedStudy(client, 'deck', 'a', 'mixed')).toBeUndefined();
  client.setQueryData(previewKey('deck', 'a', 'mixed'), preview, {
    updatedAt: Date.now() - 61_000,
  });
  expect(preparedStudy(client, 'deck', 'a', 'mixed')).toBeUndefined();
});

it('a cancelled group cannot populate previews after an edit', async () => {
  const client = new QueryClient();
  let finish!: (value: Record<string, PreparedStudy>) => void;
  vi.mocked(studyApi.prepare).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const group = prepareStudyGroup(client, ['deck'], 'a', 'new_first').catch(() => 'cancelled');
  await invalidateStudyData(client, 'deck');
  finish({ deck: preview });
  expect(await group).toBe('cancelled');
  expect(preparedStudy(client, 'deck', 'a', 'new_first')).toBeUndefined();
});
