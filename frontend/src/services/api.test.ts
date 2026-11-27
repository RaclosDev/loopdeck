import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client';
import { accountApi, passkeysApi } from './api';

vi.mock('../api/client', () => ({
  default: { post: vi.fn(), put: vi.fn(), delete: vi.fn(), get: vi.fn() },
  SLOW_REQUEST_TIMEOUT_MS: 120_000,
}));
vi.mock('../lib/webauthn', () => ({
  createPasskey: vi.fn().mockResolvedValue({ id: 'credencial' }),
  getPasskey: vi.fn(),
  deviceName: () => 'Mi móvil',
}));

beforeEach(() => {
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.delete).mockReset();
});

describe('adding a passkey proves who you are first', () => {
  const ceremony = { data: { requestId: 'r1', options: { publicKey: {} } } };

  it('sends the password in the body of the options request', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce(ceremony)
      .mockResolvedValueOnce({ data: { id: 1 } });
    await passkeysApi.addOnThisDevice({ password: 'secreta' });
    expect(api.post).toHaveBeenNthCalledWith(1, '/users/me/passkeys/options', {
      password: 'secreta',
    });
  });

  it('sends the Google credential for accounts without a password', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce(ceremony)
      .mockResolvedValueOnce({ data: { id: 1 } });
    await passkeysApi.addOnThisDevice({ googleCredential: 'token-de-google' });
    expect(api.post).toHaveBeenNthCalledWith(1, '/users/me/passkeys/options', {
      googleCredential: 'token-de-google',
    });
  });

  it('does not repeat the password in the request that stores the passkey', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce(ceremony)
      .mockResolvedValueOnce({ data: { id: 1 } });
    await passkeysApi.addOnThisDevice({ password: 'secreta' });
    expect(JSON.stringify(vi.mocked(api.post).mock.calls[1])).not.toContain('secreta');
  });
});

describe('account security calls', () => {
  it('changes the password and returns the new session token', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { token: 'jwt-nuevo', user: {} } });
    await expect(accountApi.renewSession('vieja', 'nueva-123')).resolves.toBe('jwt-nuevo');
    expect(api.put).toHaveBeenCalledWith('/users/me/password', {
      currentPassword: 'vieja',
      newPassword: 'nueva-123',
    });
  });

  it('asks the server to close every session', async () => {
    vi.mocked(api.delete).mockResolvedValue({ status: 204 });
    await accountApi.logoutEverywhere();
    expect(api.delete).toHaveBeenCalledWith('/users/me/sessions');
  });
});
