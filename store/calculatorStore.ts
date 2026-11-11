import { create } from 'zustand';
import { evaluate } from '../lib/calculator/evaluate';

export type CalcKey = string;

interface CalculatorState {
  expression: string;
  result: number | null;
  press: (key: CalcKey) => void;
  clear: () => void;
  setExpression: (e: string) => void;
}

const OPERATORS = ['+', '-', '×', '÷'];

export function formatResult(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n) >= 1e15) {
    // Beyond double precision for decimals: expand integer digits, no exponent.
    return BigInt(Math.round(n)).toString();
  }
  const rounded = Math.round(n * 1e10) / 1e10;
  const str = rounded.toFixed(10).replace(/\.?0+$/, '');
  return str === '-0' || str === '' ? '0' : str;
}

// In-memory only; true right after '=' so the next digit starts fresh.
let justEvaluated = false;

export const useCalculatorStore = create<CalculatorState>((set, get) => {
  const update = (expression: string) =>
    set({ expression, result: evaluate(expression) });

  return {
    expression: '',
    result: null,
    clear: () => {
      justEvaluated = false;
      set({ expression: '', result: null });
    },
    setExpression: (e) => {
      justEvaluated = false;
      update(e);
    },
    press: (key) => {
      const { expression, result } = get();
      if (key === 'C') {
        get().clear();
        return;
      }
      if (key === '=') {
        if (result !== null) {
          const formatted = formatResult(result);
          const parsed = /^-?\d+(\.\d+)?$/.test(formatted) ? evaluate(formatted) : null;
          if (parsed !== null) {
            justEvaluated = true;
            set({ expression: formatted, result: parsed });
          }
        }
        return;
      }
      if (key === '⌫') {
        justEvaluated = false;
        update(expression.slice(0, -1));
        return;
      }

      const isDigit = key.length === 1 && key >= '0' && key <= '9';
      const isDot = key === '.' || key === ',';
      const isOp = OPERATORS.includes(key);
      if (!isDigit && !isDot && !isOp && key !== '(' && key !== ')' && key !== '%') return;

      let base = expression;
      if (justEvaluated) {
        // digit/dot/paren starts new expression; operator or % continues
        if (!(isOp || key === '%')) base = '';
        justEvaluated = false;
      }

      if (isDot) {
        const lastNumber = base.split(/[^0-9.,]/).pop() ?? '';
        if (/[.,]/.test(lastNumber)) return;
        key = '.';
      }
      if (isOp && (base === '' || base.endsWith('('))) {
        if (key !== '-') return;
      } else if (isOp && OPERATORS.includes(base.slice(-1))) {
        // replace trailing operator
        const head = base.slice(0, -1);
        if (head === '' || head.endsWith('(')) {
          if (key !== '-') return;
        }
        base = head;
      }
      update(base + key);
    },
  };
});
