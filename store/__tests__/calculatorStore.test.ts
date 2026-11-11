import { useCalculatorStore } from '../calculatorStore';

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
});
