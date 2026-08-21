"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
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
import { useEffect, useMemo, useState } from "react";
import { useToast, useUserRole, type UserRole } from "@/components/providers";
import {
  feedbackConfig,
  roleActors,
  statusConfig,
  getWorkflowStage,
  workflowSteps,
} from "@/components/payroll/payroll-config";
import { PayrollFullTable } from "@/components/payroll/payroll-full-table";
import { Badge, Button, Modal, StatusBadge, UserAvatar } from "@/components/ui";
import {
  confirmPayrollReview,
  confirmProjectPayroll,
  getPayrollWorkspace,
  lockPayrollRun,
  publishPayrollPayslips,
  recordRevenueCheck,
  requestPayrollCorrection,
  resubmitPayrollCorrection,
  reviewPayrollFeedback,
  submitPayrollExplanation,
  updatePayrollLine,
  type PayrollWorkspace,
} from "@/lib/payroll-store";
import type { PayrollAuditEvent, PayrollAttendanceSheet, PayrollFeedback, PayrollLine, PayrollRun } from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

type DetailTab = "overview" | "workflow";

const tabs: Array<{ value: DetailTab; label: string; icon: typeof FileSpreadsheet }> = [
  { value: "overview", label: "Bảng lương", icon: FileSpreadsheet },
  { value: "workflow", label: "Quy trình duyệt", icon: History },
];

const validTabs = new Set(tabs.map((item) => item.value));

type WorkflowAction = "confirm_review" | "confirm_project" | "publish" | "record_revenue" | "submit_explanation" | "finalize" | "resubmit";
type ConfirmationFilter = "all" | "pending" | "feedback" | "confirmed";

