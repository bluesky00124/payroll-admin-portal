import type {
  ExpressionNode,
  FormulaVariable,
  RoundingRule,
  SalaryFormula,
} from "@/lib/types";

export function evaluateExpression(
  node: ExpressionNode,
  variables: Record<string, number>,
): number {
  if (node.type === "constant") return node.value;
  if (node.type === "variable") {
    const value = variables[node.variableCode];
    if (value === undefined) throw new Error(`Thiếu biến ${node.variableCode}`);
    return value;
  }

  const left = evaluateExpression(node.left, variables);
  const right = evaluateExpression(node.right, variables);
  switch (node.operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) throw new Error("Không thể chia cho 0");
      return left / right;
  }
}

export function applyRounding(value: number, rule: RoundingRule): number {
  if (rule.mode === "none") return value;
  const scaled = value / rule.precision;
  if (rule.mode === "up") return Math.ceil(scaled) * rule.precision;
  if (rule.mode === "down") return Math.floor(scaled) * rule.precision;
  return Math.round(scaled) * rule.precision;
}

export function collectVariables(node: ExpressionNode): string[] {
  if (node.type === "variable") return [node.variableCode];
  if (node.type === "constant") return [];
  return [...collectVariables(node.left), ...collectVariables(node.right)];
}

export function expressionToText(node: ExpressionNode): string {
  if (node.type === "constant") return String(node.value);
  if (node.type === "variable") return node.variableCode;
  return `(${expressionToText(node.left)} ${node.operator} ${expressionToText(node.right)})`;
}

export function validateFormulas(
  formulas: SalaryFormula[],
  variableCatalog: FormulaVariable[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const sourceVariables = new Set(variableCatalog.map((item) => item.code));
  const outputs = new Set(formulas.map((item) => item.outputVariable));

  formulas.forEach((formula) => {
    collectVariables(formula.expression).forEach((variable) => {
      if (!sourceVariables.has(variable) && !outputs.has(variable)) {
        errors.push(`${formula.name}: biến ${variable} không tồn tại`);
      }
    });
  });

  const dependencies = new Map<string, string[]>();
  formulas.forEach((formula) => {
    dependencies.set(
      formula.outputVariable,
      collectVariables(formula.expression).filter((variable) => outputs.has(variable)),
    );
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (code: string) => {
    if (visiting.has(code)) {
      errors.push(`Phát hiện vòng lặp tại biến ${code}`);
      return;
    }
    if (visited.has(code)) return;
    visiting.add(code);
    visited.add(code);
  };
  [...outputs].forEach(visit);

  return { valid: errors.length === 0, errors };
}

export function parseExpressionText(text: string): ExpressionNode {
  const cleaned = text.replace(/×/g, "*").replace(/÷/g, "/").trim();
  if (!cleaned) return { type: "variable", variableCode: "LUONG_CO_BAN" };

  type Token = string | { type: "num"; val: number } | { type: "var"; code: string };
  const tokens: Token[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const c = cleaned[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if ("+-*/()".includes(c)) {
      tokens.push(c);
      i++;
    } else if (/\d/.test(c) || (c === "." && /\d/.test(cleaned[i + 1] ?? ""))) {
      let j = i;
      while (j < cleaned.length && /[\d.]/.test(cleaned[j])) j++;
      const val = parseFloat(cleaned.slice(i, j));
      tokens.push({ type: "num", val: isNaN(val) ? 0 : val });
      i = j;
    } else if (/[a-zA-Z_À-ỹ]/.test(c)) {
      let j = i;
      while (j < cleaned.length && /[a-zA-Z0-9_À-ỹ]/.test(cleaned[j])) j++;
      tokens.push({ type: "var", code: cleaned.slice(i, j) });
      i = j;
    } else {
      i++;
    }
  }

  if (tokens.length === 0) return { type: "variable", variableCode: "LUONG_CO_BAN" };

  let idx = 0;

  function parseExpr(): ExpressionNode {
    let left = parseTerm();
    while (idx < tokens.length && (tokens[idx] === "+" || tokens[idx] === "-")) {
      const op = tokens[idx] as "+" | "-";
      idx++;
      const right = parseTerm();
      left = { type: "binary", operator: op, left, right };
    }
    return left;
  }

  function parseTerm(): ExpressionNode {
    let left = parseFactor();
    while (idx < tokens.length && (tokens[idx] === "*" || tokens[idx] === "/")) {
      const op = tokens[idx] as "*" | "/";
      idx++;
      const right = parseFactor();
      left = { type: "binary", operator: op, left, right };
    }
    return left;
  }

  function parseFactor(): ExpressionNode {
    if (idx >= tokens.length) return { type: "constant", value: 0 };
    const tok = tokens[idx];

    if (tok === "(") {
      idx++;
      const sub = parseExpr();
      if (idx < tokens.length && tokens[idx] === ")") idx++;
      return sub;
    }

    if (typeof tok === "object") {
      idx++;
      if (tok.type === "num") return { type: "constant", value: tok.val };
      return { type: "variable", variableCode: tok.code };
    }

    idx++;
    return { type: "constant", value: 0 };
  }

  try {
    return parseExpr();
  } catch {
    return { type: "variable", variableCode: "LUONG_CO_BAN" };
  }
}
