import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';
import { useCreateDeck, useDeleteDeck, useUpdateDeck } from '../hooks/useDecks';

vi.mock('../hooks/useDecks', () => ({
  useDecks: () => ({
    data: [{ id: 'deck', name: 'Historia' }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useDeckStats: () => ({
    data: { deck: { newCount: 0, learningCount: 0, reviewCount: 0, totalCount: 3 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateDeck: vi.fn(),
  useDeleteDeck: vi.fn(),
  useUpdateDeck: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

type Resolver = () => void;
let release: Resolver;
const slowMutation = () => {
  const mutateAsync = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  return { mutateAsync, isPending: false } as never;
};

let create: ReturnType<typeof slowMutation>;
let remove: ReturnType<typeof slowMutation>;
let update: ReturnType<typeof slowMutation>;

beforeEach(() => {
  vi.resetAllMocks();
  create = slowMutation();
  remove = slowMutation();
  update = slowMutation();
  vi.mocked(useCreateDeck).mockReturnValue(create);
  vi.mocked(useDeleteDeck).mockReturnValue(remove);
  vi.mocked(useUpdateDeck).mockReturnValue(update);
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
});

const calls = (mutation: unknown) =>
  (mutation as { mutateAsync: ReturnType<typeof vi.fn> }).mutateAsync.mock.calls.length;

describe('deck actions pressed twice', () => {
  it('creates the deck once when the button is clicked twice', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Crear un mazo' }));
    fireEvent.change(await screen.findByPlaceholderText('Nombre del mazo...'), {
      target: { value: 'Química' },
    });
    const button = screen.getByRole('button', { name: 'Crear' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(calls(create)).toBe(1);
    await act(async () => release());
  });

  it('creates the deck once when Enter is repeated', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Crear un mazo' }));
    const input = await screen.findByPlaceholderText('Nombre del mazo...');
    fireEvent.change(input, { target: { value: 'Química' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(calls(create)).toBe(1);
    await act(async () => release());
  });

  it('can create another deck after the first one has finished', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Crear un mazo' }));
    fireEvent.change(await screen.findByPlaceholderText('Nombre del mazo...'), {
      target: { value: 'Química' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await act(async () => release());
    fireEvent.click(screen.getByRole('button', { name: 'Crear un mazo' }));
    fireEvent.change(await screen.findByPlaceholderText('Nombre del mazo...'), {
      target: { value: 'Física' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(calls(create)).toBe(2);
    await act(async () => release());
  });

  it('deletes the deck once when the confirmation is clicked twice', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Opciones del mazo Historia' }));
    fireEvent.click(await screen.findByText('Eliminar mazo'));
    const button = await screen.findByRole('button', { name: 'Eliminar' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(calls(remove)).toBe(1);
    await act(async () => release());
  });

  it('renames the deck once when the save is clicked twice', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Opciones del mazo Historia' }));
    fireEvent.click(await screen.findByText('Editar nombre'));
    fireEvent.change(await screen.findByLabelText('Nombre del mazo'), {
      target: { value: 'Historia universal' },
    });
    const button = screen.getByRole('button', { name: 'Guardar' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(calls(update)).toBe(1);
    await act(async () => release());
  });
});
