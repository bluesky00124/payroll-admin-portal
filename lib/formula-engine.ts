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

  if (node.type === "if") {
    const conditionVal = evaluateExpression(node.condition, variables);
    return conditionVal !== 0
      ? evaluateExpression(node.thenBranch, variables)
      : evaluateExpression(node.elseBranch, variables);
  }

  if (node.type === "comparison") {
    const left = evaluateExpression(node.left, variables);
    const right = evaluateExpression(node.right, variables);
    switch (node.operator) {
      case ">":
        return left > right ? 1 : 0;
      case "<":
        return left < right ? 1 : 0;
      case ">=":
        return left >= right ? 1 : 0;
      case "<=":
        return left <= right ? 1 : 0;
      case "==":
        return left === right ? 1 : 0;
      case "!=":
        return left !== right ? 1 : 0;
    }
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
  if (node.type === "if") {
    return [
      ...collectVariables(node.condition),
      ...collectVariables(node.thenBranch),
      ...collectVariables(node.elseBranch),
    ];
  }
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
  DON_GIA_KHOAN: "Đơn giá khoán sản lượng",
  HE_SO_HOAN_THANH_MIN: "Hệ số hoàn thành tối thiểu",
  MUC_THUONG_NONG_DU_AN: "Mức thưởng nóng dự án",
  DON_GIA_CA_DEM_DAC_BIET: "Đơn giá ca đêm đặc biệt",
  TY_LE_TRICH_QUY_DU_AN: "Tỷ lệ trích quỹ dự án",
};

export const vietnameseNameToCode: [RegExp, string][] = [
  [/Đơn giá khoán sản lượng/gi, "DON_GIA_KHOAN"],
  [/Đơn giá khoán/gi, "DON_GIA_KHOAN"],
  [/Hệ số hoàn thành tối thiểu/gi, "HE_SO_HOAN_THANH_MIN"],
  [/Hệ số hoàn thành/gi, "HE_SO_HOAN_THANH_MIN"],
  [/Mức thưởng nóng dự án/gi, "MUC_THUONG_NONG_DU_AN"],
  [/Mức thưởng nóng/gi, "MUC_THUONG_NONG_DU_AN"],
  [/Thưởng nóng/gi, "MUC_THUONG_NONG_DU_AN"],
  [/Đơn giá ca đêm đặc biệt/gi, "DON_GIA_CA_DEM_DAC_BIET"],
  [/Đơn giá ca đêm/gi, "DON_GIA_CA_DEM_DAC_BIET"],
  [/Tỷ lệ trích quỹ dự án/gi, "TY_LE_TRICH_QUY_DU_AN"],
  [/Tỷ lệ trích quỹ/gi, "TY_LE_TRICH_QUY_DU_AN"],
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
  "Đơn giá khoán sản lượng",
  "Đơn giá khoán",
  "Hệ số hoàn thành tối thiểu",
  "Hệ số hoàn thành",
  "Mức thưởng nóng dự án",
  "Mức thưởng nóng",
  "Thưởng nóng dự án",
  "Thưởng nóng",
  "Đơn giá ca đêm đặc biệt",
  "Đơn giá ca đêm",
  "Tỷ lệ trích quỹ dự án",
  "Tỷ lệ trích quỹ",
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

export function findVariableRanges(text: string, customNames?: string[]): TokenRange[] {
  const ranges: TokenRange[] = [];

  // 1. Bracketed variables like [Lương cơ bản]
  const bracketRegex = /\[\s*([^\]]+?)\s*\]/g;
  let match: RegExpExecArray | null;
  while ((match = bracketRegex.exec(text)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      name: match[1].trim(),
    });
  }

  // 2. Known / custom variable names
  const nameSet = new Set<string>([
    ...knownVariableNames,
    ...(customNames || []),
    ...Object.values(variableCodeToName),
  ]);
  const sortedNames = Array.from(nameSet)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

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

