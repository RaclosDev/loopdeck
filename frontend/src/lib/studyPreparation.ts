import type { QueryClient } from '@tanstack/react-query';
import { studyApi } from '../services/api';
import type { PreparedStudy } from '../types';

export const previewKey = (deck: string, account: string | undefined, order: string) => [
  'studyPreview',
  deck,
  account,
  order,
];

export function preparedStudy(
  client: QueryClient,
  deck: string,
  account: string | undefined,
  order: string,
) {
  const state = client.getQueryState<PreparedStudy>(previewKey(deck, account, order));
  return state?.data &&
    !state.isInvalidated &&
    Date.now() - state.dataUpdatedAt < state.data.validForMs
    ? state.data
    : undefined;
}

export async function prepareStudyGroup(
  client: QueryClient,
  decks: string[],
  account: string,
  order: string,
) {
  const requestedAt = Date.now();
  const result = await client.fetchQuery({
    queryKey: ['studyPreparation', account, order, decks],
    queryFn: ({ signal }) => studyApi.prepare(decks, order, signal),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  for (const deck of decks) {
    const preview = result[deck];
    if (preview)
      client.setQueryData(previewKey(deck, account, order), preview, { updatedAt: requestedAt });
  }
}
