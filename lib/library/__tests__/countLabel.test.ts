import { libraryCountLabel } from '../countLabel';

describe('libraryCountLabel', () => {
  it('uses singular for 1', () => {
    expect(libraryCountLabel(1, 1)).toBe('1 food · 1 dish');
  });
  it('uses plural otherwise', () => {
    expect(libraryCountLabel(0, 2)).toBe('0 foods · 2 dishes');
  });
});
