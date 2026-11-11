import { RING_LABELS, ringCircle, ringString } from '../ringText';

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
