"use client";

import * as Switch from "@radix-ui/react-switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CirclePlus,
  DollarSign,
  MinusCircle,
  Pencil,
  Plus,
  PlusCircle,
  Search,
  Sparkles,
  Trash2,
  Variable,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, ErrorState, LoadingBlock, Modal, SaveBar } from "@/components/ui";
import { api } from "@/lib/api";
import { expressionToText, parseExpressionText } from "@/lib/formula-engine";
import type { SalaryFormula } from "@/lib/types";
import { uid } from "@/lib/utils";

const categoryLabels: Record<SalaryFormula["category"], string> = {
  income: "Thu nhập",
  deduction: "Khấu trừ",
  aggregate: "Tổng hợp",
  net: "Kết quả thực nhận",
  attendance: "Chấm công",
};

interface MasterSalaryItem {
  id: string;
  code: string;
  name: string;
  outputVariable: string;
  category: SalaryFormula["category"];
  defaultFormulaText: string;
  description: string;
}

const masterSalaryItemsCatalog: MasterSalaryItem[] = [
  {
    id: "item-1",
    code: "REGULAR_PAY",
    name: "Lương theo ngày công",
    outputVariable: "LUONG_NGAY_CONG",
    category: "income",
    defaultFormulaText: "LUONG_CO_BAN / GIO_CHUAN * GIO_THUONG",
    description: "Lương cơ bản chia số giờ công chuẩn nhân số giờ công làm thực tế.",
  },
  {
    id: "item-2",
    code: "OT_150_PAY",
    name: "Lương tăng ca ngày thường (150%)",
    outputVariable: "LUONG_OT_150",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 1.5 * GIO_OT_150",
    description: "Tiền làm thêm ban ngày ngày làm việc bình thường.",
  },
  {
    id: "item-3",
    code: "OT_200_NIGHT",
    name: "Lương tăng ca đêm ngày thường (200%)",
    outputVariable: "LUONG_OT_NIGHT_200",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 2.0 * GIO_OT_NIGHT_200",
    description: "Tiền làm thêm ban đêm ngày làm việc bình thường.",
  },
  {
    id: "item-4",
    code: "OT_200_WEEKEND",
    name: "Lương tăng ca ngày nghỉ (200%)",
    outputVariable: "LUONG_OT_WEEKEND_200",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 2.0 * GIO_OT_WEEKEND_200",
    description: "Tiền làm thêm ban ngày ngày nghỉ hằng tuần.",
  },
  {
    id: "item-5",
    code: "OT_270_WEEKEND_NIGHT",
    name: "Lương tăng ca đêm ngày nghỉ (270%)",
    outputVariable: "LUONG_OT_WEEKEND_NIGHT_270",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 2.7 * GIO_OT_WEEKEND_NIGHT_270",
    description: "Tiền làm thêm ca đêm ngày nghỉ hằng tuần.",
  },
  {
    id: "item-6",
    code: "OT_300_HOLIDAY",
    name: "Lương tăng ca ngày Lễ, Tết (300%)",
    outputVariable: "LUONG_OT_HOLIDAY_300",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 3.0 * GIO_OT_HOLIDAY_300",
    description: "Tiền làm thêm ban ngày ngày nghỉ Lễ Tết.",
  },
  {
    id: "item-7",
    code: "OT_390_HOLIDAY_NIGHT",
    name: "Lương tăng ca đêm ngày Lễ, Tết (390%)",
    outputVariable: "LUONG_OT_HOLIDAY_NIGHT_390",
    category: "income",
    defaultFormulaText: "NEN_TINH_OT / GIO_CHUAN * 3.9 * GIO_OT_HOLIDAY_NIGHT_390",
    description: "Tiền làm thêm ca đêm ngày nghỉ Lễ Tết.",
  },
  {
    id: "item-8",
    code: "ALLOWANCE_HOUSING",
    name: "Phụ cấp nhà ở theo ngày công",
    outputVariable: "PC_NHA_O_CONG",
    category: "income",
    defaultFormulaText: "PC_NHA_O / GIO_CHUAN * GIO_THUONG",
    description: "Trợ cấp nhà ở phân bổ theo giờ công thực tế.",
  },
  {
    id: "item-9",
    code: "ALLOWANCE_TRAVEL",
    name: "Phụ cấp đi lại theo ngày công",
    outputVariable: "PC_DI_LAI_CONG",
    category: "income",
    defaultFormulaText: "PC_DI_LAI / GIO_CHUAN * GIO_THUONG",
    description: "Trợ cấp đi lại phân bổ theo giờ công thực tế.",
  },
  {
    id: "item-10",
    code: "BONUS_ATTENDANCE",
    name: "Thưởng chuyên cần tháng",
    outputVariable: "THUONG_CHUYEN_CAN",
    category: "income",
    defaultFormulaText: "PC_CHUYEN_CAN",
    description: "Thưởng đi làm đầy đủ không vi phạm kỷ luật.",
  },
  {
    id: "item-11",
    code: "INSURANCE_EMPLOYEE",
    name: "Bảo hiểm bắt buộc trích nộp (10.5%)",
    outputVariable: "BAO_HIEM_NV",
    category: "deduction",
    defaultFormulaText: "LUONG_DONG_BH * 0.105",
    description: "Tổng BHXH (8%) + BHYT (1.5%) + BHTN (1%) người lao động đóng.",
  },
  {
    id: "item-12",
    code: "TAX_PIT",
    name: "Thuế thu nhập cá nhân (TNCN)",
    outputVariable: "THUE_TNCN",
    category: "deduction",
    defaultFormulaText: "THU_NHAP_CHIU_THUE * 0.05",
    description: "Số tiền thuế TNCN trích nộp theo biểu thuế.",
  },
  {
    id: "item-13",
    code: "UNION_FEE",
    name: "Kinh phí Công đoàn người lao động (1%)",
    outputVariable: "CONG_DOAN_NV",
    category: "deduction",
    defaultFormulaText: "LUONG_CO_BAN * 0.01",
    description: "Đoàn phí công đoàn trích nộp từ lương.",
  },
  {
    id: "item-14",
    code: "ADVANCE_PAYMENT",
    name: "Khấu trừ tạm ứng lương",
    outputVariable: "TAM_UNG_LUONG",
    category: "deduction",
    defaultFormulaText: "KHAU_TRU_TAM_UNG",
    description: "Số tiền tạm ứng lương đã nhận trong kỳ.",
  },
  {
    id: "item-15",
    code: "GROSS_INCOME",
    name: "Tổng thu nhập (Gross Pay)",
    outputVariable: "TONG_THU_NHAP",
    category: "aggregate",
    defaultFormulaText: "LUONG_NGAY_CONG + LUONG_OT_150 + TONG_PHU_CAP",
    description: "Tổng cộng các khoản thu nhập trước trích nộp.",
  },
  {
    id: "item-16",
    code: "TOTAL_DEDUCTIONS",
    name: "Tổng các khoản khấu trừ",
    outputVariable: "TONG_KHAU_TRU",
    category: "deduction",
    defaultFormulaText: "BAO_HIEM_NV + THUE_TNCN + KHAU_TRU_KHAC",
    description: "Tổng các khoản trích nộp bảo hiểm, thuế và các khoản trừ khác.",
  },
  {
    id: "item-17",
    code: "NET_PAYMENT",
    name: "Lương thực lãnh (Net Pay)",
    outputVariable: "THUC_LANH",
    category: "net",
    defaultFormulaText: "TONG_THU_NHAP - TONG_KHAU_TRU",
    description: "Số tiền chuyển khoản thực nhận vào tài khoản người lao động.",
  },
];