export function findVariableAtCursor(
  text: string,
  cursor: number,
  customNames?: string[]
): { range: TokenRange; action: "backspace" | "delete" | "inside" } | null {
  const ranges = findVariableRanges(text, customNames);
  for (const r of ranges) {
    if (cursor === r.end) {
      return { range: r, action: "backspace" };
    }
    if (cursor === r.start) {
      return { range: r, action: "delete" };
    }
    if (cursor > r.start && cursor < r.end) {
      return { range: r, action: "inside" };
    }
  }
  return null;
}

export interface VisualToken {
  id: string;
  type: "variable" | "operator" | "number" | "function" | "unknown";
  text: string;
}

export function tokenizeFriendlyText(text: string, customNames?: string[]): VisualToken[] {
  if (!text || !text.trim()) return [];
  const ranges = findVariableRanges(text, customNames);
  ranges.sort((a, b) => a.start - b.start);

  const tokens: VisualToken[] = [];
  let lastIndex = 0;
  let idCounter = 1;

  const pushNonVarText = (segment: string) => {
    const rawTokens = segment.split(/(>=|<=|==|!=|<>|[+\-*/×÷(),;><=]|\s+)/);
    for (const raw of rawTokens) {
      if (!raw || /^\s+$/.test(raw)) continue;
      const upper = raw.toUpperCase();
      if (upper === "IF") {
        tokens.push({
          id: `tok-${idCounter++}`,
          type: "function",
          text: "IF",
        });
      } else if (["+", "-", "*", "/", "×", "÷", "(", ")", ",", ";", ">=", "<=", "==", "!=", "<>", ">", "<", "="].includes(raw)) {
        tokens.push({
          id: `tok-${idCounter++}`,
          type: "operator",
          text: raw === "*" ? "×" : raw === "/" ? "÷" : raw === "-" ? "−" : raw === "=" ? "==" : raw === "<>" ? "!=" : raw,
        });
      } else if (/^(\d+(\.\d*)?|\.\d+)%?$/.test(raw)) {
        tokens.push({
          id: `tok-${idCounter++}`,
          type: "number",
          text: raw,
        });
      } else if (variableCodeToName[raw]) {
        tokens.push({
          id: `tok-${idCounter++}`,
          type: "variable",
          text: variableCodeToName[raw],
        });
      } else {
        tokens.push({
          id: `tok-${idCounter++}`,
          type: "unknown",
          text: raw,
        });
      }
    }
  };

  for (const r of ranges) {
    if (r.start > lastIndex) {
      pushNonVarText(text.slice(lastIndex, r.start));
    }
    tokens.push({
      id: `tok-${idCounter++}`,
      type: "variable",
      text: r.name,
    });
    lastIndex = r.end;
  }

  if (lastIndex < text.length) {
    pushNonVarText(text.slice(lastIndex));
  }

  return tokens;
}

export function tokensToFriendlyText(tokens: VisualToken[]): string {
  return tokens
    .map((t) => {
      if (t.type === "operator") {
        return t.text === "×" ? "*" : t.text === "÷" ? "/" : t.text === "−" ? "-" : t.text;
      }
      if (t.type === "variable") {
        return t.text.startsWith("[") && t.text.endsWith("]") ? t.text : `[${t.text}]`;
      }
      return t.text;
    })
    .join(" ");
}

function expressionPrecedence(node: ExpressionNode): number {
  if (node.type === "if") return 0;
  if (node.type === "comparison") return 1;
  if (node.type !== "binary") return 4;
  return node.operator === "+" || node.operator === "-" ? 2 : 3;
}

