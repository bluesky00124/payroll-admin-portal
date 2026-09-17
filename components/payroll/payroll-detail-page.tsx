"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  History,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast, useUserRole, type UserRole } from "@/components/providers";
import {
  roleActors,
  statusConfig,
  workflowSteps,
} from "@/components/payroll/payroll-config";
import { PayrollFullTable } from "@/components/payroll/payroll-full-table";
import { Badge, Button, Modal, StatusBadge, UserAvatar } from "@/components/ui";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

import {
  usePayrollDetail,
  usePayrollMatrix,
  useWorkflowTimeline,
  useSubmitWorkflow,
  useApproveWorkflow,
  useRejectWorkflow,
  useConfirmationStats,
  useResolveDispute,
  useCalculatePayroll,
} from "@/lib/hooks/use-payroll";
import { payrollApi } from "@/lib/payroll-api";
import type { PayrollPeriod, WorkflowStep, WorkflowInstance, ConfirmationStatus, DisputeRecord } from "@/lib/payroll-types";

type DetailTab = "overview" | "workflow";

const tabs: Array<{ value: DetailTab; label: string; icon: typeof FileSpreadsheet }> = [
  { value: "overview", label: "Bảng lương", icon: FileSpreadsheet },
  { value: "workflow", label: "Quy trình duyệt", icon: History },
];

const validTabs = new Set(tabs.map((item) => item.value));

type WorkflowAction = "submit" | "approve" | "reject";

