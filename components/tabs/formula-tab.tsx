"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronUp,
  GripVertical,
  Layers,
  Minus,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, ErrorState, LoadingBlock, SaveBar } from "@/components/ui";
import { api } from "@/lib/api";
import { ProjectParametersModal } from "@/components/formula/project-parameters-modal";
import { SmartFormulaEditor } from "@/components/formula/smart-formula-editor";
import {
  collectVariables,
  expressionToFriendlyText,
  parseExpressionText,
  tokenizeFriendlyText,
  variableCodeToName,
} from "@/lib/formula-engine";
import {
  salaryComponentLibrary,
  type SalaryComponentDefinition,
} from "@/lib/payroll-component-library";
import type { ExpressionNode, ProjectCustomVariable, SalaryFormula } from "@/lib/types";
import { uid } from "@/lib/utils";

const categoryLabels: Record<SalaryFormula["category"], string> = {
  income: "Thu nhập",
  deduction: "Khấu trừ",
  aggregate: "Tổng hợp",
  net: "Kết quả thực nhận",
  attendance: "Chấm công",
};

export function OperatorSymbol({
  op,
  className = "w-3.5 h-3.5",
}: {
  op: string;
  className?: string;
}) {
  if (op === "/" || op === "÷") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Dấu chia"
      >
        <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.6" />
        <circle cx="12" cy="6" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (op === "*" || op === "×") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Dấu nhân"
      >
        <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
        <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
      </svg>
    );
  }

  if (op === "+") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Dấu cộng"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }

  if (op === "-" || op === "−") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Dấu trừ"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }

  return <span className="font-bold text-sm leading-none">{op}</span>;
}

function renderVisualExpressionNode(
  node: ExpressionNode,
  variableNameMap?: Map<string, string>,
  parentOperator?: string,
  isRightChild = false
): React.ReactNode[] {
  if (node.type === "constant") {
    return [
      <span
        key={`const-${node.value}-${Math.random()}`}
        className="formula-const-pill"
        title="Hằng số"
      >
        {node.value}
      </span>,
    ];
  }

  if (node.type === "variable") {
    const label =
      variableNameMap?.get(node.variableCode) ??
      variableCodeToName[node.variableCode] ??
      node.variableCode;
    return [
      <span
        key={`var-${node.variableCode}-${Math.random()}`}
        className="formula-var-pill"
        title={label}
      >
        {label}
      </span>,
    ];
  }

  if (node.type === "if") {
    const condElements = renderVisualExpressionNode(node.condition, variableNameMap);
    const thenElements = renderVisualExpressionNode(node.thenBranch, variableNameMap);
    const elseElements = renderVisualExpressionNode(node.elseBranch, variableNameMap);
    return [
      <span key={`if-kw-${Math.random()}`} className="formula-op-pill font-bold" style={{ backgroundColor: "#038b8c", color: "#ffffff" }}>IF</span>,
      <span key={`if-open-${Math.random()}`} className="formula-paren-pill">(</span>,
      ...condElements,
      <span key={`if-c1-${Math.random()}`} className="formula-paren-pill font-bold">,</span>,
      ...thenElements,
      <span key={`if-c2-${Math.random()}`} className="formula-paren-pill font-bold">,</span>,
      ...elseElements,
      <span key={`if-close-${Math.random()}`} className="formula-paren-pill">)</span>,
    ];
  }

  if (node.type === "comparison") {
    const leftElements = renderVisualExpressionNode(node.left, variableNameMap);
    const rightElements = renderVisualExpressionNode(node.right, variableNameMap);
    return [
      ...leftElements,
      <span
        key={`cmp-${node.operator}-${Math.random()}`}
        className="formula-op-pill font-mono font-bold"
        title={`So sánh ${node.operator}`}
      >
        {node.operator}
      </span>,
      ...rightElements,
    ];
  }

  if (node.type === "binary") {
    const currentPrecedence = node.operator === "+" || node.operator === "-" ? 1 : 2;
    const parentPrecedence =
      parentOperator === "+" || parentOperator === "-" ? 1 : parentOperator ? 2 : 0;

    const needsParentheses =
      Boolean(parentOperator) &&
      (currentPrecedence < parentPrecedence ||
        (isRightChild &&
          currentPrecedence === parentPrecedence &&
          (parentOperator === "-" || parentOperator === "/" || parentOperator !== node.operator)));

    const leftElements = renderVisualExpressionNode(
      node.left,
      variableNameMap,
      node.operator,
      false
    );
    const rightElements = renderVisualExpressionNode(
      node.right,
      variableNameMap,
      node.operator,
      true
    );

    const opElement = (
      <span
        key={`op-${node.operator}-${Math.random()}`}
        className="formula-op-pill"
        title={`Toán tử ${node.operator === "*" ? "nhân (×)" : node.operator === "/" ? "chia (÷)" : node.operator === "+" ? "cộng (+)" : "trừ (−)"}`}
      >
        <OperatorSymbol op={node.operator} />
      </span>
    );

    if (needsParentheses) {
      return [
        <span
          key={`open-${Math.random()}`}
          className="formula-paren-pill"
        >
          (
        </span>,
        ...leftElements,
        opElement,
        ...rightElements,
        <span
          key={`close-${Math.random()}`}
          className="formula-paren-pill"
        >
          )
        </span>,
      ];
    }

    return [...leftElements, opElement, ...rightElements];
  }

  return [];
}

