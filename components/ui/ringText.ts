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

// Ring geometry in the mockup's 100x100 viewBox. The mockup sets textLength="228" on the whole
// string, but react-native-svg 15.12 drops textLength in its JS layer, so each word gets a
// letterSpacing that stretches it to its share of those 228 units. Geist and Rubik have no "✦"
// glyph, so each repeat is its own word on the path and a gold dot replaces the star.
const RING_R = 38;
const RING_TEXT_LENGTH = 228;

// Advance widths (em) of Geist SemiBold, read from the bundled font file.
const GEIST_600_ADVANCE: Record<string, number> = {
  S: 0.668, E: 0.615, N: 0.748, D: 0.708, C: 0.724, A: 0.709, L: 0.586, U: 0.699, T: 0.584,
  G: 0.726, I: 0.29, ' ': 0.236,
};

export interface RingLayout {
  fontSize: number;
  /** startOffset is the word centre on the path (use textAnchor="middle"). */
  words: { text: string; startOffset: number; textLength: number; letterSpacing: number }[];
  dots: { x: number; y: number }[];
}

export function ringLayout(key: keyof typeof RING_LABELS): RingLayout {
  const { text, repeat, fontSize } = RING_LABELS[key];
  const word = text.replace('✦', '').trim();
  const seg = (2 * Math.PI * RING_R) / repeat;
  // Word keeps its share of the mockup's 228 units (by characters, star and spaces excluded).
  const textLength = (RING_TEXT_LENGTH / repeat) * (word.length / text.length);
  const natural = [...word].reduce((sum, ch) => sum + (GEIST_600_ADVANCE[ch] ?? 0.65), 0) * fontSize;
  const letterSpacing = word.length > 1 ? (textLength - natural) / (word.length - 1) : 0;
  const dotR = RING_R + 0.35 * fontSize; // about half the cap height, outward of the baseline
  const words = [];
  const dots = [];
  for (let i = 0; i < repeat; i++) {
    words.push({ text: word, startOffset: i * seg + seg / 2, textLength, letterSpacing });
    // Path starts at the left point (angle pi) and runs clockwise over the top.
    const a = Math.PI + (i * seg) / RING_R;
    dots.push({ x: 50 + dotR * Math.cos(a), y: 50 + dotR * Math.sin(a) });
  }
  return { fontSize, words, dots };
}
