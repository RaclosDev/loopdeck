import { describe, expect, it } from 'vitest';
import { base64UrlToBuffer, bufferToBase64Url, deviceName, isPasskeyCancel } from './webauthn';

describe('webauthn', () => {
  it('convierte base64url de ida y vuelta, sin relleno', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63, 1]);
    const encoded = bufferToBase64Url(bytes.buffer);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(new Uint8Array(base64UrlToBuffer(encoded))).toEqual(bytes);
  });

  it('cancelar el diálogo del sistema no es un error', () => {
    expect(isPasskeyCancel(new DOMException('x', 'NotAllowedError'))).toBe(true);
    expect(isPasskeyCancel(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isPasskeyCancel(new Error('x'))).toBe(false);
  });

  it('nombra la llave según el dispositivo', () => {
    expect(deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)')).toBe('iPhone');
    expect(deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows');
    expect(deviceName('curl')).toBe('Llave de acceso');
  });
});
