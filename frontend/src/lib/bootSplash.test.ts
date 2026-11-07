import { hideBootSplash } from './bootSplash';

describe('hideBootSplash', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="boot-splash"></div><div id="root"></div>';
  });

  it('fades the splash out and removes it', async () => {
    const done = hideBootSplash();
    await vi.waitFor(() =>
      expect(document.getElementById('boot-splash')?.classList.contains('is-leaving')).toBe(true),
    );
    await done;
    expect(document.getElementById('boot-splash')).toBeNull();
    expect(document.getElementById('root')).not.toBeNull();
  });

  it('does nothing when there is no splash', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await expect(hideBootSplash()).resolves.toBeUndefined();
  });
});