const formulaSections = [
  {
    key: "income",
    title: "1. Các khoản Thu nhập (Gross Pay)",
    description: "Cấu hình công thức tính cho từng mục thu nhập, lương ngày công, tăng ca và phụ cấp",
    accentStyle: "border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.02] to-transparent",
    badgeTone: "success" as const,
    iconBoxStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    icon: PlusCircle,
    categories: ["income"],
  },
  {
    key: "deduction",
    title: "2. Các khoản Khấu trừ & Trích nộp (Deductions)",
    description: "Cấu hình công thức tính cho từng mục bảo hiểm xã hội, thuế TNCN và các khoản giảm trừ",
    accentStyle: "border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-500/10 via-rose-500/[0.02] to-transparent",
    badgeTone: "danger" as const,
    iconBoxStyle: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    icon: MinusCircle,
    categories: ["deduction"],
  },
  {
    key: "aggregate_net",
    title: "3. Tổng hợp & Thực lãnh (Net Pay)",
    description: "Cấu hình công thức cho Tổng thu nhập, Tổng khấu trừ và Số tiền thực lãnh",
    accentStyle: "border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-500/10 via-indigo-500/[0.02] to-transparent",
    badgeTone: "info" as const,
    iconBoxStyle: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    icon: DollarSign,
    categories: ["aggregate", "net"],
  },
];

