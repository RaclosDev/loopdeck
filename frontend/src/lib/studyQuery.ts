import { studyApi } from '../services/api';

export const loadStudy = () => import('../pages/Study');

export function studyBatchOptions(deckId: string, account: string | undefined, order: string) {
  return {
    queryKey: ['studyBatch', deckId, account, order],
    queryFn: ({ signal }: { signal: AbortSignal }) => studyApi.getBatch(deckId, order, signal),
    staleTime: 10_000,
    retry: false,
  };
}
