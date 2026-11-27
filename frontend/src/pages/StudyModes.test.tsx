import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, CanceledError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiApi, decksApi, notesApi } from '../services/api';
import StudyGuide from './StudyGuide';
import StudyExplore from './StudyExplore';
import StudyQuiz from './StudyQuiz';
import StudyChunkedQuiz from './StudyChunkedQuiz';
import StudyTutor from './StudyTutor';
import type { Note } from '../types';

vi.mock('../services/api', () => ({
  decksApi: { getAll: vi.fn() },
  notesApi: { getByDeck: vi.fn() },
  aiApi: { chat: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn() }) }));

const note = (id: string, noteType: string, fields: Record<string, string>): Note => ({
  id,
  userId: 'u',
  deckId: 'deck',
  noteType,
  fieldsJson: JSON.stringify(fields),
  tags: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});
const cloze = note('cloze', 'cloze', {
  text: 'La capital de {{c1::Francia::país}} es {{c2::París}}.',
});
const capital = note('capital', 'cloze', {
  text: '{{c1::Madrid::ciudad}} es la capital de España',
});
const basic = note('basic', 'basic', { front: 'Pregunta básica', back: 'Respuesta básica' });

function open(page: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/study/deck']}>
      <Routes>
        <Route path="/study/:deckId" element={page} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.mocked(decksApi.getAll).mockResolvedValue([{ id: 'deck', name: 'Mazo' }] as never);
});

describe('cloze notes outside the classic study screen', () => {
  it('shows the question with the gap and the answer in the guide', async () => {
    vi.mocked(notesApi.getByDeck).mockResolvedValue([cloze]);
    open(<StudyGuide />);
    expect(await screen.findByText(/La capital de \[país\] es París\./)).toBeTruthy();
    expect(screen.getByText('Francia')).toBeTruthy();
  });

  it('shows the gap on the front of the explore card and the answer on the back', async () => {
    vi.mocked(notesApi.getByDeck).mockResolvedValue([cloze]);
    const { container } = open(<StudyExplore />);
    await waitFor(() => expect(container.textContent).toContain('La capital de [país] es París.'));
    expect(container.textContent).toContain('Francia');
  });

  it('asks the cloze question in the quiz and offers the answers as options', async () => {
    vi.mocked(notesApi.getByDeck).mockResolvedValue([cloze, capital]);
    const { container } = open(<StudyQuiz />);
    await waitFor(() => expect(container.textContent).toMatch(/\[(país|ciudad)\]/));
    expect(container.textContent).toContain('Francia');
    expect(container.textContent).toContain('Madrid');
  });

  it('does the same in the chunked quiz', async () => {
    vi.mocked(notesApi.getByDeck).mockResolvedValue([cloze, capital]);
    const { container } = open(<StudyChunkedQuiz />);
    await waitFor(() => expect(container.textContent).toMatch(/\[(país|ciudad)\]/));
    expect(container.textContent).toContain('Francia');
    expect(container.textContent).toContain('Madrid');
  });

  it('sends the tutor a question and an answer for a cloze note', async () => {
    vi.mocked(notesApi.getByDeck).mockResolvedValue([cloze]);
    vi.mocked(aiApi.chat).mockResolvedValue({ response: 'Vale' });
    open(<StudyTutor />);
    fireEvent.change(await screen.findByLabelText('Pregunta al tutor IA'), {
      target: { value: 'Explícamelo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(aiApi.chat).toHaveBeenCalled());
    const context = vi.mocked(aiApi.chat).mock.calls[0][1];
    expect(context).toContain('Pregunta: La capital de [país] es París.');
    expect(context).toContain('Respuesta: Francia');
  });
});

describe('tutor cancellation', () => {
  it('lets the user cancel a slow reply and aborts the request', async () => {
    vi.mocked(notesApi.getByDeck).mockResolvedValue([basic]);
    let signal: AbortSignal | undefined;
    vi.mocked(aiApi.chat).mockImplementation(
      (_prompt, _context, received) =>
        new Promise((_resolve, reject) => {
          signal = received;
          received?.addEventListener('abort', () => reject(new CanceledError()));
        }),
    );
    open(<StudyTutor />);
    fireEvent.change(await screen.findByLabelText('Pregunta al tutor IA'), {
      target: { value: 'Algo lento' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(signal?.aborted).toBe(true);
    expect(await screen.findByText('Has cancelado la consulta.')).toBeTruthy();
    expect(screen.queryByText(/escribiendo/)).toBeNull();
    expect((screen.getByLabelText('Pregunta al tutor IA') as HTMLInputElement).disabled).toBe(
      false,
    );
  });

  it('still reports a real failure as an error', async () => {
    vi.mocked(notesApi.getByDeck).mockResolvedValue([basic]);
    vi.mocked(aiApi.chat).mockRejectedValue(new AxiosError('boom'));
    open(<StudyTutor />);
    fireEvent.change(await screen.findByLabelText('Pregunta al tutor IA'), {
      target: { value: 'Hola' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText(/hubo un error al conectar/)).toBeTruthy();
  });
});
