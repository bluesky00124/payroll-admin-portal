"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileUp,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  UploadCloud,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExcelImportModal } from "@/components/employees/excel-import-modal";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  MonthPicker,
  StatusBadge,
  TablePaginationFooter,
  TableRowActions,
} from "@/components/ui";
import { api } from "@/lib/api";
import type {
  Employee,
  InsuranceChangeRecord,
  InsuranceChangeType,
  InsuranceRecord,
} from "@/lib/types";
import { cn, formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

export function InsuranceSubtab({
  projectId,
  employees,
  isAccountant = true,
}: {
  projectId: string;
  employees: Employee[];
  isAccountant?: boolean;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  // Chế độ xem: "master" (Danh sách tham gia BHXH) | "changes" (Biến động trong kỳ)
  const [activeView, setActiveView] = useState<"master" | "changes">("master");

  // Bộ lọc chung & kỳ áp dụng (tháng trước năm sau: YYYY-MM)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("2026-08");
  const [changeStatusFilter, setChangeStatusFilter] = useState<string>("all");
  const [masterStatusFilter, setMasterStatusFilter] = useState<string>("all");

  // Selection state
  const [selectedChangeIds, setSelectedChangeIds] = useState<Set<string>>(new Set());

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [declareModalOpen, setDeclareModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedChangeForAction, setSelectedChangeForAction] = useState<InsuranceChangeRecord | null>(null);

  // Form state cho Modal Khai báo biến động
  const [formEmployeeId, setFormEmployeeId] = useState(employees[0]?.id ?? "");
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  const [formChangeType, setFormChangeType] = useState<InsuranceChangeType>("salary_adjust");
  const [formNewSalary, setFormNewSalary] = useState<number>(6300000);
  const [formEffectiveMonth, setFormEffectiveMonth] = useState("2026-08");
  const [formReason, setFormReason] = useState("");
  const [formDocName, setFormDocName] = useState("");
  const [formDocSize, setFormDocSize] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state cho Modal Kế toán Xác nhận đối chiếu
  const [agencyReceiptCode, setAgencyReceiptCode] = useState("BHXH-7901-202608-00582");
  const [verifierName, setVerifierName] = useState("Trần Thu Trang (Kế toán BHXH)");

  // Form state cho Modal Từ chối
  const [rejectionReason, setRejectionReason] = useState("");

  // Upload preview state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreviewRows, setUploadPreviewRows] = useState<Array<{
    employeeCode: string;
    employeeName: string;
    changeType: InsuranceChangeType;
    newSalary: number;
    reason: string;
  }>>([]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    (employees || []).forEach((emp) => {
      map.set(emp.id, emp);
      if (emp.code) map.set(emp.code, emp);
    });
    return map;
  }, [employees]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Queries
  const masterQuery = useQuery({
    queryKey: ["insurance-master", projectId],
    queryFn: () =>
      api.getInsuranceMasterRecords({
        projectId: projectId === "all" ? undefined : projectId,
      }),
  });

  const changesQuery = useQuery({
    queryKey: ["insurance-changes", projectId, selectedPeriod],
    queryFn: () =>
      api.getInsuranceChanges({
        projectId: projectId === "all" ? undefined : projectId,
        period: selectedPeriod,
      }),
  });

  const masterRecords = masterQuery.data ?? [];
  const changeRecords = changesQuery.data ?? [];

  // Filtered employees for search combobox
  const filteredEmployeesForSelect = useMemo(() => {
    if (!employeeSearchTerm.trim()) return employees;
    const term = employeeSearchTerm.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.code.toLowerCase().includes(term) ||
        e.position.toLowerCase().includes(term)
    );
  }, [employees, employeeSearchTerm]);

  // Currently selected employee for Declare modal
  const selectedEmployeeObj = useMemo(() => {
    return employees.find((e) => e.id === formEmployeeId) || employees[0];
  }, [employees, formEmployeeId]);

  const selectedEmployeeMaster = useMemo(() => {
    return masterRecords.find((m) => m.employeeId === formEmployeeId);
  }, [masterRecords, formEmployeeId]);

  // Filtered Master
  const filteredMaster = useMemo(() => {
    return masterRecords.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.employeeName.toLowerCase().includes(term) ||
        item.employeeCode.toLowerCase().includes(term) ||
        item.insuranceBookNumber.toLowerCase().includes(term);

      const matchStatus = masterStatusFilter === "all" || item.status === masterStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [masterRecords, searchTerm, masterStatusFilter]);

  // Filtered Changes
  const filteredChanges = useMemo(() => {
    return changeRecords.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.employeeName.toLowerCase().includes(term) ||
        item.employeeCode.toLowerCase().includes(term) ||
        item.reason.toLowerCase().includes(term);

      const matchStatus = changeStatusFilter === "all" || item.status === changeStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [changeRecords, searchTerm, changeStatusFilter]);

  // Pagination for Master
  const [masterPage, setMasterPage] = useState(1);
  const [masterPageSize, setMasterPageSize] = useState(10);
  const paginatedMaster = useMemo(() => {
    const start = (masterPage - 1) * masterPageSize;
    return filteredMaster.slice(start, start + masterPageSize);
  }, [filteredMaster, masterPage, masterPageSize]);

  // Pagination for Changes
  const [changesPage, setChangesPage] = useState(1);
  const [changesPageSize, setChangesPageSize] = useState(10);
  const paginatedChanges = useMemo(() => {
    const start = (changesPage - 1) * changesPageSize;
    return filteredChanges.slice(start, start + changesPageSize);
  }, [filteredChanges, changesPage, changesPageSize]);

  // Pending counts
  const pendingChanges = useMemo(
    () => changeRecords.filter((r) => r.status === "pending_agency_verification"),
    [changeRecords]
  );
  const pendingCount = pendingChanges.length;

  const isAllPendingSelected =
    pendingChanges.length > 0 && pendingChanges.every((item) => selectedChangeIds.has(item.id));

  const toggleSelectAllChanges = () => {
    if (isAllPendingSelected) {
      setSelectedChangeIds(new Set());
    } else {
      setSelectedChangeIds(new Set(pendingChanges.map((item) => item.id)));
    }
  };

  const toggleSelectChangeItem = (id: string) => {
    const next = new Set(selectedChangeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedChangeIds(next);
  };

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormDocName(file.name);
      const sizeKb = Math.round(file.size / 1024);
      setFormDocSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
      notify(`Đã chọn tệp đính kèm: ${file.name}`);
    }
  };

  // Mutations
  const createChangeMutation = useMutation({
    mutationFn: async (payload: Partial<InsuranceChangeRecord>) => api.createInsuranceChange(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["insurance-master"] });
      setDeclareModalOpen(false);
      setFormReason("");
      setFormDocName("");
      setFormDocSize("");
      notify("Đã tạo yêu cầu biến động BHXH thành công! Đang chờ C&B đối chiếu.");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const batchImportMutation = useMutation({
    mutationFn: async (items: Partial<InsuranceChangeRecord>[]) => api.batchImportInsuranceChanges(items),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["insurance-master"] });
      setUploadModalOpen(false);
      setUploadPreviewRows([]);
      notify(`Đã nạp thành công ${data.length} bản ghi biến động vào ${formatMonthYear(selectedPeriod)}!`);
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const verifyChangeMutation = useMutation({
    mutationFn: async ({ id, receiptCode, verifier }: { id: string; receiptCode?: string; verifier?: string }) =>
      api.verifyInsuranceChange(id, { verifiedBy: verifier, agencyReceiptCode: receiptCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["insurance-master"] });
      setVerifyModalOpen(false);
      setSelectedChangeForAction(null);
      notify("Kế toán đã xác nhận đối chiếu BHXH thành công! Đã tự động cập nhật danh sách tham gia.");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const batchVerifyMutation = useMutation({
    mutationFn: async ({ ids, receiptCode, verifier }: { ids: string[]; receiptCode?: string; verifier?: string }) =>
      api.batchVerifyInsuranceChanges({ ids, verifiedBy: verifier, agencyReceiptCode: receiptCode }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["insurance-changes"] });
      queryClient.invalidateQueries({ queryKey: ["insurance-master"] });
      setSelectedChangeIds(new Set());
      setVerifyModalOpen(false);
      notify(`Đã xác nhận đối chiếu thành công ${data.length} hồ sơ BHXH!`);
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const rejectChangeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      api.rejectInsuranceChange(id, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-changes"] });
      setRejectModalOpen(false);
      setSelectedChangeForAction(null);
      setRejectionReason("");
      notify("Đã từ chối hồ sơ biến động BHXH.");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  // Helpers
  const renderChangeTypeBadge = (type: InsuranceChangeType) => {
    switch (type) {
      case "increase":
        return <StatusBadge tone="success">Báo tăng mới</StatusBadge>;
      case "decrease":
        return <StatusBadge tone="danger">Báo giảm hẳn</StatusBadge>;
      case "salary_adjust":
        return <StatusBadge tone="warning">Điều chỉnh mức đóng</StatusBadge>;
      case "suspend":
        return <StatusBadge tone="neutral">Tạm dừng đóng</StatusBadge>;
      case "resume":
        return <StatusBadge tone="info">Đóng trở lại</StatusBadge>;
    }
  };

  const handleSimulateFileUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadPreviewRows([
        {
          employeeCode: "NV-JSS-002",
          employeeName: "Trần Thị Bích",
          changeType: "salary_adjust",
          newSalary: 7200000,
          reason: "Điều chỉnh lương chức danh Tổ trưởng KCS",
        },
        {
          employeeCode: "NV-JSS-005",
          employeeName: "Hoàng Văn Em",
          changeType: "increase",
          newSalary: 6300000,
          reason: "Ký HĐLĐ chính thức sau thử việc",
        },
      ]);
    }, 600);
  };

  const handleConfirmImport = () => {
    const items: Partial<InsuranceChangeRecord>[] = uploadPreviewRows.map((row) => {
      const emp = employees.find((e) => e.code === row.employeeCode);
      return {
        employeeId: emp?.id ?? `emp-import-${row.employeeCode}`,
        employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        projectId: emp?.projectId ?? (projectId === "all" ? "prj-jss" : projectId),
        period: selectedPeriod,
        changeType: row.changeType,
        newSalary: row.newSalary,
        effectiveMonth: selectedPeriod,
        reason: row.reason,
        documentName: "Mau_Bien_Dong_BHXH.xlsx",
      };
    });
    batchImportMutation.mutate(items);
  };

  const handleCreateDeclare = () => {
    if (!selectedEmployeeObj) {
      notify("Vui lòng chọn người lao động", "warning");
      return;
    }
    createChangeMutation.mutate({
      employeeId: selectedEmployeeObj.id,
      employeeCode: selectedEmployeeObj.code,
      employeeName: selectedEmployeeObj.name,
      projectId: selectedEmployeeObj.projectId,
      period: selectedPeriod,
      changeType: formChangeType,
      oldSalary: selectedEmployeeMaster?.insuranceSalary ?? 6300000,
      newSalary: formChangeType === "decrease" ? 0 : formNewSalary,
      effectiveMonth: formEffectiveMonth,
      reason: formReason || "Khai báo biến động theo thỏa thuận",
      documentName: formDocName || undefined,
    });
  };

  // Statutory Calculations for Declare modal
  const calcEmpAmount = Math.round((formChangeType === "decrease" ? 0 : formNewSalary) * 0.105);
  const calcCompAmount = Math.round((formChangeType === "decrease" ? 0 : formNewSalary) * 0.215);
  const calcTotalAmount = calcEmpAmount + calcCompAmount;

  if (masterQuery.isLoading && changesQuery.isLoading) return <LoadingBlock rows={6} />;
  if (masterQuery.isError || changesQuery.isError) {
    return (
      <ErrorState
        message="Không thể tải dữ liệu Bảo hiểm xã hội"
        retry={() => {
          masterQuery.refetch();
          changesQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="insurance-subtab">
      {/* Navigation Switcher: Danh sách tham gia BHXH vs Biến động trong kỳ */}
      <div className="subtab-view-switcher">
        <button
          type="button"
          className={`subtab-view-btn ${activeView === "master" ? "active" : ""}`}
          onClick={() => {
            setActiveView("master");
            setMasterPage(1);
          }}
        >
          <BookOpen />
          <span>Danh sách tham gia BHXH ({masterRecords.length})</span>
        </button>
        <button
          type="button"
          className={`subtab-view-btn ${activeView === "changes" ? "active" : ""}`}
          onClick={() => {
            setActiveView("changes");
            setChangesPage(1);
          }}
        >
          <FileSpreadsheet />
          <span>Biến động trong kỳ</span>
          {pendingCount > 0 && <span className="subtab-view-counter">{pendingCount}</span>}
        </button>
      </div>

      {/* TAB 1: DANH SÁCH THAM GIA BHXH (SỔ THEO DÕI HIỆN HÀNH) */}
      {activeView === "master" && (
        <div className="integrated-table-card">
          <div className="table-card-toolbar">
            <div className="filter-panel-top">
              <div className="filter-panel-inputs">
                <label className="search-field">
                  <Search />
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setMasterPage(1);
                    }}
                    placeholder="Tìm theo tên NV, mã NV, mã số BHXH..."
                  />
                </label>
              </div>

              <div className="filter-panel-actions">
                <Button
                  variant="primary"
                  onClick={() => {
                    setActiveView("changes");
                    setDeclareModalOpen(true);
                  }}
                >
                  <Plus /> Khai báo biến động
                </Button>
              </div>
            </div>

            <div className="filter-panel-bottom">
              <div className="filter-status-pills">
                <button
                  type="button"
                  className={`pill-btn ${masterStatusFilter === "all" ? "active" : ""}`}
                  onClick={() => {
                    setMasterStatusFilter("all");
                    setMasterPage(1);
                  }}
                >
                  Tất cả ({masterRecords.length})
                </button>
                <button
                  type="button"
                  className={`pill-btn success ${masterStatusFilter === "active" ? "active" : ""}`}
                  onClick={() => {
                    setMasterStatusFilter("active");
                    setMasterPage(1);
                  }}
                >
                  Đang tham gia ({masterRecords.filter((m) => m.status === "active").length})
                </button>
                <button
                  type="button"
                  className={`pill-btn warning ${masterStatusFilter === "suspended" ? "active" : ""}`}
                  onClick={() => {
                    setMasterStatusFilter("suspended");
                    setMasterPage(1);
                  }}
                >
                  Tạm dừng / Thai sản ({masterRecords.filter((m) => m.status === "suspended").length})
                </button>
                <button
                  type="button"
                  className={`pill-btn danger ${masterStatusFilter === "stopped" ? "active" : ""}`}
                  onClick={() => {
                    setMasterStatusFilter("stopped");
                    setMasterPage(1);
                  }}
                >
                  Đã dừng đóng ({masterRecords.filter((m) => m.status === "stopped").length})
                </button>
              </div>

            </div>
          </div>

          {filteredMaster.length === 0 ? (
            <EmptyState
              title="Không có hồ sơ trong danh sách tham gia BHXH"
              description="Không tìm thấy người lao động phù hợp với điều kiện tìm kiếm."
            />
          ) : (
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th>Người lao động</th>
                    <th>Mã số BHXH (10 số)</th>
                    <th className="text-right">Mức lương đóng BH</th>
                    <th className="text-right">NLĐ trích (10.5%)</th>
                    <th className="text-right">DN đóng (21.5%)</th>
                    <th>Tháng áp dụng</th>
                    <th>Trạng thái tham gia</th>
                    <th>Nơi đăng ký KCB</th>
                    <th>Kế toán xác nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMaster.map((item, idx) => {
                    const empAmount = Math.round(item.insuranceSalary * 0.105);
                    const compAmount = Math.round(item.insuranceSalary * 0.215);
                    const stt = (masterPage - 1) * masterPageSize + idx + 1;
                    const emp = employeeMap.get(item.employeeId) || employeeMap.get(item.employeeCode);
                    const projectCode = item.projectCode || emp?.projectCode;

                    return (
                      <tr key={item.id}>
                        <td className="text-center text-muted font-medium">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold">{item.employeeName}</span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employeeCode}</span>
                              {projectCode && <span className="text-muted text-[11px] font-normal">· {projectCode}</span>}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono text-sm">{item.insuranceBookNumber}</td>
                        <td className="text-right font-mono">
                          <span className="font-semibold text-primary">{formatCurrency(item.insuranceSalary)}</span>
                        </td>
                        <td className="text-right font-mono">
                          <span className="font-semibold text-warning">{formatCurrency(empAmount)}</span>
                        </td>
                        <td className="text-right font-mono">
                          <span className="font-semibold text-info">{formatCurrency(compAmount)}</span>
                        </td>
                        <td>
                          <Badge tone="neutral">{formatMonthYear(item.effectiveMonth)}</Badge>
                        </td>
                        <td>
                          {item.status === "active" ? (
                            <StatusBadge tone="success">Đang tham gia</StatusBadge>
                          ) : item.status === "suspended" ? (
                            <StatusBadge tone="warning">Tạm dừng / Thai sản</StatusBadge>
                          ) : (
                            <StatusBadge tone="neutral" dot={false}>Đã dừng đóng</StatusBadge>
                          )}
                        </td>
                        <td>
                          <div className="hospital-cell">
                            <Building2 />
                            <span className="truncate" title={item.hospitalName || "BV Đa khoa Quận/Huyện"}>
                              {item.hospitalName || "BV Đa khoa Quận/Huyện"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-xs">
                            <div className="font-medium text-foreground">{item.verifiedBy?.split("(")[0] || "Hệ thống"}</div>
                            {item.verifiedAt && <div className="text-[11px] text-muted">{formatDate(item.verifiedAt)}</div>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePaginationFooter
              totalItems={filteredMaster.length}
              currentPage={masterPage}
              pageSize={masterPageSize}
              onPageChange={setMasterPage}
              onPageSizeChange={(newSize) => {
                setMasterPageSize(newSize);
                setMasterPage(1);
              }}
            />
          </div>
        )}
      </div>
    )}

      {/* TAB 2: BIẾN ĐỘNG TRONG KỲ */}
      {activeView === "changes" && (
        <div className="integrated-table-card">
          <div className="table-card-toolbar">
            <div className="filter-panel-top">
              <div className="filter-panel-inputs">
                <label className="search-field">
                  <Search />
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setChangesPage(1);
                    }}
                    placeholder="Tìm theo tên NV, mã NV, lý do..."
                  />
                </label>

                <MonthPicker
                  label="Kỳ trích nộp:"
                  value={selectedPeriod}
                  onChange={(val) => {
                    setSelectedPeriod(val);
                    setChangesPage(1);
                  }}
                  variant="filter"
                />
              </div>

              <div className="filter-panel-actions">
                {selectedChangeIds.size > 0 ? (
                  <div className="bulk-action-group">
                    <Badge tone="info">Đã chọn {selectedChangeIds.size} hồ sơ</Badge>
                    {isAccountant && (
                      <Button
                        variant="primary"
                        onClick={() => {
                          setSelectedChangeForAction(null);
                          setVerifyModalOpen(true);
                        }}
                      >
                        <CheckCheck /> Xác nhận {selectedChangeIds.size} hồ sơ đã chọn
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedChangeIds(new Set())}>
                      Bỏ chọn
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setUploadModalOpen(true)}
                      title="Chủ dự án tải lên tệp danh sách biến động BHXH kỳ này"
                    >
                      <Upload /> Tải lên biến động
                    </Button>

                    <Button
                      variant="primary"
                      onClick={() => {
                        setFormEmployeeId(employees[0]?.id ?? "");
                        const firstMaster = masterRecords.find((m) => m.employeeId === (employees[0]?.id ?? ""));
                        setFormNewSalary(firstMaster?.insuranceSalary ?? 6300000);
                        setFormEffectiveMonth(selectedPeriod);
                        setDeclareModalOpen(true);
                      }}
                      title="Khai báo tăng mới, giảm hẳn hoặc điều chỉnh mức đóng cho nhân sự"
                    >
                      <Plus /> Khai báo biến động
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="filter-panel-bottom">
              <div className="filter-status-pills">
                <button
                  type="button"
                  className={`pill-btn ${changeStatusFilter === "all" ? "active" : ""}`}
                  onClick={() => {
                    setChangeStatusFilter("all");
                    setChangesPage(1);
                  }}
                >
                  Tất cả ({changeRecords.length})
                </button>
                <button
                  type="button"
                  className={`pill-btn warning ${changeStatusFilter === "pending_agency_verification" ? "active" : ""}`}
                  onClick={() => {
                    setChangeStatusFilter("pending_agency_verification");
                    setChangesPage(1);
                  }}
                >
                  Chờ đối chiếu BHXH ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`pill-btn success ${changeStatusFilter === "verified" ? "active" : ""}`}
                  onClick={() => {
                    setChangeStatusFilter("verified");
                    setChangesPage(1);
                  }}
                >
                  Đã xác nhận BHXH ({changeRecords.filter((r) => r.status === "verified").length})
                </button>
                <button
                  type="button"
                  className={`pill-btn danger ${changeStatusFilter === "rejected" ? "active" : ""}`}
                  onClick={() => {
                    setChangeStatusFilter("rejected");
                    setChangesPage(1);
                  }}
                >
                  Từ chối ({changeRecords.filter((r) => r.status === "rejected").length})
                </button>
              </div>

            </div>
          </div>

          {filteredChanges.length === 0 ? (
            <EmptyState
              title={`Không có biến động BHXH trong tháng ${formatMonthYear(selectedPeriod)}`}
              description={
                searchTerm
                  ? "Không tìm thấy hồ sơ biến động phù hợp với từ khóa tìm kiếm."
                  : "Kỳ này chưa phát sinh biến động tăng/giảm hoặc điều chỉnh lương đóng BHXH. Bấm 'Khai báo biến động' hoặc 'Tải lên biến động' để thêm mới."
              }
              action={
                <Button variant="primary" onClick={() => setDeclareModalOpen(true)}>
                  <Plus /> Khai báo biến động mới
                </Button>
              }
            />
          ) : (
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table">
                <thead>
                  <tr>
                    {isAccountant && (
                      <th style={{ width: "40px" }} className="text-center">
                        <input
                          type="checkbox"
                          checked={isAllPendingSelected}
                          onChange={toggleSelectAllChanges}
                          disabled={pendingCount === 0}
                          title="Chọn tất cả hồ sơ chờ đối chiếu"
                        />
                      </th>
                    )}
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "160px" }}>Người lao động</th>
                    <th style={{ minWidth: "145px" }}>Loại biến động</th>
                    <th style={{ minWidth: "135px" }} className="text-right">Mức lương đóng</th>
                    <th style={{ minWidth: "125px" }} className="text-right">NLĐ trích (10.5%)</th>
                    <th style={{ minWidth: "125px" }} className="text-right">DN đóng (21.5%)</th>
                    <th style={{ minWidth: "200px" }}>Lý do & Chứng từ</th>
                    <th style={{ minWidth: "135px" }}>Trạng thái đối chiếu</th>
                    <th style={{ minWidth: "160px" }}>Kết quả cơ quan BHXH</th>
                    <th style={{ width: "60px" }} className="text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedChanges.map((item, idx) => {
                    const isPending = item.status === "pending_agency_verification";
                    const isVerified = item.status === "verified";
                    const isChecked = selectedChangeIds.has(item.id);
                    const empAmount = Math.round(item.newSalary * 0.105);
                    const compAmount = Math.round(item.newSalary * 0.215);
                    const stt = (changesPage - 1) * changesPageSize + idx + 1;
                    const emp = employeeMap.get(item.employeeId) || employeeMap.get(item.employeeCode);
                    const projectCode = item.projectCode || emp?.projectCode;

                    return (
                      <tr
                        key={item.id}
                        className={
                          isChecked
                            ? "highlight-selected-row"
                            : isPending
                            ? "highlight-pending-row"
                            : undefined
                        }
                      >
                        {isAccountant && (
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectChangeItem(item.id)}
                              disabled={!isPending}
                              title={isPending ? "Tích chọn để xác nhận" : "Hồ sơ đã xử lý"}
                            />
                          </td>
                        )}
                        <td className="text-center text-muted font-medium">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold">{item.employeeName}</span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{item.employeeCode}</span>
                              {projectCode && <span className="text-muted text-[11px] font-normal">· {projectCode}</span>}
                            </span>
                          </div>
                        </td>
                        <td>{renderChangeTypeBadge(item.changeType)}</td>
                        <td className="text-right font-mono">
                          <div className="salary-diff-cell">
                            <span className="salary-diff-new">{formatCurrency(item.newSalary)}</span>
                            {item.oldSalary !== undefined && item.oldSalary !== item.newSalary && (
                              <span className="salary-diff-old">{formatCurrency(item.oldSalary)}</span>
                            )}
                          </div>
                        </td>
                        <td className="text-right font-mono">
                          <span className="text-warning font-semibold">{formatCurrency(empAmount)}</span>
                        </td>
                        <td className="text-right font-mono">
                          <span className="text-info font-semibold">{formatCurrency(compAmount)}</span>
                        </td>
                        <td>
                          <div className="change-reason-cell">
                            <span className="change-reason-text" title={item.reason}>{item.reason}</span>
                            {item.documentName && (
                              <span className="doc-attachment-tag" title={item.documentName}>
                                <FileText />
                                <span className="truncate">{item.documentName}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {isPending ? (
                            <StatusBadge tone="warning">Chờ đối chiếu</StatusBadge>
                          ) : isVerified ? (
                            <StatusBadge tone="success">Đã xác nhận</StatusBadge>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <StatusBadge tone="danger">Từ chối</StatusBadge>
                              {item.rejectionReason && (
                                <span className="text-[11px] text-destructive max-w-[170px] truncate" title={item.rejectionReason}>
                                  {item.rejectionReason}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          {item.agencyReceiptCode ? (
                            <div className="flex flex-col gap-0.5 items-start">
                              <span className="agency-receipt-code">{item.agencyReceiptCode}</span>
                              <div className="text-[11px] text-muted">
                                {item.verifiedBy?.split("(")[0]} • {formatDate(item.verifiedAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <TableRowActions
                            items={[
                              ...(isAccountant && isPending
                                ? [
                                    {
                                      key: "verify",
                                      label: "Xác nhận đối chiếu BHXH",
                                      icon: <Check />,
                                      onClick: () => {
                                        setSelectedChangeForAction(item);
                                        setVerifyModalOpen(true);
                                      },
                                    },
                                    {
                                      key: "reject",
                                      label: "Từ chối hồ sơ",
                                      icon: <X />,
                                      danger: true,
                                      onClick: () => {
                                        setSelectedChangeForAction(item);
                                        setRejectModalOpen(true);
                                      },
                                    },
                                  ]
                                : []),
                              ...(item.documentName
                                ? [
                                    {
                                      key: "document",
                                      label: `Xem chứng từ: ${item.documentName}`,
                                      icon: <FileText />,
                                      onClick: () => {
                                        notify(`Xem chứng từ đính kèm: ${item.documentName}`);
                                      },
                                    },
                                  ]
                                : []),
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
              totalItems={filteredChanges.length}
              selectedCount={selectedChangeIds.size}
              currentPage={changesPage}
              pageSize={changesPageSize}
              onPageChange={setChangesPage}
              onPageSizeChange={(newSize) => {
                setChangesPageSize(newSize);
                setChangesPage(1);
              }}
            />
          </div>
        )}
      </div>
    )}

      {/* MODAL 1: TẢI LÊN DANH SÁCH BIẾN ĐỘNG (DÙNG COMPONENT CHUNG) */}
      <ExcelImportModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        title={`Tải Lên Danh Sách Biến Động BHXH - ${formatMonthYear(selectedPeriod)}`}
        description="Nạp bảng tổng hợp biến động tăng, giảm, điều chỉnh mức đóng BHXH hàng tháng từ Chủ dự án / BCSX."
        period={selectedPeriod}
        sampleTemplateName="Mau_Bien_Dong_BHXH.xlsx"
        sampleTemplateDescription="Bảng kê gồm: Mã NV, Họ tên, Loại biến động (Tăng mới / Báo giảm / Điều chỉnh), Mức lương đóng mới và Lý do."
        onDownloadSample={() => notify("Đã tải xuống biểu mẫu Mau_Bien_Dong_BHXH.xlsx")}
        columns={[
          {
            key: "employeeCode",
            label: "Mã NV",
            width: "120px",
            render: (row) => <code>{row.employeeCode}</code>,
          },
          {
            key: "employeeName",
            label: "Họ và tên",
            render: (row) => <strong>{row.employeeName}</strong>,
          },
          {
            key: "changeType",
            label: "Loại biến động",
            render: (row) => renderChangeTypeBadge(row.changeType),
          },
          {
            key: "newSalary",
            label: "Lương đóng mới",
            align: "right",
            render: (row) => (
              <strong className="text-primary font-mono font-bold">
                {formatCurrency(row.newSalary)}
              </strong>
            ),
          },
          {
            key: "reason",
            label: "Lý do biến động",
            render: (row) => <span className="text-xs">{row.reason}</span>,
          },
        ]}
        previewRows={uploadPreviewRows}
        stats={[
          {
            label: "Tổng số bản ghi",
            value: `${uploadPreviewRows.length} dòng`,
            tone: "primary",
          },
          {
            label: "Báo tăng mới",
            value: `${uploadPreviewRows.filter((r) => r.changeType === "increase").length}`,
            tone: "success",
          },
          {
            label: "Điều chỉnh lương",
            value: `${uploadPreviewRows.filter((r) => r.changeType === "salary_adjust").length}`,
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
        onConfirmImport={handleConfirmImport}
        confirmLoading={batchImportMutation.isPending}
        onClearPreview={() => setUploadPreviewRows([])}
      />

      {/* MODAL 2: KHAI BÁO BIẾN ĐỘNG (SENIOR DESIGNED WITH SEARCHABLE SELECT & EQUAL CARDS) */}
      <Modal
        open={declareModalOpen}
        onOpenChange={(open) => {
          setDeclareModalOpen(open);
          if (!open) setIsEmployeeDropdownOpen(false);
        }}
        title="Khai Báo Biến Động Bảo Hiểm Xã Hội"
        description={`Chủ dự án / Quản lý tạo yêu cầu biến động BHXH kỳ ${formatMonthYear(selectedPeriod)} để chuyển C&B đối chiếu với cơ quan BHXH.`}
        size="lg"
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setDeclareModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateDeclare}
              loading={createChangeMutation.isPending}
            >
              <Check /> Gửi yêu cầu biến động
            </Button>
          </div>
        }
      >
        <div className="declare-modal-form">
          {/* 1. Chọn nhân sự với Searchable Combobox */}
          <div className="declare-section-block">
            <div className="declare-section-header">
              <div className="declare-section-header-left">
                <span className="declare-section-badge">1</span>
                <span className="declare-section-title">Chọn người lao động</span>
              </div>
              <span className="declare-section-hint">Tìm theo tên, mã NV hoặc chức danh</span>
            </div>

            <div className="searchable-select-container" ref={employeeDropdownRef}>
              <button
                type="button"
                className={`searchable-select-trigger ${isEmployeeDropdownOpen ? "open" : ""}`}
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
              >
                <div className="flex items-center gap-2">
                  <span className="employee-code-badge">{selectedEmployeeObj?.code}</span>
                  <strong className="text-foreground">{selectedEmployeeObj?.name}</strong>
                  <span className="text-xs text-muted">({selectedEmployeeObj?.position})</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted" />
              </button>

              {isEmployeeDropdownOpen && (
                <div className="searchable-select-dropdown">
                  <div className="searchable-select-search-box">
                    <Search className="w-4 h-4 text-muted flex-shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Tìm kiếm theo họ tên hoặc mã nhân viên..."
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {employeeSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setEmployeeSearchTerm("")}
                        className="text-muted hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="searchable-select-list">
                    {filteredEmployeesForSelect.length === 0 ? (
                      <div className="p-3 text-xs text-muted text-center">
                        Không tìm thấy người lao động phù hợp
                      </div>
                    ) : (
                      filteredEmployeesForSelect.map((emp) => {
                        const isSelected = emp.id === formEmployeeId;
                        const empMaster = masterRecords.find((m) => m.employeeId === emp.id);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            className={`searchable-select-item ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setFormEmployeeId(emp.id);
                              if (empMaster) {
                                setFormNewSalary(empMaster.insuranceSalary);
                              }
                              setIsEmployeeDropdownOpen(false);
                              setEmployeeSearchTerm("");
                            }}
                          >
                            <div className="searchable-select-item-left">
                              <span className="employee-code-badge">{emp.code}</span>
                              <div>
                                <span className="font-semibold text-xs text-foreground">{emp.name}</span>
                                <div className="text-[11px] text-muted">{emp.position}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-primary font-mono font-semibold">
                                {formatCurrency(empMaster?.insuranceSalary ?? 6300000)}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedEmployeeObj && (
              <div className="employee-preview-banner">
                <div className="employee-preview-left">
                  <div className="employee-avatar-circle">
                    {selectedEmployeeObj.name.split(" ").slice(-1)[0][0]}
                  </div>
                  <div className="employee-preview-meta">
                    <span className="employee-preview-name">{selectedEmployeeObj.name}</span>
                    <span className="employee-preview-sub">
                      <span className="employee-code-badge">{selectedEmployeeObj.code}</span>
                      <span>•</span>
                      <span>{selectedEmployeeObj.position}</span>
                    </span>
                  </div>
                </div>

                <div className="employee-preview-salary-badge">
                  <span className="employee-preview-salary-label">Mức đóng hiện tại</span>
                  <span className="employee-preview-salary-val">
                    {formatCurrency(selectedEmployeeMaster?.insuranceSalary ?? 6300000)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Chọn loại biến động (Đơn giản, tinh gọn chuẩn SOP) */}
          <div className="declare-section-block">
            <div className="declare-section-header">
              <div className="declare-section-header-left">
                <span className="declare-section-badge">2</span>
                <span className="declare-section-title">Loại biến động BHXH *</span>
              </div>
            </div>

            <div className="change-type-simple-pills">
              {[
                { value: "increase", label: "Báo tăng mới" },
                { value: "salary_adjust", label: "Điều chỉnh lương" },
                { value: "suspend", label: "Tạm dừng đóng" },
                { value: "resume", label: "Đóng trở lại" },
                { value: "decrease", label: "Báo giảm hẳn" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "change-type-pill-btn",
                    formChangeType === opt.value && "active"
                  )}
                  onClick={() => setFormChangeType(opt.value as any)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Mức lương đóng & Statutory Rate Live Calculator */}
          <div className="declare-section-block">
            <div className="declare-section-header">
              <div className="declare-section-header-left">
                <span className="declare-section-badge">3</span>
                <span className="declare-section-title">Mức lương đóng & Tỷ lệ trích nộp theo luật định</span>
              </div>
              <span className="declare-section-hint">Tự động tính theo tỷ lệ 10.5% NLĐ và 21.5% DN</span>
            </div>

            <div className="statutory-calculator-card">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="text-xs text-muted mb-1 block">Mức lương đóng BHXH mới (VNĐ):</label>
                  <input
                    type="number"
                    step={100000}
                    value={formNewSalary}
                    onChange={(e) => setFormNewSalary(Number(e.target.value))}
                    disabled={formChangeType === "decrease"}
                    placeholder="6.300.000"
                  />
                </div>

                <div className="w-56">
                  <label className="text-xs text-muted mb-1 block">Tháng áp dụng hiệu lực:</label>
                  <MonthPicker
                    value={formEffectiveMonth}
                    onChange={(val) => setFormEffectiveMonth(val)}
                    variant="form"
                  />
                </div>
              </div>

              <div className="statutory-calculator-grid">
                <div className="statutory-calc-item">
                  <span className="statutory-calc-label">
                    <span className="w-2 h-2 rounded-full bg-warning inline-block"></span> NLĐ trích (10.5%)
                  </span>
                  <span className="statutory-calc-val text-warning">{formatCurrency(calcEmpAmount)}</span>
                  <span className="text-[10px] text-muted">8% Hưu trí + 1.5% BHYT + 1% BHTN</span>
                </div>

                <div className="statutory-calc-item">
                  <span className="statutory-calc-label">
                    <span className="w-2 h-2 rounded-full bg-info inline-block"></span> Doanh nghiệp (21.5%)
                  </span>
                  <span className="statutory-calc-val text-info">{formatCurrency(calcCompAmount)}</span>
                  <span className="text-[10px] text-muted">17% BHXH + 3% BHYT + 1% BHTN + 0.5% BNN</span>
                </div>

                <div className="statutory-calc-item">
                  <span className="statutory-calc-label">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> Tổng kinh phí (32%)
                  </span>
                  <span className="statutory-calc-val text-primary">{formatCurrency(calcTotalAmount)}</span>
                  <span className="text-[10px] text-muted">Tổng nộp cơ quan BHXH</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Lý do biến động & Textarea Rộng Rãi */}
          <div className="declare-section-block">
            <div className="declare-section-header">
              <div className="declare-section-header-left">
                <span className="declare-section-badge">4</span>
                <span className="declare-section-title">Lý do biến động & Căn cứ phê duyệt</span>
              </div>
              <span className="declare-section-hint">Có thể bấm chọn nhanh từ các gợi ý dưới đây</span>
            </div>

            <textarea
              rows={5}
              className="long-reason-textarea"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Nhập chi tiết căn cứ và lý do biến động (ví dụ: Ký Hợp đồng lao động chính thức thời hạn 12 tháng theo Quyết định tuyển dụng số 45/QĐ-2026, áp dụng nâng lương theo thỏa thuận tại Phụ lục HĐLĐ...)"
            />
            <div className="quick-reason-chips">
              <button
                type="button"
                className="quick-reason-chip"
                onClick={() => setFormReason("Ký Hợp đồng lao động chính thức sau thời gian thử việc theo quy định")}
              >
                + Ký HĐLĐ chính thức
              </button>
              <button
                type="button"
                className="quick-reason-chip"
                onClick={() => setFormReason("Tăng lương thâm niên và trách nhiệm theo Phụ lục HĐLĐ số 02/2026")}
              >
                + Tăng lương định kỳ
              </button>
              <button
                type="button"
                className="quick-reason-chip"
                onClick={() => setFormReason("Nghỉ hưởng chế độ thai sản 6 tháng theo Giấy chứng sinh của cơ sở y tế")}
              >
                + Nghỉ thai sản 6 tháng
              </button>
              <button
                type="button"
                className="quick-reason-chip"
                onClick={() => setFormReason("Chấm dứt Hợp đồng lao động theo đơn xin thôi việc đã được phê duyệt")}
              >
                + Chấm dứt HĐLĐ
              </button>
            </div>
          </div>

          {/* 5. Tệp tài liệu / Quyết định đính kèm (Real File Uploader) */}
          <div className="declare-section-block">
            <div className="declare-section-header">
              <div className="declare-section-header-left">
                <span className="declare-section-badge">5</span>
                <span className="declare-section-title">Tệp tài liệu / Quyết định đính kèm</span>
              </div>
              <span className="declare-section-hint">Đính kèm HĐLĐ, Phụ lục hoặc Giấy tờ y tế</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />

            {formDocName ? (
              <div className="attached-file-card">
                <div className="attached-file-left">
                  <div className="attached-file-icon">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="attached-file-info">
                    <span className="attached-file-name" title={formDocName}>
                      {formDocName}
                    </span>
                    <span className="attached-file-meta">
                      {formDocSize && <span>{formDocSize}</span>}
                      <span>•</span>
                      <span className="text-success font-medium">✓ Đã đính kèm hồ sơ</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Đổi tệp
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setFormDocName("");
                      setFormDocSize("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Gỡ bỏ tệp này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="file-upload-dropzone-real"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud />
                <div>
                  <strong className="text-xs text-foreground block">
                    Bấm để chọn tệp từ máy tính hoặc kéo thả file vào đây
                  </strong>
                  <span className="text-[11px] text-muted">
                    Hỗ trợ tệp PDF, Word, Ảnh quyết định/HĐLĐ (.pdf, .docx, .png, .jpg - Tối đa 10MB)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL 3: KẾ TOÁN XÁC NHẬN ĐỐI CHIẾU CƠ QUAN BHXH */}
      <Modal
        open={verifyModalOpen}
        onOpenChange={setVerifyModalOpen}
        title="Xác Nhận Đã Đối Chiếu Với Cơ Quan BHXH"
        description="Xác nhận kết quả thẩm định từ phần mềm BHXH điện tử. Sau khi xác nhận, hệ thống sẽ tự động cập nhật vào danh sách tham gia."
        size="md"
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setVerifyModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (selectedChangeForAction) {
                  verifyChangeMutation.mutate({
                    id: selectedChangeForAction.id,
                    receiptCode: agencyReceiptCode,
                    verifier: verifierName,
                  });
                } else if (selectedChangeIds.size > 0) {
                  batchVerifyMutation.mutate({
                    ids: Array.from(selectedChangeIds),
                    receiptCode: agencyReceiptCode,
                    verifier: verifierName,
                  });
                }
              }}
              loading={verifyChangeMutation.isPending || batchVerifyMutation.isPending}
            >
              <Check /> Xác nhận & Cập nhật sổ BHXH
            </Button>
          </div>
        }
      >
        <div className="form-layout">
          <div className="alert-info-box">
            <div className="text-xs">
              {selectedChangeForAction ? (
                <>
                  Hồ sơ: <strong>{selectedChangeForAction.employeeName}</strong> ({selectedChangeForAction.employeeCode})
                  <br />
                  Loại biến động: <strong>{selectedChangeForAction.changeType}</strong> - Lương mới: <strong className="font-mono text-primary">{formatCurrency(selectedChangeForAction.newSalary)}</strong>
                </>
              ) : (
                <>Đang duyệt đồng loạt <strong>{selectedChangeIds.size}</strong> hồ sơ biến động BHXH kỳ {formatMonthYear(selectedPeriod)}.</>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Mã hồ sơ giao dịch điện tử BHXH:</label>
            <input
              type="text"
              value={agencyReceiptCode}
              onChange={(e) => setAgencyReceiptCode(e.target.value)}
              placeholder="Ví dụ: BHXH-7901-202608-00582"
            />
            <span className="text-[11px] text-muted mt-1">Mã xác thực cấp từ cổng giao dịch BHXH điện tử.</span>
          </div>

          <div className="form-group">
            <label>Chuyên viên C&B / Kế toán phụ trách:</label>
            <input
              type="text"
              value={verifierName}
              onChange={(e) => setVerifierName(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 4: TỪ CHỐI HỒ SƠ BIẾN ĐỘNG */}
      <Modal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        title="Từ Chối Hồ Sơ Biến Động BHXH"
        description="Trả lại hồ sơ cho Chủ dự án / BCSX nếu thông tin mức đóng chưa khớp hoặc thiếu tài liệu chứng từ."
        size="sm"
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (selectedChangeForAction) {
                  rejectChangeMutation.mutate({
                    id: selectedChangeForAction.id,
                    reason: rejectionReason,
                  });
                }
              }}
              loading={rejectChangeMutation.isPending}
            >
              <X /> Xác nhận từ chối
            </Button>
          </div>
        }
      >
        <div className="form-layout">
          <div className="form-group">
            <label>Lý do từ chối:</label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do từ chối (ví dụ: Mức lương đóng chưa khớp với Phụ lục HĐLĐ, thiếu giấy khai sinh...)"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
