"use client";

import * as Switch from "@radix-ui/react-switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Calculator,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  GripVertical,
  Home,
  Landmark,
  Layers,
  Minus,
  MinusCircle,
  Pencil,
  Plus,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Variable,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, ErrorState, LoadingBlock, SaveBar } from "@/components/ui";
import { api } from "@/lib/api";
import { expressionToFriendlyText, expressionToText, findVariableRanges, parseExpressionText } from "@/lib/formula-engine";
import type { SalaryFormula } from "@/lib/types";
import { uid } from "@/lib/utils";

interface LibraryComponentItem {
  id: string;
  code: string;
  name: string;
  outputVariable: string;
  category: "income" | "deduction";
  defaultFormulaText: string;
  iconName: "basic" | "ot" | "bonus" | "housing" | "tax" | "insurance" | "union";
  tagText: string;
  badgeStyle: string;
  cardStyle: string;
}

const libraryComponents: LibraryComponentItem[] = [
  // Earnings (Thu nhập & Phụ cấp)
  {
    id: "lib-1",
    code: "VAR_BASE_01",
    name: "Lương cơ bản",
    outputVariable: "LUONG_CO_BAN",
    category: "income",
    defaultFormulaText: "LUONG_CO_BAN / GIO_CHUAN * GIO_THUONG",
    iconName: "basic",
    tagText: "Cố định",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-2",
    code: "CALC_OT_150",
    name: "Lương tăng ca 150% (Ngày thường)",
    outputVariable: "LUONG_OT_150",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 1.5 * GIO_OT_150",
    iconName: "ot",
    tagText: "OT 150%",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-2b",
    code: "CALC_OT_200",
    name: "Lương tăng ca 200% (Cuối tuần)",
    outputVariable: "LUONG_OT_200",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 2.0 * GIO_OT_200",
    iconName: "ot",
    tagText: "OT 200%",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-2c",
    code: "CALC_OT_300",
    name: "Lương tăng ca 300% (Ngày lễ, tết)",
    outputVariable: "LUONG_OT_300",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 3.0 * GIO_OT_300",
    iconName: "ot",
    tagText: "OT 300%",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-3",
    code: "VAR_BONUS_KPI",
    name: "Thưởng hiệu suất KPI",
    outputVariable: "THUONG_KPI",
    category: "income",
    defaultFormulaText: "THUONG_DANG_KY * TY_LE_HOAN_THANH",
    iconName: "bonus",
    tagText: "Thưởng KPI",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-3b",
    code: "VAR_ATTEND_BONUS",
    name: "Thưởng chuyên cần",
    outputVariable: "THUONG_CHUYEN_CAN",
    category: "income",
    defaultFormulaText: "THUONG_CHUYEN_CAN_CO_DINH",
    iconName: "bonus",
    tagText: "Chuyên cần",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-4",
    code: "ALLOW_HOUSE_01",
    name: "Phụ cấp nhà ở",
    outputVariable: "PC_NHA_O_CONG",
    category: "income",
    defaultFormulaText: "PC_NHA_O / GIO_CHUAN * GIO_THUONG",
    iconName: "housing",
    tagText: "Phụ cấp",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-5",
    code: "ALLOW_TRAVEL_01",
    name: "Phụ cấp đi lại & xăng xe",
    outputVariable: "PC_DI_LAI_CONG",
    category: "income",
    defaultFormulaText: "PC_DI_LAI / GIO_CHUAN * GIO_THUONG",
    iconName: "housing",
    tagText: "Phụ cấp",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-5b",
    code: "ALLOW_MEAL_01",
    name: "Phụ cấp ăn trưa / cơm ca",
    outputVariable: "PC_AN_TRUA",
    category: "income",
    defaultFormulaText: "PC_AN_TRUA_NGAY * GIO_THUONG / 8",
    iconName: "housing",
    tagText: "Ăn trưa",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-5c",
    code: "ALLOW_PHONE_01",
    name: "Phụ cấp điện thoại & trang phục",
    outputVariable: "PC_DIEN_THOAI",
    category: "income",
    defaultFormulaText: "PC_DIEN_THOAI_CO_DINH",
    iconName: "housing",
    tagText: "Phụ cấp",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },
  {
    id: "lib-5d",
    code: "ALLOW_RESP_01",
    name: "Phụ cấp trách nhiệm / công việc",
    outputVariable: "PC_TRACH_NHIEM",
    category: "income",
    defaultFormulaText: "PC_TRACH_NHIEM_CO_DINH",
    iconName: "housing",
    tagText: "Trách nhiệm",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
    cardStyle: "bg-card border-border hover:border-primary/50",
  },

  // Deductions (Khấu trừ & Trích nộp)
  {
    id: "lib-6",
    code: "TAX_PIT_TIERS",
    name: "Thuế thu nhập cá nhân (TNCN)",
    outputVariable: "THUE_TNCN",
    category: "deduction",
    defaultFormulaText: "THU_NHAP_CHIU_THUE * 0.05",
    iconName: "tax",
    tagText: "Thuế TNCN",
    badgeStyle: "bg-destructive/10 text-destructive border-destructive/20",
    cardStyle: "bg-card border-border hover:border-destructive/50",
  },
  {
    id: "lib-7",
    code: "DED_SOC_INS",
    name: "Bảo hiểm bắt buộc trích nộp (10.5%)",
    outputVariable: "BAO_HIEM_NV",
    category: "deduction",
    defaultFormulaText: "LUONG_DONG_BH * 0.105",
    iconName: "insurance",
    tagText: "Bảo hiểm 10.5%",
    badgeStyle: "bg-destructive/10 text-destructive border-destructive/20",
    cardStyle: "bg-card border-border hover:border-destructive/50",
  },
  {
    id: "lib-7b",
    code: "DED_BHXH",
    name: "Bảo hiểm xã hội (BHXH 8%)",
    outputVariable: "BAO_HIEM_XH",
    category: "deduction",
    defaultFormulaText: "LUONG_DONG_BH * 0.08",
    iconName: "insurance",
    tagText: "BHXH 8%",
    badgeStyle: "bg-destructive/10 text-destructive border-destructive/20",
    cardStyle: "bg-card border-border hover:border-destructive/50",
  },
  {
    id: "lib-7c",
    code: "DED_BHYT",
    name: "Bảo hiểm y tế (BHYT 1.5%)",
    outputVariable: "BAO_HIEM_YT",
    category: "deduction",
    defaultFormulaText: "LUONG_DONG_BH * 0.015",
    iconName: "insurance",
    tagText: "BHYT 1.5%",
    badgeStyle: "bg-destructive/10 text-destructive border-destructive/20",
    cardStyle: "bg-card border-border hover:border-destructive/50",
  },
  {
    id: "lib-7d",
    code: "DED_BHTN",
    name: "Bảo hiểm thất nghiệp (BHTN 1%)",
    outputVariable: "BAO_HIEM_TN",
    category: "deduction",
    defaultFormulaText: "LUONG_DONG_BH * 0.01",
    iconName: "insurance",
    tagText: "BHTN 1%",
    badgeStyle: "bg-destructive/10 text-destructive border-destructive/20",
    cardStyle: "bg-card border-border hover:border-destructive/50",
  },
  {
    id: "lib-8",
    code: "DED_UNION_FEE",
    name: "Kinh phí Công đoàn người lao động (1%)",
    outputVariable: "CONG_DOAN_NV",
    category: "deduction",
    defaultFormulaText: "LUONG_CO_BAN * 0.01",
    iconName: "union",
    tagText: "Đoàn phí 1%",
    badgeStyle: "bg-destructive/10 text-destructive border-destructive/20",
    cardStyle: "bg-card border-border hover:border-destructive/50",
  },
  {
    id: "lib-9",
    code: "DED_ADVANCE",
    name: "Tạm ứng lương trong tháng",
    outputVariable: "TAM_UNG_LUONG",
    category: "deduction",
    defaultFormulaText: "SO_TIEN_TAM_UNG",
    iconName: "tax",
    tagText: "Tạm ứng",
    badgeStyle: "bg-destructive/10 text-destructive border-destructive/20",
    cardStyle: "bg-card border-border hover:border-destructive/50",
  },
  {
    id: "lib-10",
    code: "DED_LATE",
    name: "Khấu trừ đi trễ / về sớm",
    outputVariable: "KHAU_TRU_DI_TRE",
    category: "deduction",
    defaultFormulaText: "SO_PHUT_DI_TRE * DON_GIA_DI_TRE",
    iconName: "tax",
    tagText: "Kỷ luật",
    badgeStyle: "bg-destructive/10 text-destructive border-destructive/20",
    cardStyle: "bg-card border-border hover:border-destructive/50",
  },
];

