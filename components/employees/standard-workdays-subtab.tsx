"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Info,
  Pencil,
  RotateCcw,
  Search,
  Upload,
  X,
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
import type { Employee, StandardWorkdayRecord } from "@/lib/types";

export function StandardWorkdaysSubtab({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "overridden" | "default">("all");

  const [editRecord, setEditRecord] = useState<StandardWorkdayRecord | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideValue, setOverrideValue] = useState<number>(24);
  const [overrideReason, setOverrideReason] = useState("");

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreviewRows, setUploadPreviewRows] = useState<Array<{
    employeeCode: string;
    employeeName: string;
    overrideDays: number;
    reason: string;
  }>>([]);

  const workdaysQuery = useQuery({
    queryKey: ["standard-workdays", projectId],
    queryFn: () => api.getStandardWorkdays({ projectId: projectId === "all" ? undefined : projectId }),
  });

  const workdays = workdaysQuery.data ?? [];

  const filteredList = useMemo(() => {
    return workdays.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.employeeName.toLowerCase().includes(term) ||
        item.employeeCode.toLowerCase().includes(term);

      if (!matchSearch) return false;
      if (filterMode === "overridden") return item.isOverridden;
      if (filterMode === "default") return !item.isOverridden;
      return true;
    });
  }, [workdays, searchTerm, filterMode]);

  const overriddenCount = useMemo(() => workdays.filter((w) => w.isOverridden).length, [workdays]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    (employees || []).forEach((emp) => {
      map.set(emp.id, emp);
      if (emp.code) map.set(emp.code, emp);
    });
    return map;
  }, [employees]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  // Mutations
  const saveOverrideMutation = useMutation({
    mutationFn: async ({
      id,
      overrideDays,
      isOverridden,
      reason,
    }: {
      id: string;
      overrideDays?: number;
      isOverridden: boolean;
      reason?: string;
    }) => {
      return api.saveStandardWorkdayOverride(id, {
        overrideDays,
        isOverridden,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-workdays"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setOverrideModalOpen(false);
      notify("Đã lưu cấu hình ngày công chuẩn riêng cho nhân viên!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  // Batch import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const targetProj = projectId === "all" ? (employees[0]?.projectId ?? "prj-jss") : projectId;
      return api.batchImportStandardWorkdays({
        projectId: targetProj,
        items: uploadPreviewRows.map((r) => ({
          employeeCode: r.employeeCode,
          overrideDays: r.overrideDays,
          reason: r.reason,
        })),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["standard-workdays"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setImportModalOpen(false);
      setUploadPreviewRows([]);
      notify(`Đã cập nhật thành công ngày công chuẩn cho ${data.length} nhân viên!`);
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
      setUploadPreviewRows(
        targetEmps.slice(0, 5).map((emp, i) => ({
          employeeCode: emp.code,
          employeeName: emp.name,
          overrideDays: i % 2 === 0 ? 24 : 22,
          reason: i % 2 === 0 ? "Chế độ ca kíp xoay vòng 24 công/tháng" : "Chế độ khối văn phòng 22 công/tháng",
        }))
      );
    }, 600);
  };

  const openOverrideModal = (item: StandardWorkdayRecord) => {
    setEditRecord(item);
    setOverrideValue(item.overrideDays ?? 24);
    setOverrideReason(item.reason ?? "");
    setOverrideModalOpen(true);
  };

  const handleResetToDefault = (item: StandardWorkdayRecord) => {
    saveOverrideMutation.mutate({
      id: item.id,
      overrideDays: undefined,
      isOverridden: false,
      reason: undefined,
    });
  };

  if (workdaysQuery.isLoading) return <LoadingBlock rows={6} />;
  if (workdaysQuery.isError) {
    return (
      <ErrorState
        message="Không thể tải dữ liệu ngày công chuẩn"
        retry={() => workdaysQuery.refetch()}
      />
    );
  }

  return (
    <div className="standard-workdays-subtab">
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
                <Upload /> Tải lên ngày công chuẩn
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
                Tất cả ({workdays.length})
              </button>
              <button
                type="button"
                className={`pill-btn warning ${filterMode === "overridden" ? "active" : ""}`}
                onClick={() => setFilterMode("overridden")}
              >
                Có ngày công riêng ({overriddenCount})
              </button>
              <button
                type="button"
                className={`pill-btn neutral ${filterMode === "default" ? "active" : ""}`}
                onClick={() => setFilterMode("default")}
              >
                Theo mặc định dự án ({workdays.length - overriddenCount})
              </button>
            </div>
          </div>
        </div>

        {/* Content Table */}
        {filteredList.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bản ghi ngày công chuẩn"
            description="Chưa có thiết lập ngày công phù hợp với tiêu chí lọc đã chọn."
            action={
              <Button variant="primary" onClick={() => setImportModalOpen(true)}>
                <Upload /> Tải lên danh sách ngay
              </Button>
            }
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th style={{ minWidth: "160px" }}>Người lao động</th>
                  <th className="text-center" style={{ width: "160px" }}>Công chuẩn Dự án</th>
                  <th className="text-center" style={{ width: "160px" }}>Công chuẩn Áp dụng</th>
                  <th style={{ width: "160px" }}>Trạng thái</th>
                  <th>Lý do ghi đè</th>
                  <th>Cập nhật bởi</th>
                  <th style={{ width: "160px" }} className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((item, idx) => {
                  const appliedDays = item.isOverridden && item.overrideDays ? item.overrideDays : item.projectStandardDays;
                  const stt = (page - 1) * pageSize + idx + 1;
                  const emp = employeeMap.get(item.employeeId) || employeeMap.get(item.employeeCode);
                  const projectCode = item.projectCode || emp?.projectCode;

                  return (
                    <tr key={item.id} className={item.isOverridden ? "highlight-override-row" : ""}>
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
                      <td className="text-center text-muted">{item.projectStandardDays} công</td>
                      <td className="text-center">
                        <strong className={item.isOverridden ? "text-primary" : ""}>
                          {appliedDays} công
                        </strong>
                      </td>
                      <td>
                        {item.isOverridden ? (
                          <StatusBadge tone="warning">Ghi đè riêng</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral" dot={false}>Mặc định dự án</StatusBadge>
                        )}
                      </td>
                      <td>
                        {item.reason ? (
                          <span className="text-xs">{item.reason}</span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-muted">{item.updatedBy || "Hệ thống"}</span>
                        {item.updatedAt && <div className="text-xs text-muted">{item.updatedAt}</div>}
                      </td>
                      <td className="text-center">
                        <TableRowActions
                          items={[
                            {
                              key: "override",
                              label: "Ghi đè ngày công",
                              icon: <Pencil />,
                              onClick: () => openOverrideModal(item),
                            },
                            ...(item.isOverridden
                              ? [
                                  {
                                    key: "reset",
                                    label: "Khôi phục mặc định dự án",
                                    icon: <RotateCcw />,
                                    danger: true,
                                    onClick: () => handleResetToDefault(item),
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

      {/* BOTTOM AUDIT / ACTIVITY LOG */}
      <SubtabActivityLog
        projectId={projectId}
        module="workdays"
        title="Nhật ký điều chỉnh Ngày công chuẩn"
        description="Lịch sử ghi nhận các thao tác ghi đè ngày công cá nhân, khôi phục chuẩn và import file Excel"
      />
    </div>

      {/* Modal 1: Overwrite Single Employee Standard Workday */}
      <Modal
        open={overrideModalOpen}
        onOpenChange={setOverrideModalOpen}
        title={`Ghi đè Ngày công chuẩn: ${editRecord?.employeeName}`}
        description={`Mã NV: ${editRecord?.employeeCode} · Ngày công chuẩn mặc định của dự án: ${editRecord?.projectStandardDays} ngày`}
        size="md"
        footer={
          <>
            <Button onClick={() => setOverrideModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              loading={saveOverrideMutation.isPending}
              onClick={() => {
                if (editRecord) {
                  saveOverrideMutation.mutate({
                    id: editRecord.id,
                    overrideDays: overrideValue,
                    isOverridden: true,
                    reason: overrideReason || "Ghi đè ngày công chuẩn theo yêu cầu nghiệp vụ",
                  });
                }
              }}
            >
              <Check /> Lưu ghi đè
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-field full-width">
            <span>Ngày công chuẩn của Dự án</span>
            <input type="text" value={`${editRecord?.projectStandardDays} ngày`} disabled />
          </div>

          <label className="form-field full-width">
            <span>Ngày công chuẩn áp dụng riêng cho NLĐ này *</span>
            <input
              type="number"
              min="1"
              max="31"
              step="0.5"
              value={overrideValue}
              onChange={(e) => setOverrideValue(Number(e.target.value))}
              required
            />
          </label>

          <label className="form-field full-width">
            <span>Lý do ghi đè (Bắt buộc ghi chú giải trình) *</span>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="VD: Nhân viên làm việc theo ca kíp đặc thù 24 công/tháng, hoặc nhân viên vào giữa tháng..."
              required
            />
          </label>
        </div>
      </Modal>

      {/* Modal 2: Reusable Excel Import Modal */}
      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title="Tải Lên Cập Nhật Ngày Công Chuẩn"
        description="Tải lên tệp Excel danh sách ngày công chuẩn được ghi đè riêng cho từng nhân sự (theo ca kíp, bộ phận đặc thù)."
        sampleTemplateName="Mau_Ngay_Cong_Chuan.xlsx"
        sampleTemplateDescription="Bảng kê gồm: Mã NV, Họ và tên, Ngày công chuẩn áp dụng riêng (VD: 24, 22, 26) và Lý do ghi đè."
        onDownloadSample={() => notify("Đã tải xuống biểu mẫu Mau_Ngay_Cong_Chuan.xlsx")}
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
            key: "overrideDays",
            label: "Công chuẩn áp dụng",
            align: "center",
            render: (row) => (
              <Badge tone="warning">
                {row.overrideDays} công
              </Badge>
            ),
          },
          {
            key: "reason",
            label: "Lý do ghi đè",
            render: (row) => <span className="text-xs">{row.reason}</span>,
          },
        ]}
        previewRows={uploadPreviewRows}
        stats={[
          {
            label: "Tổng bản ghi",
            value: `${uploadPreviewRows.length} nhân viên`,
            tone: "primary",
          },
          {
            label: "Ghi đè ngày công",
            value: `${uploadPreviewRows.length} người`,
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
    </div>
  );
}
