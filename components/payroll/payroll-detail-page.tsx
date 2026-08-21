"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSpreadsheet,
  History,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Send,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast, useUserRole } from "@/components/providers";
import {
  feedbackCategoryLabels,
  feedbackConfig,
  roleActors,
  sourceLabels,
  stageForStatus,
  statusConfig,
  workflowSteps,
} from "@/components/payroll/payroll-config";
import { PayrollFullTable } from "@/components/payroll/payroll-full-table";
import { Badge, Button, Modal, StatusBadge, UserAvatar } from "@/components/ui";
import {
  getPayrollWorkspace,
  lockPayrollRun,
  recordRevenueCheck,
  reviewPayrollFeedback,
  submitPayrollExplanation,
  syncPayslipConfirmations,
  transitionPayrollRun,
  updatePayrollLine,
  type PayrollWorkspace,
} from "@/lib/payroll-store";
import type { PayrollFeedback, PayrollLine, PayrollRun } from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

type DetailTab = "overview" | "workflow" | "feedback";

const tabs: Array<{ value: DetailTab; label: string; icon: typeof FileSpreadsheet }> = [
  { value: "overview", label: "Bảng lương", icon: FileSpreadsheet },
  { value: "workflow", label: "Quy trình duyệt", icon: History },
  { value: "feedback", label: "Phản hồi", icon: MessageSquareText },
];

const validTabs = new Set(tabs.map((item) => item.value));

