"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Info,
  Pencil,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, Modal, StatusBadge, TablePaginationFooter } from "@/components/ui";
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
      setOverrideModalOpen(false);
      setEditRecord(null);
      notify("Đã cập nhật cấu hình ngày công chuẩn cho Người lao động!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const openOverrideModal = (record: StandardWorkdayRecord) => {
    setEditRecord(record);
    setOverrideValue(record.overrideDays ?? 24);
    setOverrideReason(record.reason ?? "");
    setOverrideModalOpen(true);
  };

  const handleResetToDefault = (record: StandardWorkdayRecord) => {
    saveOverrideMutation.mutate({
      id: record.id,
      overrideDays: undefined,
      isOverridden: false,
      reason: undefined,
    });
  };

  if (workdaysQuery.isLoading) return <LoadingBlock rows={6} />;
  if (workdaysQuery.isError) return <ErrorState message="Không thể tải dữ liệu ngày công chuẩn" retry={() => workdaysQuery.refetch()} />;

  return (
    <div className="standard-workdays-subtab">
      {/* Banner explaining inheritance & overwrite */}
      <div className="workflow-info-banner mb-4">
        <div className="banner-icon-side">
          <CalendarDays />
        </div>
        <div>
          <strong>Cơ chế kế thừa Ngày công chuẩn từ Dự án:</strong>
          <p>
            Mặc định toàn bộ NLĐ kế thừa <strong>26 ngày công chuẩn</strong> từ cấu hình Dự án. Kế toán có thể <em>ghi đè (overwrite)</em> ngày công chuẩn riêng cho từng cá nhân (áp dụng cho đối tượng ca kíp đặc thù, thử việc hoặc thỏa thuận riêng).
          </p>
        </div>
      </div>

      {/* Integrated Single Card: Toolbar + Filters + Data Table */}
      <div className="integrated-table-card">
        {/* Table Card Toolbar */}
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
              <Badge tone="info">Mặc định dự án: 26 công</Badge>
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
                Đã ghi đè ({overriddenCount})
              </button>
              <button
                type="button"
                className={`pill-btn ${filterMode === "default" ? "active" : ""}`}
                onClick={() => setFilterMode("default")}
              >
                Mặc định theo dự án ({workdays.length - overriddenCount})
              </button>
            </div>

            <div className="filter-panel-meta">
              {(searchTerm || filterMode !== "all") && (
                <button
                  type="button"
                  className="btn-clear-filters"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterMode("all");
                  }}
                >
                  <X /> Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredList.length === 0 ? (
          <EmptyState
            title="Không tìm thấy nhân viên"
            description="Không có bản ghi phù hợp với bộ lọc hiện tại."
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th>Người lao động</th>
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

                  return (
                    <tr key={item.id} className={item.isOverridden ? "highlight-override-row" : ""}>
                      <td className="text-center text-muted font-medium">{stt}</td>
                      <td>
                        <div className="employee-cell-info">
                          <span className="employee-cell-name">{item.employeeName}</span>
                          <span className="employee-cell-sub">
                            <span className="employee-code-badge">{item.employeeCode}</span>
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
                        <div className="action-buttons-compact">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openOverrideModal(item)}
                            title="Ghi đè ngày công chuẩn riêng"
                          >
                            <Pencil /> Ghi đè
                          </Button>
                          {item.isOverridden && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetToDefault(item)}
                              title="Khôi phục về mức mặc định của dự án"
                            >
                              <RotateCcw />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer */}
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

      {/* Modal Overwrite */}
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
    </div>
  );
}
