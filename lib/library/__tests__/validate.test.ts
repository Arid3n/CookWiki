import { parseMacroValue } from '../validate';

describe('parseMacroValue', () => {
  it('parses dot and comma decimals', () => {
    expect(parseMacroValue('12.5')).toBe(12.5);
    expect(parseMacroValue(' 12,5 ')).toBe(12.5);
  });
  it('allows zero', () => {
    expect(parseMacroValue('0')).toBe(0);
  });
  it('rejects empty, negative, non-numeric, non-finite', () => {
    expect(parseMacroValue('')).toBeNull();
    expect(parseMacroValue('  ')).toBeNull();
    expect(parseMacroValue('-1')).toBeNull();
    expect(parseMacroValue('abc')).toBeNull();
    expect(parseMacroValue('1.2.3')).toBeNull();
    expect(parseMacroValue('Infinity')).toBeNull();
    expect(parseMacroValue('1e999')).toBeNull();
    expect(parseMacroValue('NaN')).toBeNull();
  });
});