function formatExpression(
  node: ExpressionNode,
  variableLabel: (code: string) => string,
  parentOperator?: string,
  isRightChild = false,
): string {
  if (node.type === "constant") return String(node.value);
  if (node.type === "variable") return variableLabel(node.variableCode);

  if (node.type === "if") {
    const cond = formatExpression(node.condition, variableLabel);
    const thenB = formatExpression(node.thenBranch, variableLabel);
    const elseB = formatExpression(node.elseBranch, variableLabel);
    return `IF( ${cond}, ${thenB}, ${elseB} )`;
  }

  if (node.type === "comparison") {
    const left = formatExpression(node.left, variableLabel);
    const right = formatExpression(node.right, variableLabel);
    return `${left} ${node.operator} ${right}`;
  }

  const left = formatExpression(node.left, variableLabel, node.operator, false);
  const right = formatExpression(node.right, variableLabel, node.operator, true);
  const formatted = `${left} ${node.operator} ${right}`;

  if (!parentOperator) return formatted;
  const currentPrecedence = expressionPrecedence(node);
  const parentPrecedence = parentOperator === "+" || parentOperator === "-" ? 2 : parentOperator === "*" || parentOperator === "/" ? 3 : 1;
  const needsParentheses =
    currentPrecedence < parentPrecedence ||
    (isRightChild && currentPrecedence === parentPrecedence && (parentOperator === "-" || parentOperator === "/" || parentOperator !== node.operator));

  return needsParentheses ? `( ${formatted} )` : formatted;
}

export function expressionToText(node: ExpressionNode): string {
  return formatExpression(node, (code) => code);
}

export function expressionToFriendlyText(node: ExpressionNode, variableNameMap?: Map<string, string>): string {
  return formatExpression(node, (code) => {
    const label = variableNameMap?.get(code) ?? variableCodeToName[code] ?? code;
    return `[${label}]`;
  });
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
    (dependencies.get(code) ?? []).forEach(visit);
    visiting.delete(code);
    visited.add(code);
  };
  [...outputs].forEach(visit);

  return { valid: errors.length === 0, errors };
}

export interface ExpressionParseResult {
  expression: ExpressionNode | null;
  errors: string[];
  normalizedText: string;
}

