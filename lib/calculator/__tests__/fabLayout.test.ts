import { fabBottomOffset } from '../fabLayout';

describe('fabBottomOffset', () => {
  it('no keyboard: 96 + inset', () => expect(fabBottomOffset(34, 0)).toBe(130));
  it('keyboard replaces the inset: 96 + height', () => expect(fabBottomOffset(34, 300)).toBe(396));
  it('negative or NaN keyboard height counts as 0', () => {
    expect(fabBottomOffset(20, -5)).toBe(116);
    expect(fabBottomOffset(20, NaN)).toBe(116);
  });
});
