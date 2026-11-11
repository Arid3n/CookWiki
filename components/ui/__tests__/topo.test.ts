import { topoPaths } from '../topo';

describe('topoPaths', () => {
  it('is deterministic per seed', () => {
    expect(topoPaths(1, 260, 232)).toEqual(topoPaths(1, 260, 232));
  });
  it('differs between seeds', () => {
    expect(topoPaths(1, 260, 232)).not.toEqual(topoPaths(2, 260, 232));
  });
  it('returns valid path strings without NaN', () => {
    for (const d of topoPaths(3, 260, 206)) {
      expect(d).toMatch(/^M[\d\s.,\-LCZMQ]+$/i);
      expect(d).not.toContain('NaN');
    }
  });
  it('handles zero size', () => {
    for (const d of topoPaths(1, 0, 0)) {
      expect(d).not.toContain('NaN');
      expect(d).toMatch(/^M[\d\s.,\-LCZMQ]+$/i);
    }
  });
  it('yields many rings', () => {
    expect(topoPaths(2, 260, 164).length).toBeGreaterThan(3);
  });
});
