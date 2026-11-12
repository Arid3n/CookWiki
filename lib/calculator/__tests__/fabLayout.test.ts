import { dockRightReserve, fabBottomOffset } from '../fabLayout';

describe('fabBottomOffset', () => {
  it('sits level with the dock above the safe-area inset', () => {
    expect(fabBottomOffset(0)).toBe(11);
    expect(fabBottomOffset(24)).toBe(35);
  });
  it('ignores a bad inset', () => {
    expect(fabBottomOffset(NaN)).toBe(11);
    expect(fabBottomOffset(-4)).toBe(11);
  });
});

describe('dockRightReserve', () => {
  it('leaves room for the button plus a gap', () => {
    expect(dockRightReserve(16, 50)).toBe(74);
  });
});
