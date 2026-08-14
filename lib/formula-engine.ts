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

export const variableCodeToName: Record<string, string> = {
  LUONG_CO_BAN: "Lương cơ bản",
  NEN_TINH_OT: "Nền tính tăng ca",
  GIO_CHUAN: "Giờ chuẩn tháng",
  GIO_THUONG: "Giờ công thường",
  GIO_OT_150: "Giờ tăng ca 150%",
  GIO_OT_200: "Giờ tăng ca 200%",
  GIO_OT_300: "Giờ tăng ca 300%",
  TONG_PHU_CAP: "Tổng phụ cấp",
  BAO_HIEM_NV: "Bảo hiểm nhân viên",
  BAO_HIEM_XH: "Bảo hiểm xã hội 8%",
  BAO_HIEM_YT: "Bảo hiểm y tế 1.5%",
  BAO_HIEM_TN: "Bảo hiểm thất nghiệp 1%",
  KHAU_TRU_KHAC: "Khấu trừ khác",
  LUONG_NGAY_CONG: "Lương theo giờ công",
  LUONG_OT_150: "Lương tăng ca 150%",
  LUONG_OT_200: "Lương tăng ca 200%",
  LUONG_OT_300: "Lương tăng ca 300%",
  TONG_THU_NHAP: "Tổng thu nhập",
  TONG_KHAU_TRU: "Tổng khấu trừ",
  THUC_LANH: "Tổng thực lãnh",
  VAR_BASE_SCALE: "Hệ số lương cơ bản",
  VAR_BASE_01: "Lương cơ bản",
  CALC_OT_RATES: "Lương tăng ca",
  VAR_BONUS_KPI: "Thưởng hiệu suất KPI",
  THUONG_KPI: "Thưởng hiệu suất KPI",
  THUONG_CHUYEN_CAN: "Thưởng chuyên cần",
  ALLOW_HOUSE_01: "Phụ cấp nhà ở",
  PC_NHA_O_CONG: "Phụ cấp nhà ở",
  PC_NHA_O: "Phụ cấp nhà ở",
  ALLOW_TRAVEL_01: "Phụ cấp đi lại & xăng xe",
  PC_DI_LAI_CONG: "Phụ cấp đi lại & xăng xe",
  PC_DI_LAI: "Phụ cấp đi lại",
  PC_AN_TRUA: "Phụ cấp ăn trưa",
  PC_DIEN_THOAI: "Phụ cấp điện thoại",
  PC_TRACH_NHIEM: "Phụ cấp trách nhiệm",
  PC_DINH_MUC: "Mức phụ cấp",
  TAX_PIT_TIERS: "Thuế TNCN",
  THUE_TNCN: "Thuế TNCN",
  THU_NHAP_CHIU_THUE: "Thu nhập chịu thuế",
  GIAM_TRU_GIA_CANH: "Giảm trừ gia cảnh",
  DED_SOC_INS: "Bảo hiểm bắt buộc",
  LUONG_DONG_BH: "Lương đóng bảo hiểm",
  TY_LE_BH: "0.105",
  DED_UNION_FEE: "Kinh phí Công đoàn",
  CONG_DOAN_NV: "Kinh phí Công đoàn",
  TY_LE_DOAN_PHI: "0.01",
  THUONG_DANG_KY: "Thưởng đăng ký",
  TY_LE_HOAN_THANH: "Tỷ lệ hoàn thành",
  TAM_UNG_LUONG: "Tạm ứng lương",
  KHAU_TRU_DI_TRE: "Khấu trừ đi trễ",
};

export const vietnameseNameToCode: [RegExp, string][] = [
  [/Lương cơ bản/gi, "LUONG_CO_BAN"],
  [/Nền tính tăng ca/gi, "NEN_TINH_OT"],
  [/Giờ chuẩn tháng/gi, "GIO_CHUAN"],
  [/Giờ chuẩn/gi, "GIO_CHUAN"],
  [/Giờ công thường/gi, "GIO_THUONG"],
  [/Giờ tăng ca 150%/gi, "GIO_OT_150"],
  [/Giờ tăng ca 200%/gi, "GIO_OT_200"],
  [/Giờ tăng ca 300%/gi, "GIO_OT_300"],
  [/Tổng phụ cấp/gi, "TONG_PHU_CAP"],
  [/Bảo hiểm nhân viên/gi, "BAO_HIEM_NV"],
  [/Bảo hiểm xã hội 8%/gi, "BAO_HIEM_XH"],
  [/Bảo hiểm y tế 1\.5%/gi, "BAO_HIEM_YT"],
  [/Bảo hiểm thất nghiệp 1%/gi, "BAO_HIEM_TN"],
  [/Khấu trừ khác/gi, "KHAU_TRU_KHAC"],
  [/Lương theo giờ công/gi, "LUONG_NGAY_CONG"],
  [/Lương tăng ca 150%/gi, "LUONG_OT_150"],
  [/Lương tăng ca 200%/gi, "LUONG_OT_200"],
  [/Lương tăng ca 300%/gi, "LUONG_OT_300"],
  [/Lương tăng ca/gi, "CALC_OT_RATES"],
  [/Tổng thu nhập/gi, "TONG_THU_NHAP"],
  [/Tổng khấu trừ/gi, "TONG_KHAU_TRU"],
  [/Tổng thực lãnh/gi, "THUC_LANH"],
  [/Thực lãnh/gi, "THUC_LANH"],
  [/Thưởng hiệu suất KPI/gi, "THUONG_KPI"],
  [/Thưởng KPI/gi, "THUONG_KPI"],
  [/Thưởng chuyên cần/gi, "THUONG_CHUYEN_CAN"],
  [/Phụ cấp nhà ở/gi, "PC_NHA_O_CONG"],
  [/Phụ cấp đi lại & xăng xe/gi, "PC_DI_LAI_CONG"],
  [/Phụ cấp đi lại/gi, "PC_DI_LAI"],
  [/Phụ cấp ăn trưa/gi, "PC_AN_TRUA"],
  [/Phụ cấp điện thoại/gi, "PC_DIEN_THOAI"],
  [/Phụ cấp trách nhiệm/gi, "PC_TRACH_NHIEM"],
  [/Mức phụ cấp/gi, "PC_DINH_MUC"],
  [/Thuế TNCN/gi, "THUE_TNCN"],
  [/Thuế thu nhập cá nhân/gi, "THUE_TNCN"],
  [/Thu nhập chịu thuế/gi, "THU_NHAP_CHIU_THUE"],
  [/Giảm trừ gia cảnh/gi, "GIAM_TRU_GIA_CANH"],
  [/Bảo hiểm bắt buộc trích nộp/gi, "BAO_HIEM_NV"],
  [/Bảo hiểm bắt buộc/gi, "BAO_HIEM_NV"],
  [/Lương đóng bảo hiểm/gi, "LUONG_DONG_BH"],
  [/Kinh phí Công đoàn người lao động/gi, "CONG_DOAN_NV"],
  [/Thưởng đăng ký/gi, "THUONG_DANG_KY"],
  [/Tỷ lệ hoàn thành/gi, "TY_LE_HOAN_THANH"],
  [/Tạm ứng lương/gi, "TAM_UNG_LUONG"],
  [/Khấu trừ đi trễ/gi, "KHAU_TRU_DI_TRE"],
  [/Hệ số lương/gi, "VAR_BASE_SCALE"],
  [/10\.5%/g, "0.105"],
  [/8%/g, "0.08"],
  [/1\.5%/g, "0.015"],
  [/1%/g, "0.01"],
];

