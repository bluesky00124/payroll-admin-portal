import { describe, expect, it } from "vitest";
import {
  applyRounding,
  collectVariables,
  evaluateExpression,
  expressionToText,
  findVariableAtCursor,
  parseExpressionTextResult,
  tokenizeFriendlyText,
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

  it("tokenize và parse đúng các số nhiều chữ số như 52 và số thập phân", () => {
    const parsed = parseExpressionTextResult("Lương cơ bản * 52 / 100 + 1.5");
    expect(parsed.errors).toEqual([]);
    expect(parsed.expression).not.toBeNull();
    expect(expressionToText(parsed.expression!)).toBe("LUONG_CO_BAN * 52 / 100 + 1.5");
  });

  it("gom các tham số đầu vào dài thành đúng 1 token duy nhất (không bị tách từ)", () => {
    const tokens = tokenizeFriendlyText(
      "Lương cơ bản / Giờ chuẩn tháng * Giờ công thường * Hệ số hoàn thành tối thiểu + Đơn giá khoán sản lượng"
    );

    const varTokens = tokens.filter((t) => t.type === "variable").map((t) => t.text);
    expect(varTokens).toEqual([
      "Lương cơ bản",
      "Giờ chuẩn tháng",
      "Giờ công thường",
      "Hệ số hoàn thành tối thiểu",
      "Đơn giá khoán sản lượng",
    ]);

    const parsed = parseExpressionTextResult(
      "Lương cơ bản / Giờ chuẩn tháng * Giờ công thường * Hệ số hoàn thành tối thiểu + Đơn giá khoán sản lượng"
    );
    expect(parsed.errors).toEqual([]);
    expect(expressionToText(parsed.expression!)).toBe(
      "LUONG_CO_BAN / GIO_CHUAN * GIO_THUONG * HE_SO_HOAN_THANH_MIN + DON_GIA_KHOAN"
    );
  });

  it("parse và đánh giá hàm IF điều kiện cơ bản chuẩn Excel", () => {
    const formulaText = "= IF(Giờ công thường >= 208, 1000000, 500000)";
    const parsed = parseExpressionTextResult(formulaText);
    expect(parsed.errors).toEqual([]);
    expect(parsed.expression).not.toBeNull();
    expect(parsed.expression?.type).toBe("if");

    // Test true branch (208 >= 208)
    const resultTrue = evaluateExpression(parsed.expression!, { GIO_THUONG: 208 });
    expect(resultTrue).toBe(1_000_000);

    // Test false branch (200 < 208)
    const resultFalse = evaluateExpression(parsed.expression!, { GIO_THUONG: 200 });
    expect(resultFalse).toBe(500_000);
  });

  it("parse và đánh giá hàm IF lồng nhau và toán tử so sánh", () => {
    const nestedText = "IF(GIO_THUONG >= 208, 1000000, IF(GIO_THUONG >= 190, 500000, 0))";
    const parsed = parseExpressionTextResult(nestedText);
    expect(parsed.errors).toEqual([]);
    expect(parsed.expression).not.toBeNull();

    expect(evaluateExpression(parsed.expression!, { GIO_THUONG: 210 })).toBe(1_000_000);
    expect(evaluateExpression(parsed.expression!, { GIO_THUONG: 195 })).toBe(500_000);
    expect(evaluateExpression(parsed.expression!, { GIO_THUONG: 180 })).toBe(0);
  });

  it("parse IF với toán tử % và dấu chấm phẩy ;", () => {
    const formulaWithPercent = "IF(LUONG_CO_BAN > 10000000; LUONG_CO_BAN * 10%; LUONG_CO_BAN * 5%)";
    const parsed = parseExpressionTextResult(formulaWithPercent);
    expect(parsed.errors).toEqual([]);
    expect(parsed.expression).not.toBeNull();

    expect(evaluateExpression(parsed.expression!, { LUONG_CO_BAN: 12_000_000 })).toBe(1_200_000);
    expect(evaluateExpression(parsed.expression!, { LUONG_CO_BAN: 8_000_000 })).toBe(400_000);
  });

  it("parse công thức với biến đóng ngoặc vuông [Tên biến] và @mention", () => {
    const formulaWithBrackets = "= IF( [Giờ công thường] >= 208, [Lương cơ bản] + 1000000, @LUONG_CO_BAN )";
    const parsed = parseExpressionTextResult(formulaWithBrackets);
    expect(parsed.errors).toEqual([]);
    expect(parsed.expression).not.toBeNull();

    const result = evaluateExpression(parsed.expression!, {
      GIO_THUONG: 210,
      LUONG_CO_BAN: 7_000_000,
    });
    expect(result).toBe(8_000_000);
  });

  it("findVariableAtCursor phát hiện đúng vị trí biến khi xóa (atomic deletion)", () => {
    const text = "IF( [Giờ công thường] >= 208, 1000000, 0 )";
    // [Giờ công thường] starts at index 4 and ends at index 21
    const variableStart = 4;
    const variableEnd = 21;

    // Cursor right at the end of [Giờ công thường] (index 21) -> Backspace should target this variable
    const atEnd = findVariableAtCursor(text, variableEnd);
    expect(atEnd).not.toBeNull();
    expect(atEnd?.action).toBe("backspace");
    expect(atEnd?.range.start).toBe(variableStart);
    expect(atEnd?.range.end).toBe(variableEnd);

    // Cursor right at start (index 4) -> Delete should target this variable
    const atStart = findVariableAtCursor(text, variableStart);
    expect(atStart).not.toBeNull();
    expect(atStart?.action).toBe("delete");

    // Cursor in the middle (index 10) -> inside
    const inside = findVariableAtCursor(text, 10);
    expect(inside).not.toBeNull();
    expect(inside?.action).toBe("inside");
  });
});