function getNextAction(run: PayrollRun) {
  switch (run.status) {
    case "admin_review": return { label: "Xác nhận đã kiểm tra", icon: <FileCheck2 /> };
    case "project_approval": return { label: "Xác nhận & phát hành", icon: <Send /> };
    case "payslip_confirmation": return { label: "Đồng bộ xác nhận NLĐ", icon: <RefreshCw /> };
    case "revenue_check": return { label: "Cập nhật doanh thu", icon: <BarChart3 /> };
    case "explanation_required": return { label: "Gửi giải trình", icon: <MessageSquareText /> };
    case "ready_to_finalize": return { label: "Hoàn tất & khóa", icon: <LockKeyhole /> };
    case "locked": return null;
  }
}

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

  const handleNextAction = (run: PayrollRun) => {
    if (run.status === "admin_review") runMutation(() => transitionPayrollRun(run.id, "project_approval", { type: "approve", title: "Admin/BCSX xác nhận bảng lương", description: "Đã đối chiếu dữ liệu thực tế và chuyển CDA/GSDA xác nhận.", actor }), "Đã chuyển CDA/GSDA xác nhận");
    else if (run.status === "project_approval") runMutation(() => transitionPayrollRun(run.id, "payslip_confirmation", { type: "publish", title: "CDA/GSDA xác nhận & phát hành phiếu lương", description: `Đã phát hành ${run.employeeCount} phiếu lương tới ứng dụng NLĐ.`, actor }), "Đã phát hành phiếu lương cho NLĐ");
    else if (run.status === "payslip_confirmation") runMutation(() => syncPayslipConfirmations(run.id, actor), "NLĐ đã xác nhận đủ phiếu lương");
    else if (run.status === "revenue_check") setRevenueOpen(true);
    else if (run.status === "explanation_required") { setExplanation(run.explanation ?? ""); setExplanationOpen(true); }
    else if (run.status === "ready_to_finalize") setLockOpen(true);
  };

  const resolveFeedback = () => {
    if (!feedbackAction || !feedbackNote.trim()) return;
    runMutation(() => reviewPayrollFeedback(feedbackAction.feedback.id, feedbackAction.action, actor, feedbackNote.trim()), feedbackAction.action === "adjusted" ? "Đã xác nhận điều chỉnh phản hồi" : "Đã từ chối phản hồi");
    setFeedbackAction(null);
    setFeedbackNote("");
  };

  if (!workspace) return <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải chi tiết bảng lương…</div>;
  if (!selectedRun || !selectedProject) return <section className="content-card payroll-not-found"><FileSpreadsheet /><h1>Không tìm thấy bảng lương</h1><p>Bảng lương có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p><Button onClick={() => router.push("/payroll")}><ArrowLeft />Quay lại danh sách</Button></section>;

  const nextAction = getNextAction(selectedRun);
  const hasOpenFeedback = selectedFeedbacks.some((item) => !["adjusted", "rejected"].includes(item.status));

  return (
    <>
      <div className="payroll-detail-page">
        <header className="payroll-detail-page-header">
          <div className="payroll-detail-title">
            <Link href="/payroll" className="payroll-back-link"><ArrowLeft />Danh sách bảng lương</Link>
            <div className="payroll-detail-title-row"><h1>{selectedRun.code}</h1><StatusBadge tone={statusConfig[selectedRun.status].tone}>{selectedRun.status === "locked" && <LockKeyhole />}{statusConfig[selectedRun.status].label}</StatusBadge></div>
            <p>{selectedProject.code} · {selectedProject.name} · {formatMonthYear(selectedRun.period, true)}</p>
          </div>
          <div className="payroll-detail-header-action"><small>Cập nhật {formatDate(selectedRun.updatedAt)}</small>{nextAction && <Button variant="primary" onClick={() => handleNextAction(selectedRun)}>{nextAction.icon}{nextAction.label}</Button>}</div>
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
                {value === "feedback" && selectedFeedbacks.length > 0 && (
                  <span className="tab-badge">{selectedFeedbacks.length}</span>
                )}
                {isActive && <span className="tab-indicator" />}
              </button>
            );
          })}
        </nav>

        <main className="payroll-detail-page-content">
          {activeTab === "overview" && <OverviewTab run={selectedRun} sheet={selectedSheet ?? undefined} feedbacks={selectedFeedbacks} onNext={() => handleNextAction(selectedRun)} onEdit={openLineEditor} lines={selectedLines} employees={workspace.employees} query={query} onQueryChange={setQuery} canViewSensitive={canViewSensitive} />}
          {activeTab === "workflow" && <WorkflowTab run={selectedRun} audits={selectedAudits} />}
          {activeTab === "feedback" && <FeedbackTab feedbacks={selectedFeedbacks} onOwnerApprove={(feedback) => runMutation(() => reviewPayrollFeedback(feedback.id, "pending_accounting", actor), "Đã duyệt và chuyển phản hồi tới Kế toán C&B")} onResolve={(feedback, action) => { setFeedbackAction({ feedback, action }); setFeedbackNote(""); }} />}
        </main>

        {selectedRun.status === "payslip_confirmation" && hasOpenFeedback && <div className="payroll-page-warning"><AlertTriangle />Cần xử lý hết phản hồi của người lao động trước khi chuyển bước.</div>}
      </div>

      <Modal open={Boolean(editingLine)} onOpenChange={(open) => { if (!open) setEditingLine(null); }} title={`Điều chỉnh lương · ${editingLine?.employeeCode ?? ""}`} description={editingLine ? `${editingLine.employeeName} · ${editingLine.position}` : undefined} size="lg" footer={<><Button onClick={() => setEditingLine(null)}>Hủy</Button><Button variant="primary" disabled={!editValues.reason.trim()} onClick={saveLine}><Check />Lưu điều chỉnh</Button></>}>
        <div className="edit-payroll-form"><div className="form-grid"><label className="form-field"><span>Ngày công</span><input type="number" step="0.5" value={editValues.workDays} onChange={(event) => setEditValues((value) => ({ ...value, workDays: Number(event.target.value) }))} /></label><label className="form-field"><span>Giờ tăng ca</span><input type="number" step="0.5" value={editValues.overtimeHours} onChange={(event) => setEditValues((value) => ({ ...value, overtimeHours: Number(event.target.value) }))} /></label><MoneyField label="Lương theo công" value={editValues.basePay} onChange={(value) => setEditValues((current) => ({ ...current, basePay: value }))} /><MoneyField label="Tiền tăng ca" value={editValues.overtimePay} onChange={(value) => setEditValues((current) => ({ ...current, overtimePay: value }))} /><MoneyField label="Tổng phụ cấp" value={editValues.allowances} onChange={(value) => setEditValues((current) => ({ ...current, allowances: value }))} /><MoneyField label="Tổng khấu trừ" value={editValues.deductions} onChange={(value) => setEditValues((current) => ({ ...current, deductions: value }))} /><label className="form-field form-field-wide"><span>Ghi chú dòng lương</span><textarea rows={2} value={editValues.note} onChange={(event) => setEditValues((value) => ({ ...value, note: event.target.value }))} /></label><label className="form-field form-field-wide"><span>Lý do điều chỉnh <b>*</b></span><textarea rows={3} value={editValues.reason} onChange={(event) => setEditValues((value) => ({ ...value, reason: event.target.value }))} placeholder="Nêu rõ căn cứ điều chỉnh hoặc cấp quản lý phê duyệt…" /></label></div><div className="edit-net-preview"><span>Thực nhận sau điều chỉnh</span><strong>{formatCurrency(editValues.basePay + editValues.overtimePay + editValues.allowances - editValues.deductions)}</strong></div></div>
      </Modal>
      <Modal open={revenueOpen} onOpenChange={setRevenueOpen} title="Cập nhật doanh thu & kiểm tra chênh lệch" description="Hệ thống tính A và B theo Bước 7 của quy trình." size="md" footer={<><Button onClick={() => setRevenueOpen(false)}>Hủy</Button><Button variant="primary" disabled={revenueValue <= 0} onClick={() => { const needsExplanation = recordRevenueCheck(selectedRun.id, revenueValue, actor); refresh(); setRevenueOpen(false); notify(needsExplanation ? "Chênh lệch vượt ngưỡng, cần CDA/GSDA giải trình" : "Chênh lệch trong ngưỡng cho phép", needsExplanation ? "warning" : "success"); }}><BarChart3 />Kiểm tra chênh lệch</Button></>}><div className="revenue-form"><label className="form-field"><span>Doanh thu dự án kỳ này</span><input type="number" min={1} value={revenueValue} onChange={(event) => setRevenueValue(Number(event.target.value))} /></label><div className="formula-note"><strong>Công thức kiểm soát</strong><p>A = Chi phí lương/Doanh thu kỳ này − tỷ lệ kỳ trước</p><p>B = A × Doanh thu kỳ này</p><small>Không yêu cầu giải trình khi −1,5% ≤ A ≤ 1,5% và −10 triệu ≤ B ≤ 10 triệu.</small></div></div></Modal>
      <Modal open={explanationOpen} onOpenChange={setExplanationOpen} title="Giải trình chênh lệch" description="CDA/GSDA nêu nguyên nhân và số tiền chênh lệch để C&B tiếp nhận, lưu hồ sơ." size="md" footer={<><Button onClick={() => setExplanationOpen(false)}>Hủy</Button><Button variant="primary" disabled={!explanation.trim()} onClick={() => { runMutation(() => submitPayrollExplanation(selectedRun.id, explanation.trim(), actor), "Đã lưu giải trình chênh lệch"); setExplanationOpen(false); }}><Send />Gửi giải trình</Button></>}><label className="form-field"><span>Nội dung giải trình <b>*</b></span><textarea rows={6} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label></Modal>
      <Modal open={lockOpen} onOpenChange={setLockOpen} title="Hoàn tất và khóa bảng lương?" description="Thao tác này xác nhận dữ liệu đã hoàn tất đủ quy trình duyệt." size="sm" footer={<><Button onClick={() => setLockOpen(false)}>Hủy</Button><Button variant="primary" onClick={() => { runMutation(() => lockPayrollRun(selectedRun.id, actor), "Đã hoàn tất và khóa bảng lương"); setLockOpen(false); }}><LockKeyhole />Khóa bảng lương</Button></>}><div className="lock-confirm"><LockKeyhole /><div><strong>Không thể chỉnh sửa sau khi khóa</strong><p>Bảng lương được lưu làm cơ sở lập danh sách chi lương.</p></div></div></Modal>
      <Modal open={Boolean(feedbackAction)} onOpenChange={(open) => { if (!open) setFeedbackAction(null); }} title={feedbackAction?.action === "adjusted" ? "Xác nhận đã điều chỉnh" : "Từ chối phản hồi"} description={feedbackAction ? `${feedbackAction.feedback.employeeCode} · ${feedbackAction.feedback.employeeName}` : undefined} size="sm" footer={<><Button onClick={() => setFeedbackAction(null)}>Hủy</Button><Button variant={feedbackAction?.action === "rejected" ? "danger" : "primary"} disabled={!feedbackNote.trim()} onClick={resolveFeedback}>{feedbackAction?.action === "adjusted" ? <Check /> : <XCircle />}{feedbackAction?.action === "adjusted" ? "Hoàn tất xử lý" : "Từ chối phản hồi"}</Button></>}><div className="feedback-resolution"><blockquote>{feedbackAction?.feedback.message}</blockquote><label className="form-field"><span>{feedbackAction?.action === "adjusted" ? "Nội dung đã điều chỉnh" : "Lý do từ chối"} <b>*</b></span><textarea rows={4} value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} /></label></div></Modal>
    </>
  );
}

