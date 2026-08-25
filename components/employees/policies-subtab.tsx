"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  Check,
  Info,
  Pencil,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ExcelImportModal } from "@/components/employees/excel-import-modal";
import { SubtabActivityLog } from "@/components/employees/subtab-activity-log";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  StatusBadge,
  TablePaginationFooter,
  TableRowActions,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { Employee, EmployeePolicyItem, EmployeePolicyRecord } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

function formatAllowanceValue(pol: EmployeePolicyItem) {
  const valObj = pol.isCustom ? pol.customValue : pol.defaultValue;
  if (valObj?.amount !== undefined && typeof valObj.amount === "number") {
    if (valObj.amount === 0) return "0đ";
    return `${(valObj.amount / 1000).toLocaleString("vi-VN")}k`;
  }
  if (valObj?.multiplier !== undefined) {
    return `${valObj.multiplier}%`;
  }
  if (valObj?.rate !== undefined) {
    return `${valObj.rate}%`;
  }
  return "";
}

export function EmployeePoliciesSubtab({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "shift_leader" | "chinh_thuc" | "hoc_viec">("all");

  // Selection / Modal state
  const [editRecord, setEditRecord] = useState<EmployeePolicyRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formPolicies, setFormPolicies] = useState<EmployeePolicyItem[]>([]);
  const [formBaseSalary, setFormBaseSalary] = useState<number>(6300000);
  const [formInsuranceSalary, setFormInsuranceSalary] = useState<number>(6300000);

  // Detail Modal state
  const [detailRecord, setDetailRecord] = useState<EmployeePolicyRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreviewRows, setUploadPreviewRows] = useState<Array<{
    employeeCode: string;
    employeeName: string;
    policyCode: string;
    policyName: string;
    amount: number;
    reason: string;
  }>>([]);

  const policiesQuery = useQuery({
    queryKey: ["employee-policies", projectId],
    queryFn: () => api.getEmployeePolicies({ projectId: projectId === "all" ? undefined : projectId }),
  });

  const employeePolicies = policiesQuery.data ?? [];

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    (employees || []).forEach((emp) => {
      map.set(emp.id, emp);
      if (emp.code) map.set(emp.code, emp);
    });
    return map;
  }, [employees]);

  const filteredList = useMemo(() => {
    return employeePolicies.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.employeeName.toLowerCase().includes(term) ||
        item.employeeCode.toLowerCase().includes(term);

      if (!matchSearch) return false;
      if (filterMode === "shift_leader") return item.role === "shift_leader";
      if (filterMode === "chinh_thuc") return item.role === "chinh_thuc";
      if (filterMode === "hoc_viec") return item.role === "hoc_viec";
      return true;
    });
  }, [employeePolicies, searchTerm, filterMode]);

  const counts = useMemo(() => {
    return {
      all: employeePolicies.length,
      shiftLeader: employeePolicies.filter((p) => p.role === "shift_leader").length,
      official: employeePolicies.filter((p) => p.role === "chinh_thuc").length,
      probation: employeePolicies.filter((p) => p.role === "hoc_viec").length,
    };
  }, [employeePolicies]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  // Open edit modal
  const openEditModal = (rec: EmployeePolicyRecord) => {
    setEditRecord(rec);
    setFormPolicies(JSON.parse(JSON.stringify(rec.policies || [])));
    setFormBaseSalary(rec.baseSalary || 6300000);
    setFormInsuranceSalary(rec.insuranceSalary || 6300000);
    setModalOpen(true);
  };

  // Open detail modal
  const openDetailModal = (rec: EmployeePolicyRecord) => {
    setDetailRecord(rec);
    setDetailModalOpen(true);
  };

  // Update single policy item in form state
  const handleTogglePolicy = (policyId: string, enabled: boolean) => {
    setFormPolicies((prev) =>
      prev.map((item) => {
        if (item.policyId === policyId) {
          return { ...item, isEnabled: enabled };
        }
        return item;
      })
    );
  };

  const handleUpdatePolicyAmount = (policyId: string, amount: number, reason?: string) => {
    setFormPolicies((prev) =>
      prev.map((item) => {
        if (item.policyId === policyId) {
          const isDefault = amount === (item.defaultValue?.amount ?? 0);
          return {
            ...item,
            isCustom: !isDefault,
            customValue: { ...item.customValue, amount },
            reason: reason !== undefined ? reason : item.reason,
          };
        }
        return item;
      })
    );
  };

  const handleUpdatePolicyReason = (policyId: string, reason: string) => {
    setFormPolicies((prev) =>
      prev.map((item) => {
        if (item.policyId === policyId) {
          return { ...item, reason };
        }
        return item;
      })
    );
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editRecord) return;
      return api.updateEmployeePolicies(editRecord.employeeId, {
        policies: formPolicies,
        baseSalary: formBaseSalary,
        insuranceSalary: formInsuranceSalary,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-policies"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      notify("Đã lưu thiết lập chế độ & phụ cấp nhân viên thành công!");
      setModalOpen(false);
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  // Batch import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const targetProj = projectId === "all" ? (employees[0]?.projectId ?? "prj-jss") : projectId;
      return api.batchImportEmployeePolicies({
        projectId: targetProj,
        items: uploadPreviewRows.map((r) => ({
          employeeCode: r.employeeCode,
          policyCode: r.policyCode,
          amount: r.amount,
          isEnabled: true,
          reason: r.reason,
        })),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-policies"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setImportModalOpen(false);
      setUploadPreviewRows([]);
      notify(`Đã cập nhật phụ cấp thành công cho ${data.length} nhân sự!`);
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const handleSimulateFileUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      const targetEmps = employees.filter(
        (e) => projectId === "all" || e.projectId === (projectId === "all" ? "prj-jss" : projectId)
      );
      setUploadPreviewRows([
        {
          employeeCode: targetEmps[0]?.code ?? "EMP-001",
          employeeName: targetEmps[0]?.name ?? "Nguyễn Văn An",
          policyCode: "RESPONSIBILITY_ALLOWANCE",
          policyName: "Phụ cấp trách nhiệm",
          amount: 1500000,
          reason: "Bổ nhiệm Trưởng ca sản xuất (QĐ số 42)",
        },
        {
          employeeCode: targetEmps[1]?.code ?? "EMP-002",
          employeeName: targetEmps[1]?.name ?? "Trần Thị Bình",
          policyCode: "TRAVEL_ALLOWANCE",
          policyName: "Phụ cấp đi lại",
          amount: 600000,
          reason: "Hỗ trợ tuyến đường xa > 20km",
        },
        {
          employeeCode: targetEmps[2]?.code ?? "EMP-003",
          employeeName: targetEmps[2]?.name ?? "Lê Hoàng Cường",
          policyCode: "HOUSING_ALLOWANCE",
          policyName: "Phụ cấp nhà ở",
          amount: 900000,
          reason: "Hỗ trợ lưu trú công nhân ngoại tỉnh",
        },
        {
          employeeCode: targetEmps[3]?.code ?? "EMP-004",
          employeeName: targetEmps[3]?.name ?? "Phạm Minh Đức",
          policyCode: "CHILD_CARE_ALLOWANCE",
          policyName: "Phụ cấp con nhỏ",
          amount: 500000,
          reason: "Hỗ trợ nuôi con nhỏ",
        },
      ]);
    }, 600);
  };

  const calculatedFormTotalAllowance = useMemo(() => {
    return formPolicies
      .filter(
        (i) =>
          i.isEnabled &&
          i.policyId !== "pol-base-salary" &&
          i.policyId !== "pol-insurance-salary" &&
          i.policyId !== "pol-hourly-rate" &&
          !i.policyId.startsWith("pol-ot")
      )
      .reduce((sum, i) => {
        const val = i.isCustom ? i.customValue?.amount : i.defaultValue?.amount;
        return sum + (typeof val === "number" ? val : 0);
      }, 0);
  }, [formPolicies]);

  const renderRoleBadge = (role: string) => {
    if (role === "shift_leader") return <StatusBadge tone="info">Trưởng ca / Tổ trưởng</StatusBadge>;
    if (role === "hoc_viec") return <StatusBadge tone="warning">Học việc / Thử việc</StatusBadge>;
    return <StatusBadge tone="neutral">Chính thức</StatusBadge>;
  };

  if (policiesQuery.isLoading) return <LoadingBlock rows={6} />;
  if (policiesQuery.isError) {
    return (
      <ErrorState
        message="Không thể tải danh sách chế độ người lao động"
        retry={() => policiesQuery.refetch()}
      />
    );
  }

  return (
    <div className="employee-policies-subtab">
      {/* Integrated Flat Card Table */}
      <div className="integrated-table-card">
        {/* Card Toolbar */}
        <div className="table-card-toolbar">
          <div className="filter-panel-top">
            <div className="filter-panel-inputs">
              <label className="search-field">
                <Search />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên nhân viên, mã NV..."
                />
              </label>
            </div>

            <div className="filter-panel-actions">
              <Button variant="primary" onClick={() => setImportModalOpen(true)}>
                <Upload /> Tải lên phụ cấp Excel
              </Button>
            </div>
          </div>

          <div className="filter-panel-bottom">
            <div className="filter-status-pills">
              <button
                type="button"
                className={`pill-btn ${filterMode === "all" ? "active" : ""}`}
                onClick={() => setFilterMode("all")}
              >
                Tất cả ({counts.all})
              </button>
              <button
                type="button"
                className={`pill-btn info ${filterMode === "shift_leader" ? "active" : ""}`}
                onClick={() => setFilterMode("shift_leader")}
              >
                Trưởng ca / Quản lý ({counts.shiftLeader})
              </button>
              <button
                type="button"
                className={`pill-btn success ${filterMode === "chinh_thuc" ? "active" : ""}`}
                onClick={() => setFilterMode("chinh_thuc")}
              >
                Chính thức ({counts.official})
              </button>
              <button
                type="button"
                className={`pill-btn warning ${filterMode === "hoc_viec" ? "active" : ""}`}
                onClick={() => setFilterMode("hoc_viec")}
              >
                Học việc ({counts.probation})
              </button>
            </div>
          </div>
        </div>

        {/* Content Table */}
        {filteredList.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bản ghi chế độ nhân viên"
            description="Chưa có dữ liệu chế độ người lao động phù hợp với tiêu chí lọc."
            action={
              <Button variant="primary" onClick={() => setImportModalOpen(true)}>
                <Upload /> Tải lên danh sách phụ cấp ngay
              </Button>
            }
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table min-w-[1100px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "165px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "150px" }}>CHỨC DANH</th>
                    <th className="text-right" style={{ width: "135px" }}>LƯƠNG CƠ BẢN</th>
                    <th style={{ minWidth: "290px" }}>CÁC KHOẢN PHỤ CẤP ÁP DỤNG</th>
                    <th className="text-right" style={{ width: "145px" }}>TỔNG PHỤ CẤP</th>
                    <th style={{ width: "140px" }}>NGÀY CẬP NHẬT</th>
                    <th style={{ width: "60px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((item, idx) => {
                    const stt = (page - 1) * pageSize + idx + 1;
                    const emp = employeeMap.get(item.employeeId) || employeeMap.get(item.employeeCode);
                    const projectCode = item.projectCode || emp?.projectCode;

                    // Active allowances list
                    const activeAllowances = (item.policies || []).filter(
                      (p) =>
                        p.isEnabled &&
                        p.policyId !== "pol-base-salary" &&
                        p.policyId !== "pol-insurance-salary" &&
                        p.policyId !== "pol-hourly-rate" &&
                        !p.policyId.startsWith("pol-ot")
                    );

                    const visibleAllowances = activeAllowances.slice(0, 2);
                    const remainingCount = activeAllowances.length - visibleAllowances.length;

                    return (
                      <tr key={item.id}>
                        <td className="text-center font-semibold text-foreground/80">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-bold text-foreground">{item.employeeName}</span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employeeCode}</span>
                              {projectCode && <span className="text-muted-foreground text-[11.5px] font-normal">· {projectCode}</span>}
                            </span>
                          </div>
                        </td>
                        <td>{renderRoleBadge(item.role)}</td>
                        <td className="text-right font-mono font-semibold text-foreground">
                          {formatCurrency(item.baseSalary)}
                        </td>
                        <td>
                          <div className="flex items-center flex-wrap gap-1.5 py-0.5">
                            {activeAllowances.length === 0 ? (
                              <span className="text-muted-foreground text-xs font-normal">Không có phụ cấp</span>
                            ) : (
                              <>
                                {visibleAllowances.map((pol) => {
                                  const valText = formatAllowanceValue(pol);
                                  const cleanName = pol.policyName.replace(/:$/, "").trim();
                                  return (
                                    <span
                                      key={pol.policyId}
                                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border/80 bg-secondary/70 text-foreground font-semibold shadow-2xs"
                                      title={pol.reason || pol.policyName}
                                    >
                                      <span className="text-foreground/90 font-medium">{cleanName}</span>
                                      {valText && (
                                        <strong className="font-mono font-bold text-primary">
                                          {valText}
                                        </strong>
                                      )}
                                    </span>
                                  );
                                })}

                                {remainingCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => openDetailModal(item)}
                                    className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-2xs"
                                    title={`Xem thêm ${remainingCount} khoản phụ cấp khác`}
                                  >
                                    +{remainingCount}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="text-right font-mono font-bold text-primary">
                          {formatCurrency(item.totalAllowance)}
                        </td>
                        <td>
                          <span className="text-xs font-semibold font-mono text-foreground block">
                            {item.updatedAt ? formatDate(item.updatedAt) : "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {item.updatedBy || "Kế toán C&B"}
                          </span>
                        </td>
                        <td className="text-center">
                          <TableRowActions
                            items={[
                              {
                                key: "view-details",
                                label: "Xem chi tiết phụ cấp",
                                icon: <Info />,
                                onClick: () => openDetailModal(item),
                              },
                              {
                                key: "edit-policy",
                                label: "Cấu hình chế độ & phụ cấp",
                                icon: <Pencil />,
                                onClick: () => openEditModal(item),
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

            {/* Attached Table Footer */}
            <TablePaginationFooter
              totalItems={filteredList.length}
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
      </div>

      {/* BOTTOM AUDIT / ACTIVITY LOG */}
      <SubtabActivityLog
        projectId={projectId}
        module="policies"
        title="Nhật ký điều chỉnh Chế độ & Phụ cấp"
        description="Lịch sử tùy biến phụ cấp riêng, khôi phục chuẩn và import Excel phụ cấp"
      />

      {/* Modal 1: Thiết lập chế độ đãi ngộ & Phụ cấp người lao động */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={`Cấu hình Chế độ & Phụ cấp: ${editRecord?.employeeName}`}
        description={`Mã NV: ${editRecord?.employeeCode} · Chức danh: ${editRecord?.roleTitle} · Dự án: ${editRecord?.projectCode || "JSS-ST"}`}
        size="lg"
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Check /> Lưu cấu hình chế độ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Quick Summary Header Strip - Sticky with distinct shadow */}
          <div className="sticky -top-5 z-20 bg-card/95 backdrop-blur-md p-3.5 rounded-xl border border-border shadow-md">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground font-medium block mb-0.5">Lương cơ bản (LCB)</span>
                <strong className="text-base font-mono font-bold text-foreground">
                  {formatCurrency(formBaseSalary)}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground font-medium block mb-0.5">Lương đóng BHXH</span>
                <strong className="text-base font-mono font-bold text-foreground">
                  {formatCurrency(formInsuranceSalary)}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground font-medium block mb-0.5">Tổng phụ cấp hàng tháng</span>
                <strong className="text-base font-mono font-bold text-primary">
                  {formatCurrency(calculatedFormTotalAllowance)}
                </strong>
              </div>
            </div>
          </div>

          {/* Policy List Groupings */}
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {/* Group 1: Lương cơ sở */}
            <div className="p-3.5 rounded-lg border border-border bg-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-primary" /> Mức Lương cơ sở thỏa thuận
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <label className="form-field">
                  <span className="font-semibold text-foreground text-xs">Mức Lương cơ bản (VNĐ) *</span>
                  <input
                    type="number"
                    step="100000"
                    value={formBaseSalary}
                    onChange={(e) => setFormBaseSalary(Number(e.target.value))}
                    required
                  />
                </label>
                <label className="form-field">
                  <span className="font-semibold text-foreground text-xs">Lương đóng Bảo hiểm Xã hội (VNĐ) *</span>
                  <input
                    type="number"
                    step="100000"
                    value={formInsuranceSalary}
                    onChange={(e) => setFormInsuranceSalary(Number(e.target.value))}
                    required
                  />
                </label>
              </div>
            </div>

            {/* Group 2: Các khoản phụ cấp định kỳ */}
            <div className="p-3.5 rounded-lg border border-border bg-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-primary" /> Các khoản phụ cấp &amp; Trợ cấp tháng
              </h4>

              <div className="space-y-2.5">
                {formPolicies
                  .filter(
                    (p) =>
                      p.policyId !== "pol-base-salary" &&
                      p.policyId !== "pol-insurance-salary" &&
                      p.policyId !== "pol-hourly-rate" &&
                      !p.policyId.startsWith("pol-ot")
                  )
                  .map((pol) => {
                    const defaultAmt = pol.defaultValue?.amount ?? 0;
                    const currentAmt = pol.isCustom ? pol.customValue?.amount ?? defaultAmt : defaultAmt;
                    const cleanName = pol.policyName.replace(/:$/, "").trim();

                    return (
                      <div
                        key={pol.policyId}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          pol.isEnabled
                            ? "bg-secondary/40 border-border"
                            : "bg-secondary/10 border-border/40 opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={pol.isEnabled}
                              onChange={(e) => handleTogglePolicy(pol.policyId, e.target.checked)}
                            />
                            <span className="font-bold text-sm text-foreground">
                              {cleanName}
                            </span>
                          </label>

                          <span className="text-xs text-muted-foreground font-medium">
                            Chuẩn dự án: <strong className="font-mono text-foreground font-semibold">{formatCurrency(defaultAmt)}</strong>
                          </span>
                        </div>

                        {pol.isEnabled && (
                          <div className="grid grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-border">
                            <label className="form-field">
                              <span className="text-xs font-semibold text-foreground">Mức tiền áp dụng cho NLĐ (VNĐ)</span>
                              <input
                                type="number"
                                step="50000"
                                value={currentAmt}
                                onChange={(e) =>
                                  handleUpdatePolicyAmount(pol.policyId, Number(e.target.value))
                                }
                              />
                            </label>
                            <label className="form-field">
                              <span className="text-xs font-semibold text-foreground">Ghi chú / Quyết định</span>
                              <input
                                type="text"
                                placeholder="VD: QĐ số 42/QĐ-BĐH..."
                                value={pol.reason || ""}
                                onChange={(e) => handleUpdatePolicyReason(pol.policyId, e.target.value)}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Reusable Excel Import Modal */}
      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Tải Lên Danh Sách Phụ Cấp &amp; Chế Độ Nhân Sự"
        description="Tải lên tệp Excel danh sách các khoản phụ cấp hoặc mức lương thỏa thuận được thiết lập cho từng người lao động."
        sampleTemplateName="Mau_Che_Do_Phu_Cap_Nhan_Vien.xlsx"
        sampleTemplateDescription="Bảng kê gồm: Mã NV, Họ và tên, Mã chế độ (VD: RESPONSIBILITY_ALLOWANCE, TRAVEL_ALLOWANCE, HOUSING_ALLOWANCE), Mức tiền và Lý do điều chỉnh."
        onDownloadSample={() => notify("Đã tải xuống biểu mẫu Mau_Che_Do_Phu_Cap_Nhan_Vien.xlsx")}
        columns={[
          {
            key: "employeeCode",
            label: "Mã NV",
            width: "110px",
            render: (row) => <code>{row.employeeCode}</code>,
          },
          {
            key: "employeeName",
            label: "Họ và tên",
            render: (row) => <strong>{row.employeeName}</strong>,
          },
          {
            key: "policyName",
            label: "Tên khoản chế độ / Phụ cấp",
            render: (row) => <Badge tone="info">{row.policyName?.replace(/:$/, "").trim()}</Badge>,
          },
          {
            key: "amount",
            label: "Mức áp dụng",
            align: "right",
            render: (row) => (
              <strong className="font-mono text-primary font-bold">
                {formatCurrency(row.amount)}
              </strong>
            ),
          },
          {
            key: "reason",
            label: "Lý do điều chỉnh",
            render: (row) => <span className="text-xs font-medium text-foreground">{row.reason}</span>,
          },
        ]}
        previewRows={uploadPreviewRows}
        stats={[
          {
            label: "Tổng bản ghi",
            value: `${uploadPreviewRows.length} nhân sự`,
            tone: "primary",
          },
          {
            label: "Số khoản phụ cấp",
            value: `${uploadPreviewRows.length} khoản`,
            tone: "warning",
          },
          {
            label: "Thẩm định dữ liệu",
            value: "Hợp lệ 100%",
            tone: "success",
          },
        ]}
        onSimulateUpload={handleSimulateFileUpload}
        isUploading={isUploading}
        onConfirmImport={() => importMutation.mutate()}
        confirmLoading={importMutation.isPending}
        onClearPreview={() => setUploadPreviewRows([])}
      />

      {/* Modal 3: View Full Allowance Details */}
      <Modal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={`Chi tiết Chế độ & Phụ cấp: ${detailRecord?.employeeName}`}
        description={`Mã NV: ${detailRecord?.employeeCode} · Chức danh: ${detailRecord?.roleTitle} · Dự án: ${detailRecord?.projectCode || "JSS-ST"}`}
        size="md"
        footer={
          <>
            <Button onClick={() => setDetailModalOpen(false)}>Đóng</Button>
            <Button
              variant="primary"
              onClick={() => {
                const rec = detailRecord;
                setDetailModalOpen(false);
                if (rec) openEditModal(rec);
              }}
            >
              <Pencil /> Chỉnh sửa cấu hình
            </Button>
          </>
        }
      >
        {detailRecord && (() => {
          const activeAll = (detailRecord.policies || []).filter(
            (p) =>
              p.isEnabled &&
              p.policyId !== "pol-base-salary" &&
              p.policyId !== "pol-insurance-salary" &&
              p.policyId !== "pol-hourly-rate" &&
              !p.policyId.startsWith("pol-ot")
          );

          return (
            <div className="space-y-4">
              {/* Summary Strip - Sticky with distinct shadow */}
              <div className="sticky -top-5 z-20 bg-card/95 backdrop-blur-md p-3.5 rounded-xl border border-border shadow-md">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground font-medium block mb-0.5">Tổng phụ cấp hàng tháng</span>
                    <strong className="text-lg font-mono font-bold text-primary">
                      {formatCurrency(detailRecord.totalAllowance)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium block mb-0.5">Số khoản đang áp dụng</span>
                    <strong className="text-lg font-mono font-bold text-foreground">
                      {activeAll.length} khoản phụ cấp
                    </strong>
                  </div>
                </div>
              </div>

              {/* Allowances List Table / Cards */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {activeAll.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    Người lao động này hiện không có khoản phụ cấp nào được áp dụng.
                  </div>
                ) : (
                  activeAll.map((pol) => {
                    const defaultAmt = pol.defaultValue?.amount ?? 0;
                    const valText = formatAllowanceValue(pol);
                    const cleanName = pol.policyName.replace(/:$/, "").trim();
                    const amtNumber = pol.isCustom ? pol.customValue?.amount : pol.defaultValue?.amount;

                    return (
                      <div
                        key={pol.policyId}
                        className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span>{cleanName}</span>
                          </div>
                          {pol.reason ? (
                            <div className="text-xs text-muted-foreground mt-0.5 font-medium">{pol.reason}</div>
                          ) : (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Chuẩn dự án: {formatCurrency(defaultAmt)}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-base text-primary block">
                            {typeof amtNumber === "number"
                              ? formatCurrency(amtNumber)
                              : valText}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
