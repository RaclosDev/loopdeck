import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notesApi } from '../services/api';
import { lookupDefinition } from '../utils/definitionService';
import AddCard from './AddCard';

vi.mock('../services/api', () => ({
  notesApi: { create: vi.fn() },
  aiApi: { massDefine: vi.fn() },
}));
vi.mock('../utils/definitionService', () => ({ lookupDefinition: vi.fn() }));
vi.mock('../hooks/useDecks', () => ({
  useDecks: () => ({
    data: [{ id: 'deck', name: 'Historia' }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('../lib/queryInvalidation', () => ({ invalidateStudyData: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

function open() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/add/deck']}>
        <Routes>
          <Route path="/add/:deckId" element={<AddCard />} />
          <Route path="/" element={<p>Inicio</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const side = (name: 'Frente' | 'Dorso') =>
  screen.getByRole('textbox', { name: `${name} de la tarjeta`, hidden: true });
function type(name: 'Frente' | 'Dorso', html: string) {
  const editor = side(name);
  editor.innerHTML = html;
  fireEvent.input(editor);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('saving twice from the keyboard', () => {
  it('creates a single note when Ctrl+Enter is pressed twice before the server answers', async () => {
    let finish: () => void = () => undefined;
    vi.mocked(notesApi.create).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({} as never);
        }),
    );
    open();
    type('Frente', 'Término');
    type('Dorso', 'Significado');
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(notesApi.create).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    await waitFor(() => expect(side('Frente').innerHTML).toBe(''));
  });

  it('allows saving the next note once the first one has finished', async () => {
    vi.mocked(notesApi.create).mockResolvedValue({} as never);
    open();
    type('Frente', 'Uno');
    type('Dorso', 'A');
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(side('Frente').innerHTML).toBe(''));
    type('Frente', 'Dos');
    type('Dorso', 'B');
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(notesApi.create).toHaveBeenCalledTimes(2));
  });
});

describe('switching between one by one and bulk mode', () => {
  it('shows again what was typed instead of keeping it hidden', () => {
    open();
    type('Frente', 'Término');
    type('Dorso', 'Significado');
    fireEvent.click(screen.getByRole('button', { name: 'En masa' }));
    expect(screen.queryByRole('textbox', { name: 'Frente de la tarjeta' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Una a una' }));
    expect(side('Frente').innerHTML).toBe('Término');
    expect(side('Dorso').innerHTML).toBe('Significado');
  });

  it('saves exactly what the editors show after coming back', async () => {
    vi.mocked(notesApi.create).mockResolvedValue({} as never);
    open();
    type('Frente', 'Término');
    type('Dorso', 'Significado');
    fireEvent.click(screen.getByRole('button', { name: 'En masa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Una a una' }));
    fireEvent.click(screen.getByRole('button', { name: /^Añadir\s*Ctrl/ }));
    await waitFor(() => expect(notesApi.create).toHaveBeenCalled());
    expect(JSON.parse(vi.mocked(notesApi.create).mock.calls[0][0].fieldsJson)).toEqual({
      front: 'Término',
      back: 'Significado',
    });
  });
});

describe('looking up a definition', () => {
  beforeEach(() => {
    vi.mocked(lookupDefinition).mockResolvedValue({ definition: 'Un animal doméstico' } as never);
  });

  it('asks before replacing a back that already has content, and keeps it if refused', async () => {
    open();
    type('Frente', 'gato');
    type('Dorso', 'Mi propia respuesta');
    fireEvent.click(screen.getByRole('button', { name: /Def\. IA/ }));
    expect(await screen.findByText('¿Sustituir el dorso?')).toBeTruthy();
    expect(side('Dorso').innerHTML).toBe('Mi propia respuesta');
    fireEvent.click(screen.getByRole('button', { name: 'Conservar lo escrito' }));
    await waitFor(() => expect(screen.queryByText('¿Sustituir el dorso?')).toBeNull());
    expect(side('Frente').innerHTML).toBe('gato');
    expect(side('Dorso').innerHTML).toBe('Mi propia respuesta');
  });

  it('replaces the content when the user accepts', async () => {
    open();
    type('Frente', 'gato');
    type('Dorso', 'Mi propia respuesta');
    fireEvent.click(screen.getByRole('button', { name: /Def\. IA/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sustituir' }));
    await waitFor(() => expect(side('Frente').textContent).toBe('Un animal doméstico'));
    expect(side('Dorso').textContent).toBe('GATO');
  });

  it('fills the sides without asking when the back is empty', async () => {
    open();
    type('Frente', 'gato');
    fireEvent.click(screen.getByRole('button', { name: /Def\. IA/ }));
    await waitFor(() => expect(side('Frente').textContent).toBe('Un animal doméstico'));
    expect(screen.queryByText('¿Sustituir el dorso?')).toBeNull();
    expect(side('Dorso').textContent).toBe('GATO');
  });
});