export function PayrollDetailPage({ payrollId }: { payrollId: string }) {
  const [query, setQuery] = useState("");
  
  const [actionModal, setActionModal] = useState<{ action: WorkflowAction, open: boolean }>({ action: "approve", open: false });
  const [actionNote, setActionNote] = useState("");

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationFilter, setConfirmationFilter] = useState("all");
  const [confirmationQuery, setConfirmationQuery] = useState("");
  
  const { role } = useUserRole();
  const { notify } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as DetailTab | null;
  const activeTab: DetailTab = requestedTab && validTabs.has(requestedTab) ? requestedTab : "overview";

  const id = Number(payrollId);

  const [isExporting, setIsExporting] = useState(false);
  
  // Queries
  const { data: run, isLoading: isRunLoading } = usePayrollDetail(id);
  const { data: matrixData, isLoading: isMatrixLoading } = usePayrollMatrix(id);
  const { data: timelineData, isLoading: isTimelineLoading } = useWorkflowTimeline(id);
  
  // Mutations
  const submitMut = useSubmitWorkflow();
  const approveMut = useApproveWorkflow();
  const rejectMut = useRejectWorkflow();
  const calculateMut = useCalculatePayroll();

  const handleExportExcel = async () => {
    if (!run) return;
    try {
      setIsExporting(true);
      await payrollApi.downloadPayrollExcel(
        id,
        `BANG_LUONG_${run.projectCode}_${run.year}${String(run.month).padStart(2, "0")}.xlsx`
      );
      notify("Đã tải xuống file bảng lương Excel thành công.");
    } catch (e: any) {
      notify(e.message || "Không thể tải file Excel", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCalculate = async () => {
    try {
      const res = await calculateMut.mutateAsync({ id });
      notify(`Đã tính toán lương thành công cho ${res?.totalCalculated ?? run?.totalEmployees} nhân viên.`);
    } catch (e: any) {
      notify(e.message || "Lỗi khi tính toán bảng lương", "error");
    }
  };

  useEffect(() => {
    if (searchParams.get("dialog") === "confirmations") setConfirmationOpen(true);
  }, [searchParams]);

  const changeTab = (tab: DetailTab) => {
    setQuery("");
    router.replace(tab === "overview" ? `/payroll/${payrollId}` : `/payroll/${payrollId}?tab=${tab}`, { scroll: false });
  };

  const openConfirmations = () => {
    setConfirmationFilter("all");
    setConfirmationQuery("");
    setConfirmationOpen(true);
  };

  const closeConfirmations = () => {
    setConfirmationOpen(false);
    if (searchParams.get("dialog") === "confirmations") {
      router.replace(`/payroll/${payrollId}?tab=workflow`, { scroll: false });
    }
  };

  const openActionDialog = (action: WorkflowAction) => {
    setActionNote("");
    setActionModal({ action, open: true });
  };

  const handleActionSubmit = async () => {
    try {
      if (actionModal.action === "submit") {
        await submitMut.mutateAsync({ id, note: actionNote });
        notify("Đã gửi trình duyệt bảng lương");
      } else if (actionModal.action === "approve") {
        await approveMut.mutateAsync({ id, payload: { note: actionNote } });
        notify("Đã duyệt bảng lương bước hiện tại");
      } else if (actionModal.action === "reject") {
        await rejectMut.mutateAsync({ id, reason: actionNote });
        notify("Đã từ chối và trả lại bảng lương");
      }
      setActionModal({ action: "approve", open: false });
    } catch (e: any) {
      notify(e.message || "Lỗi thao tác workflow", "error");
    }
  };

  if (isRunLoading) return <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải chi tiết bảng lương…</div>;
  if (!run) return <section className="content-card payroll-not-found"><FileSpreadsheet /><h1>Không tìm thấy bảng lương</h1><p>Bảng lương có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p><Button onClick={() => router.push("/payroll")}><ArrowLeft />Quay lại danh sách</Button></section>;

  const canViewSensitive = role === "accountant" || role === "payment_accountant";

  return (
    <>
      <div className="payroll-detail-page">
        <header className="payroll-detail-page-header">
          <div className="payroll-detail-title">
            <Link href="/payroll" className="payroll-back-link"><ArrowLeft />Danh sách bảng lương</Link>
            <div className="payroll-detail-title-row">
              <h1>{run.periodCode}</h1>
              <StatusBadge tone={statusConfig[run.status]?.tone || "neutral"}>{statusConfig[run.status]?.label || run.status}</StatusBadge>
            </div>
            <p>{run.projectCode} · {run.projectName} · {run.month}/{run.year}</p>
          </div>
          <div className="payroll-detail-header-action flex items-center gap-2">
            <small className="mr-2">Ngày tạo: {formatDate(run.createdAt)}</small>
            {(run.status === "draft" || run.status === "calculated") && (
              <Button
                variant="secondary"
                disabled={calculateMut.isPending}
                onClick={handleCalculate}
              >
                <RefreshCw className={calculateMut.isPending ? "spin" : ""} />
                {calculateMut.isPending ? "Đang tính..." : "Tính lại lương"}
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={isExporting}
              onClick={handleExportExcel}
            >
              {isExporting ? <RefreshCw className="spin" /> : <Download />}
              Xuất Excel
            </Button>
          </div>
        </header>

        <nav className="payroll-page-tabs" aria-label="Nhóm thông tin bảng lương">
          {tabs.map(({ value, label, icon: Icon }) => {
            const isActive = activeTab === value;
            return (
              <button
                type="button"
                className={`payroll-page-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => changeTab(value)}
                key={value}
              >
                <Icon />
                <span>{label}</span>
                {isActive && <span className="tab-indicator" />}
              </button>
            );
          })}
        </nav>

        <main className="payroll-detail-page-content">
          {activeTab === "overview" && (
            <div className="payroll-overview-tab payroll-page-tab-panel">
              {isMatrixLoading ? (
                <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải dữ liệu ma trận...</div>
              ) : (
                <PayrollFullTable matrix={matrixData!} query={query} onQueryChange={setQuery} canViewSensitive={canViewSensitive} />
              )}
            </div>
          )}
          {activeTab === "workflow" && (
            <WorkflowTab 
              run={run} 
              timeline={timelineData} 
              isLoading={isTimelineLoading}
              onAction={openActionDialog} 
              onOpenConfirmations={openConfirmations} 
            />
          )}
        </main>
      </div>

      <Modal open={confirmationOpen} onOpenChange={(open) => { if (!open) closeConfirmations(); }} title="Chi tiết phản hồi từ Người lao động" description={`${run.periodCode} · ${run.projectCode}`} size="xl" footer={<Button onClick={closeConfirmations}>Đóng</Button>}>
        <PayslipConfirmationPanel
          run={run}
          filter={confirmationFilter}
          query={confirmationQuery}
          onFilterChange={setConfirmationFilter}
          onQueryChange={setConfirmationQuery}
        />
      </Modal>

      <Modal open={actionModal.open} onOpenChange={(o) => setActionModal({ ...actionModal, open: o })} title={actionModal.action === "submit" ? "Trình duyệt bảng lương" : actionModal.action === "approve" ? "Phê duyệt bảng lương" : "Từ chối bảng lương"} size="sm" footer={<><Button onClick={() => setActionModal({ ...actionModal, open: false })}>Hủy</Button><Button variant={actionModal.action === "reject" ? "danger" : "primary"} onClick={handleActionSubmit}>{actionModal.action === "reject" ? <XCircle /> : <Send />}{actionModal.action === "submit" ? "Trình duyệt" : actionModal.action === "approve" ? "Phê duyệt" : "Từ chối"}</Button></>}>
        <label className="form-field">
          <span>Ghi chú ({actionModal.action === "reject" ? "Bắt buộc" : "Không bắt buộc"})</span>
          <textarea rows={4} value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
        </label>
      </Modal>
    </>
  );
}

function WorkflowTab({ run, timeline, isLoading, onAction, onOpenConfirmations }: { run: PayrollPeriod; timeline: any; isLoading: boolean; onAction: (action: WorkflowAction) => void; onOpenConfirmations: () => void }) {
  if (isLoading || !timeline) return <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải tiến trình...</div>;
  
  const { instance, steps, history } = timeline;

  return (
    <section className="payroll-workflow-tab payroll-page-tab-panel">
      <header className="workflow-table-heading">
        <div>
          <span className="eyebrow"><History /> QUY TRÌNH DUYỆT LƯƠNG</span>
          <h2>Tiến trình phê duyệt (Workflow)</h2>
          <p>Chỉ người có thẩm quyền tương ứng với bước hiện tại mới có thể phê duyệt.</p>
        </div>
        {run.status === "calculated" && (
          <Button variant="primary" onClick={() => onAction("submit")}><Send /> Trình duyệt ngay</Button>
        )}
      </header>
      <div className="workflow-table-wrap">
        <table className="workflow-approval-table">
          <thead>
            <tr><th>Bước</th><th>Tên bước</th><th>Trạng thái</th><th>Thời gian</th></tr>
          </thead>
          <tbody>
            {steps.map((step: WorkflowStep) => (
              <tr className={step.status === "in_progress" ? "active" : step.status === "approved" ? "done" : ""} key={step.stepOrder}>
                <td><span className="workflow-step-number">{step.stepOrder}</span></td>
                <td>
                  <div className="workflow-step-cell">
                    <strong>{step.stepName}</strong>
                  </div>
                </td>
                <td><StatusBadge tone={step.status === "approved" ? "success" : step.status === "in_progress" ? "warning" : "neutral"}>{step.status}</StatusBadge></td>
                <td>{step.completedAt ? formatDate(step.completedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {instance?.status === "in_progress" && (
        <div className="mt-4 flex gap-3">
          <Button variant="primary" onClick={() => onAction("approve")}><Check /> Duyệt Bước {instance.currentStepOrder}</Button>
          <Button onClick={() => onAction("reject")}><RotateCcw /> Từ chối</Button>
          {instance.currentStepOrder === 6 && (
            <Button onClick={onOpenConfirmations}><UserCheck /> Xem xác nhận NLĐ</Button>
          )}
        </div>
      )}

      {history && history.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-3">Lịch sử thao tác</h3>
          <ul className="space-y-3">
            {history.map((h: any, i: number) => (
              <li key={i} className="text-sm border-b pb-2">
                <strong>{h.actorName}</strong> đã <b>{h.action}</b> lúc {formatDate(h.createdAt)}
                {h.comment && <p className="text-muted-foreground mt-1">"{h.comment}"</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PayslipConfirmationPanel({ run, filter, query, onFilterChange, onQueryChange }: { run: PayrollPeriod; filter: string; query: string; onFilterChange: (f: string) => void; onQueryChange: (q: string) => void; }) {
  const { data, isLoading } = useConfirmationStats(run.id, { search: query, status: filter !== "all" ? filter : undefined });
  
  if (isLoading) return <div className="p-4">Đang tải...</div>;
  if (!data) return null;

  return (
    <div className="payslip-confirmation-modal">
      <div className="confirmation-toolbar">
        <label className="search-field confirmation-search"><Search /><input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Tìm mã NV…" /></label>
        <div className="confirmation-filters">
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => onFilterChange("all")}>Tất cả <span>{data.total}</span></button>
          <button type="button" className={filter === "disputed" ? "active" : ""} onClick={() => onFilterChange("disputed")}>Khiếu nại <span>{data.disputed}</span></button>
          <button type="button" className={filter === "confirmed" ? "active" : ""} onClick={() => onFilterChange("confirmed")}>Đã xác nhận <span>{data.confirmed}</span></button>
        </div>
      </div>
      <div className="confirmation-table-wrap mt-4">
        <table className="confirmation-table">
          <thead><tr><th>Nhân viên</th><th>Trạng thái</th><th>Lý do khiếu nại</th><th>Thời gian</th></tr></thead>
          <tbody>
            {data.disputes.map((d) => (
              <tr key={d.confirmationId}>
                <td><strong>{d.fullName}</strong><small className="block text-muted-foreground">{d.employeeCode}</small></td>
                <td><StatusBadge tone={d.status === "disputed" ? "danger" : "success"}>{d.status}</StatusBadge></td>
                <td>{d.disputeReason}</td>
                <td>{formatDate(d.disputedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