export function PayrollDetailPage({ payrollId }: { payrollId: string }) {
  const [workspace, setWorkspace] = useState<PayrollWorkspace | null>(null);
  const [query, setQuery] = useState("");
  const [editingLine, setEditingLine] = useState<PayrollLine | null>(null);
  const [editValues, setEditValues] = useState({ workDays: 0, overtimeHours: 0, basePay: 0, overtimePay: 0, allowances: 0, deductions: 0, note: "", reason: "" });
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [revenueValue, setRevenueValue] = useState(620_000_000);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [lockOpen, setLockOpen] = useState(false);
  const [correctionDialog, setCorrectionDialog] = useState<{ mode: "request" | "resubmit"; step: 3 | 4 } | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationFilter, setConfirmationFilter] = useState<ConfirmationFilter>("all");
  const [confirmationQuery, setConfirmationQuery] = useState("");
  const [feedbackAction, setFeedbackAction] = useState<{ feedback: PayrollFeedback; action: "adjusted" | "rejected" } | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const { role } = useUserRole();
  const { notify } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const actor = roleActors[role];
  const requestedTab = searchParams.get("tab") as DetailTab | null;
  const activeTab: DetailTab = requestedTab && validTabs.has(requestedTab) ? requestedTab : "overview";

  const refresh = () => setWorkspace(getPayrollWorkspace());
  useEffect(() => refresh(), []);
  useEffect(() => {
    if (searchParams.get("dialog") === "confirmations") setConfirmationOpen(true);
  }, [searchParams]);

  const selectedRun = workspace?.payrollRuns.find((item) => item.id === payrollId) ?? null;
  const selectedProject = selectedRun && workspace ? workspace.projects.find((item) => item.id === selectedRun.projectId) : null;
  const selectedSheet = selectedRun && workspace ? workspace.attendanceSheets.find((item) => item.id === selectedRun.attendanceSheetId) : null;
  const selectedLines = useMemo(() => selectedRun && workspace ? workspace.payrollLines.filter((item) => item.payrollId === selectedRun.id) : [], [selectedRun, workspace]);
  const selectedFeedbacks = useMemo(() => selectedRun && workspace ? workspace.feedbacks.filter((item) => item.payrollId === selectedRun.id) : [], [selectedRun, workspace]);
  const selectedAudits = useMemo(() => selectedRun && workspace ? workspace.auditEvents.filter((item) => item.payrollId === selectedRun.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [], [selectedRun, workspace]);
  const canViewSensitive = role === "accountant" || role === "payment_accountant";

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

  const runMutation = (action: () => void, success: string) => {
    try {
      action();
      refresh();
      notify(success);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể thực hiện thao tác.", "error");
    }
  };

  const openLineEditor = (line: PayrollLine) => {
    setEditingLine(line);
    setEditValues({ workDays: line.workDays, overtimeHours: line.overtimeHours, basePay: line.basePay, overtimePay: line.overtimePay, allowances: line.allowances, deductions: line.deductions, note: line.note ?? "", reason: "" });
  };

  const saveLine = () => {
    if (!editingLine || !editValues.reason.trim()) return;
    runMutation(() => updatePayrollLine(editingLine.id, {
      workDays: Number(editValues.workDays), overtimeHours: Number(editValues.overtimeHours), basePay: Number(editValues.basePay), overtimePay: Number(editValues.overtimePay), allowances: Number(editValues.allowances), deductions: Number(editValues.deductions), note: editValues.note,
    }, actor, editValues.reason.trim()), "Đã lưu điều chỉnh và ghi nhận lịch sử");
    setEditingLine(null);
  };

  const handleWorkflowAction = (action: WorkflowAction) => {
    if (!selectedRun) return;
    if (action === "confirm_review") runMutation(() => confirmPayrollReview(selectedRun.id, actor), "Đã chuyển CDA/GSDA xác nhận");
    else if (action === "confirm_project") runMutation(() => confirmProjectPayroll(selectedRun.id, actor), "Đã xác nhận bảng lương, chờ phát hành phiếu lương");
    else if (action === "publish") runMutation(() => publishPayrollPayslips(selectedRun.id, actor), "Đã phát hành phiếu lương cho NLĐ");
    else if (action === "record_revenue") setRevenueOpen(true);
    else if (action === "submit_explanation") { setExplanation(selectedRun.explanation ?? ""); setExplanationOpen(true); }
    else if (action === "finalize") setLockOpen(true);
    else if (action === "resubmit") { setCorrectionNote(""); setCorrectionDialog({ mode: "resubmit", step: selectedRun.returnToStep ?? 3 }); }
  };

  const openCorrectionRequest = (step: 3 | 4) => {
    setCorrectionNote("");
    setCorrectionDialog({ mode: "request", step });
  };

  const submitCorrectionAction = () => {
    if (!selectedRun || !correctionDialog || !correctionNote.trim()) return;
    if (correctionDialog.mode === "request") {
      runMutation(() => requestPayrollCorrection(selectedRun.id, correctionDialog.step, actor, correctionNote.trim()), "Đã chuyển Kế toán C&B điều chỉnh");
    } else {
      runMutation(() => resubmitPayrollCorrection(selectedRun.id, actor, correctionNote.trim()), "Đã điều chỉnh và gửi lại bước duyệt");
    }
    setCorrectionDialog(null);
    setCorrectionNote("");
  };

  const resolveFeedback = () => {
    if (!feedbackAction || !feedbackNote.trim()) return;
    runMutation(() => reviewPayrollFeedback(feedbackAction.feedback.id, feedbackAction.action, actor, feedbackNote.trim()), feedbackAction.action === "adjusted" ? "Đã xác nhận điều chỉnh phản hồi" : "Đã từ chối phản hồi");
    setFeedbackAction(null);
    setFeedbackNote("");
  };

  if (!workspace) return <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải chi tiết bảng lương…</div>;
  if (!selectedRun || !selectedProject) return <section className="content-card payroll-not-found"><FileSpreadsheet /><h1>Không tìm thấy bảng lương</h1><p>Bảng lương có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p><Button onClick={() => router.push("/payroll")}><ArrowLeft />Quay lại danh sách</Button></section>;

  return (
    <>
      <div className="payroll-detail-page">
        <header className="payroll-detail-page-header">
          <div className="payroll-detail-title">
            <Link href="/payroll" className="payroll-back-link"><ArrowLeft />Danh sách bảng lương</Link>
            <div className="payroll-detail-title-row"><h1>{selectedRun.code}</h1><StatusBadge tone={statusConfig[selectedRun.status].tone}>{statusConfig[selectedRun.status].label}</StatusBadge></div>
            <p>{selectedProject.code} · {selectedProject.name} · {formatMonthYear(selectedRun.period, true)}</p>
          </div>
          <div className="payroll-detail-header-action"><small>Cập nhật {formatDate(selectedRun.updatedAt)}</small></div>
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
          {activeTab === "overview" && <OverviewTab run={selectedRun} feedbacks={selectedFeedbacks} onEdit={openLineEditor} lines={selectedLines} employees={workspace.employees} query={query} onQueryChange={setQuery} canViewSensitive={canViewSensitive} />}
          {activeTab === "workflow" && <WorkflowTab run={selectedRun} sheet={selectedSheet ?? undefined} audits={selectedAudits} feedbacks={selectedFeedbacks} role={role} onAction={handleWorkflowAction} onRequestCorrection={openCorrectionRequest} onOpenConfirmations={openConfirmations} />}
        </main>
      </div>

      <Modal open={confirmationOpen} onOpenChange={(open) => { if (!open) closeConfirmations(); }} title="Chi tiết xác nhận phiếu lương" description={`${selectedRun.code} · ${selectedProject.code} · ${formatMonthYear(selectedRun.period, true)}`} size="xl" footer={<Button onClick={closeConfirmations}>Đóng</Button>}>
        <PayslipConfirmationPanel
          run={selectedRun}
          lines={selectedLines}
          feedbacks={selectedFeedbacks}
          role={role}
          filter={confirmationFilter}
          query={confirmationQuery}
          onFilterChange={setConfirmationFilter}
          onQueryChange={setConfirmationQuery}
          onOwnerApprove={(feedback) => runMutation(() => reviewPayrollFeedback(feedback.id, "pending_accounting", actor), "Đã duyệt và chuyển phản hồi tới Kế toán C&B")}
          onResolve={(feedback, action) => { setFeedbackAction({ feedback, action }); setFeedbackNote(""); }}
        />
      </Modal>
      <Modal open={Boolean(editingLine)} onOpenChange={(open) => { if (!open) setEditingLine(null); }} title={`Điều chỉnh lương · ${editingLine?.employeeCode ?? ""}`} description={editingLine ? `${editingLine.employeeName} · ${editingLine.position}` : undefined} size="lg" footer={<><Button onClick={() => setEditingLine(null)}>Hủy</Button><Button variant="primary" disabled={!editValues.reason.trim()} onClick={saveLine}><Check />Lưu điều chỉnh</Button></>}>
        <div className="edit-payroll-form"><div className="form-grid"><label className="form-field"><span>Ngày công</span><input type="number" step="0.5" value={editValues.workDays} onChange={(event) => setEditValues((value) => ({ ...value, workDays: Number(event.target.value) }))} /></label><label className="form-field"><span>Giờ tăng ca</span><input type="number" step="0.5" value={editValues.overtimeHours} onChange={(event) => setEditValues((value) => ({ ...value, overtimeHours: Number(event.target.value) }))} /></label><MoneyField label="Lương theo công" value={editValues.basePay} onChange={(value) => setEditValues((current) => ({ ...current, basePay: value }))} /><MoneyField label="Tiền tăng ca" value={editValues.overtimePay} onChange={(value) => setEditValues((current) => ({ ...current, overtimePay: value }))} /><MoneyField label="Tổng phụ cấp" value={editValues.allowances} onChange={(value) => setEditValues((current) => ({ ...current, allowances: value }))} /><MoneyField label="Tổng khấu trừ" value={editValues.deductions} onChange={(value) => setEditValues((current) => ({ ...current, deductions: value }))} /><label className="form-field form-field-wide"><span>Ghi chú dòng lương</span><textarea rows={2} value={editValues.note} onChange={(event) => setEditValues((value) => ({ ...value, note: event.target.value }))} /></label><label className="form-field form-field-wide"><span>Lý do điều chỉnh <b>*</b></span><textarea rows={3} value={editValues.reason} onChange={(event) => setEditValues((value) => ({ ...value, reason: event.target.value }))} placeholder="Nêu rõ căn cứ điều chỉnh hoặc cấp quản lý phê duyệt…" /></label></div><div className="edit-net-preview"><span>Thực nhận sau điều chỉnh</span><strong>{formatCurrency(editValues.basePay + editValues.overtimePay + editValues.allowances - editValues.deductions)}</strong></div></div>
      </Modal>
      <Modal open={revenueOpen} onOpenChange={setRevenueOpen} title="Cập nhật doanh thu & kiểm tra chênh lệch" description="Hệ thống tính A và B theo Bước 7 của quy trình." size="md" footer={<><Button onClick={() => setRevenueOpen(false)}>Hủy</Button><Button variant="primary" disabled={revenueValue <= 0} onClick={() => { const needsExplanation = recordRevenueCheck(selectedRun.id, revenueValue, actor); refresh(); setRevenueOpen(false); notify(needsExplanation ? "Chênh lệch vượt ngưỡng, cần CDA/GSDA giải trình" : "Chênh lệch trong ngưỡng cho phép", needsExplanation ? "warning" : "success"); }}><BarChart3 />Kiểm tra chênh lệch</Button></>}><div className="revenue-form"><label className="form-field"><span>Doanh thu dự án kỳ này</span><input type="number" min={1} value={revenueValue} onChange={(event) => setRevenueValue(Number(event.target.value))} /></label><div className="formula-note"><strong>Công thức kiểm soát</strong><p>A = Chi phí lương/Doanh thu kỳ này − tỷ lệ kỳ trước</p><p>B = A × Doanh thu kỳ này</p><small>Không yêu cầu giải trình khi −1,5% ≤ A ≤ 1,5% và −10 triệu ≤ B ≤ 10 triệu.</small></div></div></Modal>
      <Modal open={explanationOpen} onOpenChange={setExplanationOpen} title="Giải trình chênh lệch" description="CDA/GSDA nêu nguyên nhân và số tiền chênh lệch để C&B tiếp nhận, lưu hồ sơ." size="md" footer={<><Button onClick={() => setExplanationOpen(false)}>Hủy</Button><Button variant="primary" disabled={!explanation.trim()} onClick={() => { runMutation(() => submitPayrollExplanation(selectedRun.id, explanation.trim(), actor), "Đã lưu giải trình chênh lệch"); setExplanationOpen(false); }}><Send />Gửi giải trình</Button></>}><label className="form-field"><span>Nội dung giải trình <b>*</b></span><textarea rows={6} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label></Modal>
      <Modal open={lockOpen} onOpenChange={setLockOpen} title="Hoàn tất và khóa bảng lương?" description="Thao tác này xác nhận dữ liệu đã hoàn tất đủ quy trình duyệt." size="sm" footer={<><Button onClick={() => setLockOpen(false)}>Hủy</Button><Button variant="primary" onClick={() => { runMutation(() => lockPayrollRun(selectedRun.id, actor), "Đã hoàn tất và khóa bảng lương"); setLockOpen(false); }}><LockKeyhole />Khóa bảng lương</Button></>}><div className="lock-confirm"><LockKeyhole /><div><strong>Không thể chỉnh sửa sau khi khóa</strong><p>Bảng lương được lưu làm cơ sở lập danh sách chi lương.</p></div></div></Modal>
      <Modal open={Boolean(correctionDialog)} onOpenChange={(open) => { if (!open) setCorrectionDialog(null); }} title={correctionDialog?.mode === "request" ? "Yêu cầu điều chỉnh bảng lương" : "Xác nhận đã điều chỉnh"} description={correctionDialog?.mode === "request" ? `Trả Bước ${correctionDialog.step} về Kế toán C&B để kiểm tra và cập nhật.` : `Gửi lại Bước ${correctionDialog?.step ?? 3} cho người có trách nhiệm duyệt.`} size="sm" footer={<><Button onClick={() => setCorrectionDialog(null)}>Hủy</Button><Button variant="primary" disabled={!correctionNote.trim()} onClick={submitCorrectionAction}>{correctionDialog?.mode === "request" ? <RotateCcw /> : <Send />}{correctionDialog?.mode === "request" ? "Chuyển điều chỉnh" : "Gửi lại duyệt"}</Button></>}><label className="form-field"><span>{correctionDialog?.mode === "request" ? "Lý do yêu cầu điều chỉnh" : "Nội dung đã điều chỉnh"} <b>*</b></span><textarea rows={5} value={correctionNote} onChange={(event) => setCorrectionNote(event.target.value)} placeholder={correctionDialog?.mode === "request" ? "Nêu rõ dữ liệu sai lệch và căn cứ cần bổ sung…" : "Nêu rõ nội dung đã cập nhật và căn cứ điều chỉnh…"} /></label></Modal>
      <Modal open={Boolean(feedbackAction)} onOpenChange={(open) => { if (!open) setFeedbackAction(null); }} title={feedbackAction?.action === "adjusted" ? "Xác nhận đã điều chỉnh" : "Từ chối phản hồi"} description={feedbackAction ? `${feedbackAction.feedback.employeeCode} · ${feedbackAction.feedback.employeeName}` : undefined} size="sm" footer={<><Button onClick={() => setFeedbackAction(null)}>Hủy</Button><Button variant={feedbackAction?.action === "rejected" ? "danger" : "primary"} disabled={!feedbackNote.trim()} onClick={resolveFeedback}>{feedbackAction?.action === "adjusted" ? <Check /> : <XCircle />}{feedbackAction?.action === "adjusted" ? "Hoàn tất xử lý" : "Từ chối phản hồi"}</Button></>}><div className="feedback-resolution"><blockquote>{feedbackAction?.feedback.message}</blockquote><label className="form-field"><span>{feedbackAction?.action === "adjusted" ? "Nội dung đã điều chỉnh" : "Lý do từ chối"} <b>*</b></span><textarea rows={4} value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} /></label></div></Modal>
    </>
  );
}

