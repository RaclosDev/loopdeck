import { describe, expect, it, vi } from 'vitest';
import { createImportJob, saveImportJob } from './noteImport';
import { notesApi } from './api';
vi.mock('./api', () => ({ notesApi: { importBulk: vi.fn() } }));

describe('resumable bulk save', () => {
  it('validates the entire AI response before any card can be saved', () => {
    expect(() =>
      createImportJob('deck', [
        { front: 'ok', back: 'ok' },
        { front: 42, back: 'wrong' },
      ]),
    ).toThrow();
    expect(notesApi.importBulk).not.toHaveBeenCalled();
  });
  it('retries the uncertain batch with its original key and skips confirmed batches', async () => {
    const job = createImportJob(
      'deck',
      Array.from({ length: 205 }, (_, i) => ({ front: `f${i}`, back: 'b' })),
    );
    const save = vi.mocked(notesApi.importBulk);
    save
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(undefined);
    await expect(saveImportJob(job, () => {})).rejects.toThrow('network');
    expect(job.saved).toBe(100);
    const retryKey = save.mock.calls[1][2];
    await saveImportJob(job, () => {});
    expect(save.mock.calls.map((call) => call[1].length)).toEqual([100, 100, 100, 5]);
    expect(save.mock.calls[2][2]).toBe(retryKey);
    expect(job.saved).toBe(205);
  });
});