type ParserToken =
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "(" | ")" | "," | ";" | ">" | "<" | ">=" | "<=" | "==" | "!=" }
  | { type: "function"; name: "IF" }
  | { type: "number"; value: number; raw: string }
  | { type: "variable"; code: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseExpressionTextResult(
  text: string,
  aliases?: ReadonlyMap<string, string>,
): ExpressionParseResult {
  let cleaned = text.replace(/^=\s*/, "").replace(/×/g, "*").replace(/÷/g, "/").trim();
  // Strip bracketed variable names [Tên biến] -> Tên biến and @mention prefix
  cleaned = cleaned.replace(/\[\s*([^\]]+?)\s*\]/g, " $1 ");
  cleaned = cleaned.replace(/@([a-zA-Z0-9_À-ỹ]+)/g, " $1 ");
  const errors: string[] = [];

  if (!cleaned) {
    return { expression: null, errors: ["Hãy nhập biểu thức tính."], normalizedText: "" };
  }

  if (aliases) {
    [...aliases.entries()]
      .filter(([k, v]) => Boolean(k?.trim()) && Boolean(v?.trim()))
      .forEach(([key, val]) => {
        if (/^[A-Z0-9_]+$/.test(key) && !/^[A-Z0-9_]+$/.test(val)) {
          cleaned = cleaned.replace(new RegExp(escapeRegExp(val), "gi"), key);
        } else if (/^[A-Z0-9_]+$/.test(val) && !/^[A-Z0-9_]+$/.test(key)) {
          cleaned = cleaned.replace(new RegExp(escapeRegExp(key), "gi"), val);
        } else {
          cleaned = cleaned.replace(new RegExp(escapeRegExp(key), "gi"), val);
        }
      });
  }

  [...vietnameseNameToCode]
    .sort(([left], [right]) => right.source.length - left.source.length)
    .forEach(([pattern, code]) => {
      cleaned = cleaned.replace(pattern, code);
    });

  const tokens: ParserToken[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const c = cleaned[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Two-character operators
    const twoChars = cleaned.slice(i, i + 2);
    if (twoChars === ">=" || twoChars === "<=" || twoChars === "==" || twoChars === "!=") {
      tokens.push({ type: "operator", value: twoChars as ">=" | "<=" | "==" | "!=" });
      i += 2;
      continue;
    }
    if (twoChars === "<>") {
      tokens.push({ type: "operator", value: "!=" });
      i += 2;
      continue;
    }
    if (twoChars === "=>") {
      tokens.push({ type: "operator", value: ">=" });
      i += 2;
      continue;
    }
    if (twoChars === "=<") {
      tokens.push({ type: "operator", value: "<=" });
      i += 2;
      continue;
    }

    // Single-character operators
    if ("+-*/(),;><".includes(c)) {
      tokens.push({ type: "operator", value: c as "+" | "-" | "*" | "/" | "(" | ")" | "," | ";" | ">" | "<" });
      i++;
      continue;
    }

    if (c === "=") {
      tokens.push({ type: "operator", value: "==" });
      i++;
      continue;
    }

    if (/\d/.test(c) || (c === "." && /\d/.test(cleaned[i + 1] ?? ""))) {
      let j = i;
      while (j < cleaned.length && /[\d.]/.test(cleaned[j])) j++;
      const raw = cleaned.slice(i, j);
      let val = Number(raw);
      if (cleaned[j] === "%") {
        val = val / 100;
        j++;
      }
      if (!Number.isFinite(val) || (raw.match(/\./g)?.length ?? 0) > 1) {
        errors.push(`Số “${raw}” không hợp lệ.`);
      } else {
        tokens.push({ type: "number", value: val, raw });
      }
      i = j;
    } else if (/[a-zA-Z_À-ỹ]/.test(c)) {
      let j = i;
      while (j < cleaned.length && /[a-zA-Z0-9_À-ỹ]/.test(cleaned[j])) j++;
      const word = cleaned.slice(i, j);
      if (word.toUpperCase() === "IF") {
        tokens.push({ type: "function", name: "IF" });
      } else {
        tokens.push({ type: "variable", code: word });
      }
      i = j;
    } else {
      errors.push(`Ký tự “${c}” không được hỗ trợ.`);
      i++;
    }
  }

  if (tokens.length === 0 || errors.length > 0) {
    return { expression: null, errors, normalizedText: cleaned };
  }

  let idx = 0;

  function peekOperator(value?: string): boolean {
    const token = tokens[idx];
    return token?.type === "operator" && (value === undefined || token.value === value);
  }

  function parseRoot(): ExpressionNode | null {
    return parseIfOrComparison();
  }

  function parseIfOrComparison(): ExpressionNode | null {
    const current = tokens[idx];
    if (current?.type === "function" && current.name === "IF") {
      return parseIf();
    }
    return parseComparison();
  }

  function parseIf(): ExpressionNode | null {
    const current = tokens[idx];
    if (!current || current.type !== "function" || current.name !== "IF") {
      return null;
    }
    idx++; // consume IF

    if (!peekOperator("(")) {
      errors.push("Hàm IF cần dấu mở ngoặc “(”.");
      return null;
    }
    idx++; // consume (

    const condition = parseIfOrComparison();
    if (!condition) {
      errors.push("Thiếu biểu thức điều kiện trong hàm IF.");
      return null;
    }

    if (!peekOperator(",") && !peekOperator(";")) {
      errors.push("Thiếu dấu phân cách “,” sau điều kiện hàm IF.");
      return null;
    }
    idx++; // consume , or ;

    const thenBranch = parseIfOrComparison();
    if (!thenBranch) {
      errors.push("Thiếu giá trị khi điều kiện đúng trong hàm IF.");
      return null;
    }

    if (!peekOperator(",") && !peekOperator(";")) {
      errors.push("Thiếu dấu phân cách “,” sau giá trị đúng trong hàm IF.");
      return null;
    }
    idx++; // consume , or ;

    const elseBranch = parseIfOrComparison();
    if (!elseBranch) {
      errors.push("Thiếu giá trị khi điều kiện sai trong hàm IF.");
      return null;
    }

    if (!peekOperator(")")) {
      errors.push("Thiếu dấu đóng ngoặc “)” kết thúc hàm IF.");
      return null;
    }
    idx++; // consume )

    return { type: "if", condition, thenBranch, elseBranch };
  }

  function parseComparison(): ExpressionNode | null {
    let left = parseExpr();
    if (!left) return null;

    const token = tokens[idx];
    if (token?.type === "operator" && [">", "<", ">=", "<=", "==", "!="].includes(token.value)) {
      const op = token.value as ">" | "<" | ">=" | "<=" | "==" | "!=";
      idx++;
      const right = parseExpr();
      if (!right) {
        errors.push(`Thiếu biểu thức so sánh sau “${op}”.`);
        return null;
      }
      return { type: "comparison", operator: op, left, right };
    }
    return left;
  }

  function parseExpr(): ExpressionNode | null {
    let left = parseTerm();
    if (!left) return null;
    while (peekOperator("+") || peekOperator("-")) {
      const op = (tokens[idx] as Extract<ParserToken, { type: "operator" }>).value as "+" | "-";
      idx++;
      const right = parseTerm();
      if (!right) {
        errors.push(`Thiếu toán hạng sau “${op}”.`);
        return null;
      }
      left = { type: "binary", operator: op, left, right };
    }
    return left;
  }

  function parseTerm(): ExpressionNode | null {
    let left = parseFactor();
    if (!left) return null;
    while (peekOperator("*") || peekOperator("/")) {
      const op = (tokens[idx] as Extract<ParserToken, { type: "operator" }>).value as "*" | "/";
      idx++;
      const right = parseFactor();
      if (!right) {
        errors.push(`Thiếu toán hạng sau “${op}”.`);
        return null;
      }
      left = { type: "binary", operator: op, left, right };
    }
    return left;
  }

  function parseFactor(): ExpressionNode | null {
    if (idx >= tokens.length) return null;
    const tok = tokens[idx];

    // IF function call
    if (tok.type === "function" && tok.name === "IF") {
      return parseIf();
    }

    if (tok.type === "operator" && tok.value === "(") {
      idx++;
      const sub = parseIfOrComparison();
      if (!peekOperator(")")) {
        errors.push("Thiếu dấu đóng ngoặc “)”.");
        return null;
      }
      idx++;
      return sub;
    }

    if (tok.type === "operator" && (tok.value === "+" || tok.value === "-")) {
      idx++;
      const value = parseFactor();
      if (!value) return null;
      return tok.value === "-" ? { type: "binary", operator: "-", left: { type: "constant", value: 0 }, right: value } : value;
    }

    if (tok.type === "number") {
      idx++;
      return { type: "constant", value: tok.value };
    }

    if (tok.type === "variable") {
      idx++;
      return { type: "variable", variableCode: tok.code };
    }

    return null;
  }

  const expression = parseRoot();
  if (!expression && errors.length === 0) {
    errors.push("Biểu thức chưa hoàn chỉnh.");
  }
  if (idx < tokens.length) {
    const token = tokens[idx];
    let label = "";
    if (token.type === "operator") label = token.value;
    else if (token.type === "variable") label = token.code;
    else if (token.type === "function") label = token.name;
    else label = token.raw;
    errors.push(`Không thể xử lý phần “${label}” trong biểu thức.`);
  }

  return {
    expression: errors.length === 0 ? expression : null,
    errors,
    normalizedText: cleaned,
  };
}

export function parseExpressionText(text: string): ExpressionNode {
  const result = parseExpressionTextResult(text);
  return result.expression ?? { type: "variable", variableCode: "LUONG_CO_BAN" };
}
