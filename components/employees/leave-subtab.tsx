"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  History,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  TablePaginationFooter,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { Employee, LeaveRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function LeaveSubtab({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "remaining" | "exhausted">("all");
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const leaveQuery = useQuery({
    queryKey: ["leave-records", projectId],
    queryFn: () => api.getLeaveRecords({ projectId: projectId === "all" ? undefined : projectId }),
  });

  const leaveRecords = leaveQuery.data ?? [];

  const filteredRecords = useMemo(() => {
    return leaveRecords.filter((rec) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        rec.employeeName.toLowerCase().includes(term) ||
        rec.employeeCode.toLowerCase().includes(term);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "remaining" && rec.remainingDays > 0) ||
        (filterStatus === "exhausted" && rec.remainingDays <= 0);

      return matchSearch && matchStatus;
    });
  }, [leaveRecords, searchTerm, filterStatus]);

  const remainingCount = useMemo(() => leaveRecords.filter((r) => r.remainingDays > 0).length, [leaveRecords]);
  const exhaustedCount = useMemo(() => leaveRecords.filter((r) => r.remainingDays <= 0).length, [leaveRecords]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const leaveTypeLabel = (type: string) => {
    switch (type) {
      case "annual":
        return "Phép năm";
      case "compensatory":
        return "Nghỉ bù";
      case "unpaid":
        return "Nghỉ không lương";
      case "sick":
        return "Nghỉ ốm (BHXH)";
      default:
        return type;
    }
  };

  if (leaveQuery.isLoading) return <LoadingBlock rows={6} />;
  if (leaveQuery.isError) {
    return (
      <ErrorState
        message="Không thể tải dữ liệu phép năm"
        retry={() => leaveQuery.refetch()}
      />
    );
  }

  return (
    <div className="leave-subtab">
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
          </div>

          <div className="filter-panel-bottom">
            <div className="filter-status-pills">
              <button
                type="button"
                className={`pill-btn ${filterStatus === "all" ? "active" : ""}`}
                onClick={() => setFilterStatus("all")}
              >
                Tất cả ({leaveRecords.length})
              </button>
              <button
                type="button"
                className={`pill-btn success ${filterStatus === "remaining" ? "active" : ""}`}
                onClick={() => setFilterStatus("remaining")}
              >
                Còn phép ({remainingCount})
              </button>
              <button
                type="button"
                className={`pill-btn danger ${filterStatus === "exhausted" ? "active" : ""}`}
                onClick={() => setFilterStatus("exhausted")}
              >
                Hết phép ({exhaustedCount})
              </button>
            </div>

            <div className="filter-panel-meta">
              {(searchTerm || filterStatus !== "all") && (
                <button
                  type="button"
                  className="btn-clear-filters"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                  }}
                >
                  <X /> Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Leave Table */}
        {filteredRecords.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu phép năm"
            description={searchTerm ? "Không tìm thấy nhân viên phù hợp." : "Chưa có danh sách phép năm trong dự án này."}
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th>Người lao động</th>
                  <th className="text-center" style={{ width: "130px" }}>Tổng ngày phép</th>
                  <th className="text-center" style={{ width: "120px" }}>Thâm niên</th>
                  <th className="text-center" style={{ width: "130px" }}>Đã sử dụng</th>
                  <th className="text-center" style={{ width: "140px" }}>Còn lại</th>
                  <th style={{ width: "150px" }} className="text-center">Lịch sử nghỉ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((rec, idx) => {
                  const isExhausted = rec.remainingDays <= 0;
                  const stt = (page - 1) * pageSize + idx + 1;

                  return (
                    <tr key={rec.id}>
                      <td className="text-center text-muted font-medium">{stt}</td>
                      <td>
                        <div className="employee-cell-info">
                          <span className="employee-cell-name">{rec.employeeName}</span>
                          <span className="employee-cell-sub">
                            <span className="employee-code-badge">{rec.employeeCode}</span>
                          </span>
                        </div>
                      </td>
                      <td className="text-center font-semibold">
                        {rec.totalEntitled} ngày
                      </td>
                      <td className="text-center text-muted">
                        {rec.seniorityDays > 0 ? `+${rec.seniorityDays} thâm niên` : "—"}
                      </td>
                      <td className="text-center">
                        <strong className="text-warning">{rec.usedDays} ngày</strong>
                      </td>
                      <td className="text-center">
                        <strong className={isExhausted ? "text-danger" : "text-success"}>
                          {rec.remainingDays} ngày
                        </strong>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(rec);
                            setHistoryModalOpen(true);
                          }}
                        >
                          <History /> Chi tiết ({rec.history.length})
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer */}
            <TablePaginationFooter
              totalItems={filteredRecords.length}
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

      {/* Modal: Xem Lịch sử sử dụng ngày phép */}
      <Modal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        title={`Lịch sử nghỉ phép: ${selectedRecord?.employeeName}`}
        description={`Mã NV: ${selectedRecord?.employeeCode} · Tổng: ${selectedRecord?.totalEntitled} ngày · Đã dùng: ${selectedRecord?.usedDays} ngày · Còn lại: ${selectedRecord?.remainingDays} ngày`}
        size="lg"
        footer={<Button onClick={() => setHistoryModalOpen(false)}>Đóng</Button>}
      >
        {selectedRecord?.history && selectedRecord.history.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Khoảng thời gian</th>
                  <th>Số ngày</th>
                  <th>Loại nghỉ</th>
                  <th>Lý do nghỉ</th>
                  <th>Người phê duyệt</th>
                </tr>
              </thead>
              <tbody>
                {selectedRecord.history.map((h, i) => (
                  <tr key={h.id}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>{formatDate(h.from)}</strong> ➔ <strong>{formatDate(h.to)}</strong>
                    </td>
                    <td>
                      <Badge tone="info">{h.days} ngày</Badge>
                    </td>
                    <td>{leaveTypeLabel(h.leaveType)}</td>
                    <td>{h.reason}</td>
                    <td>
                      <span className="text-xs text-muted">{h.approvedBy}</span>
                      <div className="text-xs text-muted">{formatDate(h.approvedAt)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có lịch sử nghỉ phép"
            description="Người lao động chưa sử dụng ngày phép nào trong năm hiện tại."
          />
        )}
      </Modal>
    </div>
  );
}
