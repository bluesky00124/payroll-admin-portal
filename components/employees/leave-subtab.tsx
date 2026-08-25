"use client";

import { useQuery } from "@tanstack/react-query";
import {
  History,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import type { Employee, LeaveRecord } from "@/lib/types";
import { formatDate, formatMonthYear } from "@/lib/utils";

type FilterStatusType = "all" | "official" | "probation" | "resigned" | "available" | "exhausted";

function formatLeaveNumber(num: number | undefined | null): string {
  if (typeof num !== "number" || isNaN(num)) return "0.0";
  return num.toFixed(1);
}

function getAvailableDays(rec: LeaveRecord): number {
  if (typeof rec.availableDays === "number") return rec.availableDays;
  const accrued = typeof rec.accruedDays === "number" ? rec.accruedDays : 8.0;
  const used = typeof rec.usedDays === "number" ? rec.usedDays : 0;
  return Math.max(0, accrued - used);
}

function getAccruedDays(rec: LeaveRecord): number {
  return typeof rec.accruedDays === "number" ? rec.accruedDays : 8.0;
}

function getUsedDays(rec: LeaveRecord): number {
  return typeof rec.usedDays === "number" ? rec.usedDays : 0;
}

function getRemainingDays(rec: LeaveRecord): number {
  if (typeof rec.remainingDays === "number") return rec.remainingDays;
  const total = (rec.totalEntitled || 12) + (rec.seniorityDays || 0);
  const used = getUsedDays(rec);
  return Math.max(0, total - used);
}

export function LeaveSubtab({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>("all");
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const leaveQuery = useQuery({
    queryKey: ["leave-records", projectId],
    queryFn: () => api.getLeaveRecords({ projectId: projectId === "all" ? undefined : projectId }),
  });

  const leaveRecords = leaveQuery.data ?? [];

  const filteredRecords = useMemo(() => {
    return leaveRecords.filter((rec) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (rec.employeeName && rec.employeeName.toLowerCase().includes(term)) ||
        (rec.employeeCode && rec.employeeCode.toLowerCase().includes(term)) ||
        (rec.projectCode && rec.projectCode.toLowerCase().includes(term));

      const isProbation = rec.contractType === "probation" || rec.employeeStatus === "probation" || rec.eligibilityStatus === "probation_ineligible";
      const isResigned = rec.employeeStatus === "resigned" || rec.eligibilityStatus === "resigned";
      const isOfficial = !isProbation && !isResigned;
      const avail = getAvailableDays(rec);

      let matchStatus = true;
      if (filterStatus === "official") {
        matchStatus = isOfficial;
      } else if (filterStatus === "probation") {
        matchStatus = isProbation;
      } else if (filterStatus === "resigned") {
        matchStatus = isResigned;
      } else if (filterStatus === "available") {
        matchStatus = isOfficial && avail > 0;
      } else if (filterStatus === "exhausted") {
        matchStatus = isOfficial && avail <= 0;
      }

      return matchSearch && matchStatus;
    });
  }, [leaveRecords, searchTerm, filterStatus]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let official = 0;
    let probation = 0;
    let resigned = 0;
    let available = 0;
    let exhausted = 0;

    leaveRecords.forEach((rec) => {
      const isProbation = rec.contractType === "probation" || rec.employeeStatus === "probation" || rec.eligibilityStatus === "probation_ineligible";
      const isResigned = rec.employeeStatus === "resigned" || rec.eligibilityStatus === "resigned";
      if (isProbation) {
        probation++;
      } else if (isResigned) {
        resigned++;
      } else {
        official++;
        const avail = getAvailableDays(rec);
        if (avail > 0) available++;
        else exhausted++;
      }
    });

    return {
      all: leaveRecords.length,
      official,
      probation,
      resigned,
      available,
      exhausted,
    };
  }, [leaveRecords]);

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
                  placeholder="Tìm theo tên nhân viên, mã NV, mã dự án..."
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
                Tất cả ({counts.all})
              </button>
              <button
                type="button"
                className={`pill-btn success ${filterStatus === "official" ? "active" : ""}`}
                onClick={() => setFilterStatus("official")}
              >
                Chính thức có phép ({counts.official})
              </button>
              <button
                type="button"
                className={`pill-btn warning ${filterStatus === "probation" ? "active" : ""}`}
                onClick={() => setFilterStatus("probation")}
              >
                Thử việc / Chưa có HĐLĐ ({counts.probation})
              </button>
              <button
                type="button"
                className={`pill-btn danger ${filterStatus === "resigned" ? "active" : ""}`}
                onClick={() => setFilterStatus("resigned")}
              >
                Đã nghỉ việc ({counts.resigned})
              </button>
              <button
                type="button"
                className={`pill-btn ${filterStatus === "available" ? "active" : ""}`}
                onClick={() => setFilterStatus("available")}
              >
                Còn phép khả dụng ({counts.available})
              </button>
              <button
                type="button"
                className={`pill-btn ${filterStatus === "exhausted" ? "active" : ""}`}
                onClick={() => setFilterStatus("exhausted")}
              >
                Hết phép ({counts.exhausted})
              </button>
            </div>
          </div>
        </div>

        {/* Main Leave Table */}
        {filteredRecords.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu phép năm"
            description={searchTerm ? "Không tìm thấy nhân viên phù hợp với từ khóa." : "Chưa có danh sách phép năm trong bộ lọc này."}
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table min-w-[1050px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "160px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "115px" }}>LOẠI HĐ</th>
                    <th style={{ width: "120px" }}>NGÀY VÀO LÀM</th>
                    <th style={{ width: "125px" }}>NGÀY NGHỈ VIỆC</th>
                    <th style={{ width: "140px" }}>THỜI ĐIỂM HƯỞNG</th>
                    <th className="text-center" style={{ width: "135px" }}>TỔNG PHÉP NĂM</th>
                    <th className="text-center" style={{ width: "115px" }}>ĐÃ SỬ DỤNG</th>
                    <th className="text-center" style={{ width: "140px" }}>PHÉP KHẢ DỤNG</th>
                    <th style={{ width: "60px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((rec, idx) => {
                    const isProbation = rec.contractType === "probation" || rec.employeeStatus === "probation" || rec.eligibilityStatus === "probation_ineligible";
                    const isResigned = rec.employeeStatus === "resigned" || rec.eligibilityStatus === "resigned";
                    const isOfficial = !isProbation && !isResigned;
                    const stt = (page - 1) * pageSize + idx + 1;

                    const emp = employeeMap.get(rec.employeeId) || employeeMap.get(rec.employeeCode);
                    const joinDate = rec.joinDate || emp?.joinDate || rec.entitlementDate;
                    const resignationDate = rec.resignationDate || (isResigned ? emp?.resignationDate || "2026-06-30" : undefined);
                    const projectCode = rec.projectCode || emp?.projectCode;

                    const availDays = getAvailableDays(rec);
                    const accruedDays = getAccruedDays(rec);
                    const usedDays = getUsedDays(rec);
                    const totalEntitled = rec.totalEntitled ?? 12;
                    const seniority = rec.seniorityDays ?? 0;

                    return (
                      <tr key={rec.id}>
                        <td className="text-center text-muted font-medium">{stt}</td>
                        <td>
                          <div className="employee-cell-info">
                            <span className="employee-cell-name font-semibold">{rec.employeeName}</span>
                            <span className="employee-cell-sub">
                              <span className="employee-code-badge">{rec.employeeCode}</span>
                              {projectCode && <span className="text-muted text-[11px] font-normal">· {projectCode}</span>}
                            </span>
                          </div>
                        </td>
                        <td>
                          {isResigned ? (
                            <StatusBadge tone="danger">Đã nghỉ</StatusBadge>
                          ) : isProbation ? (
                            <StatusBadge tone="warning">Thử việc</StatusBadge>
                          ) : (
                            <StatusBadge tone="success">Chính thức</StatusBadge>
                          )}
                        </td>
                        <td className="font-mono text-xs">
                          {joinDate ? formatDate(joinDate) : "—"}
                        </td>
                        <td>
                          {resignationDate ? (
                            <span className="font-mono text-xs text-rose-600 dark:text-rose-400 font-medium">
                              {formatDate(resignationDate)}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td>
                          {isResigned ? (
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                              Nghỉ từ {formatDate(rec.resignationDate || "2026-06-30")}
                            </span>
                          ) : isProbation ? (
                            <span className="text-xs text-muted font-medium">Chờ ký HĐLĐ</span>
                          ) : (
                            <Badge tone="neutral">{formatDate(rec.entitlementDate || "2026-01-01")}</Badge>
                          )}
                        </td>
                        <td className="text-center">
                          {isProbation ? (
                            <span className="text-muted">—</span>
                          ) : isResigned ? (
                            <span>{accruedDays} ngày</span>
                          ) : (
                            <span>
                              {totalEntitled} ngày {seniority > 0 ? `(+${seniority})` : ""}
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          {isProbation ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                              {formatLeaveNumber(usedDays)} ngày
                            </strong>
                          )}
                        </td>
                        <td className="text-center">
                          {isProbation ? (
                            <span className="text-muted font-medium text-xs">Chưa có phép</span>
                          ) : isResigned ? (
                            <span className={availDays > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted font-medium"}>
                              {formatLeaveNumber(availDays)} ngày tồn
                            </span>
                          ) : (
                            <strong className={availDays > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                              {formatLeaveNumber(availDays)} ngày
                            </strong>
                          )}
                        </td>
                        <td className="text-center">
                          <TableRowActions
                            items={[
                              {
                                key: "history",
                                label: `Lịch sử nghỉ phép (${rec.history?.length || 0})`,
                                icon: <History />,
                                onClick: () => {
                                  setSelectedRecord(rec);
                                  setHistoryModalOpen(true);
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

            {/* Attached Table Footer */}
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
        description={`Mã NV: ${selectedRecord?.employeeCode} · Khả dụng hiện tại: ${selectedRecord ? formatLeaveNumber(getAvailableDays(selectedRecord)) : "0.0"} ngày · Đã dùng: ${selectedRecord ? formatLeaveNumber(getUsedDays(selectedRecord)) : "0.0"} ngày · Tổng cả năm: ${selectedRecord?.totalEntitled ?? 12} ngày`}
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
            description="Người lao động chưa phát sinh đơn xin nghỉ phép nào trong năm hiện tại."
          />
        )}
      </Modal>
    </div>
  );
}
