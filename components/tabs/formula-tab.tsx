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
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, ErrorState, LoadingBlock, SaveBar } from "@/components/ui";
import { api } from "@/lib/api";
import { expressionToText, parseExpressionText } from "@/lib/formula-engine";
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
}

const libraryComponents: LibraryComponentItem[] = [
  // Earnings
  {
    id: "lib-1",
    code: "VAR_BASE_01",
    name: "Basic Salary (Lương cơ bản)",
    outputVariable: "LUONG_CO_BAN",
    category: "income",
    defaultFormulaText: "LUONG_CO_BAN / GIO_CHUAN * GIO_THUONG",
    iconName: "basic",
  },
  {
    id: "lib-2",
    code: "CALC_OT_RATES",
    name: "Overtime (OT - Lương tăng ca)",
    outputVariable: "LUONG_OT_150",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 1.5 * GIO_OT_150",
    iconName: "ot",
  },
  {
    id: "lib-3",
    code: "VAR_BONUS_KPI",
    name: "Performance Bonus (Thưởng KPI)",
    outputVariable: "THUONG_KPI",
    category: "income",
    defaultFormulaText: "THUONG_DANG_KY * TY_LE_HOAN_THANH",
    iconName: "bonus",
  },
  {
    id: "lib-4",
    code: "ALLOW_HOUSE_01",
    name: "Housing Allowance (Phụ cấp nhà ở)",
    outputVariable: "PC_NHA_O_CONG",
    category: "income",
    defaultFormulaText: "PC_NHA_O / GIO_CHUAN * GIO_THUONG",
    iconName: "housing",
  },
  {
    id: "lib-5",
    code: "ALLOW_TRAVEL_01",
    name: "Travel Allowance (Phụ cấp đi lại)",
    outputVariable: "PC_DI_LAI_CONG",
    category: "income",
    defaultFormulaText: "PC_DI_LAI / GIO_CHUAN * GIO_THUONG",
    iconName: "housing",
  },

  // Deductions
  {
    id: "lib-6",
    code: "TAX_PIT_TIERS",
    name: "Income Tax (Thuế TNCN)",
    outputVariable: "THUE_TNCN",
    category: "deduction",
    defaultFormulaText: "THU_NHAP_CHIU_THUE * 0.05",
    iconName: "tax",
  },
  {
    id: "lib-7",
    code: "DED_SOC_INS",
    name: "Social Insurance (Bảo hiểm xã hội 10.5%)",
    outputVariable: "BAO_HIEM_NV",
    category: "deduction",
    defaultFormulaText: "LUONG_DONG_BH * 0.105",
    iconName: "insurance",
  },
  {
    id: "lib-8",
    code: "DED_UNION_FEE",
    name: "Union Fee (Đoàn phí công đoàn 1%)",
    outputVariable: "CONG_DOAN_NV",
    category: "deduction",
    defaultFormulaText: "LUONG_CO_BAN * 0.01",
    iconName: "union",
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
      return <Coins className={className} />;
    case "ot":
      return <Clock className={className} />;
    case "bonus":
      return <TrendingUp className={className} />;
    case "housing":
      return <Home className={className} />;
    case "tax":
      return <MinusCircle className={className} />;
    case "insurance":
      return <Shield className={className} />;
    case "union":
      return <Users className={className} />;
    default:
      return <Coins className={className} />;
  }
}

function FormulaCodeBadge({ text }: { text: string }) {
  if (!text) return null;
  const tokens = text.split(/(\s+)/);

  return (
    <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs font-semibold shadow-inner inline-flex items-center gap-1.5 flex-wrap">
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
        return (
          <span
            key={idx}
            className="text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/60 text-[11.5px]"
          >
            {tok}
          </span>
        );
      })}
    </div>
  );
}