function OverviewTab({ run, sheet, feedbacks, onNext, onEdit, lines, employees, query, onQueryChange, canViewSensitive }: { run: PayrollRun; sheet: PayrollWorkspace["attendanceSheets"][number] | undefined; feedbacks: PayrollFeedback[]; onNext: () => void; onEdit: (line: PayrollLine) => void; lines: PayrollLine[]; employees: PayrollWorkspace["employees"]; query: string; onQueryChange: (value: string) => void; canViewSensitive: boolean }) {
  const next = getNextAction(run);
  return <div className="payroll-overview-tab payroll-page-tab-panel"><div className="payroll-money-grid"><article><span>Tổng thu nhập</span><strong>{formatCurrency(run.grossPayroll)}</strong><small>Trước khấu trừ</small></article><article><span>Tổng khấu trừ</span><strong>{formatCurrency(run.totalDeductions)}</strong><small>BHXH, thuế và phát sinh</small></article><article className="net"><span>Thực nhận</span><strong>{formatCurrency(run.netPayroll)}</strong><small>{run.employeeCount} người lao động</small></article><article><span>Phiếu lương xác nhận</span><strong>{run.confirmedPayslipCount}/{run.employeeCount}</strong><small>{run.feedbackCount} phản hồi</small></article></div><div className="payroll-overview-layout"><section className="payroll-info-panel"><h3>Nguồn dữ liệu</h3><dl><div><dt>Bảng công</dt><dd>{sheet?.code}</dd></div><div><dt>Nguồn</dt><dd>{sheet ? sourceLabels[sheet.source] : "—"}</dd></div><div><dt>Trạng thái bảng công</dt><dd><Badge tone="success"><CheckCircle2 />Đã duyệt cuối</Badge></dd></div><div><dt>Khởi tạo bởi</dt><dd>{run.createdBy}</dd></div></dl></section><section className="payroll-next-panel"><span className="next-kicker">HÀNH ĐỘNG TIẾP THEO</span><h3>{run.status === "locked" ? "Bảng lương đã hoàn tất" : statusConfig[run.status].label}</h3><p>{run.status === "locked" ? `Khóa bởi ${run.lockedBy} lúc ${formatDate(run.lockedAt)}.` : workflowSteps[Math.min(8, stageForStatus[run.status] - 1)]?.description}</p>{next && <Button variant="primary" onClick={onNext}>{next.icon}{next.label}</Button>}</section></div>{(run.currentRevenue || run.varianceRate !== undefined) && <div className="variance-summary"><div><span>Doanh thu kỳ này</span><strong>{formatCurrency(run.currentRevenue ?? 0)}</strong></div><div><span>Chênh lệch A</span><strong className={Math.abs(run.varianceRate ?? 0) > 1.5 ? "danger" : "success"}>{(run.varianceRate ?? 0).toFixed(2)}%</strong></div><div><span>Quy đổi B</span><strong>{formatCurrency(run.varianceAmount ?? 0)}</strong></div>{run.explanation && <p><b>Giải trình:</b> {run.explanation}</p>}</div>}<PayrollFullTable run={run} lines={lines} employees={employees} locked={run.status === "locked"} query={query} onQueryChange={onQueryChange} onEdit={onEdit} canViewSensitive={canViewSensitive} />{run.status === "payslip_confirmation" && feedbacks.some((item) => !["adjusted", "rejected"].includes(item.status)) && <div className="tab-context-note"><AlertTriangle /><div><strong>Còn phản hồi chưa xử lý</strong><p>Mở tab Phản hồi để chủ dự án duyệt và C&B xác nhận kết quả.</p></div></div>}</div>;
}