export function FormulaVisualExpression({
  formula,
  rawText,
  variableNameMap,
}: {
  formula?: SalaryFormula;
  rawText?: string;
  variableNameMap?: Map<string, string>;
}) {
  const elements = (() => {
    if (formula?.expression) {
      return renderVisualExpressionNode(formula.expression, variableNameMap);
    }
    const text = rawText || "";
    if (!text.trim()) return null;
    const customNames = variableNameMap ? Array.from(variableNameMap.values()) : undefined;
    const tokens = tokenizeFriendlyText(text, customNames);
    return tokens.map((tok, idx) => {
      if (tok.type === "function") {
        return (
          <span
            key={`fn-${idx}`}
            className="formula-op-pill font-bold"
            title="Hàm IF"
          >
            {tok.text}
          </span>
        );
      }

      if (tok.type === "operator") {
        return (
          <span
            key={`op-${idx}`}
            className="formula-op-pill"
            title={`Toán tử ${tok.text}`}
          >
            <OperatorSymbol op={tok.text} />
          </span>
        );
      }

      if (tok.type === "number") {
        return (
          <span
            key={`num-${idx}`}
            className="formula-const-pill"
            title="Hằng số"
          >
            {tok.text}
          </span>
        );
      }

      const label =
        variableNameMap?.get(tok.text) ??
        variableCodeToName[tok.text] ??
        tok.text;

      return (
        <span
          key={`var-${idx}`}
          className="formula-var-pill"
          title={label}
        >
          {label}
        </span>
      );
    });
  })();

  if (!elements || elements.length === 0) {
    return <span className="text-muted text-xs italic">Chưa thiết lập công thức</span>;
  }

  return <div className="flex flex-wrap items-center gap-1.5 inline-flex">{elements}</div>;
}