function FormulaCodeBadge({ text }: { text: string }) {
  if (!text) return null;
  const tokens = text.split(/(\s+)/);

  return (
    <div className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs font-semibold shadow-inner inline-flex items-center gap-1.5 flex-wrap">
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
            className="text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/60 text-[11.5px]"
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
  const [editingFormula, setEditingFormula] = useState<SalaryFormula | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SalaryFormula | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addCategoryFilter, setAddCategoryFilter] = useState<string>("all");
  const [variablesModalOpen, setVariablesModalOpen] = useState(false);
  const [variableSearch, setVariableSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    if (formulasQuery.data) {
      setFormulas(structuredClone(formulasQuery.data));
    }
  }, [formulasQuery.data]);

  const variables = useMemo(() => variablesQuery.data ?? [], [variablesQuery.data]);
  const variableNameMap = useMemo(() => new Map(variables.map((item) => [item.code, item.name])), [variables]);

  const existingOutputCodes = useMemo(
    () => new Set(formulas.map((f) => f.outputVariable.toUpperCase())),
    [formulas]
  );

  const filteredCatalogItems = useMemo(() => {
    return masterSalaryItemsCatalog.filter((item) => {
      const matchCategory =
        addCategoryFilter === "all" ||
        (addCategoryFilter === "income" && item.category === "income") ||
        (addCategoryFilter === "deduction" && item.category === "deduction") ||
        (addCategoryFilter === "aggregate" && (item.category === "aggregate" || item.category === "net"));

      const q = addSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.outputVariable.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      return matchCategory && matchSearch;
    });
  }, [addSearch, addCategoryFilter]);

  const filteredVariables = useMemo(() => {
    const q = variableSearch.toLowerCase().trim();
    if (!q) return variables;
    return variables.filter(
      (v) => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
    );
  }, [variables, variableSearch]);

  const toggleEnable = (id: string, enabled: boolean) => {
    setFormulas((items) => items.map((item) => (item.id === id ? { ...item, enabled } : item)));
    setDirty(true);
  };

  const handleAddCatalogItem = (item: MasterSalaryItem) => {
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
    notify(`Đã thêm mục tính "${item.name}" vào dự án`);
  };

  const handleCreateCustomItem = (defaultCategory: SalaryFormula["category"] = "income") => {
    setAddModalOpen(false);
    const newOrder = formulas.length + 1;
    const newFormula: SalaryFormula = {
      id: uid("formula"),
      projectId,
      code: `CUSTOM_${newOrder}`,
      name: `Mục tính mới ${newOrder}`,
      outputVariable: `MUC_TINH_${newOrder}`,
      category: defaultCategory,
      order: newOrder,
      expression: { type: "variable", variableCode: "LUONG_CO_BAN" },
      rounding: { mode: "nearest", precision: 1 },
      enabled: true,
    };
    setEditingFormula(newFormula);
    setEditingText("LUONG_CO_BAN / GIO_CHUAN * GIO_THUONG");
  };

  const openEditModal = (formula: SalaryFormula) => {
    setEditingFormula(structuredClone(formula));
    setEditingText(expressionToText(formula.expression));
  };

  const insertChipToFormula = (chip: string) => {
    setEditingText((prev) => (prev ? `${prev.trim()} ${chip}` : chip));
  };

  const handleSaveModal = () => {
    if (!editingFormula) return;
    const parsedExpr = parseExpressionText(editingText);
    const updated = {
      ...editingFormula,
      expression: parsedExpr,
    };

    setFormulas((items) => {
      const exists = items.some((item) => item.id === updated.id);
      if (exists) {
        return items.map((item) => (item.id === updated.id ? updated : item));
      }
      return [...items, updated];
    });
    setEditingFormula(null);
    setDirty(true);
    notify(`Đã cập nhật công thức cho "${editingFormula.name}"`);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteTarget) return;
    if (formulas.length <= 1) {
      notify("Dự án phải giữ tối thiểu 1 mục tính toán.", "warning");
      setDeleteTarget(null);
      return;
    }
    setFormulas((items) =>
      items.filter((item) => item.id !== deleteTarget.id).map((item, idx) => ({ ...item, order: idx + 1 }))
    );
    setDeleteTarget(null);
    setDirty(true);
    notify("Đã gỡ mục tính khỏi dự án");
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
      notify("Đã lưu cấu hình công thức lương của dự án!");
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

  const humanReadableFormula = useMemo(() => {
    if (!editingText) return "";
    return editingText
      .split(/\s+/)
      .map((token) => variableNameMap.get(token) ?? token)
      .join(" ");
  }, [editingText, variableNameMap]);

  if (formulasQuery.isLoading || variablesQuery.isLoading) return <LoadingBlock rows={6} />;
  if (formulasQuery.isError || variablesQuery.isError) {
    return (
      <ErrorState
        message="Không thể tải bộ công thức."
        retry={() => {
          formulasQuery.refetch();
          variablesQuery.refetch();
        }}
      />
    );
  }

  return (
    <>
      {embedded ? (
        <div className="subsection-heading">
          <div>
            <span className="section-kicker">CÔNG THỨC LƯƠNG</span>
            <h3>Cấu hình công thức tính cho từng mục lương</h3>
            <p>Thêm mục tính lương vào dự án và tùy chỉnh biểu thức tính toán cho từng mục.</p>
          </div>
          <div className="heading-actions">
            <Button onClick={() => setVariablesModalOpen(true)}>
              <Variable className="w-4 h-4" /> Tra cứu biến số
            </Button>
            <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>
              <CheckCircle2 /> Kiểm tra hợp lệ
            </Button>
            <Button variant="primary" onClick={() => setAddModalOpen(true)}>
              <CirclePlus /> Thêm mục tính lương
            </Button>
          </div>
        </div>
      ) : (
        <div className="tab-heading">
          <div>
            <span className="section-kicker">CÔNG THỨC LƯƠNG</span>
            <h2>Cấu hình công thức tính cho từng mục lương</h2>
            <p>Thêm mục tính lương vào dự án và tùy chỉnh biểu thức tính toán cho từng mục.</p>
          </div>
          <div className="heading-actions">
            <Button onClick={() => setVariablesModalOpen(true)}>
              <Variable className="w-4 h-4" /> Tra cứu biến số
            </Button>
            <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>
              <CheckCircle2 /> Kiểm tra hợp lệ
            </Button>
            <Button variant="primary" onClick={() => setAddModalOpen(true)}>
              <CirclePlus /> Thêm mục tính lương
            </Button>
          </div>
        </div>
      )}

      {/* Validation alert banner */}
      {validation && (
        <div
          className={`mb-4 p-3.5 rounded-lg border flex items-center justify-between gap-3 ${
            validation.valid
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <strong className="text-xs font-bold block">
                {validation.valid ? "Tất cả công thức hợp lệ 100%" : `Có ${validation.errors.length} lỗi cần xử lý`}
              </strong>
              {validation.errors.length > 0 && (
                <span className="text-xs block opacity-90">{validation.errors.join("; ")}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setValidation(null)} className="text-xs opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grouped Item Formula Sections */}
      <div className="space-y-6">
        {formulaSections.map((sec) => {
          const sectionFormulas = formulas.filter((item) => sec.categories.includes(item.category));
          const Icon = sec.icon;

          return (
            <div
              key={sec.key}
              className={`content-card overflow-hidden transition-all shadow-sm ${sec.accentStyle}`}
            >
              {/* Section Header */}
              <div className="p-4 flex items-center justify-between gap-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sec.iconBoxStyle}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-foreground">{sec.title}</strong>
                      <Badge tone={sec.badgeTone}>{sectionFormulas.length} mục</Badge>
                    </div>
                    <small className="text-xs text-muted block mt-0.5">{sec.description}</small>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setAddModalOpen(true)}
                >
                  <CirclePlus className="w-3.5 h-3.5" /> Thêm mục tính lương
                </Button>
              </div>

              {/* Table */}
              <div className="table-scroll bg-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">STT</th>
                      <th>Tên mục lương / chế độ</th>
                      <th>Mã biến kết quả</th>
                      <th>Biểu thức công thức tính toán</th>
                      <th className="w-24 text-center">Áp dụng</th>
                      <th className="w-32 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionFormulas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-xs text-muted">
                          Chưa có mục nào trong nhóm này. Bấm <strong>"+ Thêm mục tính lương"</strong> để bổ sung.
                        </td>
                      </tr>
                    ) : (
                      sectionFormulas.map((formula, index) => (
                        <tr key={formula.id} className={!formula.enabled ? "opacity-50" : ""}>
                          <td className="text-center font-mono text-xs text-muted font-medium">
                            {index + 1}
                          </td>
                          <td>
                            <strong className="text-foreground font-semibold text-sm">
                              {formula.name}
                            </strong>
                          </td>
                          <td>
                            <code className="text-xs font-mono text-primary font-bold px-2 py-0.5 rounded bg-primary-soft/60 border border-primary/20">
                              {formula.outputVariable}
                            </code>
                          </td>
                          <td>
                            <FormulaCodeBadge text={expressionToText(formula.expression)} />
                          </td>
                          <td className="text-center">
                            <Switch.Root
                              className="switch-root inline-block"
                              checked={formula.enabled}
                              onCheckedChange={(enabled) => toggleEnable(formula.id, enabled)}
                              aria-label="Bật tắt công thức"
                            >
                              <Switch.Thumb />
                            </Switch.Root>
                          </td>
                          <td className="text-right">
                            <div className="row-actions justify-end">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openEditModal(formula)}
                                title="Sửa công thức"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Sửa
                              </Button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(formula)}
                                className="button button-ghost button-icon"
                                title="Gỡ khỏi dự án"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Salary Item Modal (Catalog & Custom) */}
      <Modal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        title="Thêm mục tính lương vào dự án"
        description={`Chọn mục tính lương/chế độ từ danh mục hệ thống để thêm vào bảng tính (${filteredCatalogItems.length} mục danh mục).`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={() => handleCreateCustomItem("income")}>
              <Plus className="w-4 h-4" /> Tạo mục tính tùy chỉnh mới
            </Button>
            <Button onClick={() => setAddModalOpen(false)}>Đóng</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Full-width Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label className="search-field w-full flex-1">
              <Search />
              <input
                placeholder="Tìm kiếm mục tính lương theo tên hoặc mã biến..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
              />
            </label>

            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border shrink-0">
              <button
                type="button"
                onClick={() => setAddCategoryFilter("all")}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  addCategoryFilter === "all" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setAddCategoryFilter("income")}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  addCategoryFilter === "income" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
              >
                Thu nhập
              </button>
              <button
                type="button"
                onClick={() => setAddCategoryFilter("deduction")}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  addCategoryFilter === "deduction" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
              >
                Khấu trừ
              </button>
              <button
                type="button"
                onClick={() => setAddCategoryFilter("aggregate")}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  addCategoryFilter === "aggregate" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
              >
                Tổng hợp / Net
              </button>
            </div>
          </div>

          {/* Master Salary Items Cards List */}
          <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
            {filteredCatalogItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                Không tìm thấy mục tính lương phù hợp từ khóa <strong>"{addSearch}"</strong>.
              </div>
            ) : (
              filteredCatalogItems.map((item) => {
                const isAdded = existingOutputCodes.has(item.outputVariable.toUpperCase());

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isAdded
                        ? "bg-secondary/40 border-border opacity-60 cursor-not-allowed"
                        : "bg-card hover:border-primary/50 border-border shadow-sm hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-bold text-foreground">{item.name}</strong>
                        <Badge tone="info">{categoryLabels[item.category]}</Badge>
                        <code className="text-xs font-mono text-primary font-semibold">{item.outputVariable}</code>
                      </div>

                      <p className="text-xs text-muted leading-relaxed">{item.description}</p>

                      <div className="mt-1">
                        <FormulaCodeBadge text={item.defaultFormulaText} />
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isAdded ? (
                        <Button disabled size="sm" variant="ghost" className="opacity-70 cursor-not-allowed">
                          Đã có trong dự án
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleAddCatalogItem(item)}
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm vào dự án
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Variables Catalog Reference Modal */}
      <Modal
        open={variablesModalOpen}
        onOpenChange={setVariablesModalOpen}
        title="Danh mục biến số dữ liệu hệ thống"
        description="Tra cứu tất cả mã biến số có sẵn dùng để tùy chỉnh công thức tính lương."
        size="lg"
        footer={<Button onClick={() => setVariablesModalOpen(false)}>Đóng</Button>}
      >
        <div className="space-y-4">
          <label className="search-field w-full">
            <Search />
            <input
              placeholder="Tìm biến số theo tên hoặc mã (LUONG_CO_BAN, GIO_CHUAN...)"
              value={variableSearch}
              onChange={(e) => setVariableSearch(e.target.value)}
            />
          </label>

          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
            {filteredVariables.map((v) => (
              <div
                key={v.code}
                className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-foreground">{v.name}</strong>
                    <code className="text-xs font-mono text-primary font-bold">{v.code}</code>
                  </div>
                  <small className="text-xs text-muted block mt-0.5">
                    Đơn vị: {v.unit} · Giá trị mẫu: {v.sampleValue}
                  </small>
                </div>
                {editingFormula && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setVariablesModalOpen(false);
                      insertChipToFormula(v.code);
                    }}
                  >
                    + Chèn biến
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Item Formula Customizer Modal */}
      <Modal
        open={Boolean(editingFormula)}
        onOpenChange={(open) => !open && setEditingFormula(null)}
        title={`Cấu hình công thức: ${editingFormula?.name}`}
        description={`Mục tính: ${editingFormula?.name} (${editingFormula?.outputVariable})`}
        size="lg"
        footer={
          <>
            <Button onClick={() => setEditingFormula(null)}>Hủy</Button>
            <Button variant="primary" onClick={handleSaveModal}>
              Lưu công thức
            </Button>
          </>
        }
      >
        {editingFormula && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary-soft/80 to-secondary border border-primary/20 flex items-center justify-between">
              <div>
                <strong className="text-sm font-bold text-foreground block">{editingFormula.name}</strong>
                <code className="text-xs font-mono text-primary font-bold">{editingFormula.outputVariable}</code>
              </div>
              <Badge tone="info">{categoryLabels[editingFormula.category]}</Badge>
            </div>

            {/* Formula Input Box (Excel Style) */}
            <div className="space-y-2">
              <label className="form-field">
                <span className="flex items-center justify-between">
                  <strong>Biểu thức công thức tính toán (Cú pháp Excel)</strong>
                  <small className="text-muted font-mono text-[11px]">Toán tử: +  -  *  /  (  )</small>
                </span>
                <input
                  className="font-mono text-sm font-bold text-primary bg-card border-2 border-primary/40 focus:border-primary p-3 rounded-xl shadow-sm"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  placeholder="LUONG_CO_BAN / GIO_CHUAN * GIO_THUONG"
                />
              </label>

              {/* Live Syntax Badge Preview */}
              <div className="p-3 rounded-xl bg-slate-950 text-slate-100 space-y-1.5 border border-slate-800">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                  Biểu thức trực quan:
                </span>
                <FormulaCodeBadge text={editingText} />
              </div>

              {/* Human Readable Preview */}
              {humanReadableFormula && (
                <div className="p-3 rounded-xl bg-primary-soft/40 border border-primary/20 text-xs text-muted-strong flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    <strong>Dịch nghĩa tiếng Việt: </strong> {humanReadableFormula}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Click Chips */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs font-bold text-muted block">Nhấp chọn biến & toán tử để chèn nhanh vào vị trí:</span>

              {/* Operators Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted mr-1 font-semibold">Toán tử:</span>
                {["+", "-", "*", "/", "(", ")"].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => insertChipToFormula(op)}
                    className="w-8 h-8 rounded-lg bg-primary text-white font-mono font-bold text-sm hover:bg-primary-hover shadow-sm hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                  >
                    {op === "*" ? "×" : op === "/" ? "÷" : op}
                  </button>
                ))}
              </div>

              {/* Variables Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-xs text-muted mr-1 font-semibold">Biến số hệ thống:</span>
                {variables.map((v) => (
                  <button
                    key={v.code}
                    type="button"
                    onClick={() => insertChipToFormula(v.code)}
                    className="px-2.5 py-1 rounded-lg bg-card hover:bg-primary-soft hover:border-primary border border-border text-xs font-semibold text-foreground hover:text-primary transition-all shadow-sm"
                  >
                    + {v.name} ({v.code})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Gỡ mục tính toán khỏi dự án?"
        description={deleteTarget?.name}
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="danger" onClick={handleDeleteConfirmed}>
              Gỡ mục tính
            </Button>
          </>
        }
      >
        <p className="modal-note">Mục tính toán này sẽ được loại khỏi bảng tính lương của dự án.</p>
      </Modal>

      <SaveBar visible={dirty} saving={saveMutation.isPending} onSave={() => saveMutation.mutate()} onCancel={cancel} />
    </>
  );
}
