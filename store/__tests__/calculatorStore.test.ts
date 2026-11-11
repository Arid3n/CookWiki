import { useCalculatorStore, formatResult } from '../calculatorStore';

const press = (...keys: string[]) => keys.forEach((k) => useCalculatorStore.getState().press(k));

beforeEach(() => useCalculatorStore.getState().clear());

describe('calculatorStore', () => {
  it('1+2= gives 3', () => {
    press('1', '+', '2');
    expect(useCalculatorStore.getState().result).toBe(3);
    press('=');
    expect(useCalculatorStore.getState().expression).toBe('3');
    expect(useCalculatorStore.getState().result).toBe(3);
  });
  it('live result keeps expression', () => {
    press('1', '+', '2');
    expect(useCalculatorStore.getState().expression).toBe('1+2');
  });
  it('digit after = starts new expression', () => {
    press('1', '+', '2', '=', '5');
    expect(useCalculatorStore.getState().expression).toBe('5');
  });
  it('operator after = continues', () => {
    press('1', '+', '2', '=', '×', '4');
    expect(useCalculatorStore.getState().expression).toBe('3×4');
    expect(useCalculatorStore.getState().result).toBe(12);
  });
  it('backspace', () => {
    press('1', '2', '⌫');
    expect(useCalculatorStore.getState().expression).toBe('1');
  });
  it('same state module-wide', () => {
    press('7');
    expect(useCalculatorStore.getState()).toBe(useCalculatorStore.getState());
    expect(useCalculatorStore.getState().expression).toBe('7');
  });
  it('clear resets', () => {
    press('7', '+', '1');
    useCalculatorStore.getState().clear();
    expect(useCalculatorStore.getState().expression).toBe('');
    expect(useCalculatorStore.getState().result).toBeNull();
  });
  it('C key clears', () => {
    press('7', 'C');
    expect(useCalculatorStore.getState().expression).toBe('');
  });
  it('ignores second dot and leading operator', () => {
    press('1', '.', '2', '.');
    expect(useCalculatorStore.getState().expression).toBe('1.2');
    useCalculatorStore.getState().clear();
    press('+', '×', '3');
    expect(useCalculatorStore.getState().expression).toBe('3');
  });
  it('leading minus allowed', () => {
    press('-', '5', '+', '2');
    expect(useCalculatorStore.getState().result).toBe(-3);
  });
  it('no float noise', () => {
    press('0', '.', '1', '+', '0', '.', '2', '=');
    expect(useCalculatorStore.getState().expression).toBe('0.3');
  });
  it('= with invalid keeps expression', () => {
    press('1', '+', '=');
    expect(useCalculatorStore.getState().expression).toBe('1+');
  });
  it('setExpression recomputes', () => {
    useCalculatorStore.getState().setExpression('2×3');
    expect(useCalculatorStore.getState().result).toBe(6);
  });
  it('formatResult never uses exponent notation', () => {
    expect(formatResult(1e21)).toMatch(/^-?\d+$/);
    expect(formatResult(-1e21)).toMatch(/^-?\d+$/);
    expect(formatResult(1e300)).toMatch(/^\d+$/);
    expect(formatResult(1e-7)).toBe('0.0000001');
    expect(formatResult(1e-11)).toBe('0');
    expect(formatResult(0.1 + 0.2)).toBe('0.3');
  });
  it('= on 1e21-scale result leaves parseable expression', () => {
    press(...'9'.repeat(21).split(''), '+', '1');
    press('=');
    const s = useCalculatorStore.getState();
    expect(s.expression).toMatch(/^\d+$/);
    expect(s.result).not.toBeNull();
  });
  it('= near 1e300 never shows Infinity', () => {
    press('1', ...'0'.repeat(300).split(''));
    press('=');
    let s = useCalculatorStore.getState();
    expect(s.expression).toMatch(/^\d+$/);
    expect(s.result).not.toBeNull();
    useCalculatorStore.getState().clear();
    press(...'9'.repeat(310).split(''));
    expect(useCalculatorStore.getState().result).toBeNull();
    press('=');
    s = useCalculatorStore.getState();
    expect(s.expression).toBe('9'.repeat(310));
    expect(s.expression).not.toMatch(/Infinity|e/);
  });
});
