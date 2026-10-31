function hexToRgb(hex: string) {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt('0x' + hex[1] + hex[1]);
    g = parseInt('0x' + hex[2] + hex[2]);
    b = parseInt('0x' + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt('0x' + hex[1] + hex[2]);
    g = parseInt('0x' + hex[3] + hex[4]);
    b = parseInt('0x' + hex[5] + hex[6]);
  }
  return `${r}, ${g}, ${b}`;
}

function adjustBrightness(hex: string, percent: number) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r = Math.min(255, Math.max(0, r + Math.round(255 * (percent / 100))));
  g = Math.min(255, Math.max(0, g + Math.round(255 * (percent / 100))));
  b = Math.min(255, Math.max(0, b + Math.round(255 * (percent / 100))));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function applyThemeColor(hexColor: string) {
  if (!/^#[\da-f]{6}$/i.test(hexColor)) return;
  const root = document.documentElement;

  // Keep custom ink readable on the cream paper and beneath white button text.
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((index) => {
      const value = parseInt(hex.slice(index, index + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  let inkColor = hexColor;
  while ((luminance('#f3ecdc') + 0.05) / (luminance(inkColor) + 0.05) < 4.5) {
    inkColor = adjustBrightness(inkColor, -5);
  }
  const light = inkColor;
  const dark = adjustBrightness(inkColor, -15);
  const rgb = hexToRgb(inkColor);

  root.style.setProperty('--accent-primary', inkColor);
  root.style.setProperty('--accent-primary-light', light);
  root.style.setProperty('--accent-primary-dark', dark);
  root.style.setProperty('--accent-primary-rgb', rgb);

  root.style.setProperty('--accent-glow', `rgba(${rgb}, 0.15)`);

  root.style.setProperty('--gradient-primary', `linear-gradient(${inkColor}, ${inkColor})`);

  localStorage.setItem('loopdeck_custom_color', hexColor);
}
