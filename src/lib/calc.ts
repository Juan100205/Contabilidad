/**
 * Evaluador de expresiones aritméticas simples (+ - * / y paréntesis), tipo
 * calculadora de Excel, para campos de monto. No usa eval/Function: es un
 * parser recursivo descendente sobre un set de caracteres controlado.
 */
export function evaluateExpression(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // Solo números, espacios y los operadores soportados.
  if (!/^[0-9+\-*/().\s]+$/.test(trimmed)) return null;

  try {
    const tokens = tokenize(trimmed);
    let pos = 0;

    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    const parseExpression = (): number => {
      let value = parseTerm();
      while (peek() === "+" || peek() === "-") {
        const op = next();
        const rhs = parseTerm();
        value = op === "+" ? value + rhs : value - rhs;
      }
      return value;
    };

    const parseTerm = (): number => {
      let value = parseFactor();
      while (peek() === "*" || peek() === "/") {
        const op = next();
        const rhs = parseFactor();
        if (op === "/" && rhs === 0) throw new Error("Division by zero");
        value = op === "*" ? value * rhs : value / rhs;
      }
      return value;
    };

    const parseFactor = (): number => {
      if (peek() === "-") {
        next();
        return -parseFactor();
      }
      if (peek() === "+") {
        next();
        return parseFactor();
      }
      if (peek() === "(") {
        next();
        const value = parseExpression();
        if (peek() !== ")") throw new Error("Missing closing parenthesis");
        next();
        return value;
      }
      const token = next();
      if (token === undefined || Number.isNaN(Number(token))) {
        throw new Error("Unexpected token");
      }
      return Number(token);
    };

    const result = parseExpression();
    if (pos !== tokens.length) throw new Error("Unexpected trailing tokens");
    if (!Number.isFinite(result)) return null;

    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i];
        i++;
      }
      tokens.push(num);
      continue;
    }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}
