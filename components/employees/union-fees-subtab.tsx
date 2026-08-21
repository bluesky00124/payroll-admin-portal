"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileText,
  History,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserMinus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import type { Employee, UnionFeeRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function UnionFeesSubtab({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "participating" | "non_participating">("all");
  
  // State for Confirm Toggle Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetToggleRecord, setTargetToggleRecord] = useState<UnionFeeRecord | null>(null);
  const [toggleReason, setToggleReason] = useState("");

  // State for History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedRecordForHistory, setSelectedRecordForHistory] = useState<UnionFeeRecord | null>(null);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    (employees || []).forEach((emp) => {
      map.set(emp.id, emp);
      if (emp.code) map.set(emp.code, emp);
    });
    return map;
  }, [employees]);

  const unionQuery = useQuery({
    queryKey: ["union-fees", projectId],
    queryFn: () =>
      api.getUnionFees({
        projectId: projectId === "all" ? undefined : projectId,
      }),
  });

  const unionFees = unionQuery.data ?? [];

  const filteredFees = useMemo(() => {
    return unionFees.filter((fee) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        fee.employeeName.toLowerCase().includes(term) ||
        fee.employeeCode.toLowerCase().includes(term);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "participating" && fee.isParticipating) ||
        (statusFilter === "non_participating" && !fee.isParticipating);

      return matchSearch && matchStatus;
    });
  }, [unionFees, searchTerm, statusFilter]);

  const activeCount = useMemo(() => unionFees.filter((u) => u.isParticipating).length, [unionFees]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedFees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFees.slice(start, start + pageSize);
  }, [filteredFees, page, pageSize]);

  // Mutation to toggle participation
  const toggleMutation = useMutation({
    mutationFn: async ({ record, newStatus, reason }: { record: UnionFeeRecord; newStatus: boolean; reason?: string }) => {
      return api.updateUnionFee(record.id, {
        isParticipating: newStatus,
        note: reason || (newStatus ? "Kích hoạt tham gia Công đoàn" : "Bỏ tham gia Công đoàn theo yêu cầu"),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["union-fees"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setConfirmModalOpen(false);
      setTargetToggleRecord(null);
      setToggleReason("");
      notify(
        data.isParticipating
          ? `Đã đăng ký tham gia Công đoàn cho nhân viên ${data.employeeName}!`
          : `Đã dừng trích nộp Công đoàn cho nhân viên ${data.employeeName}!`
      );
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const handleRequestToggle = (record: UnionFeeRecord) => {
    setTargetToggleRecord(record);
    setToggleReason(record.isParticipating ? "Người lao động làm đơn xin rút khỏi tổ chức Công đoàn cơ sở" : "Đăng ký gia nhập tổ chức Công đoàn cơ sở");
    setConfirmModalOpen(true);
  };

  const handleConfirmToggle = () => {
    if (!targetToggleRecord) return;
    toggleMutation.mutate({
      record: targetToggleRecord,
      newStatus: !targetToggleRecord.isParticipating,
      reason: toggleReason,
    });
  };

  if (unionQuery.isLoading) return <LoadingBlock rows={6} />;
  if (unionQuery.isError) {
    return (
      <ErrorState
        message="Không thể tải dữ liệu Công đoàn phí"
        retry={() => unionQuery.refetch()}
      />
    );
  }

  return (
    <div className="union-fees-subtab">
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm theo tên nhân viên, mã NV..."
                />
              </label>
            </div>
          </div>

          <div className="filter-panel-bottom">
            <div className="filter-status-pills">
              <button
                type="button"
                className={`pill-btn ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                Tất cả ({unionFees.length})
              </button>
              <button
                type="button"
                className={`pill-btn success ${statusFilter === "participating" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("participating");
                  setPage(1);
                }}
              >
                Có trích nộp ({activeCount})
              </button>
              <button
                type="button"
                className={`pill-btn neutral ${statusFilter === "non_participating" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("non_participating");
                  setPage(1);
                }}
              >
                Không tham gia ({unionFees.length - activeCount})
              </button>
            </div>
          </div>
        </div>

        {/* Content Table */}
        {filteredFees.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bản ghi Công đoàn phí"
            description="Chưa có dữ liệu trích nộp công đoàn phí cho các tiêu chí đã chọn."
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    <th style={{ minWidth: "160px" }}>NGƯỜI LAO ĐỘNG</th>
                    <th style={{ width: "120px" }}>NGÀY VÀO LÀM</th>
                    <th style={{ width: "125px" }}>NGÀY NGHỈ VIỆC</th>
                    <th style={{ width: "125px" }}>NGÀY THAM GIA</th>
                    <th style={{ width: "120px" }}>HÌNH THỨC TRÍCH</th>
                    <th style={{ width: "130px" }} className="text-right">MỨC TRÍCH NỘP</th>
                    <th style={{ width: "160px" }} className="text-center">THAM GIA CÔNG ĐOÀN</th>
                    <th style={{ width: "60px" }} className="text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFees.map((item, idx) => {
                    const stt = (page - 1) * pageSize + idx + 1;
                    const emp = employeeMap.get(item.employeeId) || employeeMap.get(item.employeeCode);
                    const joinDate = item.joinDate || emp?.joinDate;
                    const isResigned = emp?.status === "resigned" || item.resignationDate;
                    const resignationDate = item.resignationDate || (emp?.status === "resigned" ? emp?.joinDate ? "2026-06-30" : undefined : undefined);
                    const joinedUnionDate = item.joinedUnionDate || (item.isParticipating ? joinDate : undefined);
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
                        <td className="font-mono text-xs">
                          {joinDate ? formatDate(joinDate) : "—"}
                        </td>
                        <td>
                          {isResigned && resignationDate ? (
                            <span className="font-mono text-xs text-rose-600 dark:text-rose-400 font-medium">
                              {formatDate(resignationDate)}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="font-mono text-xs">
                          {item.isParticipating && joinedUnionDate ? (
                            <Badge tone="neutral">{formatDate(joinedUnionDate)}</Badge>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td>
                          {item.feeType === "percentage" ? "1%" : "Cố định"}
                        </td>
                        <td className="text-right font-mono">
                          {item.isParticipating ? (
                            <span className="font-semibold text-primary">{formatCurrency(item.amount)}</span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer p-1">
                            <input
                              type="checkbox"
                              checked={item.isParticipating}
                              onChange={() => handleRequestToggle(item)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                              title={item.isParticipating ? "Bấm để bỏ tham gia Công đoàn" : "Bấm để đăng ký tham gia Công đoàn"}
                            />
                          </label>
                        </td>
                        <td className="text-center">
                          <TableRowActions
                            items={[
                              {
                                key: "history",
                                label: `Lịch sử tham gia (${item.history?.length || 1})`,
                                icon: <History />,
                                onClick: () => {
                                  setSelectedRecordForHistory(item);
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
              totalItems={filteredFees.length}
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
        module="union"
        title="Nhật ký biến động Công đoàn phí"
        description="Lịch sử đăng ký gia nhập, ngừng tham gia và điều chỉnh mức trích nộp công đoàn phí"
      />

      {/* Modal 1: Xác nhận thay đổi tham gia Công đoàn (Redesigned Confirm Popup) */}
      <Modal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        title={
          targetToggleRecord?.isParticipating
            ? "Xác Nhận Dừng Tham Gia Công Đoàn"
            : "Xác Nhận Đăng Ký Tham Gia Công Đoàn"
        }
        description={
          targetToggleRecord?.isParticipating
            ? "Cập nhật ngừng trích nộp kinh phí công đoàn hàng tháng cho người lao động."
            : "Kích hoạt chế độ trích nộp công đoàn phí định kỳ cho người lao động."
        }
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
              <X className="w-4 h-4" /> Hủy bỏ
            </Button>
            <Button
              variant={targetToggleRecord?.isParticipating ? "danger" : "primary"}
              onClick={handleConfirmToggle}
              loading={toggleMutation.isPending}
            >
              {targetToggleRecord?.isParticipating ? (
                <>
                  <UserMinus className="w-4 h-4" /> Xác nhận dừng tham gia
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" /> Xác nhận đăng ký tham gia
                </>
              )}
            </Button>
          </>
        }
      >
        {targetToggleRecord && (() => {
          const emp = employeeMap.get(targetToggleRecord.employeeId) || employeeMap.get(targetToggleRecord.employeeCode);
          const isStopping = targetToggleRecord.isParticipating;

          return (
            <div className="space-y-4">
              {/* Employee Summary Card */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/50 flex items-center justify-between gap-3 shadow-2xs">
                <div className="min-w-0">
                  <span className="font-bold text-sm text-foreground block truncate">
                    {targetToggleRecord.employeeName}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="employee-code-badge">{targetToggleRecord.employeeCode}</span>
                    {emp?.department && <span>· {emp.department}</span>}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <StatusBadge tone={isStopping ? "success" : "neutral"} dot={true}>
                    {isStopping ? "Đang tham gia" : "Chưa tham gia"}
                  </StatusBadge>
                  <div className="text-xs font-mono font-bold text-primary mt-1">
                    {targetToggleRecord.feeType === "percentage" ? "1% Lương BHXH" : formatCurrency(targetToggleRecord.amount)}
                  </div>
                </div>
              </div>

              {/* Warning / Impact Card */}
              {isStopping ? (
                <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 flex items-start gap-3 shadow-2xs">
                  <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1.5 min-w-0">
                    <h5 className="font-bold text-xs text-destructive">
                      Tác động đến kỳ tính lương &amp; Quyền lợi:
                    </h5>
                    <ul className="space-y-1 text-foreground/80 font-medium list-none">
                      <li className="flex items-start gap-1.5">
                        <span className="text-destructive font-bold">✕</span>
                        <span>
                          <strong>Ngừng khấu trừ đoàn phí:</strong> Hệ thống sẽ không tự động trừ 1% lương đóng BHXH vào công đoàn phí kể từ kỳ lương hiện tại.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-destructive font-bold">✕</span>
                        <span>
                          <strong>Quyền lợi đoàn viên:</strong> Nhân sự sẽ không nằm trong danh sách thụ hưởng các chế độ thăm hỏi, quà tặng từ Công đoàn cơ sở.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-muted-foreground font-bold">•</span>
                        <span>
                          <strong>Lưu vết hệ thống:</strong> Thao tác này sẽ tự động được ghi lại trong tab <em>Lịch sử Công đoàn</em> để phục vụ kiểm toán C&amp;B.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 flex items-start gap-3 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1.5 min-w-0">
                    <h5 className="font-bold text-xs text-primary">
                      Quy định trích nộp &amp; Quyền lợi đoàn viên:
                    </h5>
                    <ul className="space-y-1 text-foreground/80 font-medium list-none">
                      <li className="flex items-start gap-1.5">
                        <span className="text-primary font-bold">✓</span>
                        <span>
                          <strong>Trích nộp tự động:</strong> Mức trích là 1% tiền lương làm căn cứ đóng BHXH (tối đa 10% mức lương cơ sở) vào mỗi kỳ tính lương.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-primary font-bold">✓</span>
                        <span>
                          <strong>Bảo vệ quyền lợi:</strong> Người lao động được hưởng đầy đủ các chính sách chăm lo đời sống và phúc lợi của tổ chức Công đoàn.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Reason Form Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Lý do / Căn cứ xác nhận *
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Lưu vết hồ sơ nhân sự
                  </span>
                </label>
                <textarea
                  value={toggleReason}
                  onChange={(e) => setToggleReason(e.target.value)}
                  placeholder={
                    isStopping
                      ? "VD: Người lao động làm đơn xin rút khỏi tổ chức Công đoàn cơ sở..."
                      : "VD: Đơn tự nguyện gia nhập tổ chức Công đoàn cơ sở..."
                  }
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-border bg-card text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all placeholder:text-muted-foreground"
                  rows={3}
                />
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal 2: Xem Lịch sử chỉnh sửa / tham gia Công đoàn */}
      <Modal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        title={`Lịch sử Công đoàn: ${selectedRecordForHistory?.employeeName}`}
        description={`Mã NV: ${selectedRecordForHistory?.employeeCode} · Hình thức: ${selectedRecordForHistory?.feeType === "percentage" ? "1% Lương BHXH" : "Cố định"} · Trạng thái: ${selectedRecordForHistory?.isParticipating ? "Đang tham gia" : "Không tham gia"}`}
        size="lg"
        footer={<Button onClick={() => setHistoryModalOpen(false)}>Đóng</Button>}
      >
        {selectedRecordForHistory ? (
          <div className="data-table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th>Thời gian ghi nhận</th>
                  <th>Hành động / Thay đổi</th>
                  <th className="text-right">Mức trích nộp</th>
                  <th>Người thực hiện</th>
                  <th>Ghi chú / Căn cứ</th>
                </tr>
              </thead>
              <tbody>
                {(selectedRecordForHistory.history && selectedRecordForHistory.history.length > 0
                  ? selectedRecordForHistory.history
                  : [
                      {
                        id: "initial-log",
                        actionDate: selectedRecordForHistory.joinedUnionDate || "2024-01-01",
                        actionType: selectedRecordForHistory.isParticipating ? "join" : "leave",
                        actionLabel: selectedRecordForHistory.isParticipating ? "Đăng ký tham gia Công đoàn" : "Chưa đăng ký tham gia",
                        amount: selectedRecordForHistory.isParticipating ? selectedRecordForHistory.amount : 0,
                        changedBy: "Hệ thống C&B",
                        note: selectedRecordForHistory.isParticipating ? "Gia nhập Công đoàn cơ sở" : "Chưa có thông tin tham gia",
                      },
                    ]
                ).map((h, i) => (
                  <tr key={h.id}>
                    <td className="text-center text-muted font-medium">{i + 1}</td>
                    <td className="font-mono text-xs">
                      {formatDate(h.actionDate)}
                    </td>
                    <td>
                      {h.actionType === "join" ? (
                        <StatusBadge tone="success">{h.actionLabel}</StatusBadge>
                      ) : h.actionType === "leave" ? (
                        <StatusBadge tone="danger">{h.actionLabel}</StatusBadge>
                      ) : (
                        <StatusBadge tone="info">{h.actionLabel}</StatusBadge>
                      )}
                    </td>
                    <td className="text-right font-mono">
                      {h.amount ? (
                        <span className="font-semibold text-primary">{formatCurrency(h.amount)}</span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-foreground font-medium">{h.changedBy}</span>
                    </td>
                    <td>
                      <span className="text-xs text-muted">{h.note || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có lịch sử thay đổi"
            description="Chưa ghi nhận biến động tham gia công đoàn nào đối với nhân sự này."
          />
        )}
      </Modal>
    </div>
  );
}
