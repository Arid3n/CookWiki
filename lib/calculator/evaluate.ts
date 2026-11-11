const MAX_LENGTH = 1000;
const MAX_DEPTH = 100;

class Invalid extends Error {}

/**
 * Evaluates an arithmetic expression. Returns null when the expression is
 * invalid or the result is not finite. Never throws.
 */
export function evaluate(expr: string): number | null {
  if (expr.length === 0 || expr.length > MAX_LENGTH) return null;
  const s = expr.replace(/\s+/g, '');
  if (s.length === 0) return null;

  let pos = 0;
  let depth = 0;

  const peek = () => s[pos];

  function parseExpression(): number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = s[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (peek() === '×' || peek() === '*' || peek() === '÷' || peek() === '/') {
      const op = s[pos++];
      const right = parseFactor();
      if (op === '×' || op === '*') left = left * right;
      else {
        if (right === 0) throw new Invalid();
        left = left / right;
      }
    }
    return left;
  }

  // factor: optional unary minus (start of expression or after '(' only,
  // enforced by where parseFactor is entered), then primary with % postfix
  function parseFactor(): number {
    const atStart = pos === 0 || s[pos - 1] === '(';
    let negate = false;
    if (peek() === '-' && atStart) {
      negate = true;
      pos++;
    }
    let value = parsePrimary();
    while (peek() === '%') {
      pos++;
      value = value / 100;
    }
    return negate ? -value : value;
  }

  function parsePrimary(): number {
    const c = peek();
    if (c === '(') {
      if (++depth > MAX_DEPTH) throw new Invalid();
      pos++;
      const v = parseExpression();
      if (peek() !== ')') throw new Invalid();
      pos++;
      depth--;
      return v;
    }
    return parseNumber();
  }

  function parseNumber(): number {
    const start = pos;
    let digits = 0;
    let dots = 0;
    while (pos < s.length) {
      const c = s[pos];
      if (c >= '0' && c <= '9') digits++;
      else if (c === '.' || c === ',') dots++;
      else break;
      pos++;
    }
    if (digits === 0 || dots > 1) throw new Invalid();
    return Number(s.slice(start, pos).replace(',', '.'));
  }

  try {
    const value = parseExpression();
    if (pos !== s.length) return null;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