export function FormulaTab({ projectId }: { projectId: string; embedded?: boolean }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const formulasQuery = useQuery({ queryKey: ["formulas", projectId], queryFn: () => api.getFormulas(projectId) });
  const variablesQuery = useQuery({ queryKey: ["formula-variables"], queryFn: api.getFormulaVariables });
  const customVariablesQuery = useQuery({
    queryKey: ["project-custom-variables", projectId],
    queryFn: () => api.getProjectCustomVariables(projectId),
  });

  const customVariables = useMemo(() => customVariablesQuery.data ?? [], [customVariablesQuery.data]);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);

  const missingParamsCount = useMemo(() => {
    return customVariables.filter((v) => v.value === null || v.value === undefined).length;
  }, [customVariables]);

  const [formulas, setFormulas] = useState<SalaryFormula[]>([]);
  const [rawTexts, setRawTexts] = useState<Record<string, string>>({});
  const [editingFormulaIds, setEditingFormulaIds] = useState<Set<string>>(new Set());

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
  const [filterSearch, setFilterSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);

  // Dragged component state
  const [draggedItem, setDraggedItem] = useState<SalaryComponentDefinition | null>(null);

  // Auto-scroll the page smoothly when dragging near top or bottom edges
  useEffect(() => {
    if (!draggedItem) return;

    let animFrameId: number | null = null;
    let currentSpeed = 0;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      const threshold = 140; // Pixels from viewport top/bottom edge
      const maxSpeed = 26;
      const clientY = e.clientY;
      const innerHeight = window.innerHeight;

      if (clientY < threshold) {
        // Dragging near top: scroll UP
        const ratio = (threshold - Math.max(0, clientY)) / threshold;
        currentSpeed = -Math.round(ratio * maxSpeed);
      } else if (clientY > innerHeight - threshold) {
        // Dragging near bottom: scroll DOWN
        const ratio = (clientY - (innerHeight - threshold)) / threshold;
        currentSpeed = Math.round(ratio * maxSpeed);
      } else {
        currentSpeed = 0;
      }

      if (currentSpeed !== 0 && animFrameId === null) {
        const scrollStep = () => {
          if (currentSpeed !== 0) {
            window.scrollBy({ top: currentSpeed, behavior: "instant" as ScrollBehavior });
            animFrameId = requestAnimationFrame(scrollStep);
          } else {
            animFrameId = null;
          }
        };
        animFrameId = requestAnimationFrame(scrollStep);
      }
    };

    const stopAutoScroll = () => {
      currentSpeed = 0;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    };

    window.addEventListener("dragover", onDragOver, { passive: false });
    window.addEventListener("dragend", stopAutoScroll);
    window.addEventListener("drop", stopAutoScroll);

    return () => {
      stopAutoScroll();
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragend", stopAutoScroll);
      window.removeEventListener("drop", stopAutoScroll);
    };
  }, [draggedItem]);

  const variables = useMemo(() => {
    const base = variablesQuery.data ?? [];
    const customMap = new Map(customVariables.map((c) => [c.code, c]));

    const result = base.map((v) => {
      const custom = customMap.get(v.code);
      if (custom) {
        return {
          ...v,
          value: custom.value,
          sampleValue: custom.value ?? custom.defaultValue ?? v.sampleValue ?? 0,
        };
      }
      return v;
    });

    const existingCodes = new Set(result.map((r) => r.code));
    customVariables.forEach((c) => {
      if (!existingCodes.has(c.code)) {
        result.push({
          code: c.code,
          name: c.name,
          group: "custom",
          unit: c.unit,
          description: c.description,
          defaultValue: c.defaultValue,
          sampleValue: c.value ?? c.defaultValue ?? 0,
          value: c.value,
          isCustom: true,
        });
      }
    });

    return result;
  }, [variablesQuery.data, customVariables]);

  const variableNameMap = useMemo(() => new Map(variables.map((item) => [item.code, item.name])), [variables]);

  const getMissingCustomParams = (formula: SalaryFormula) => {
    const customMap = new Map(customVariables.map((c) => [c.code, c]));
    const used = collectVariables(formula.expression);
    const missing: ProjectCustomVariable[] = [];
    used.forEach((code) => {
      const c = customMap.get(code);
      if (c && (c.value === null || c.value === undefined)) {
        missing.push(c);
      }
    });
    return missing;
  };

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
  const deductionComponents = useMemo(
    () => formulas.filter((f) => f.category === "deduction" && f.code !== "TOTAL_DEDUCTION"),
    [formulas],
  );

  const filteredLibrary = useMemo(() => {
    const q = filterSearch.toLowerCase().trim();
    if (!q) return salaryComponentLibrary;
    return salaryComponentLibrary.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
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

  // Track which formula items have unsaved changes compared to server data
  const modifiedFormulaIds = useMemo(() => {
    const originalList = formulasQuery.data ?? [];
    const originalMap = new Map(
      originalList.map((f) => [f.id, expressionToFriendlyText(f.expression, variableNameMap)])
    );
    const modified = new Set<string>();

    for (const f of formulas) {
      const currentText = (rawTexts[f.id] ?? expressionToFriendlyText(f.expression, variableNameMap)).trim();
      const originalText = (originalMap.get(f.id) ?? "").trim();
      if (!originalMap.has(f.id) || currentText !== originalText) {
        modified.add(f.id);
      }
    }
    return modified;
  }, [formulas, rawTexts, formulasQuery.data, variableNameMap]);

  // Add component to structure
  const addComponentToStructure = (item: SalaryComponentDefinition) => {
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
          <h2>Cấu hình Công thức & Cấu trúc Lương</h2>
          <p className="text-xs text-muted mt-1">
            Thiết lập các thành phần lương trên sơ đồ trực quan, sau đó tùy chỉnh biểu thức công thức tính toán chi tiết phía dưới.
          </p>
        </div>

        <div className="heading-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsParamsModalOpen(true)}
            className="h-9 gap-1.5 shadow-2xs text-xs font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Tham số dự án
            {missingParamsCount > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/25 animate-pulse">
                Thiếu {missingParamsCount}
              </span>
            ) : customVariables.length > 0 ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/25">
                {customVariables.length}
              </span>
            ) : null}
          </Button>
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
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${validation.valid
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Components Library Sidebar (Compact Width, Sticky & Matching Chip Size) */}
        <aside className="lg:col-span-4 content-card p-3.5 space-y-3.5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] lg:overflow-y-auto">
          <div className="flex items-center justify-between pb-2.5 border-b border-border">
            <strong className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" /> Thư viện Thành phần Lương
            </strong>
          </div>

          {/* Search Filter */}
          <label className="search-field w-full !max-w-full shrink-0 h-8 min-h-[32px] gap-2 px-2.5">
            <Search className="w-3.5 h-3.5 text-muted shrink-0" />
            <input
              placeholder="Tìm kiếm thành phần lương..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="text-xs"
            />
            {filterSearch && (
              <button
                type="button"
                onClick={() => setFilterSearch("")}
                className="p-0.5 rounded text-muted hover:text-foreground shrink-0"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>

          {/* Group 1: EARNINGS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-muted uppercase pb-0.5">
              <span>1. THU NHẬP ({earningsLibrary.length})</span>
            </div>

            <div className="space-y-1.5">
              {earningsLibrary.map((item) => {
                const isAdded = existingOutputCodes.has(item.outputVariable.toUpperCase());

                return (
                  <div
                    key={item.id}
                    draggable={!isAdded}
                    onDragStart={() => setDraggedItem(item)}
                    onDragEnd={() => setDraggedItem(null)}
                    title={item.description}
                    className={`w-full min-h-[34px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 transition-all group ${
                      isAdded
                        ? "bg-secondary/40 border-border/30 text-muted-foreground opacity-50 cursor-not-allowed shadow-none"
                        : "bg-card border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-foreground shadow-2xs cursor-grab active:scale-[0.99]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-muted/60 shrink-0 cursor-grab" />
                      <span className="truncate block">{item.name}</span>
                    </div>

                    {isAdded ? (
                      <span className="h-6 text-[11px] font-medium text-muted shrink-0 flex items-center">
                        Đã thêm
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addComponentToStructure(item);
                        }}
                        title={`Thêm "${item.name}" vào cấu trúc`}
                        className="h-6 w-6 rounded-md text-primary hover:bg-primary-soft flex items-center justify-center transition-colors shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 2: DEDUCTIONS */}
          <div className="space-y-1.5 pt-2.5 border-t border-border">
            <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-muted uppercase pb-0.5">
              <span>2. KHẤU TRỪ ({deductionsLibrary.length})</span>
            </div>

            <div className="space-y-1.5">
              {deductionsLibrary.map((item) => {
                const isAdded = existingOutputCodes.has(item.outputVariable.toUpperCase());

                return (
                  <div
                    key={item.id}
                    draggable={!isAdded}
                    onDragStart={() => setDraggedItem(item)}
                    onDragEnd={() => setDraggedItem(null)}
                    title={item.description}
                    className={`w-full min-h-[34px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 transition-all group ${
                      isAdded
                        ? "bg-secondary/40 border-border/30 text-muted-foreground opacity-50 cursor-not-allowed shadow-none"
                        : "bg-card border-border/50 hover:border-rose-500/50 hover:bg-rose-500/5 text-foreground shadow-2xs cursor-grab active:scale-[0.99]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-muted/60 shrink-0 cursor-grab" />
                      <span className="truncate block">{item.name}</span>
                    </div>

                    {isAdded ? (
                      <span className="h-6 text-[11px] font-medium text-muted shrink-0 flex items-center">
                        Đã thêm
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addComponentToStructure(item);
                        }}
                        title={`Thêm "${item.name}" vào cấu trúc`}
                        className="h-6 w-6 rounded-md text-primary hover:bg-primary-soft flex items-center justify-center transition-colors shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 3: PROJECT CUSTOM PARAMETERS */}
          {customVariables.length > 0 && (
            <div className="space-y-1.5 pt-2.5 border-t border-border">
              <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-muted uppercase pb-0.5">
                <span className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-primary" />
                  3. THAM SỐ DỰ ÁN ({customVariables.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsParamsModalOpen(true)}
                  className="text-primary hover:underline lowercase text-[10.5px] font-normal"
                >
                  Cài đặt
                </button>
              </div>

              <div className="space-y-1.5">
                {customVariables.map((param) => {
                  const hasValue = param.value !== null && param.value !== undefined;

                  return (
                    <button
                      type="button"
                      key={param.id || param.code}
                      onClick={() => setIsParamsModalOpen(true)}
                      className="w-full min-h-[34px] px-2.5 py-1.5 rounded-lg border border-border/70 bg-card text-left text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs group hover:border-primary/40 cursor-pointer transition-all"
                      title={`${param.description || param.name} - Bấm để chỉnh sửa`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            hasValue ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        <span className="truncate block text-foreground group-hover:text-primary transition-colors">
                          {param.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {hasValue ? (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                            {typeof param.value === "number"
                              ? param.value.toLocaleString("vi-VN")
                              : param.value}{" "}
                            {param.unit}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded">
                            Chưa nhập
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Right Column: Flow Canvas & Detailed Formula Cards */}
        <section className="lg:col-span-8 space-y-5">
          {/* 1. Unified Payroll Flow Architecture Pipeline (Balanced 2-Column Format) */}
          <div className="content-card overflow-hidden !p-0 border border-border shadow-xs">
            {/* Header with Title and Pipeline Equation Badge */}
            <div className="px-4 py-3 bg-secondary/30 border-b border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-sm font-bold text-foreground block">
                    Cấu trúc Dòng tiền Lương
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Kéo thả các thành phần từ thư viện bên trái vào từng nhóm tương ứng
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Workspace: Inputs (Earnings - Deductions) -> Result (Net Payable) */}
            <div className="p-4 space-y-3">
              {/* Row 1: 2-Column Inputs (Thu Nhập - Khấu Trừ) */}
              <div className="flex flex-col md:flex-row items-stretch gap-3">
                {/* Left Box: Gross Earnings (Thu Nhập) */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedItem && draggedItem.category === "income") {
                      addComponentToStructure(draggedItem);
                    }
                  }}
                  className="flex-1 rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 flex flex-col space-y-2.5 transition-all hover:border-emerald-500/40"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Các khoản Thu nhập
                    </strong>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {grossComponents.length} khoản
                    </span>
                  </div>

                  <div className="border border-dashed border-emerald-500/30 rounded-lg p-2.5 min-h-[76px] bg-card/60 flex flex-wrap items-center content-start gap-2 flex-1">
                    {grossComponents.length === 0 ? (
                      <div className="w-full text-center py-3 text-xs text-muted-foreground italic flex flex-col items-center gap-1">
                        <Plus className="w-4 h-4 text-emerald-500/60" />
                        <span>Kéo thả hoặc bấm (+) từ thư viện</span>
                      </div>
                    ) : (
                      grossComponents.map((item) => (
                        <div
                          key={item.id}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-card text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs hover:border-emerald-500 transition-all max-w-full group"
                        >
                          <GripVertical className="w-3 h-3 text-emerald-500/70 shrink-0 cursor-grab" />
                          <span className="truncate">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => removeComponentFromStructure(item.id)}
                            className="text-muted hover:text-destructive p-0.5 rounded hover:bg-destructive/10 transition-colors ml-0.5"
                            title={`Gỡ bỏ ${item.name}`}
                            aria-label={`Gỡ bỏ ${item.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dedicated Center Operator Bridge (Never overlaps card borders) */}
                <div className="flex md:flex-col items-center justify-center shrink-0 self-center py-0.5 md:py-0 px-1">
                  <div
                    className="w-7 h-7 rounded-full bg-card border border-border shadow-2xs flex items-center justify-center text-muted-foreground hover:border-primary/40 transition-colors select-none"
                    title="Trừ đi các khoản khấu trừ"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Right Box: Deductions (Khấu Trừ) */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedItem && draggedItem.category === "deduction") {
                      addComponentToStructure(draggedItem);
                    }
                  }}
                  className="flex-1 rounded-xl border border-rose-500/25 bg-rose-500/5 dark:bg-rose-500/10 p-3.5 flex flex-col space-y-2.5 transition-all hover:border-rose-500/40"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Các khoản Khấu trừ
                    </strong>
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      {deductionComponents.length} khoản
                    </span>
                  </div>

                  <div className="border border-dashed border-rose-500/30 rounded-lg p-2.5 min-h-[76px] bg-card/60 flex flex-wrap items-center content-start gap-2 flex-1">
                    {deductionComponents.length === 0 ? (
                      <div className="w-full text-center py-3 text-xs text-muted-foreground italic flex flex-col items-center gap-1">
                        <Plus className="w-4 h-4 text-rose-500/60" />
                        <span>Kéo thả hoặc bấm (+) từ thư viện</span>
                      </div>
                    ) : (
                      deductionComponents.map((item) => (
                        <div
                          key={item.id}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-card text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs hover:border-rose-500 transition-all max-w-full group"
                        >
                          <GripVertical className="w-3 h-3 text-rose-500/70 shrink-0 cursor-grab" />
                          <span className="truncate">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => removeComponentFromStructure(item.id)}
                            className="text-muted hover:text-destructive p-0.5 rounded hover:bg-destructive/10 transition-colors ml-0.5"
                            title={`Gỡ bỏ ${item.name}`}
                            aria-label={`Gỡ bỏ ${item.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                <p>Thiết lập hoặc tùy chỉnh chuỗi công thức tính toán cho từng thành phần lương đã kéo thả ở trên.</p>
              </div>
            </div>

            <div className="p-4 space-y-3.5 bg-secondary/30">
              {formulas.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted bg-card border border-border rounded-xl">
                  Chưa có mục nào trong cấu trúc lương. Hãy chọn/kéo thả các mục từ Thư viện Thành phần Lương ở bên trái.
                </div>
              ) : (
                formulas.map((formula, idx) => {
                  const isIncome = formula.category === "income";
                  const isEditing = editingFormulaIds.has(formula.id);
                  const isModified = modifiedFormulaIds.has(formula.id);

                  return (
                    <div
                      key={formula.id}
                      className={`rounded-xl border transition-all p-4 space-y-3.5 bg-card ${isModified
                        ? "border-amber-500/80 dark:border-amber-400/80 shadow-xs ring-1 ring-amber-500/20"
                        : isEditing
                          ? "border-primary/80 shadow-sm"
                          : "border-border shadow-2xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
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
                          {isModified && (
                            <Badge tone="warning">
                              Chưa lưu
                            </Badge>
                          )}
                          {(() => {
                            const missingParams = getMissingCustomParams(formula);
                            if (missingParams.length === 0) return null;
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                <AlertCircle className="w-3 h-3" /> Cần nhập: {missingParams.map((m) => m.name).join(", ")}
                              </span>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEditFormula(formula.id)}
                            title={isEditing ? "Thu gọn" : "Chỉnh sửa công thức"}
                          >
                            {isEditing ? <ChevronUp className="w-4 h-4 text-muted" /> : <Pencil className="w-4 h-4 text-primary" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeComponentFromStructure(formula.id)}
                            title="Gỡ khỏi cấu trúc"
                            className="text-muted hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* VIEW MODE SUMMARY WITH GUARANTEED HIGH CONTRAST OPERATOR BADGES */}
                      {!isEditing && (
                        <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-xs font-bold text-muted-foreground shrink-0 mr-1">
                            Biểu thức tính toán:
                          </span>
                          <FormulaVisualExpression
                            formula={formula}
                            rawText={getFormulaRawText(formula)}
                            variableNameMap={variableNameMap}
                          />
                        </div>
                      )}

                      {/* EDIT MODE PANEL */}
                      {isEditing && (
                        <div className="pt-3 border-t border-border space-y-3">
                          <SmartFormulaEditor
                            formula={formula}
                            rawText={getFormulaRawText(formula)}
                            variables={variables}
                            variableNameMap={variableNameMap}
                            onChange={(nextText) => updateFormulaText(formula.id, nextText)}
                          />
                          <span className="text-[11px] text-muted opacity-80 block pt-0.5">
                            * Thay đổi được áp dụng tạm thời. Nhấn nút <strong>Lưu cấu hình</strong> ở phía trên để lưu chính thức vào hệ thống.
                          </span>
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

      {/* Project Parameters Dedicated Modal */}
      <ProjectParametersModal
        projectId={projectId}
        isOpen={isParamsModalOpen}
        onClose={() => setIsParamsModalOpen(false)}
      />

      <SaveBar visible={dirty} saving={saveMutation.isPending} onSave={() => saveMutation.mutate()} onCancel={cancel} />
    </div>
  );
}