const categoryLabels: Record<SalaryFormula["category"], string> = {
  income: "Thu nhập",
  deduction: "Khấu trừ",
  aggregate: "Tổng hợp",
  net: "Kết quả thực nhận",
  attendance: "Chấm công",
};

function ComponentIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  switch (name) {
    case "basic":
      return <Plus className={className} />;
    case "ot":
      return <Clock className={className} />;
    case "bonus":
      return <TrendingUp className={className} />;
    case "housing":
      return <Home className={className} />;
    case "tax":
      return <Minus className={className} />;
    case "insurance":
      return <Shield className={className} />;
    case "union":
      return <Users className={className} />;
    default:
      return <Coins className={className} />;
  }
}

function getVietnameseLabel(code: string, variableNameMap?: Map<string, string>): string {
  if (!code) return "";
  if (variableNameMap && variableNameMap.has(code)) {
    return variableNameMap.get(code)!;
  }
  const knownDict: Record<string, string> = {
    LUONG_CO_BAN: "Lương cơ bản",
    NEN_TINH_OT: "Nền tính tăng ca",
    GIO_CHUAN: "Giờ chuẩn tháng",
    GIO_THUONG: "Giờ công thường",
    GIO_OT_150: "Giờ tăng ca 150%",
    TONG_PHU_CAP: "Tổng phụ cấp",
    BAO_HIEM_NV: "Bảo hiểm nhân viên",
    KHAU_TRU_KHAC: "Khấu trừ khác",
    LUONG_NGAY_CONG: "Lương theo giờ công",
    LUONG_OT_150: "Lương tăng ca 150%",
    TONG_THU_NHAP: "Tổng thu nhập",
    TONG_KHAU_TRU: "Tổng khấu trừ",
    THUC_LANH: "Tổng thực lãnh",
    VAR_BASE_SCALE: "Hệ số lương cơ bản",
    VAR_BASE_01: "Lương cơ bản",
    CALC_OT_RATES: "Lương tăng ca",
    VAR_BONUS_KPI: "Thưởng hiệu suất KPI",
    ALLOW_HOUSE_01: "Phụ cấp nhà ở",
    ALLOW_TRAVEL_01: "Phụ cấp đi lại & xăng xe",
    TAX_PIT_TIERS: "Thuế TNCN",
    DED_SOC_INS: "Bảo hiểm bắt buộc",
    DED_UNION_FEE: "Kinh phí Công đoàn",
  };
  return knownDict[code] ?? code;
}