export const knownVariableNames: string[] = [
  "Lương cơ bản",
  "Nền tính tăng ca",
  "Giờ chuẩn tháng",
  "Giờ chuẩn",
  "Giờ công thường",
  "Giờ tăng ca 150%",
  "Giờ tăng ca 200%",
  "Giờ tăng ca 300%",
  "Tổng phụ cấp",
  "Bảo hiểm nhân viên",
  "Bảo hiểm xã hội 8%",
  "Bảo hiểm y tế 1.5%",
  "Bảo hiểm thất nghiệp 1%",
  "Khấu trừ khác",
  "Lương theo giờ công",
  "Lương tăng ca 150%",
  "Lương tăng ca 200%",
  "Lương tăng ca 300%",
  "Lương tăng ca",
  "Tổng thu nhập",
  "Tổng khấu trừ",
  "Thưởng hiệu suất KPI",
  "Thưởng KPI",
  "Thưởng chuyên cần",
  "Phụ cấp nhà ở",
  "Phụ cấp đi lại & xăng xe",
  "Phụ cấp đi lại",
  "Phụ cấp ăn trưa",
  "Phụ cấp điện thoại",
  "Phụ cấp trách nhiệm",
  "Mức phụ cấp",
  "Thuế TNCN",
  "Thuế thu nhập cá nhân",
  "Thu nhập chịu thuế",
  "Giảm trừ gia cảnh",
  "Bảo hiểm bắt buộc trích nộp",
  "Bảo hiểm bắt buộc",
  "Lương đóng bảo hiểm",
  "Kinh phí Công đoàn người lao động",
  "Kinh phí Công đoàn",
  "Thưởng đăng ký",
  "Tỷ lệ hoàn thành",
  "Tạm ứng lương",
  "Khấu trừ đi trễ",
  "Tổng thực lãnh",
  "Thực lãnh",
  "Hệ số lương cơ bản",
  "Hệ số lương",
];

export interface TokenRange {
  start: number;
  end: number;
  name: string;
}

export function findVariableRanges(text: string): TokenRange[] {
  const ranges: TokenRange[] = [];
  const sortedNames = [...knownVariableNames].sort((a, b) => b.length - a.length);

  sortedNames.forEach((name) => {
    let pos = text.indexOf(name);
    while (pos !== -1) {
      const endPos = pos + name.length;
      const overlaps = ranges.some(
        (r) => (pos >= r.start && pos < r.end) || (endPos > r.start && endPos <= r.end)
      );
      if (!overlaps) {
        ranges.push({ start: pos, end: endPos, name });
      }
      pos = text.indexOf(name, pos + 1);
    }
  });

  return ranges.sort((a, b) => a.start - b.start);
}

export function expressionToText(node: ExpressionNode): string {
  if (node.type === "constant") return String(node.value);
  if (node.type === "variable") return node.variableCode;
  return `${expressionToText(node.left)} ${node.operator} ${expressionToText(node.right)}`;
}

export function expressionToFriendlyText(node: ExpressionNode, variableNameMap?: Map<string, string>): string {
  if (node.type === "constant") return String(node.value);
  if (node.type === "variable") {
    if (variableNameMap && variableNameMap.has(node.variableCode)) {
      return variableNameMap.get(node.variableCode)!;
    }
    return variableCodeToName[node.variableCode] ?? node.variableCode;
  }
  return `${expressionToFriendlyText(node.left, variableNameMap)} ${node.operator} ${expressionToFriendlyText(node.right, variableNameMap)}`;
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
  let cleaned = text.replace(/×/g, "*").replace(/÷/g, "/").trim();
  vietnameseNameToCode.forEach(([pattern, code]) => {
    cleaned = cleaned.replace(pattern, code);
  });
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