function WorkflowTab({ run, audits }: { run: PayrollRun; audits: PayrollWorkspace["auditEvents"] }) {
  return <div className="payroll-workflow-tab payroll-page-tab-panel"><div className="workflow-column">{workflowSteps.map((item) => { const stage = stageForStatus[run.status]; const isDone = item.step < stage || run.status === "locked"; const isActive = item.step === stage; const isSkipped = item.step === 8 && stage > 8 && !run.explanation; return <div className={`workflow-row ${isDone ? "done" : ""} ${isActive ? "active" : ""}`} key={item.step}><div className="workflow-marker">{isDone ? <Check /> : item.step}</div><div className="workflow-copy"><div><span>B{item.step}</span><h3>{item.title}</h3>{isSkipped && <Badge tone="neutral">Không cần giải trình</Badge>}</div><p>{item.description}</p><small><Users />{item.owner}<Clock3 />{item.time}</small></div></div>; })}</div><aside className="audit-panel"><h3><History />Lịch sử xử lý</h3>{audits.length === 0 ? <p>Chưa có hoạt động.</p> : audits.map((event) => <article key={event.id}><span /><div><strong>{event.title}</strong><p>{event.description}</p><small>{event.actor} · {formatDate(event.createdAt)}</small></div></article>)}</aside></div>;
}

