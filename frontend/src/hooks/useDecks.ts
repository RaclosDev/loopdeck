import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { decksApi } from '../services/api';
import { Deck } from '../types';

export function useDecks() {
  const { user } = useAuth();
  return useQuery<Deck[], Error>({
    queryKey: ['decks', user?.id],
    queryFn: async () => {
      const data = await decksApi.getAll();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeckStats(deckIds: string[]) {
  const { user } = useAuth();
  // The endpoint returns all deck statistics in a single request.
  const enabled = deckIds.length > 0;
  return useQuery({
    queryKey: ['deckStats', user?.id],
    enabled,
    queryFn: async () => {
      const data = await decksApi.getStats();
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateDeck() {
  const { user } = useAuth();
  const decksKey = ['decks', user?.id];
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newDeck: { name: string; description?: string }) => decksApi.create(newDeck),
    onMutate: async (newDeck) => {
      await queryClient.cancelQueries({ queryKey: decksKey });
      const previousDecks = queryClient.getQueryData<Deck[]>(decksKey);

      if (previousDecks) {
        queryClient.setQueryData<Deck[]>(decksKey, [
          ...previousDecks,
          {
            ...newDeck,
            id: 'temp-' + Date.now(),
            userId: 'temp',
            createdAt: new Date().toISOString(),
          } as Deck,
        ]);
      }

      return { previousDecks };
    },
    onError: (err, newDeck, context) => {
      if (context?.previousDecks) {
        queryClient.setQueryData(decksKey, context.previousDecks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: decksKey });
      queryClient.invalidateQueries({ queryKey: ['deckStats'] });
    },
  });
}

export function useDeleteDeck() {
  const { user } = useAuth();
  const decksKey = ['decks', user?.id];
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => decksApi.delete(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: decksKey });
      const previousDecks = queryClient.getQueryData<Deck[]>(decksKey);

      if (previousDecks) {
        queryClient.setQueryData<Deck[]>(
          decksKey,
          previousDecks.filter((d) => d.id !== id),
        );
      }

      return { previousDecks };
    },
    onError: (err, id, context) => {
      if (context?.previousDecks) {
        queryClient.setQueryData(decksKey, context.previousDecks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: decksKey });
      queryClient.invalidateQueries({ queryKey: ['deckStats'] });
    },
  });
}

export function useUpdateDeck() {
  const { user } = useAuth();
  const decksKey = ['decks', user?.id];
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      decksApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: decksKey });
      const previousDecks = queryClient.getQueryData<Deck[]>(decksKey);

      if (previousDecks) {
        queryClient.setQueryData<Deck[]>(
          decksKey,
          previousDecks.map((d) => (d.id === id ? { ...d, ...data } : d)),
        );
      }

      return { previousDecks };
    },
    onError: (err, variables, context) => {
      if (context?.previousDecks) {
        queryClient.setQueryData(decksKey, context.previousDecks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: decksKey });
    },
  });
}
