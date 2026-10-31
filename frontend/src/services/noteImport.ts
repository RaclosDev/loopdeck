import { notesApi } from './api';
import type { ImportNoteBody } from '../types';

export interface ImportJob {
  deckId: string;
  notes: ImportNoteBody[];
  saved: number;
  keys: string[];
}
const BATCH_SIZE = 100;

export function createImportJob(deckId: string, response: unknown, tags = ''): ImportJob {
  let generated: unknown = response;
  if (typeof generated === 'string') {
    try {
      generated = JSON.parse(generated.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    } catch {
      throw new Error('La respuesta no contiene tarjetas válidas. Vuelve a generar.');
    }
  }
  if (!Array.isArray(generated) || generated.length === 0 || generated.length > 1000)
    throw new Error('No se han recibido tarjetas válidas.');
  const notes = generated.map((value: unknown): ImportNoteBody => {
    if (
      !value ||
      typeof value !== 'object' ||
      !('front' in value) ||
      !('back' in value) ||
      typeof value.front !== 'string' ||
      typeof value.back !== 'string' ||
      !value.front.trim() ||
      !value.back.trim()
    )
      throw new Error('La respuesta contiene una tarjeta incompleta. Vuelve a generar.');
    const fieldsJson = JSON.stringify({ front: value.front, back: value.back });
    if (fieldsJson.length > 5_000_000) throw new Error('Una de las tarjetas es demasiado grande.');
    return { noteType: 'basic', fieldsJson, tags };
  });
  return {
    deckId,
    notes,
    saved: 0,
    keys: Array.from({ length: Math.ceil(notes.length / BATCH_SIZE) }, () => crypto.randomUUID()),
  };
}

export async function saveImportJob(
  job: ImportJob,
  onProgress: (saved: number, total: number) => void,
) {
  onProgress(job.saved, job.notes.length);
  while (job.saved < job.notes.length) {
    const batch = job.notes.slice(job.saved, job.saved + BATCH_SIZE);
    await notesApi.importBulk(job.deckId, batch, job.keys[Math.floor(job.saved / BATCH_SIZE)]);
    job.saved += batch.length;
    onProgress(job.saved, job.notes.length);
  }
}
