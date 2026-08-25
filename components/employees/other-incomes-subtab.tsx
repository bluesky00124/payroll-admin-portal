"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Calendar,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Gift,
  History,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UploadCloud,
  User,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { DecisionDocumentPreviewModal } from "@/components/employees/decision-preview-modal";
import { ExcelImportModal, type ExcelImportColumn } from "@/components/employees/excel-import-modal";
import { SubtabActivityLog } from "@/components/employees/subtab-activity-log";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  MonthPicker,
  SearchableSelect,
  TablePaginationFooter,
  TableRowActions,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { Employee, OtherIncomeCategory, OtherIncomeRecord } from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

const INCOME_CATEGORIES: { value: OtherIncomeCategory; label: string; tone: "success" | "info" | "warning" | "neutral" }[] = [
  { value: "spot_bonus", label: "Thưởng nóng thành tích", tone: "success" },
  { value: "project_bonus", label: "Thưởng tiến độ dự án", tone: "info" },
  { value: "support", label: "Hỗ trợ khó khăn", tone: "warning" },
  { value: "incentive", label: "Khen thưởng chuyên cần", tone: "success" },
  { value: "other", label: "Thu nhập khác", tone: "neutral" },
];

export function OtherIncomesSubtab({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OtherIncomeRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteRecord, setTargetDeleteRecord] = useState<OtherIncomeRecord | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [previewFileModalOpen, setPreviewFileModalOpen] = useState(false);
  const [previewingRecord, setPreviewingRecord] = useState<OtherIncomeRecord | null>(null);

  // Form fields state
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formPeriod, setFormPeriod] = useState("2026-08");
  const [formCategory, setFormCategory] = useState<OtherIncomeCategory>("spot_bonus");
  const [formAmount, setFormAmount] = useState<number>(1000000);
  const [formDecisionNo, setFormDecisionNo] = useState("");
  const [formDecisionDate, setFormDecisionDate] = useState("2026-08-18");
  const [formReason, setFormReason] = useState("");
  const [formAttachmentName, setFormAttachmentName] = useState("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");
  const [formAttachmentSize, setFormAttachmentSize] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch incomes
  const incomesQuery = useQuery({
    queryKey: ["other-incomes", projectId, periodFilter],
    queryFn: () =>
      api.getOtherIncomes({
        projectId: projectId === "all" ? undefined : projectId,
        period: periodFilter === "all" ? undefined : periodFilter,
      }),
  });

  const incomes = incomesQuery.data ?? [];

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeCode.toLowerCase().includes(q) ||
        (item.decisionNo ?? "").toLowerCase().includes(q) ||
        (item.categoryLabel ?? "").toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q);

      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [incomes, searchTerm, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalAmount = filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
    const uniqueEmployees = new Set(filteredIncomes.map((item) => item.employeeId)).size;
    const withAttachmentCount = filteredIncomes.filter((item) => Boolean(item.attachmentName)).length;
    return {
      totalAmount,
      uniqueEmployees,
      withAttachmentCount,
      totalCount: filteredIncomes.length,
    };
  }, [filteredIncomes]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredIncomes.slice(start, start + pageSize);
  }, [filteredIncomes, page, pageSize]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormEmployeeId(employees[0]?.id || "");
    setFormPeriod(periodFilter === "all" ? "2026-08" : periodFilter);
    setFormCategory("spot_bonus");
    setFormAmount(1000000);
    setFormDecisionNo("QĐ-2026/08-02/KT");
    setFormDecisionDate(new Date().toISOString().slice(0, 10));
    setFormReason("");
    setFormAttachmentName("");
    setFormAttachmentUrl("");
    setFormAttachmentSize("");
    setFormModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (record: OtherIncomeRecord) => {
    setEditingRecord(record);
    setFormEmployeeId(record.employeeId);
    setFormPeriod(record.period);
    setFormCategory(record.category);
    setFormAmount(record.amount);
    setFormDecisionNo(record.decisionNo || "");
    setFormDecisionDate(record.decisionDate || new Date().toISOString().slice(0, 10));
    setFormReason(record.reason);
    setFormAttachmentName(record.attachmentName || "");
    setFormAttachmentUrl(record.attachmentUrl || "");
    setFormAttachmentSize(record.attachmentSize || "");
    setFormModalOpen(true);
  };

  // File Upload handler
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormAttachmentName(file.name);
      setFormAttachmentUrl(URL.createObjectURL(file));
      const sizeKb = Math.round(file.size / 1024);
      setFormAttachmentSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
      notify(`Đã đính kèm file: ${file.name}`);
    }
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedEmp = employees.find((e) => e.id === formEmployeeId);
      const payload: Partial<OtherIncomeRecord> = {
        projectId: selectedEmp?.projectId || projectId || "prj-jss",
        employeeId: formEmployeeId,
        employeeCode: selectedEmp?.code || "",
        employeeName: selectedEmp?.name || "",
        position: selectedEmp?.position || "Nhân viên",
        period: formPeriod,
        category: formCategory,
        amount: Number(formAmount) || 0,
        decisionNo: formDecisionNo.trim(),
        decisionDate: formDecisionDate,
        attachmentName: formAttachmentName.trim(),
        attachmentUrl: formAttachmentUrl,
        attachmentSize: formAttachmentSize,
        reason: formReason.trim() || "Khen thưởng / hỗ trợ theo quyết định ban hành",
      };

      if (editingRecord) {
        return api.updateOtherIncome(editingRecord.id, payload);
      }
      return api.createOtherIncome(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["other-incomes"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setFormModalOpen(false);
      notify(editingRecord ? "Đã cập nhật thông tin thu nhập thành công!" : "Đã thêm mới khoản thu nhập thành công!");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.deleteOtherIncome(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["other-incomes"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setDeleteModalOpen(false);
      setTargetDeleteRecord(null);
      notify("Đã xóa khoản thu nhập thành công!");
    },
  });

  // Excel Import Setup
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);
  const excelColumns: ExcelImportColumn[] = [
    { key: "employeeCode", label: "Mã NLĐ", width: "120px" },
    { key: "employeeName", label: "Họ và tên NLĐ", width: "160px" },
    {
      key: "period",
      label: "Tháng",
      width: "100px",
      align: "center",
      render: (row) => <Badge tone="neutral">{formatMonthYear(row.period)}</Badge>,
    },
    {
      key: "categoryLabel",
      label: "Loại thu nhập",
      render: (row) => <span className="font-medium text-primary">{row.categoryLabel || "Thưởng nóng"}</span>,
    },
    {
      key: "amount",
      label: "Số tiền (VND)",
      align: "right",
      render: (row) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
          +{formatCurrency(row.amount)}
        </span>
      ),
    },
    { key: "decisionNo", label: "Số QĐ", width: "130px" },
    { key: "reason", label: "Lý do / Nội dung" },
  ];

  const handleSimulateExcelUpload = () => {
    const mockExcelData = [
      {
        employeeCode: employees[2]?.code || "NV-JSS-003",
        employeeName: employees[2]?.name || "Lê Hoàng Nam",
        period: "2026-08",
        category: "spot_bonus",
        categoryLabel: "Thưởng nóng thành tích",
        amount: 1000000,
        decisionNo: "QĐ-2026/08-02/KT",
        decisionDate: "2026-08-18",
        attachmentName: "Quyet_dinh_khen_thuong_dot_xuat_Nam.pdf",
        reason: "Cải tiến thao tác đóng gói",
      },
      {
        employeeCode: employees[3]?.code || "NV-JSS-004",
        employeeName: employees[3]?.name || "Phạm Thị Hương",
        period: "2026-08",
        category: "project_bonus",
        categoryLabel: "Thưởng tiến độ dự án",
        amount: 1500000,
        decisionNo: "QĐ-2026/08-05/TD",
        decisionDate: "2026-08-20",
        attachmentName: "Quyet_dinh_thuong_tien_do_Jabil.pdf",
        reason: "Vượt chỉ tiêu đơn hàng xuất khẩu",
      },
      {
        employeeCode: employees[0]?.code || "NV-JSS-001",
        employeeName: employees[0]?.name || "Nguyễn Văn An",
        period: "2026-08",
        category: "incentive",
        categoryLabel: "Khen thưởng chuyên cần",
        amount: 500000,
        decisionNo: "QĐ-2026/08-21/CC",
        decisionDate: "2026-08-21",
        attachmentName: "Khen_thuong_chuyen_can.pdf",
        reason: "Đạt chuẩn chuyên cần xuất sắc quý",
      },
    ];
    setImportPreviewRows(mockExcelData);
    notify("Đã đọc dữ liệu thành công từ file Excel (3 dòng hợp lệ)");
  };

  const importBatchMutation = useMutation({
    mutationFn: async () => {
      return api.batchImportOtherIncomes({
        projectId: projectId === "all" ? "prj-jss" : projectId,
        period: periodFilter === "all" ? "2026-08" : periodFilter,
        items: importPreviewRows,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["other-incomes"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setImportModalOpen(false);
      setImportPreviewRows([]);
      notify(`Đã nhập khẩu thành công ${res.length} khoản thu nhập vào hệ thống!`);
    },
  });

  return (
    <div className="subtab-container space-y-4">
      {/* Toolbar */}
      <div className="table-toolbar bg-card border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search */}
          <label className="search-field max-w-[280px]">
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm mã, tên NLĐ, số QĐ..."
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>

          {/* Month Filter */}
          <div className="w-[190px]">
            <MonthPicker
              value={periodFilter}
              onChange={(val) => {
                setPeriodFilter(val || "all");
                setPage(1);
              }}
              allowClear
              clearLabel="Tất cả các tháng"
              placeholder="Tất cả các tháng"
              variant="filter"
            />
          </div>

          {/* Category Filter */}
          <div className="w-[190px]">
            <SearchableSelect
              icon={<Filter className="w-3.5 h-3.5 text-muted" />}
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tất cả loại thu nhập" },
                ...INCOME_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
              ]}
              placeholder="Lọc loại thu nhập..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setImportModalOpen(true)}
            title="Import danh sách từ file Excel"
          >
            <UploadCloud className="w-4 h-4 mr-1.5 text-primary" /> Import Excel
          </Button>

          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" /> Thêm thu nhập
          </Button>
        </div>
      </div>

      {/* Main Table */}
      {incomesQuery.isLoading ? (
        <LoadingBlock rows={6} />
      ) : incomesQuery.isError ? (
        <ErrorState
          message="Không thể tải danh sách thu nhập khác"
          retry={() => incomesQuery.refetch()}
        />
      ) : filteredIncomes.length === 0 ? (
        <EmptyState
          title="Không tìm thấy khoản thu nhập nào"
          description={
            searchTerm || periodFilter !== "all" || categoryFilter !== "all"
              ? "Không có dữ liệu phù hợp với bộ lọc hiện tại."
              : "Chưa có quyết định khen thưởng / hỗ trợ nào cho người lao động trong dự án."
          }
          action={
            searchTerm || periodFilter !== "all" || categoryFilter !== "all" ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm("");
                  setPeriodFilter("all");
                  setCategoryFilter("all");
                }}
              >
                Xóa bộ lọc
              </Button>
            ) : (
              <Button variant="primary" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-1.5" /> Thêm khoản thu nhập đầu tiên
              </Button>
            )
          }
        />
      ) : (
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table min-w-[1050px]">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th style={{ minWidth: "170px" }}>NGƯỜI LAO ĐỘNG</th>
                  <th style={{ width: "120px" }} className="text-center">THÁNG ÁP DỤNG</th>
                  <th style={{ width: "180px" }}>LOẠI THU NHẬP</th>
                  <th style={{ width: "130px" }} className="text-right">SỐ TIỀN</th>
                  <th style={{ width: "220px" }}>CĂN CỨ &amp; FILE QĐ</th>
                  <th>LÝ DO / NỘI DUNG</th>
                  <th style={{ width: "150px" }}>CẬP NHẬT</th>
                  <th style={{ width: "80px" }} className="text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((item, idx) => {
                  const stt = (page - 1) * pageSize + idx + 1;
                  const catDef = INCOME_CATEGORIES.find((c) => c.value === item.category);
                  const emp = employeeMap.get(item.employeeId) || employeeMap.get(item.employeeCode);
                  const projectCode = emp?.projectCode;

                  return (
                    <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                      {/* STT */}
                      <td className="text-center text-muted font-medium">{stt}</td>

                      {/* Employee Info */}
                      <td>
                        <div className="employee-cell-info">
                          <span className="employee-cell-name font-semibold">{item.employeeName}</span>
                          <span className="employee-cell-sub">
                            <span className="employee-code-badge">{item.employeeCode}</span>
                            {projectCode && <span className="text-muted text-[11px] font-normal">· {projectCode}</span>}
                          </span>
                        </div>
                      </td>

                      {/* Period */}
                      <td className="text-center">
                        <Badge tone="neutral">{formatMonthYear(item.period)}</Badge>
                      </td>

                      {/* Category */}
                      <td>
                        <Badge tone={catDef?.tone || "neutral"}>
                          {item.categoryLabel || catDef?.label || item.category}
                        </Badge>
                      </td>

                      {/* Amount */}
                      <td className="text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[13.5px]">
                          +{formatCurrency(item.amount)}
                        </span>
                      </td>

                      {/* Decision & Attachment */}
                      <td>
                        <div className="flex flex-col gap-1">
                          {item.decisionNo ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-foreground flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                {item.decisionNo}
                              </span>
                              {item.decisionDate && (
                                <span className="text-[11px] text-muted ml-4.5">
                                  Ngày {formatDate(item.decisionDate)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted italic">Chưa có số QĐ</span>
                          )}

                          {item.attachmentName ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewingRecord(item);
                                setPreviewFileModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline font-medium text-left truncate max-w-[190px]"
                              title={`Xem file: ${item.attachmentName}`}
                            >
                              <Paperclip className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.attachmentName}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted">Chưa đính kèm file</span>
                          )}
                        </div>
                      </td>

                      {/* Reason */}
                      <td>
                        <p className="text-xs text-foreground/90 line-clamp-2" title={item.reason}>
                          {item.reason}
                        </p>
                      </td>

                      {/* Updated Info */}
                      <td>
                        <div className="text-[11.5px] text-muted space-y-0.5">
                          <div className="truncate font-medium text-foreground/80">{item.updatedBy}</div>
                          <div>{formatDate(item.updatedAt)}</div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="text-center">
                        <TableRowActions
                          items={[
                            {
                              key: "edit",
                              label: "Chỉnh sửa thu nhập",
                              icon: <Pencil />,
                              onClick: () => handleOpenEdit(item),
                            },
                            ...(item.attachmentName
                              ? [
                                  {
                                    key: "preview_doc",
                                    label: "Xem file quyết định",
                                    icon: <Eye />,
                                    onClick: () => {
                                      setPreviewingRecord(item);
                                      setPreviewFileModalOpen(true);
                                    },
                                  },
                                ]
                              : []),
                            {
                              key: "delete",
                              label: "Xóa thu nhập",
                              icon: <Trash2 />,
                              danger: true,
                              onClick: () => {
                                setTargetDeleteRecord(item);
                                setDeleteModalOpen(true);
                              },
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePaginationFooter
            totalItems={filteredIncomes.length}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* BOTTOM AUDIT / ACTIVITY LOG */}
      <SubtabActivityLog
        projectId={projectId}
        module="incomes"
        title="Nhật ký biến động Thu nhập khác"
        description="Lịch sử thêm mới, điều chỉnh, xóa và import các khoản thưởng, hỗ trợ của người lao động"
      />

      {/* ========================================================================= */}
      {/* MODAL: Thêm mới / Chỉnh sửa thu nhập (Có đính kèm file quyết định)        */}
      {/* ========================================================================= */}
      <Modal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        title={editingRecord ? "Chỉnh sửa khoản thu nhập" : "Thêm mới thu nhập khen thưởng"}
        description="Nhập thông tin quyết định khen thưởng / hỗ trợ và đính kèm văn bản phê duyệt."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={!formEmployeeId || !formAmount || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending
                ? "Đang lưu…"
                : editingRecord
                ? "Cập nhật thu nhập"
                : "Tạo khoản thu nhập"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          {/* Row 1: Employee & Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                Người lao động <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                value={formEmployeeId}
                onChange={setFormEmployeeId}
                placeholder="Chọn người lao động..."
                searchPlaceholder="Tìm mã hoặc tên người lao động..."
                options={employees.map((emp) => ({
                  value: emp.id,
                  label: `${emp.code} - ${emp.name}`,
                  subLabel: emp.position || emp.department,
                }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Tháng áp dụng <span className="text-danger">*</span>
              </label>
              <MonthPicker
                value={formPeriod}
                onChange={setFormPeriod}
                variant="form"
                placeholder="Chọn tháng áp dụng..."
              />
            </div>
          </div>

          {/* Row 2: Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                Loại thu nhập <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                value={formCategory}
                onChange={(val) => setFormCategory(val as OtherIncomeCategory)}
                options={INCOME_CATEGORIES.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Số tiền chi trả (VND) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  className="form-input w-full font-mono font-bold text-emerald-600 dark:text-emerald-400 pr-12"
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  placeholder="Nhập số tiền..."
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted font-bold">VND</span>
              </div>
            </div>
          </div>

          {/* Row 3: Decision No & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Số quyết định khen thưởng / Căn cứ</label>
              <input
                type="text"
                className="form-input w-full"
                value={formDecisionNo}
                onChange={(e) => setFormDecisionNo(e.target.value)}
                placeholder="VD: QĐ-2026/08-02/KT"
              />
            </div>

            <div className="form-group">
              <label className="form-label flex items-center justify-between">
                <span>Ngày ban hành quyết định</span>
                {formDecisionDate && (
                  <span className="text-xs text-primary font-medium">
                    {formatDate(formDecisionDate)}
                  </span>
                )}
              </label>
              <input
                type="date"
                className="form-input w-full"
                value={formDecisionDate}
                onChange={(e) => setFormDecisionDate(e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Attachment Upload Area */}
          <div className="form-group">
            <label className="form-label flex items-center justify-between">
              <span>Đính kèm file quyết định (PDF, Word, Ảnh)</span>
              {formAttachmentName && (
                <span className="text-xs text-primary font-medium">
                  {formAttachmentSize || "Đã chọn file"}
                </span>
              )}
            </label>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleFileSelected}
            />

            {formAttachmentName ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {formAttachmentName}
                    </div>
                    <div className="text-[11px] text-muted">
                      {formAttachmentSize || "Tệp đính kèm"} · Sẵn sàng lưu
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Thay file
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFormAttachmentName("");
                      setFormAttachmentUrl("");
                      setFormAttachmentSize("");
                    }}
                  >
                    <X className="w-4 h-4 text-danger" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/40 flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-foreground">
                  Bấm vào đây để tải lên file quyết định khen thưởng
                </div>
                <div className="text-[11px] text-muted">
                  Hỗ trợ định dạng PDF, DOCX, PNG, JPG (Tối đa 15MB)
                </div>
              </div>
            )}
          </div>

          {/* Row 5: Reason */}
          <div className="form-group">
            <label className="form-label">
              Lý do khen thưởng / Nội dung chi trả <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-textarea w-full"
              rows={2}
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Ghi rõ thành tích, lý do khen thưởng hoặc hỗ trợ đột xuất..."
            />
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Xác nhận xóa thu nhập                                              */}
      {/* ========================================================================= */}
      <Modal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Xác nhận xóa khoản thu nhập"
        description="Khoản thu nhập này sẽ bị xóa khỏi hồ sơ và không còn được tính vào bảng lương."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => targetDeleteRecord && deleteMutation.mutate(targetDeleteRecord.id)}
            >
              {deleteMutation.isPending ? "Đang xóa…" : "Xác nhận xóa"}
            </Button>
          </>
        }
      >
        {targetDeleteRecord && (
          <div className="p-3 bg-danger/5 border border-danger/20 rounded-lg text-xs space-y-1.5">
            <div>
              <strong>Người lao động:</strong> {targetDeleteRecord.employeeCode} -{" "}
              {targetDeleteRecord.employeeName}
            </div>
            <div>
              <strong>Số tiền:</strong>{" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{formatCurrency(targetDeleteRecord.amount)}
              </span>{" "}
              ({targetDeleteRecord.categoryLabel})
            </div>
            <div>
              <strong>Tháng áp dụng:</strong> {formatMonthYear(targetDeleteRecord.period)}
            </div>
            {targetDeleteRecord.decisionNo && (
              <div>
                <strong>Số QĐ:</strong> {targetDeleteRecord.decisionNo}
              </div>
            )}
            {targetDeleteRecord.decisionDate && (
              <div>
                <strong>Ngày ban hành:</strong> {formatDate(targetDeleteRecord.decisionDate)}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Import Excel thu nhập theo tháng                                   */}
      {/* ========================================================================= */}
      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Import danh sách thu nhập khác từ Excel"
        description="Nhập danh sách nhân sự có các khoản thưởng nóng, thưởng tiến độ theo quyết định trong kỳ."
        period={periodFilter === "all" ? "2026-08" : periodFilter}
        sampleTemplateName="Mau_Import_Thu_Nhap_Khac.xlsx"
        sampleTemplateDescription="Biểu mẫu chuẩn bao gồm: Mã NV, Họ tên, Tháng (YYYY-MM), Loại thu nhập, Số tiền, Số QĐ, Lý do."
        columns={excelColumns}
        previewRows={importPreviewRows}
        stats={[
          { label: "Tổng dòng dữ liệu", value: importPreviewRows.length, tone: "primary" },
          {
            label: "Tổng tiền thu nhập",
            value: `+${formatCurrency(importPreviewRows.reduce((s, r) => s + (r.amount || 0), 0))}`,
            tone: "success",
          },
        ]}
        onSimulateUpload={handleSimulateExcelUpload}
        onConfirmImport={() => importBatchMutation.mutate()}
        confirmLoading={importBatchMutation.isPending}
        confirmLabel={`Nhập ${importPreviewRows.length || ""} khoản thu nhập vào hệ thống`}
        onClearPreview={() => setImportPreviewRows([])}
      />

      {/* ========================================================================= */}
      {/* MODAL: Xem trước file quyết định & văn bản căn cứ                         */}
      {/* ========================================================================= */}
      <DecisionDocumentPreviewModal
        open={previewFileModalOpen}
        onOpenChange={setPreviewFileModalOpen}
        data={
          previewingRecord
            ? {
                type: "income",
                employeeCode: previewingRecord.employeeCode,
                employeeName: previewingRecord.employeeName,
                position: previewingRecord.position,
                projectCode: employeeMap.get(previewingRecord.employeeId)?.projectCode,
                period: previewingRecord.period,
                categoryLabel: previewingRecord.categoryLabel || "Thu nhập khác",
                amount: previewingRecord.amount,
                decisionNo: previewingRecord.decisionNo,
                decisionDate: previewingRecord.decisionDate,
                reason: previewingRecord.reason,
                attachmentName: previewingRecord.attachmentName,
                attachmentUrl: previewingRecord.attachmentUrl,
                attachmentSize: previewingRecord.attachmentSize,
                updatedBy: previewingRecord.updatedBy,
                updatedAt: previewingRecord.updatedAt,
              }
            : null
        }
      />
    </div>
  );
}
