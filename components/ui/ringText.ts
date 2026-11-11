export const RING_LABELS = {
  send: { text: 'SEND ✦ ', repeat: 3, fontSize: 14.5 },
  calc: { text: 'CALCULATE ✦ ', repeat: 2, fontSize: 13 },
  signIn: { text: 'SIGN IN ✦ ', repeat: 3, fontSize: 13 },
};

export function ringString(key: keyof typeof RING_LABELS): string {
  const { text, repeat } = RING_LABELS[key];
  return text.repeat(repeat);
}

// Circle path (mockup #rp: centre 50,50 r 38 in a 100x100 viewBox), scaled to `size`.
export function ringCircle(size: number): string {
  const s = size / 100;
  const cx = 50 * s;
  const cy = 50 * s;
  const r = 38 * s;
  return `M${cx - r},${cy} a${r},${r} 0 1,1 ${2 * r},0 a${r},${r} 0 1,1 ${-2 * r},0`;
}
