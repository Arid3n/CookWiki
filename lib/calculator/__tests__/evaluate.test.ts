import { evaluate } from '../evaluate';

describe('evaluate', () => {
  it('precedence', () => expect(evaluate('2+3×4')).toBe(14));
  it('parens', () => expect(evaluate('(2+3)×4')).toBe(20));
  it('division', () => expect(evaluate('10÷4')).toBe(2.5));
  it('ascii operators', () => expect(evaluate('2*3/6')).toBe(1));
  it('comma decimal', () => expect(evaluate('1,5+1')).toBe(2.5));
  it('percent', () => expect(evaluate('50%')).toBe(0.5));
  it('unary minus', () => {
    expect(evaluate('-5+2')).toBe(-3);
    expect(evaluate('2×(-3)')).toBe(-6);
  });
  it('invalid -> null', () => {
    for (const e of ['1÷0', '2+', '(2+3', '', '2++3', '2+3)', '2a', '()', '.', '1.2.3', '*3'])
      expect(evaluate(e)).toBeNull();
  });
  it('500-char expression does not throw', () => {
    const e = '1+'.repeat(250);
    expect(() => evaluate(e)).not.toThrow();
    expect(evaluate(e)).toBeNull();
    expect(evaluate('1+'.repeat(249) + '1')).toBe(250);
  });
  it('deep nesting returns null', () => {
    expect(evaluate('('.repeat(2000))).toBeNull();
    expect(evaluate('('.repeat(500) + '1' + ')'.repeat(500))).toBeNull();
    expect(evaluate('('.repeat(150) + '1' + ')'.repeat(150))).toBeNull();
    expect(evaluate('('.repeat(100) + '1' + ')'.repeat(100))).toBe(1);
  });
});
