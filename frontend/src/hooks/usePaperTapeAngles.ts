import { useEffect } from 'react';

export function usePaperTapeAngles() {
  useEffect(() => {
    const initialized = new WeakSet<HTMLElement>();
    const scan = (root: Element) => {
      const elements = root.matches('.landing-tape')
        ? [root, ...root.querySelectorAll('.landing-tape')]
        : [...root.querySelectorAll('.landing-tape')];
      for (const element of elements) {
        if (!(element instanceof HTMLElement) || initialized.has(element)) continue;
        initialized.add(element);
        element.style.setProperty('--tape-angle', `${(Math.random() * 12 - 6).toFixed(2)}deg`);
      }
    };
    scan(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) scan(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
