import { RING_LABELS, ringCircle, ringLayout, ringString } from '../ringText';

describe('ringText', () => {
  it('repeats send label', () => {
    expect(ringString('send')).toBe('SEND ✦ SEND ✦ SEND ✦ ');
  });
  it('repeats calc label twice', () => {
    expect(ringString('calc')).toBe('CALCULATE ✦ CALCULATE ✦ ');
  });
  it('repeats signIn label', () => {
    expect(ringString('signIn')).toBe('SIGN IN ✦ SIGN IN ✦ SIGN IN ✦ ');
  });
  it('exposes font sizes', () => {
    expect(RING_LABELS.send.fontSize).toBe(14.5);
  });
  it('ringCircle is a valid path', () => {
    const d = ringCircle(100);
    expect(d.startsWith('M')).toBe(true);
    expect(d).not.toContain('NaN');
  });
});

describe('ringLayout', () => {
  it('has one word and one dot per repeat, without the star glyph', () => {
    const l = ringLayout('send');
    expect(l.words).toHaveLength(3);
    expect(l.dots).toHaveLength(3);
    l.words.forEach((w) => expect(w.text).toBe('SEND'));
  });
  it('first dot sits on the left of the ring, just outside the path', () => {
    const { dots, fontSize } = ringLayout('send');
    expect(dots[0].y).toBeCloseTo(50, 5);
    expect(dots[0].x).toBeCloseTo(50 - (38 + 0.35 * fontSize), 5);
  });
  it('keeps words inside their segment, clear of the dots', () => {
    const seg = (2 * Math.PI * 38) / 2;
    ringLayout('calc').words.forEach((w, i) => {
      expect(w.startOffset - w.textLength / 2).toBeGreaterThan(i * seg);
      expect(w.startOffset + w.textLength / 2).toBeLessThan((i + 1) * seg);
    });
  });
  it('word lengths add up to the mockup share of textLength 228', () => {
    const l = ringLayout('send');
    expect(l.words[0].textLength).toBeCloseTo((228 / 3) * (4 / 7), 5);
  });
  it('stretches letters a little, never squeezes them, for every label', () => {
    (['send', 'calc', 'signIn'] as const).forEach((k) => {
      const ls = ringLayout(k).words[0].letterSpacing;
      expect(ls).toBeGreaterThan(0);
      expect(ls).toBeLessThan(2);
    });
  });
});
