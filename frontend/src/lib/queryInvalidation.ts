import type { QueryClient } from '@tanstack/react-query';

export function invalidateStudyData(client: QueryClient, deckId?: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['deckStats'] }),
    client.invalidateQueries({ queryKey: ['browserNotes', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['noteTags', ...(deckId ? [deckId] : [])] }),
    client.invalidateQueries({ queryKey: ['notePage', ...(deckId ? [deckId] : [])] }),
  ]);
}