function OverviewTab({ run, feedbacks, onEdit, lines, employees, query, onQueryChange, canViewSensitive }: { run: PayrollRun; feedbacks: PayrollFeedback[]; onEdit: (line: PayrollLine) => void; lines: PayrollLine[]; employees: PayrollWorkspace["employees"]; query: string; onQueryChange: (value: string) => void; canViewSensitive: boolean }) {
  return (
    <div className="payroll-overview-tab payroll-page-tab-panel">
      {(run.currentRevenue || run.varianceRate !== undefined) && (
        <div className="variance-summary">
          <div><span>Doanh thu kỳ này</span><strong>{formatCurrency(run.currentRevenue ?? 0)}</strong></div>
          <div><span>Chênh lệch A</span><strong className={Math.abs(run.varianceRate ?? 0) > 1.5 ? "danger" : "success"}>{(run.varianceRate ?? 0).toFixed(2)}%</strong></div>
          <div><span>Quy đổi B</span><strong>{formatCurrency(run.varianceAmount ?? 0)}</strong></div>
          {run.explanation && <p><b>Giải trình:</b> {run.explanation}</p>}
        </div>
      )}
      <PayrollFullTable run={run} lines={lines} employees={employees} locked={run.status === "locked"} query={query} onQueryChange={onQueryChange} onEdit={onEdit} canViewSensitive={canViewSensitive} />
      {run.status === "payslip_confirmation" && feedbacks.some((item) => !["adjusted", "rejected"].includes(item.status)) && (
        <div className="tab-context-note">
          <AlertTriangle />
          <div>
            <strong>Còn phản hồi chưa xử lý</strong>
            <p>Xem chi tiết tại Bước 6 trong quy trình duyệt để CDA/GSDA và Kế toán C&B xử lý.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function inferAuditStep(event: PayrollAuditEvent) {
  if (event.workflowStep) return event.workflowStep;
  if (event.type === "feedback" || event.type === "edit") return undefined;
  if (event.type === "create") return 2;
  if (event.type === "publish") return 5;
  if (event.type === "revenue") return 7;
  if (event.type === "explain") return 8;
  if (event.type === "lock") return 9;
  if (event.title.includes("Admin") || event.title.includes("BCSX")) return 3;
  if (event.title.includes("CDA") || event.title.includes("GSDA")) return 4;
  if (event.title.includes("NLĐ")) return 6;
  return undefined;
}

function getWorkflowAssignee(step: number, run: PayrollRun, sheet: PayrollAttendanceSheet | undefined, event: PayrollAuditEvent | undefined, isCorrection: boolean, isDone: boolean) {
  if (isCorrection) return roleActors.accountant;
  if (step === 1) return sheet?.approvedBy ?? "Đơn vị phụ trách bảng công";
  if (step === 2) return run.createdBy;
  if (step === 3) return isDone && event?.type === "approve" ? event.actor : roleActors.bcsx;
  if (step === 4) return isDone && event?.type === "approve" ? event.actor : roleActors.project_owner;
  if (step === 5) return isDone && event?.type === "publish" ? event.actor : `${roleActors.accountant.split(" (")[0]} / CDA, GSDA`;
  if (step === 6) return "Người lao động dự án";
  if (step === 7) return isDone && event?.type === "revenue" ? event.actor : roleActors.payment_accountant;
  if (step === 8) return isDone && event?.type === "explain" ? event.actor : roleActors.project_owner;
  return isDone && event?.type === "lock" ? event.actor : roleActors.accountant;
}

function WorkflowTab({ run, sheet, audits, feedbacks, role, onAction, onRequestCorrection, onOpenConfirmations }: { run: PayrollRun; sheet: PayrollAttendanceSheet | undefined; audits: PayrollWorkspace["auditEvents"]; feedbacks: PayrollFeedback[]; role: UserRole; onAction: (action: WorkflowAction) => void; onRequestCorrection: (step: 3 | 4) => void; onOpenConfirmations: () => void }) {
  const stage = getWorkflowStage(run);
  const payslipProgress = run.employeeCount > 0 ? Math.round((run.confirmedPayslipCount / run.employeeCount) * 100) : 0;

  const renderAction = (step: number, isActive: boolean, isCorrection: boolean, isDone: boolean) => {
    if (step === 6 && (isActive || isDone)) return <Button size="sm" onClick={onOpenConfirmations}><UserCheck />Chi tiết xác nhận</Button>;
    if (isDone) return <span className="workflow-done-check" aria-label="Đã hoàn tất"><Check /></span>;
    if (!isActive || run.status === "locked") return <span className="workflow-no-action">—</span>;
    if (isCorrection) return role === "accountant" ? <Button size="sm" variant="primary" onClick={() => onAction("resubmit")}><Send />Đã điều chỉnh</Button> : <span className="workflow-waiting">Chờ Kế toán C&B</span>;
    if (step === 3) return role === "bcsx" ? <div className="workflow-actions"><Button size="sm" variant="primary" onClick={() => onAction("confirm_review")}><FileCheck2 />Xác nhận</Button><Button size="sm" onClick={() => onRequestCorrection(3)}><RotateCcw />Yêu cầu điều chỉnh</Button></div> : <span className="workflow-waiting">Chờ Admin/BCSX</span>;
    if (step === 4) return role === "project_owner" ? <div className="workflow-actions"><Button size="sm" variant="primary" onClick={() => onAction("confirm_project")}><Check />Xác nhận</Button><Button size="sm" onClick={() => onRequestCorrection(4)}><RotateCcw />Trả lại C&B</Button></div> : <span className="workflow-waiting">Chờ CDA/GSDA</span>;
    if (step === 5) return role === "accountant" || role === "project_owner" ? <Button size="sm" variant="primary" onClick={() => onAction("publish")}><Send />Phát hành</Button> : <span className="workflow-waiting">Chờ CDA/GSDA/C&B</span>;
    if (step === 7) return role === "payment_accountant" ? <Button size="sm" variant="primary" onClick={() => onAction("record_revenue")}><BarChart3 />Cập nhật doanh thu</Button> : <span className="workflow-waiting">Chờ Kế toán thanh toán</span>;
    if (step === 8) return role === "project_owner" ? <Button size="sm" variant="primary" onClick={() => onAction("submit_explanation")}><MessageSquareText />Gửi giải trình</Button> : <span className="workflow-waiting">Chờ CDA/GSDA</span>;
    if (step === 9) return role === "accountant" ? <Button size="sm" variant="primary" onClick={() => onAction("finalize")}><LockKeyhole />Hoàn tất & khóa</Button> : <span className="workflow-waiting">Chờ Kế toán C&B</span>;
    return <span className="workflow-no-action">—</span>;
  };

  return <section className="payroll-workflow-tab payroll-page-tab-panel"><header className="workflow-table-heading"><div><span className="eyebrow"><History /> QUY TRÌNH THEO PKT.QT06</span><h2>Quy trình xác nhận bảng lương</h2><p>Chỉ bước hiện tại và đúng vai trò mới có thể thao tác. Mọi kết quả được ghi nhận trực tiếp trên từng bước.</p></div><StatusBadge tone={statusConfig[run.status].tone}>{statusConfig[run.status].label}</StatusBadge></header><div className="workflow-table-wrap"><table className="workflow-approval-table"><thead><tr><th>STT</th><th>Bước</th><th>Trạng thái</th><th>Người xử lý</th><th>Thời gian</th><th>Ghi chú / Kết quả</th><th>Thao tác</th></tr></thead><tbody>{workflowSteps.map((item) => {
    const isCorrection = run.status === "correction_required" && item.step === stage;
    const isSkipped = item.step === 8 && stage > 8 && !run.explanation && run.varianceRate !== undefined;
    const isDone = !isSkipped && (run.status === "locked" || item.step < stage);
    const isActive = run.status !== "locked" && item.step === stage;
    const event = audits.find((candidate) => inferAuditStep(candidate) === item.step);
    const revenueEvent = isSkipped ? audits.find((candidate) => inferAuditStep(candidate) === 7) : undefined;
    const time = item.step === 1 ? sheet?.approvedAt : item.step === 2 ? event?.createdAt ?? run.createdAt : item.step === 5 ? event?.createdAt ?? run.publishedAt : item.step === 9 ? event?.createdAt ?? run.lockedAt : isSkipped ? revenueEvent?.createdAt : event?.createdAt;
    const statusLabel = isCorrection ? "Cần điều chỉnh" : isSkipped ? "Không yêu cầu" : isDone ? "Đã hoàn tất" : isActive ? item.step === 6 ? "Đang xác nhận" : "Chờ xử lý" : "Chờ bước trước";
    const statusTone = isCorrection ? "danger" : isSkipped ? "neutral" : isDone ? "success" : isActive ? "warning" : "neutral";
    const openFeedbackCount = feedbacks.filter((feedback) => !["adjusted", "rejected"].includes(feedback.status)).length;
    const note = isCorrection ? run.returnReason : isSkipped ? "Chênh lệch A và B nằm trong ngưỡng cho phép." : item.step === 6 && isActive ? `${run.confirmedPayslipCount}/${run.employeeCount} đã xác nhận${openFeedbackCount > 0 ? ` · ${openFeedbackCount} phản hồi đang xử lý` : ` · ${run.employeeCount - run.confirmedPayslipCount} NLĐ chưa phản hồi`}.` : item.step === 1 && sheet ? `${sheet.code} đã được duyệt cuối.` : event?.description;
    return <tr className={`${isActive ? "active" : ""} ${isDone ? "done" : ""} ${isCorrection ? "correction" : ""}`} key={item.step}><td><span className="workflow-step-number">{String(item.step).padStart(2, "0")}</span></td><td><div className="workflow-step-cell"><strong>{item.title}</strong><p>{item.description}</p><small>{item.owner} · SLA {item.time}</small></div></td><td><StatusBadge tone={statusTone}>{statusLabel}</StatusBadge></td><td><div className="workflow-assignee"><strong>{isSkipped ? "Hệ thống kiểm soát" : getWorkflowAssignee(item.step, run, sheet, event, isCorrection, isDone)}</strong><small>{isCorrection ? "Kế toán C&B xử lý yêu cầu trả lại" : isSkipped ? "Tự động theo ngưỡng A và B" : item.owner}</small>{item.step === 6 && <div className="workflow-employee-progress"><span><i style={{ width: `${payslipProgress}%` }} /></span><b>{run.confirmedPayslipCount}/{run.employeeCount} · {payslipProgress}%</b></div>}</div></td><td><span className="workflow-time">{time ? formatDate(time) : "—"}</span></td><td><span className={`workflow-note ${note ? "" : "empty"}`}>{note ?? "—"}</span></td><td>{renderAction(item.step, isActive, isCorrection, isDone)}</td></tr>;
  })}</tbody></table></div></section>;
}

function PayslipConfirmationPanel({ run, lines, feedbacks, role, filter, query, onFilterChange, onQueryChange, onOwnerApprove, onResolve }: { run: PayrollRun; lines: PayrollLine[]; feedbacks: PayrollFeedback[]; role: UserRole; filter: ConfirmationFilter; query: string; onFilterChange: (filter: ConfirmationFilter) => void; onQueryChange: (query: string) => void; onOwnerApprove: (feedback: PayrollFeedback) => void; onResolve: (feedback: PayrollFeedback, action: "adjusted" | "rejected") => void }) {
  const rows = useMemo(() => {
    const latestFeedbackByEmployee = new Map<string, PayrollFeedback>();
    [...feedbacks].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).forEach((feedback) => {
      if (!latestFeedbackByEmployee.has(feedback.employeeId)) latestFeedbackByEmployee.set(feedback.employeeId, feedback);
    });
    const workflowCompleted = getWorkflowStage(run) > 6;
    const confirmedEmployeeIds = new Set(lines.filter((line) => !latestFeedbackByEmployee.has(line.employeeId)).slice(0, run.confirmedPayslipCount).map((line) => line.employeeId));
    return lines.map((line) => {
      const feedback = latestFeedbackByEmployee.get(line.employeeId);
      const hasOpenFeedback = feedback && !["adjusted", "rejected"].includes(feedback.status);
      if (workflowCompleted) return { line, feedback, group: "confirmed" as const, label: "Đã xác nhận", tone: "success" as const };
      if (hasOpenFeedback) return { line, feedback, group: "feedback" as const, label: feedbackConfig[feedback.status].label, tone: feedbackConfig[feedback.status].tone };
      if (feedback && ["adjusted", "rejected"].includes(feedback.status)) return { line, feedback, group: "pending" as const, label: "Chờ NLĐ xác nhận lại", tone: "warning" as const };
      if (confirmedEmployeeIds.has(line.employeeId)) return { line, feedback, group: "confirmed" as const, label: "Đã xác nhận", tone: "success" as const };
      return { line, feedback, group: "pending" as const, label: "Chưa phản hồi", tone: "neutral" as const };
    });
  }, [feedbacks, lines, run]);

  const counts = {
    all: rows.length,
    confirmed: rows.filter((row) => row.group === "confirmed").length,
    pending: rows.filter((row) => row.group === "pending").length,
    feedback: rows.filter((row) => row.group === "feedback").length,
  };
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const filteredRows = rows.filter((row) => filter === "all" || row.group === filter).filter((row) => `${row.line.employeeCode} ${row.line.employeeName} ${row.line.position}`.toLocaleLowerCase("vi").includes(normalizedQuery));

  const filters: Array<{ value: ConfirmationFilter; label: string; count: number }> = [
    { value: "all", label: "Tất cả", count: counts.all },
    { value: "pending", label: "Chưa phản hồi", count: counts.pending },
    { value: "feedback", label: "Cần xử lý", count: counts.feedback },
    { value: "confirmed", label: "Đã xác nhận", count: counts.confirmed },
  ];

  return (
    <div className="payslip-confirmation-modal">
      <div className="confirmation-toolbar">
        <label className="search-field confirmation-search"><Search /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm mã hoặc tên người lao động…" aria-label="Tìm người lao động trong danh sách xác nhận" /></label>
        <div className="confirmation-filters" aria-label="Lọc trạng thái xác nhận">{filters.map((item) => <button type="button" className={filter === item.value ? "active" : ""} onClick={() => onFilterChange(item.value)} key={item.value}>{item.label}<span>{item.count}</span></button>)}</div>
      </div>
      <div className="confirmation-table-wrap">
        <table className="confirmation-table">
          <thead><tr><th>Người lao động</th><th>Trạng thái</th><th>Thời gian</th><th>Nội dung phản hồi</th><th>Người xử lý</th><th>Thao tác</th></tr></thead>
          <tbody>{filteredRows.length === 0 ? <tr><td colSpan={6}><div className="confirmation-empty"><UserCheck /><strong>Không có người lao động phù hợp</strong><span>Thử thay đổi từ khóa hoặc trạng thái lọc.</span></div></td></tr> : filteredRows.map(({ line, feedback, group, label, tone }) => <tr key={line.id}><td><div className="confirmation-employee"><UserAvatar name={line.employeeName} /><div><strong>{line.employeeName}</strong><small>{line.employeeCode} · {line.position}</small></div></div></td><td><StatusBadge tone={tone}>{label}</StatusBadge></td><td><span className="confirmation-time">{feedback ? formatDate(feedback.submittedAt) : "—"}</span></td><td>{feedback ? <div className="confirmation-feedback"><p>{feedback.message}</p>{(feedback.accountingNote || feedback.rejectionReason) && <small><b>Kết quả:</b> {feedback.accountingNote || feedback.rejectionReason}</small>}</div> : <span className="muted-dash">—</span>}</td><td>{group === "feedback" ? <span className="confirmation-owner">{feedback?.status === "pending_owner" ? roleActors.project_owner : roleActors.accountant}</span> : <span className="muted-dash">—</span>}</td><td>{feedback?.status === "pending_owner" ? role === "project_owner" ? <Button size="sm" variant="primary" onClick={() => onOwnerApprove(feedback)}><UserCheck />Duyệt</Button> : <span className="feedback-role-waiting">Chờ CDA/GSDA</span> : feedback?.status === "pending_accounting" ? role === "accountant" ? <div className="feedback-actions"><Button size="sm" variant="primary" onClick={() => onResolve(feedback, "adjusted")}><Check />Đã điều chỉnh</Button><Button size="sm" onClick={() => onResolve(feedback, "rejected")}><XCircle />Từ chối</Button></div> : <span className="feedback-role-waiting">Chờ Kế toán C&B</span> : <span className="muted-dash">—</span>}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="confirmation-rule"><CheckCircle2 /><p>Bước 6 chỉ hoàn tất khi tất cả NLĐ đã xác nhận phiên bản phiếu lương cuối cùng và không còn phản hồi đang xử lý.</p></div>
    </div>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="form-field"><span>{label}</span><div className="money-input"><input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} /><em>VNĐ</em></div></label>;
}