export function FormulaTab({ projectId, embedded = false }: { projectId: string; embedded?: boolean }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const formulasQuery = useQuery({ queryKey: ["formulas", projectId], queryFn: () => api.getFormulas(projectId) });
  const variablesQuery = useQuery({ queryKey: ["formula-variables"], queryFn: api.getFormulaVariables });

  const [formulas, setFormulas] = useState<SalaryFormula[]>([]);
  const [activeTab, setActiveTab] = useState<"grossToNet" | "netToGross" | "severance">("grossToNet");
  const [filterSearch, setFilterSearch] = useState("");
  const [prorateEnabled, setProrateEnabled] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);

  // Dragged component state
  const [draggedItem, setDraggedItem] = useState<LibraryComponentItem | null>(null);

  useEffect(() => {
    if (formulasQuery.data) {
      setFormulas(structuredClone(formulasQuery.data));
    }
  }, [formulasQuery.data]);

  const variables = useMemo(() => variablesQuery.data ?? [], [variablesQuery.data]);
  const variableNameMap = useMemo(() => new Map(variables.map((item) => [item.code, item.name])), [variables]);

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
    const newFormula: SalaryFormula = {
      id: uid("formula"),
      projectId,
      code: item.code,
      name: item.name,
      outputVariable: item.outputVariable,
      category: item.category,
      order: newOrder,
      expression: parseExpressionText(item.defaultFormulaText),
      rounding: { mode: "nearest", precision: 1 },
      enabled: true,
    };
    setFormulas((prev) => [...prev, newFormula]);
    setDirty(true);
    notify(`Đã đưa "${item.name}" vào cấu trúc lương`);
  };

  const removeComponentFromStructure = (id: string) => {
    setFormulas((prev) => prev.filter((item) => item.id !== id));
    setDirty(true);
    notify("Đã gỡ mục khỏi cấu trúc");
  };

  const updateFormulaText = (id: string, text: string) => {
    const parsed = parseExpressionText(text);
    setFormulas((prev) => prev.map((f) => (f.id === id ? { ...f, expression: parsed } : f)));
    setDirty(true);
  };

  const toggleEnable = (id: string, enabled: boolean) => {
    setFormulas((items) => items.map((item) => (item.id === id ? { ...item, enabled } : item)));
    setDirty(true);
  };

  const cancel = () => {
    setFormulas(structuredClone(formulasQuery.data ?? []));
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
      {/* Senior Designed Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest uppercase bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent block mb-1">
            PAYROLL STRUCTURE ENGINE
          </span>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Formula Configuration</h2>
          <p className="text-xs text-muted mt-0.5">
            Configure structural components on the visual canvas, then define natural Excel formulas below.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={cancel} disabled={!dirty}>
            Discard
          </Button>
          <Button
            variant="primary"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </Button>
        </div>
      </div>

      {/* Validation Banner */}
      {validation && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm ${
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
        <aside className="lg:col-span-4 bg-card border border-border rounded-2xl p-4.5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <strong className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Components Library
            </strong>
          </div>

          {/* Search Filter */}
          <label className="search-field w-full">
            <Search className="w-4 h-4 text-muted" />
            <input
              placeholder="Filter items..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </label>

          {/* Group 1: EARNINGS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-extrabold tracking-wider text-muted uppercase">
              <span>EARNINGS (LƯƠNG, PHỤ CẤP)</span>
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] flex items-center justify-center font-mono font-bold">
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
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isAdded
                        ? "bg-secondary/40 border-border opacity-50 cursor-not-allowed"
                        : "bg-card hover:border-emerald-500/50 border-border shadow-xs hover:shadow-md cursor-grab hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GripVertical className="w-4 h-4 text-muted shrink-0 opacity-40" />
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <ComponentIcon name={item.iconName} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <strong className="text-xs font-bold text-foreground truncate block leading-snug">
                          {item.name}
                        </strong>
                        <code className="text-[10px] font-mono text-muted">{item.code}</code>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isAdded}
                      onClick={() => addComponentToStructure(item)}
                      className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center shrink-0 transition-all hover:scale-110 disabled:opacity-30 disabled:pointer-events-none"
                      title="Thêm vào cấu trúc"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 2: DEDUCTIONS */}
          <div className="space-y-2.5 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs font-extrabold tracking-wider text-muted uppercase">
              <span>DEDUCTIONS (KHẤU TRỪ)</span>
              <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] flex items-center justify-center font-mono font-bold">
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
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isAdded
                        ? "bg-secondary/40 border-border opacity-50 cursor-not-allowed"
                        : "bg-card hover:border-rose-400 border-border shadow-xs hover:shadow-md cursor-grab hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GripVertical className="w-4 h-4 text-muted shrink-0 opacity-40" />
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                        <ComponentIcon name={item.iconName} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <strong className="text-xs font-bold text-foreground truncate block leading-snug">
                          {item.name}
                        </strong>
                        <code className="text-[10px] font-mono text-muted">{item.code}</code>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isAdded}
                      onClick={() => addComponentToStructure(item)}
                      className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center shrink-0 transition-all hover:scale-110 disabled:opacity-30 disabled:pointer-events-none"
                      title="Thêm vào cấu trúc"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Column: Visual Structure Drag & Drop Canvas */}
        <section className="lg:col-span-8 bg-card border border-border rounded-2xl p-5.5 shadow-sm space-y-6">
          {/* Tab Switcher Navigation */}
          <div className="flex items-center gap-6 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("grossToNet")}
              className={`text-xs font-bold transition-all relative pb-2 ${
                activeTab === "grossToNet" ? "text-primary border-b-2 border-primary" : "text-muted hover:text-foreground"
              }`}
            >
              Gross to Net
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("netToGross")}
              className={`text-xs font-bold transition-all relative pb-2 ${
                activeTab === "netToGross" ? "text-primary border-b-2 border-primary" : "text-muted hover:text-foreground"
              }`}
            >
              Net to Gross
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("severance")}
              className={`text-xs font-bold transition-all relative pb-2 ${
                activeTab === "severance" ? "text-primary border-b-2 border-primary" : "text-muted hover:text-foreground"
              }`}
            >
              Severance
            </button>
          </div>

          {/* 1. Gross Earnings Structure Box */}
          <div className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.02] to-transparent rounded-r-2xl border border-emerald-500/20 p-4.5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <strong className="text-sm font-bold text-foreground">Gross Earnings Structure</strong>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium">Prorate</span>
                <Switch.Root
                  className="switch-root"
                  checked={prorateEnabled}
                  onCheckedChange={setProrateEnabled}
                  aria-label="Prorate"
                >
                  <Switch.Thumb />
                </Switch.Root>
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
              className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 backdrop-blur-xs rounded-2xl p-4 min-h-[110px] flex flex-col items-center justify-center gap-2 transition-all hover:border-emerald-400"
            >
              {grossComponents.length === 0 ? (
                <div className="text-center text-xs text-muted flex flex-col items-center gap-1 py-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg mb-1 shadow-xs">
                    +
                  </div>
                  <span className="font-medium">Drag earning components here</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  {grossComponents.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-emerald-500/20 bg-card shadow-xs flex items-center justify-between gap-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GripVertical className="w-4 h-4 text-muted shrink-0 opacity-40" />
                        <div className="min-w-0">
                          <strong className="text-xs font-bold text-foreground truncate block leading-tight">
                            {item.name}
                          </strong>
                          <code className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {item.outputVariable}
                          </code>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeComponentFromStructure(item.id)}
                        className="text-muted hover:text-destructive p-1 rounded transition-colors"
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
          <div className="flex justify-center -my-2">
            <span className="w-8 h-8 rounded-full bg-card border border-border text-rose-500 font-bold text-base shadow-sm flex items-center justify-center">
              <Minus className="w-4 h-4" />
            </span>
          </div>

          {/* 2. Deductions Structure Box */}
          <div className="border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-500/10 via-rose-500/[0.02] to-transparent rounded-r-2xl border border-rose-500/20 p-4.5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <strong className="text-sm font-bold text-foreground">Deductions Structure</strong>
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
              className="border-2 border-dashed border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 backdrop-blur-xs rounded-2xl p-4 min-h-[110px] flex flex-col items-center justify-center gap-2 transition-all hover:border-rose-400"
            >
              {deductionComponents.length === 0 ? (
                <div className="text-center text-xs text-muted flex flex-col items-center gap-1 py-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg mb-1 shadow-xs">
                    +
                  </div>
                  <span className="font-medium">Drag deduction components here</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  {deductionComponents.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-rose-500/20 bg-card shadow-xs flex items-center justify-between gap-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GripVertical className="w-4 h-4 text-muted shrink-0 opacity-40" />
                        <div className="min-w-0">
                          <strong className="text-xs font-bold text-foreground truncate block leading-tight">
                            {item.name}
                          </strong>
                          <code className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {item.outputVariable}
                          </code>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeComponentFromStructure(item.id)}
                        className="text-muted hover:text-destructive p-1 rounded transition-colors"
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
          <div className="flex justify-center -my-2">
            <span className="w-8 h-8 rounded-full bg-card border border-border text-indigo-600 dark:text-indigo-400 font-bold text-sm shadow-sm flex items-center justify-center">
              =
            </span>
          </div>

          {/* 3. Net Payable Output Card */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-purple-500/10 border border-indigo-500/30 flex items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <strong className="text-sm font-bold text-foreground block">Net Payable (Lương Thực Nhận)</strong>
              <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                FINAL_NET_PAY = GROSS_EARNINGS - TOTAL_DEDUCTIONS
              </code>
            </div>

            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
        </section>
      </div>

      {/* SECTION BÊN DƯỚI: CONFIG CÔNG THỨC CHI TIẾT CHO TỪNG MỤC */}
      <section className="bg-card border border-border rounded-2xl p-5.5 shadow-sm space-y-4 mt-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <strong className="text-base font-bold text-foreground flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" /> Cấu hình công thức chi tiết từng mục trong cấu trúc
            </strong>
            <p className="text-xs text-muted mt-0.5">
              Thiết lập hoặc tùy chỉnh chuỗi công thức tính toán dạng Excel cho từng thành phần lương đã kéo thả ở trên.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => validateMutation.mutate()}>
            <CheckCircle2 className="w-4 h-4" /> Kiểm tra tất cả
          </Button>
        </div>

        <div className="space-y-4">
          {formulas.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              Chưa có mục nào trong cấu trúc lương. Hãy chọn/kéo thả các mục từ <strong>Components Library</strong> ở trên.
            </div>
          ) : (
            formulas.map((formula, idx) => {
              const isIncome = formula.category === "income";

              return (
                <div
                  key={formula.id}
                  className="p-4.5 rounded-2xl border border-border bg-secondary/20 hover:border-primary/40 transition-colors space-y-3.5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-secondary border border-border text-muted font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <strong className="text-sm font-bold text-foreground block">{formula.name}</strong>
                        <code className="text-xs font-mono text-primary font-bold">{formula.outputVariable}</code>
                      </div>
                      <Badge tone={isIncome ? "success" : formula.category === "deduction" ? "danger" : "info"}>
                        {categoryLabels[formula.category]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted font-semibold">
                        {formula.enabled ? "Áp dụng" : "Tắt"}
                      </span>
                      <Switch.Root
                        className="switch-root"
                        checked={formula.enabled}
                        onCheckedChange={(enabled) => toggleEnable(formula.id, enabled)}
                        aria-label="Bật tắt công thức"
                      >
                        <Switch.Thumb />
                      </Switch.Root>
                      <button
                        type="button"
                        onClick={() => removeComponentFromStructure(formula.id)}
                        className="p-1 rounded text-muted hover:text-destructive transition-colors"
                        title="Gỡ khỏi cấu trúc"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Formula Editor Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center pt-1">
                    <div className="lg:col-span-7 space-y-1.5">
                      <label className="form-field">
                        <span className="text-xs font-bold text-muted flex items-center justify-between">
                          <span>Công thức tính toán (Cú pháp Excel)</span>
                          <small className="font-mono text-[10px]">Toán tử: +  -  *  /  (  )</small>
                        </span>
                        <input
                          className="font-mono text-xs font-bold text-primary bg-card border-2 border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/10 p-2.5 rounded-xl shadow-xs transition-all"
                          value={expressionToText(formula.expression)}
                          onChange={(e) => updateFormulaText(formula.id, e.target.value)}
                          placeholder="LUONG_CO_BAN / GIO_CHUAN * GIO_THUONG"
                        />
                      </label>
                    </div>

                    <div className="lg:col-span-5">
                      <span className="text-[11px] font-bold text-muted block mb-1">
                        Biểu thức trực quan:
                      </span>
                      <FormulaCodeBadge text={expressionToText(formula.expression)} />
                    </div>
                  </div>

                  {/* Quick Chips Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/50">
                    <span className="text-[11px] font-bold text-muted mr-1">Chèn nhanh biến số:</span>
                    {variables.slice(0, 7).map((v) => (
                      <button
                        key={v.code}
                        type="button"
                        onClick={() => {
                          const current = expressionToText(formula.expression);
                          updateFormulaText(formula.id, `${current} ${v.code}`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-card hover:bg-primary-soft hover:border-primary border border-border text-[11px] font-semibold text-foreground hover:text-primary transition-all shadow-xs"
                      >
                        + {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <SaveBar visible={dirty} saving={saveMutation.isPending} onSave={() => saveMutation.mutate()} onCancel={cancel} />
    </div>
  );
}