function FormulaCodeBadge({ text, variableNameMap }: { text: string; variableNameMap?: Map<string, string> }) {
  if (!text) return null;
  const tokens = text.split(/(\s+)/);

  return (
    <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-sans text-xs font-semibold shadow-inner inline-flex items-center gap-1.5 flex-wrap">
      {tokens.map((tok, idx) => {
        if (/^\s+$/.test(tok)) return null;
        if (["+", "-", "*", "/", "(", ")"].includes(tok)) {
          return (
            <span key={idx} className="text-emerald-400 font-bold text-sm">
              {tok === "*" ? "×" : tok === "/" ? "÷" : tok}
            </span>
          );
        }
        if (/^\d+(\.\d+)?$/.test(tok)) {
          return (
            <span key={idx} className="text-amber-400 font-bold">
              {tok}
            </span>
          );
        }
        const label = getVietnameseLabel(tok, variableNameMap);
        return (
          <span
            key={idx}
            className="text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/60 text-[11.5px]"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function getSuggestedVariables(formula: SalaryFormula, variablesCatalog: { code: string; name: string }[]) {
  const code = (formula.code || formula.outputVariable || "").toUpperCase();

  if (code.includes("BASE") || code.includes("LUONG_CO_BAN") || code.includes("BASIC")) {
    return [
      { code: "LUONG_CO_BAN", name: "Lương cơ bản" },
      { code: "GIO_CHUAN", name: "Giờ chuẩn tháng" },
      { code: "GIO_THUONG", name: "Giờ công thường" },
      { code: "VAR_BASE_SCALE", name: "Hệ số lương" },
    ];
  }

  if (code.includes("OT") || code.includes("OVERTIME") || code.includes("TANG_CA")) {
    return [
      { code: "NEN_TINH_OT", name: "Nền tính tăng ca" },
      { code: "GIO_CHUAN", name: "Giờ chuẩn tháng" },
      { code: "GIO_OT_150", name: "Giờ tăng ca 150%" },
      { code: "LUONG_CO_BAN", name: "Lương cơ bản" },
    ];
  }

  if (code.includes("KPI") || code.includes("BONUS") || code.includes("THUONG")) {
    return [
      { code: "THUONG_DANG_KY", name: "Thưởng đăng ký" },
      { code: "TY_LE_HOAN_THANH", name: "Tỷ lệ hoàn thành" },
      { code: "LUONG_CO_BAN", name: "Lương cơ bản" },
    ];
  }

  if (code.includes("HOUSE") || code.includes("NHA_O") || code.includes("TRAVEL") || code.includes("DI_LAI") || code.includes("ALLOW")) {
    return [
      { code: "PC_DINH_MUC", name: "Mức phụ cấp" },
      { code: "GIO_CHUAN", name: "Giờ chuẩn tháng" },
      { code: "GIO_THUONG", name: "Giờ công thường" },
    ];
  }

  if (code.includes("INS") || code.includes("BH") || code.includes("BAO_HIEM")) {
    return [
      { code: "LUONG_DONG_BH", name: "Lương đóng bảo hiểm" },
      { code: "0.105", name: "10.5%" },
      { code: "LUONG_CO_BAN", name: "Lương cơ bản" },
    ];
  }

  if (code.includes("TAX") || code.includes("PIT") || code.includes("THUE")) {
    return [
      { code: "THU_NHAP_CHIU_THUE", name: "Thu nhập chịu thuế" },
      { code: "TONG_THU_NHAP", name: "Tổng thu nhập" },
      { code: "GIAM_TRU_GIA_CANH", name: "Giảm trừ gia cảnh" },
    ];
  }

  if (code.includes("UNION") || code.includes("CONG_DOAN")) {
    return [
      { code: "LUONG_CO_BAN", name: "Lương cơ bản" },
      { code: "0.01", name: "1%" },
    ];
  }

  return variablesCatalog.length > 0
    ? variablesCatalog.slice(0, 5).map((v) => ({ code: v.code, name: v.name }))
    : [
        { code: "LUONG_CO_BAN", name: "Lương cơ bản" },
        { code: "GIO_CHUAN", name: "Giờ chuẩn tháng" },
        { code: "GIO_THUONG", name: "Giờ công thường" },
      ];
}

export function FormulaTab({ projectId, embedded = false }: { projectId: string; embedded?: boolean }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const formulasQuery = useQuery({ queryKey: ["formulas", projectId], queryFn: () => api.getFormulas(projectId) });
  const variablesQuery = useQuery({ queryKey: ["formula-variables"], queryFn: api.getFormulaVariables });

  const [formulas, setFormulas] = useState<SalaryFormula[]>([]);
  const [rawTexts, setRawTexts] = useState<Record<string, string>>({});
  const [editingFormulaIds, setEditingFormulaIds] = useState<Set<string>>(new Set());
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleEditFormula = (id: string) => {
    setEditingFormulaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const [activeTab, setActiveTab] = useState<"grossToNet" | "netToGross" | "severance">("grossToNet");
  const [filterSearch, setFilterSearch] = useState("");
  const [prorateEnabled, setProrateEnabled] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);

  // Dragged component state
  const [draggedItem, setDraggedItem] = useState<LibraryComponentItem | null>(null);

  const variables = useMemo(() => variablesQuery.data ?? [], [variablesQuery.data]);
  const variableNameMap = useMemo(() => new Map(variables.map((item) => [item.code, item.name])), [variables]);

  useEffect(() => {
    if (formulasQuery.data) {
      setFormulas(structuredClone(formulasQuery.data));
      const initialRaw: Record<string, string> = {};
      formulasQuery.data.forEach((f) => {
        initialRaw[f.id] = expressionToFriendlyText(f.expression, variableNameMap);
      });
      setRawTexts(initialRaw);
    }
  }, [formulasQuery.data, variableNameMap]);

  // Derived sections
  const grossComponents = useMemo(() => formulas.filter((f) => f.category === "income"), [formulas]);
  const deductionComponents = useMemo(() => formulas.filter((f) => f.category === "deduction"), [formulas]);

  const filteredLibrary = useMemo(() => {
    const q = filterSearch.toLowerCase().trim();
    if (!q) return libraryComponents;
    return libraryComponents.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.outputVariable.toLowerCase().includes(q)
    );
  }, [filterSearch]);

  const earningsLibrary = useMemo(
    () => filteredLibrary.filter((item) => item.category === "income"),
    [filteredLibrary]
  );
  const deductionsLibrary = useMemo(
    () => filteredLibrary.filter((item) => item.category === "deduction"),
    [filteredLibrary]
  );

  const existingOutputCodes = useMemo(
    () => new Set(formulas.map((f) => f.outputVariable.toUpperCase())),
    [formulas]
  );

  // Add component to structure
  const addComponentToStructure = (item: LibraryComponentItem) => {
    if (existingOutputCodes.has(item.outputVariable.toUpperCase())) {
      notify(`Mục "${item.name}" đã có trong cấu trúc.`, "warning");
      return;
    }
    const newOrder = formulas.length + 1;
    const formulaId = uid("formula");
    const parsedExpr = parseExpressionText(item.defaultFormulaText);
    const defaultText = expressionToFriendlyText(parsedExpr, variableNameMap);
    const newFormula: SalaryFormula = {
      id: formulaId,
      projectId,
      code: item.code,
      name: item.name,
      outputVariable: item.outputVariable,
      category: item.category,
      order: newOrder,
      expression: parsedExpr,
      rounding: { mode: "nearest", precision: 1 },
      enabled: true,
    };
    setFormulas((prev) => [...prev, newFormula]);
    setRawTexts((prev) => ({ ...prev, [formulaId]: defaultText }));
    setEditingFormulaIds((prev) => new Set(prev).add(formulaId));
    setDirty(true);
    notify(`Đã đưa "${item.name}" vào cấu trúc lương`);
  };

  const removeComponentFromStructure = (id: string) => {
    setFormulas((prev) => prev.filter((item) => item.id !== id));
    setRawTexts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDirty(true);
    notify("Đã gỡ mục khỏi cấu trúc");
  };

  const getFormulaRawText = (formula: SalaryFormula) => {
    return rawTexts[formula.id] ?? expressionToFriendlyText(formula.expression, variableNameMap);
  };

  const updateFormulaText = (id: string, text: string) => {
    setRawTexts((prev) => ({ ...prev, [id]: text }));
    const parsed = parseExpressionText(text);
    setFormulas((prev) => prev.map((f) => (f.id === id ? { ...f, expression: parsed } : f)));
    setDirty(true);
  };

  const handleFormulaKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    formulaId: string,
    currentValue: string
  ) => {
    if (e.key !== "Backspace" && e.key !== "Delete") return;

    const input = e.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (start === null || end === null) return;

    const ranges = findVariableRanges(currentValue);
    if (ranges.length === 0) return;

    if (e.key === "Backspace") {
      if (start !== end) {
        for (const r of ranges) {
          if ((start >= r.start && start < r.end) || (end > r.start && end <= r.end)) {
            e.preventDefault();
            const minStart = Math.min(start, r.start);
            const maxEnd = Math.max(end, r.end);
            const newValue = currentValue.slice(0, minStart) + currentValue.slice(maxEnd);
            updateFormulaText(formulaId, newValue);
            requestAnimationFrame(() => {
              input.setSelectionRange(minStart, minStart);
            });
            return;
          }
        }
        return;
      }

      for (const r of ranges) {
        if (start > r.start && start <= r.end) {
          e.preventDefault();
          const newValue = currentValue.slice(0, r.start) + currentValue.slice(r.end);
          updateFormulaText(formulaId, newValue);
          requestAnimationFrame(() => {
            input.setSelectionRange(r.start, r.start);
          });
          return;
        }
      }
    } else if (e.key === "Delete") {
      if (start !== end) return;
      for (const r of ranges) {
        if (start >= r.start && start < r.end) {
          e.preventDefault();
          const newValue = currentValue.slice(0, r.start) + currentValue.slice(r.end);
          updateFormulaText(formulaId, newValue);
          requestAnimationFrame(() => {
            input.setSelectionRange(r.start, r.start);
          });
          return;
        }
      }
    }
  };

  const toggleEnable = (id: string, enabled: boolean) => {
    setFormulas((items) => items.map((item) => (item.id === id ? { ...item, enabled } : item)));
    setDirty(true);
  };

  const cancel = () => {
    const data = formulasQuery.data ?? [];
    setFormulas(structuredClone(data));
    const initialRaw: Record<string, string> = {};
    data.forEach((f) => {
      initialRaw[f.id] = expressionToFriendlyText(f.expression, variableNameMap);
    });
    setRawTexts(initialRaw);
    setDirty(false);
    setValidation(null);
  };

  const saveMutation = useMutation({
    mutationFn: () => api.saveFormulas(projectId, formulas),
    onSuccess: (saved) => {
      queryClient.setQueryData(["formulas", projectId], saved);
      setFormulas(structuredClone(saved));
      setDirty(false);
      notify("Đã lưu cấu hình công thức lương thành công!");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const validateMutation = useMutation({
    mutationFn: () => api.validateFormulas(projectId, formulas),
    onSuccess: (result) => {
      setValidation(result);
      notify(
        result.valid ? "Tất cả công thức tính hợp lệ 100%" : `Phát hiện ${result.errors.length} lỗi cần xử lý`,
        result.valid ? "success" : "warning"
      );
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  if (formulasQuery.isLoading || variablesQuery.isLoading) return <LoadingBlock rows={8} />;
  if (formulasQuery.isError || variablesQuery.isError) {
    return (
      <ErrorState
        message="Không thể tải cấu hình công thức."
        retry={() => {
          formulasQuery.refetch();
          variablesQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner - Standard Project Tab Heading */}
      <div className="tab-heading">
        <div>
          <span className="section-kicker">CẤU HÌNH CÔNG THỨC & CẤU TRÚC LƯƠNG</span>
          <h2>Cấu hình Công thức & Cấu trúc Lương</h2>
          <p className="text-xs text-muted mt-1">
            Thiết lập các thành phần lương trên sơ đồ trực quan, sau đó tùy chỉnh biểu thức công thức tính toán chi tiết phía dưới.
          </p>
        </div>

        <div className="heading-actions">
          <Button variant="secondary" onClick={cancel} disabled={!dirty}>
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4" /> Lưu cấu hình
          </Button>
        </div>
      </div>

      {/* Validation Banner */}
      {validation && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${
            validation.valid
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <strong className="text-xs font-bold block">
                {validation.valid ? "Tất cả công thức hợp lệ 100%" : `Có ${validation.errors.length} lỗi cần xử lý`}
              </strong>
              {validation.errors.length > 0 && (
                <span className="text-xs block opacity-90 mt-0.5">{validation.errors.join("; ")}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setValidation(null)} className="text-xs opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Workspace Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Components Library Sidebar */}
        <aside className="lg:col-span-4 content-card p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <strong className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Thư viện Thành phần Lương
            </strong>
          </div>

          {/* Search Filter */}
          <label className="search-field w-full">
            <Search className="w-4 h-4 text-muted" />
            <input
              placeholder="Tìm kiếm thành phần lương..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </label>

          {/* Group 1: EARNINGS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-extrabold tracking-wider text-muted uppercase">
              <span>1. THU NHẬP (LƯƠNG, PHỤ CẤP)</span>
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] flex items-center justify-center font-mono font-bold">
                {earningsLibrary.length}
              </span>
            </div>

            <div className="space-y-2">
              {earningsLibrary.map((item) => {
                const isAdded = existingOutputCodes.has(item.outputVariable.toUpperCase());

                return (
                  <div
                    key={item.id}
                    draggable={!isAdded}
                    onDragStart={() => setDraggedItem(item)}
                    onDragEnd={() => setDraggedItem(null)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
                      isAdded
                        ? "bg-secondary/40 border-border opacity-50 cursor-not-allowed"
                        : `${item.cardStyle} hover:shadow-sm cursor-grab hover:-translate-y-0.5`
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GripVertical className="w-4 h-4 text-muted/60 shrink-0 cursor-grab" />
                      <div className="min-w-0">
                        <strong className="text-xs font-bold text-foreground truncate block leading-tight">
                          {item.name}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 2: DEDUCTIONS */}
          <div className="space-y-2.5 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs font-extrabold tracking-wider text-muted uppercase">
              <span>2. KHẤU TRỪ & TRÍCH NỘP</span>
              <span className="w-5 h-5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-[10px] flex items-center justify-center font-mono font-bold">
                {deductionsLibrary.length}
              </span>
            </div>

            <div className="space-y-2">
              {deductionsLibrary.map((item) => {
                const isAdded = existingOutputCodes.has(item.outputVariable.toUpperCase());

                return (
                  <div
                    key={item.id}
                    draggable={!isAdded}
                    onDragStart={() => setDraggedItem(item)}
                    onDragEnd={() => setDraggedItem(null)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
                      isAdded
                        ? "bg-secondary/40 border-border opacity-50 cursor-not-allowed"
                        : `${item.cardStyle} hover:shadow-sm cursor-grab hover:-translate-y-0.5`
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GripVertical className="w-4 h-4 text-muted/60 shrink-0 cursor-grab" />
                      <div className="min-w-0">
                        <strong className="text-xs font-bold text-foreground truncate block leading-tight">
                          {item.name}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Column: Flow Canvas & Detailed Formula Cards */}
        <section className="lg:col-span-8 space-y-6">
          <div className="content-card p-4 space-y-4">
            {/* 1. Gross Earnings Structure Box */}
            <div className="formula-flow-node-income p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <strong className="text-sm font-bold text-foreground">Cấu trúc Các khoản Thu nhập (Gross Pay)</strong>
                </div>
              </div>

              {/* Dropzone Container */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedItem && draggedItem.category === "income") {
                    addComponentToStructure(draggedItem);
                  }
                }}
                className="border-2 border-dashed border-border bg-card rounded-lg p-4 min-h-[90px] flex flex-col justify-center transition-colors"
              >
                {grossComponents.length === 0 ? (
                  <div className="text-center text-xs text-muted flex flex-col items-center gap-1 py-2">
                    <div className="w-8 h-8 rounded bg-secondary text-muted flex items-center justify-center font-bold text-base mb-1">
                      +
                    </div>
                    <span>Kéo thả các thành phần thu nhập vào đây</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5 w-full">
                    {grossComponents.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-foreground text-xs font-semibold inline-flex items-center gap-2 shadow-xs hover:border-primary transition-all max-w-full"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-primary shrink-0 opacity-60 cursor-grab" />
                        <span className="truncate">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => removeComponentFromStructure(item.id)}
                          className="text-muted hover:text-destructive p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-0.5"
                          title="Gỡ khỏi cấu trúc"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Minus Circle Badge Divider */}
            <div className="flex justify-center items-center py-1">
              <span className="formula-connector-ring w-8 h-8 rounded-full bg-card border border-border text-destructive font-bold text-base shadow-xs flex items-center justify-center">
                <Minus className="w-4 h-4" />
              </span>
            </div>

            {/* 2. Deductions Structure Box */}
            <div className="formula-flow-node-deduction p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" />
                  <strong className="text-sm font-bold text-foreground">Cấu trúc Các khoản Khấu trừ (Deductions)</strong>
                </div>
              </div>

              {/* Dropzone Container */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedItem && draggedItem.category === "deduction") {
                    addComponentToStructure(draggedItem);
                  }
                }}
                className="border-2 border-dashed border-border bg-card rounded-lg p-4 min-h-[90px] flex flex-col justify-center transition-colors"
              >
                {deductionComponents.length === 0 ? (
                  <div className="text-center text-xs text-muted flex flex-col items-center gap-1 py-2">
                    <div className="w-8 h-8 rounded bg-secondary text-muted flex items-center justify-center font-bold text-base mb-1">
                      +
                    </div>
                    <span>Kéo thả các thành phần khấu trừ vào đây</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5 w-full">
                    {deductionComponents.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-1.5 rounded-full border border-destructive/30 bg-destructive/10 text-foreground text-xs font-semibold inline-flex items-center gap-2 shadow-xs hover:border-destructive transition-all max-w-full"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-destructive shrink-0 opacity-60 cursor-grab" />
                        <span className="truncate">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => removeComponentFromStructure(item.id)}
                          className="text-muted hover:text-destructive p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-0.5"
                          title="Gỡ khỏi cấu trúc"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Equals Circle Badge */}
            <div className="flex justify-center items-center py-1">
              <span className="formula-connector-ring w-8 h-8 rounded-full bg-card border border-border text-foreground font-bold text-sm shadow-xs flex items-center justify-center">
                =
              </span>
            </div>

            {/* 3. Net Payable Output Card */}
            <div className="formula-net-card p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <strong className="text-sm font-bold text-foreground block flex items-center gap-2">
                  Tổng Thực Lãnh (Net Payable)
                  <Badge tone="neutral">Kết quả cuối</Badge>
                </strong>
                <div className="text-xs font-mono font-bold text-primary block mt-0.5">
                  Thực Lãnh = Tổng Thu Nhập − Tổng Khấu Trừ
                </div>
              </div>

              <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>

          {/* 4. Cấu hình công thức chi tiết từng mục (Gộp tất cả items vào cùng 1 card duy nhất) */}
          <div className="content-card">
            <div className="card-heading">
              <div>
                <h3 className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" /> Cấu hình công thức chi tiết từng mục trong cấu trúc
                </h3>
                <p>Thiết lập hoặc tùy chỉnh chuỗi công thức tính toán dạng Excel cho từng thành phần lương đã kéo thả ở trên.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => validateMutation.mutate()}>
                <CheckCircle2 className="w-4 h-4 text-primary" /> Kiểm tra tất cả
              </Button>
            </div>

            <div className="divide-y divide-border">
              {formulas.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  Chưa có mục nào trong cấu trúc lương. Hãy chọn/kéo thả các mục từ Thư viện Thành phần Lương ở bên trái.
                </div>
              ) : (
                formulas.map((formula, idx) => {
                  const isIncome = formula.category === "income";
                  const isEditing = editingFormulaIds.has(formula.id);

                  return (
                    <div
                      key={formula.id}
                      className={`p-4 transition-colors space-y-3 ${
                        isEditing ? "bg-secondary/30" : "hover:bg-secondary/15"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <strong className="text-sm font-bold text-foreground block truncate">{formula.name}</strong>
                          </div>
                          <Badge tone={isIncome ? "success" : formula.category === "deduction" ? "danger" : "info"}>
                            {categoryLabels[formula.category]}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant={isEditing ? "primary" : "secondary"}
                            size="sm"
                            onClick={() => toggleEditFormula(formula.id)}
                            title={isEditing ? "Lưu / Thu gọn" : "Chỉnh sửa công thức"}
                          >
                            {isEditing ? <Save className="w-4 h-4" /> : <Pencil className="w-4 h-4 text-primary" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeComponentFromStructure(formula.id)}
                            title="Gỡ khỏi cấu trúc"
                            className="text-muted hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* VIEW MODE SUMMARY */}
                      {!isEditing && (
                        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border flex items-center gap-2 text-xs">
                          <span className="text-muted font-bold shrink-0">Biểu thức:</span>
                          <code className="font-mono text-xs font-bold text-primary truncate">
                            {getFormulaRawText(formula)}
                          </code>
                        </div>
                      )}

                      {/* EDIT MODE PANEL */}
                      {isEditing && (
                        <div className="pt-3 border-t border-border space-y-3">
                          {/* Quick Chips Bar */}
                          <div className="p-2 rounded-lg bg-secondary/30 border border-border flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-muted mr-1">Chèn nhanh biến số:</span>
                            {getSuggestedVariables(formula, variables).map((v) => (
                              <Button
                                key={v.code}
                                type="button"
                                variant="secondary"
                                size="sm"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  const current = getFormulaRawText(formula);
                                  const next = current ? `${current} ${v.name}` : v.name;
                                  updateFormulaText(formula.id, next);

                                  const inputEl = inputRefs.current[formula.id];
                                  if (inputEl) {
                                    inputEl.focus();
                                    const pos = next.length;
                                    requestAnimationFrame(() => {
                                      inputEl.setSelectionRange(pos, pos);
                                    });
                                  }
                                }}
                                className="h-7 px-2 text-[11px]"
                              >
                                {v.name}
                              </Button>
                            ))}
                          </div>

                          {/* Formula Editor Input */}
                          <div className="space-y-1.5 pt-1">
                            <label className="form-field">
                              <span className="text-xs font-bold text-muted flex items-center justify-between">
                                <span className="text-foreground font-bold">Công thức tính toán (Cú pháp Excel)</span>
                                <small className="font-mono text-[10px]">Toán tử: +  -  *  /  (  )</small>
                              </span>
                              <input
                                ref={(el) => {
                                  inputRefs.current[formula.id] = el;
                                }}
                                className="font-mono text-xs font-bold text-primary bg-card border border-input focus:border-primary p-2.5 rounded-lg w-full transition-colors"
                                value={getFormulaRawText(formula)}
                                onChange={(e) => updateFormulaText(formula.id, e.target.value)}
                                onKeyDown={(e) => handleFormulaKeyDown(e, formula.id, getFormulaRawText(formula))}
                                placeholder="Lương cơ bản / Giờ chuẩn * Giờ thưởng"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      <SaveBar visible={dirty} saving={saveMutation.isPending} onSave={() => saveMutation.mutate()} onCancel={cancel} />
    </div>
  );
}
