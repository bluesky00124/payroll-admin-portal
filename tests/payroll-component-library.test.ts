import { describe, expect, it } from "vitest";
import {
  collectVariables,
  evaluateExpression,
  parseExpressionTextResult,
} from "@/lib/formula-engine";
import {
  payrollFormulaVariables,
  salaryComponentLibrary,
} from "@/lib/payroll-component-library";

describe("SWM-DN salary component library", () => {
  it("uses unique identifiers and never self-references an output", () => {
    const ids = salaryComponentLibrary.map((item) => item.id);
    const codes = salaryComponentLibrary.map((item) => item.code);
    const outputs = salaryComponentLibrary.map((item) => item.outputVariable);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(outputs).size).toBe(outputs.length);

    salaryComponentLibrary.forEach((item) => {
      const parsed = parseExpressionTextResult(item.defaultFormulaText);
      expect(parsed.errors, item.name).toEqual([]);
      expect(parsed.expression, item.name).not.toBeNull();
      expect(collectVariables(parsed.expression!), item.name).not.toContain(item.outputVariable);
    });
  });

  it("only references variables available in the standardized catalog", () => {
    const availableCodes = new Set(payrollFormulaVariables.map((item) => item.code));

    salaryComponentLibrary.forEach((item) => {
      const parsed = parseExpressionTextResult(item.defaultFormulaText);
      const missing = collectVariables(parsed.expression!).filter(
        (code) => !availableCodes.has(code),
      );
      expect(missing, item.name).toEqual([]);
    });
  });

  it("prorates housing allowance below standard workdays", () => {
    const component = salaryComponentLibrary.find((item) => item.code === "HOUSING_ALLOWANCE");
    const expression = parseExpressionTextResult(component!.defaultFormulaText).expression!;

    expect(
      evaluateExpression(expression, {
        NGAY_CONG_THUC_TE: 20,
        NGAY_CONG_CHUAN: 25,
        MUC_PC_NHA_O: 250_000,
      }),
    ).toBe(200_000);
    expect(
      evaluateExpression(expression, {
        NGAY_CONG_THUC_TE: 25,
        NGAY_CONG_CHUAN: 25,
        MUC_PC_NHA_O: 250_000,
      }),
    ).toBe(250_000);
  });

  it("stops mandatory insurance deduction from 14 unpaid workdays", () => {
    const component = salaryComponentLibrary.find((item) => item.code === "MANDATORY_INSURANCE");
    const expression = parseExpressionTextResult(component!.defaultFormulaText).expression!;

    expect(
      evaluateExpression(expression, {
        NGAY_KHONG_LUONG: 0,
        LUONG_DONG_BH: 6_300_000,
        TY_LE_BH_NLD: 10.5,
      }),
    ).toBe(661_500);
    expect(
      evaluateExpression(expression, {
        NGAY_KHONG_LUONG: 14,
        LUONG_DONG_BH: 6_300_000,
        TY_LE_BH_NLD: 10.5,
      }),
    ).toBe(0);
  });
});