function FeedbackTab({ feedbacks, onOwnerApprove, onResolve }: { feedbacks: PayrollFeedback[]; onOwnerApprove: (feedback: PayrollFeedback) => void; onResolve: (feedback: PayrollFeedback, action: "adjusted" | "rejected") => void }) {
  return <section className="payroll-detail-section"><div className="payroll-section-heading"><div><h2>Phản hồi phiếu lương</h2><p>Chủ dự án duyệt nội dung, sau đó Kế toán xác nhận đã điều chỉnh hoặc từ chối.</p></div><Badge tone="neutral">{feedbacks.length} phản hồi</Badge></div><div className="detail-feedback-list payroll-feedback-page-list">{feedbacks.length === 0 ? <div className="payroll-empty compact"><MessageSquareText /><h3>Chưa có phản hồi</h3><p>Phản hồi từ phiếu lương trên ứng dụng NLĐ sẽ hiển thị tại đây.</p></div> : feedbacks.map((feedback) => <article className="detail-feedback-card" key={feedback.id}><UserAvatar name={feedback.employeeName} /><div className="detail-feedback-content"><div><strong>{feedback.employeeName}</strong><Badge tone="neutral">{feedbackCategoryLabels[feedback.category]}</Badge><StatusBadge tone={feedbackConfig[feedback.status].tone}>{feedbackConfig[feedback.status].label}</StatusBadge></div><p>{feedback.message}</p>{(feedback.accountingNote || feedback.rejectionReason) && <small><b>Kết quả xử lý:</b> {feedback.accountingNote || feedback.rejectionReason}</small>}<span>Gửi {formatDate(feedback.submittedAt)}</span></div>{feedback.status === "pending_owner" ? <Button size="sm" variant="primary" onClick={() => onOwnerApprove(feedback)}><UserCheck />CDA/GSDA duyệt</Button> : feedback.status === "pending_accounting" ? <div className="feedback-actions"><Button size="sm" variant="primary" onClick={() => onResolve(feedback, "adjusted")}><Check />Đã điều chỉnh</Button><Button size="sm" onClick={() => onResolve(feedback, "rejected")}><XCircle />Từ chối</Button></div> : null}</article>)}</div></section>;
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="form-field"><span>{label}</span><div className="money-input"><input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} /><em>VNĐ</em></div></label>;
}
