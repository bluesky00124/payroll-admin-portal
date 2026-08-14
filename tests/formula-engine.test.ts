import { describe, expect, it } from "vitest";
import {
  applyRounding,
  collectVariables,
  evaluateExpression,
  expressionToText,
  parseExpressionTextResult,
  validateFormulas,
} from "@/lib/formula-engine";
import type { ExpressionNode, FormulaVariable, SalaryFormula } from "@/lib/types";

const variable = (variableCode: string): ExpressionNode => ({ type: "variable", variableCode });
const constant = (value: number): ExpressionNode => ({ type: "constant", value });
const binary = (operator: "+" | "-" | "*" | "/", left: ExpressionNode, right: ExpressionNode): ExpressionNode => ({ type: "binary", operator, left, right });

describe("formula engine", () => {
  it("đánh giá expression tree đúng thứ tự", () => {
    const expression = binary("*", binary("/", variable("SALARY"), constant(208)), variable("HOURS"));
    expect(evaluateExpression(expression, { SALARY: 8_320_000, HOURS: 184 })).toBe(7_360_000);
    expect(collectVariables(expression)).toEqual(["SALARY", "HOURS"]);
  });

  it("chặn chia cho 0 và biến còn thiếu", () => {
    expect(() => evaluateExpression(binary("/", constant(1), constant(0)), {})).toThrow("Không thể chia cho 0");
    expect(() => evaluateExpression(variable("MISSING"), {})).toThrow("Thiếu biến MISSING");
  });

  it("áp dụng các chế độ làm tròn", () => {
    expect(applyRounding(12_449, { mode: "nearest", precision: 1000 })).toBe(12_000);
    expect(applyRounding(12_001, { mode: "up", precision: 1000 })).toBe(13_000);
    expect(applyRounding(12_999, { mode: "down", precision: 1000 })).toBe(12_000);
  });

  it("phát hiện biến thiếu và vòng lặp công thức", () => {
    const catalog: FormulaVariable[] = [{ code: "INPUT", name: "Đầu vào", group: "employee", sampleValue: 1, unit: "" }];
    const base = { projectId: "p", category: "income", rounding: { mode: "none", precision: 1 }, enabled: true } as const;
    const formulas: SalaryFormula[] = [
      { ...base, id: "a", code: "A", name: "A", outputVariable: "OUT_A", order: 1, expression: binary("+", variable("OUT_B"), variable("UNKNOWN")) },
      { ...base, id: "b", code: "B", name: "B", outputVariable: "OUT_B", order: 2, expression: variable("OUT_A") },
    ];
    const result = validateFormulas(formulas, catalog);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("UNKNOWN");
    expect(result.errors.join(" ")).toContain("vòng lặp");
  });

  it("parse nghiêm ngặt và giữ nguyên thứ tự tính bằng dấu ngoặc", () => {
    const parsed = parseExpressionTextResult("( Lương cơ bản + Tổng phụ cấp ) / Giờ chuẩn tháng");
    expect(parsed.errors).toEqual([]);
    expect(parsed.expression).not.toBeNull();
    expect(expressionToText(parsed.expression!)).toBe("( LUONG_CO_BAN + TONG_PHU_CAP ) / GIO_CHUAN");
  });

  it("không âm thầm biến công thức chưa hoàn chỉnh thành giá trị 0", () => {
    const incomplete = parseExpressionTextResult("Lương cơ bản /");
    expect(incomplete.expression).toBeNull();
    expect(incomplete.errors.join(" ")).toContain("Thiếu toán hạng");

    const empty = parseExpressionTextResult("");
    expect(empty.expression).toBeNull();
    expect(empty.errors).toContain("Hãy nhập biểu thức tính.");
  });
});
