import type { QueryClient } from '@tanstack/react-query';

export async function invalidateStudyData(client: QueryClient, deckId?: string) {
  await client.cancelQueries({ queryKey: ['studyBatch', ...(deckId ? [deckId] : [])] });
  return Promise.all([
    client.invalidateQueries({ queryKey: ['deckStats'] }),
    client.invalidateQueries({ queryKey: ['studyBatch', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['browserNotes', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['noteTags', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['notePage', ...(deckId ? [deckId] : [])] }),
  ]);
}
