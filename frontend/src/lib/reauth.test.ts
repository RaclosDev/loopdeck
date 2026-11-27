import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { reauthMessage } from './reauth';

const failure = (status: number) =>
  new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: {} as never,
    data: {},
  });

describe('reauthMessage', () => {
  it('explains a wrong password or credential (403)', () => {
    expect(reauthMessage(failure(403))).toMatch(/confirmar tu identidad/);
  });

  it('explains the attempt limit (429)', () => {
    expect(reauthMessage(failure(429))).toMatch(/Demasiados intentos/);
  });

  it('leaves other failures to the caller', () => {
    expect(reauthMessage(failure(500))).toBeNull();
    expect(reauthMessage(failure(401))).toBeNull();
    expect(reauthMessage(new Error('sin red'))).toBeNull();
    expect(reauthMessage(new DOMException('cancelado', 'NotAllowedError'))).toBeNull();
  });
});
