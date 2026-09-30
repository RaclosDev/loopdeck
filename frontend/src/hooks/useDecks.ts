import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { decksApi } from '../services/api';
import { Deck } from '../types';

export function useDecks() {
  return useQuery<Deck[], Error>({
    queryKey: ['decks'],
    queryFn: async () => {
      const data = await decksApi.getAll();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeckStats(deckIds: string[]) {
  return useQuery({
    queryKey: ['deckStats'],
    queryFn: async () => {
      const data = await decksApi.getStats();
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newDeck: { name: string; description?: string }) => decksApi.create(newDeck),
    onMutate: async (newDeck) => {
      await queryClient.cancelQueries({ queryKey: ['decks'] });
      const previousDecks = queryClient.getQueryData<Deck[]>(['decks']);
      
      if (previousDecks) {
        queryClient.setQueryData<Deck[]>(['decks'], [...previousDecks, { ...newDeck, id: 'temp-' + Date.now(), userId: 'temp', createdAt: new Date().toISOString() } as Deck]);
      }
      
      return { previousDecks };
    },
    onError: (err, newDeck, context) => {
      if (context?.previousDecks) {
        queryClient.setQueryData(['decks'], context.previousDecks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => decksApi.delete(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['decks'] });
      const previousDecks = queryClient.getQueryData<Deck[]>(['decks']);
      
      if (previousDecks) {
        queryClient.setQueryData<Deck[]>(['decks'], previousDecks.filter(d => d.id !== id));
      }
      
      return { previousDecks };
    },
    onError: (err, id, context) => {
      if (context?.previousDecks) {
        queryClient.setQueryData(['decks'], context.previousDecks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      queryClient.invalidateQueries({ queryKey: ['deckStats'] });
    },
  });
}

export function useUpdateDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) => decksApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['decks'] });
      const previousDecks = queryClient.getQueryData<Deck[]>(['decks']);
      
      if (previousDecks) {
        queryClient.setQueryData<Deck[]>(['decks'], previousDecks.map(d => d.id === id ? { ...d, ...data } : d));
      }
      
      return { previousDecks };
    },
    onError: (err, variables, context) => {
      if (context?.previousDecks) {
        queryClient.setQueryData(['decks'], context.previousDecks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}
