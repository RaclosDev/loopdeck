import type { QueryClient } from '@tanstack/react-query';

export async function invalidateStudyData(client: QueryClient, deckId?: string) {
  await Promise.all([
    client.cancelQueries({ queryKey: ['studyBatch', ...(deckId ? [deckId] : [])] }),
    client.cancelQueries({ queryKey: ['studyPreparation'] }),
  ]);
  return Promise.all([
    client.invalidateQueries({ queryKey: ['deckStats'] }),
    client.invalidateQueries({ queryKey: ['studyPreview', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['studyBatch', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['browserNotes', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['noteTags', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['notePage', ...(deckId ? [deckId] : [])] }),
  ]);
}
