"use client";

import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileClock,
  FileSpreadsheet,
  History,
  Inbox,
  LockKeyhole,
  MessageSquareText,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast, useUserRole, type UserRole } from "@/components/providers";
import { Badge, Button, Modal, MonthPicker, StatusBadge, UserAvatar } from "@/components/ui";
import {
  createPayrollRun,
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
import type {
  PayrollFeedback,
  PayrollFeedbackStatus,
  PayrollLine,
  PayrollRun,
  PayrollStatus,
} from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

type DetailTab = "overview" | "lines" | "workflow" | "feedback";

const statusConfig: Record<PayrollStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info"; short: string }> = {
  admin_review: { label: "Chờ Admin/BCSX kiểm tra", short: "Admin/BCSX kiểm tra", tone: "warning" },
  project_approval: { label: "Chờ CDA/GSDA xác nhận", short: "CDA/GSDA xác nhận", tone: "info" },
  payslip_confirmation: { label: "NLĐ xác nhận phiếu lương", short: "Xác nhận phiếu lương", tone: "warning" },
  revenue_check: { label: "Chờ cập nhật doanh thu", short: "Kiểm tra doanh thu", tone: "info" },
  explanation_required: { label: "Cần giải trình chênh lệch", short: "Cần giải trình", tone: "danger" },
  ready_to_finalize: { label: "Sẵn sàng hoàn tất", short: "Chờ hoàn tất", tone: "success" },
  locked: { label: "Đã hoàn tất & khóa", short: "Đã khóa", tone: "success" },
};

const feedbackConfig: Record<PayrollFeedbackStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  pending_owner: { label: "Chờ CDA/GSDA duyệt", tone: "warning" },
  pending_accounting: { label: "Chờ C&B xử lý", tone: "info" },
  adjusted: { label: "Đã điều chỉnh", tone: "success" },
  rejected: { label: "Đã từ chối", tone: "danger" },
};

const feedbackCategoryLabels: Record<PayrollFeedback["category"], string> = {
  attendance: "Ngày công",
  overtime: "Tăng ca",
  allowance: "Phụ cấp",
  deduction: "Khấu trừ",
  personal: "Thông tin cá nhân",
  other: "Nội dung khác",
};

const roleActors: Record<UserRole, string> = {
  accountant: "Trần Thu Trang (Kế toán C&B)",
  bcsx: "Bùi Minh Hạnh (BCSX)",
  project_owner: "Nguyễn Thu Hà (CDA)",
  payment_accountant: "Lê Thanh Tâm (Kế toán Thanh toán)",
};

const generationSteps = [
  "Kiểm tra trạng thái bảng công",
  "Đối chiếu Master Data nhân sự",
  "Tổng hợp chế độ lương và bảo hiểm",
  "Tính thu nhập, khấu trừ, thực nhận",
  "Hoàn thiện bảng lương dự án",
];

const workflowSteps = [
  { step: 1, title: "Chốt dữ liệu công", owner: "CDA / GSDA / BCSX", time: "03 ngày", description: "Bảng công được phê duyệt cuối cùng và thông tin nhân sự đã cập nhật." },
  { step: 2, title: "Lập bảng lương", owner: "Kế toán C&B", time: "02 ngày", description: "Đối chiếu Master Data, chế độ lương, bảo hiểm và các quyết định đã duyệt." },
  { step: 3, title: "Kiểm tra bảng lương", owner: "Admin dự án / BCSX", time: "01 ngày", description: "Đối chiếu ngày công, hồ sơ, ATM, MST, tạm giữ, vi phạm và ứng lương." },
  { step: 4, title: "Xác nhận bảng lương", owner: "CDA / GSDA", time: "01 ngày", description: "Kiểm tra và xác nhận dữ liệu trước khi phát hành." },
  { step: 5, title: "Phát hành phiếu lương", owner: "CDA / GSDA / C&B", time: "01 ngày", description: "Phân bổ bảng lương thành phiếu lương riêng cho từng NLĐ." },
  { step: 6, title: "Xác nhận phiếu lương", owner: "Người lao động", time: "01 ngày", description: "NLĐ xác nhận hoặc gửi phản hồi điều chỉnh qua ứng dụng." },
  { step: 7, title: "Cập nhật doanh thu", owner: "Kế toán Thanh toán", time: "01 ngày", description: "Kiểm tra chênh lệch tỷ lệ chi phí lương/doanh thu so với tháng trước." },
  { step: 8, title: "Giải trình chênh lệch", owner: "CDA / GSDA / C&B", time: "01 ngày", description: "Thực hiện khi |A| > 1,5% hoặc |B| > 10 triệu đồng." },
  { step: 9, title: "Hoàn tất & khóa", owner: "Kế toán C&B", time: "Ngày chi lương", description: "Lưu dữ liệu hoàn tất làm cơ sở lập danh sách chi lương." },
];

const stageForStatus: Record<PayrollStatus, number> = {
  admin_review: 3,
  project_approval: 4,
  payslip_confirmation: 6,
  revenue_check: 7,
  explanation_required: 8,
  ready_to_finalize: 9,
  locked: 10,
};

const sourceLabels = { system: "Hệ thống Công ty", excel: "Excel / Scan ký", customer: "Khách hàng xác nhận" } as const;

function getProject(workspace: PayrollWorkspace, projectId: string) {
  return workspace.projects.find((item) => item.id === projectId);
}

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

export function PayrollWorkspacePage() {
  const [workspace, setWorkspace] = useState<PayrollWorkspace | null>(null);
  const [projectFilter, setProjectFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("2026-08");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createProjectId, setCreateProjectId] = useState("prj-jss");
  const [createPeriod, setCreatePeriod] = useState("2026-08");
  const [createSheetId, setCreateSheetId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState(0);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
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
  const actor = roleActors[role];

  const refresh = () => setWorkspace(getPayrollWorkspace());
  useEffect(() => refresh(), []);

  const selectedRun = workspace?.payrollRuns.find((item) => item.id === selectedPayrollId) ?? null;
  const selectedProject = selectedRun && workspace ? getProject(workspace, selectedRun.projectId) : null;
  const selectedSheet = selectedRun && workspace ? workspace.attendanceSheets.find((item) => item.id === selectedRun.attendanceSheetId) : null;
  const selectedLines = selectedRun && workspace ? workspace.payrollLines.filter((item) => item.payrollId === selectedRun.id) : [];
  const selectedFeedbacks = selectedRun && workspace ? workspace.feedbacks.filter((item) => item.payrollId === selectedRun.id) : [];
  const selectedAudits = selectedRun && workspace ? workspace.auditEvents.filter((item) => item.payrollId === selectedRun.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

  const createSheets = useMemo(() => {
    if (!workspace) return [];
    return workspace.attendanceSheets.filter((item) => item.projectId === createProjectId && item.period === createPeriod);
  }, [workspace, createProjectId, createPeriod]);

  useEffect(() => {
    const firstAvailable = createSheets.find((item) => item.status === "approved" && !item.usedByPayrollId);
    setCreateSheetId(firstAvailable?.id ?? "");
  }, [createSheets]);

  const filteredRuns = useMemo(() => {
    if (!workspace) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return workspace.payrollRuns
      .filter((run) => projectFilter === "all" || run.projectId === projectFilter)
      .filter((run) => !monthFilter || run.period === monthFilter)
      .filter((run) => statusFilter === "all" || run.status === statusFilter)
      .filter((run) => {
        const project = getProject(workspace, run.projectId);
        return `${run.code} ${project?.code ?? ""} ${project?.name ?? ""}`.toLocaleLowerCase("vi").includes(normalizedQuery);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [workspace, projectFilter, monthFilter, statusFilter, query]);

  if (!workspace) return <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải dữ liệu bảng lương…</div>;

  const unresolvedFeedbacks = workspace.feedbacks.filter((item) => !["adjusted", "rejected"].includes(item.status)).length;
  const activeRuns = workspace.payrollRuns.filter((item) => item.status !== "locked").length;
  const lockedRuns = workspace.payrollRuns.filter((item) => item.status === "locked").length;
  const awaitingApproval = workspace.payrollRuns.filter((item) => ["admin_review", "project_approval", "explanation_required"].includes(item.status)).length;

  const runMutation = (action: () => void, success: string) => {
    try {
      action();
      refresh();
      notify(success);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể thực hiện thao tác.", "error");
    }
  };

  const handleGenerate = async () => {
    if (!createProjectId || !createPeriod || !createSheetId) return;
    setGenerating(true);
    setGenerationProgress(4);
    try {
      for (let index = 0; index < generationSteps.length; index += 1) {
        setGenerationStep(index);
        const target = (index + 1) * 20;
        for (let progress = index * 20 + 8; progress <= target; progress += 4) {
          await new Promise((resolve) => window.setTimeout(resolve, 90));
          setGenerationProgress(Math.min(progress, 100));
        }
      }
      const created = createPayrollRun({ projectId: createProjectId, period: createPeriod, attendanceSheetId: createSheetId, actor });
      refresh();
      setGenerationProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setCreateOpen(false);
      setSelectedPayrollId(created.id);
      setDetailTab("overview");
      notify(`Đã tạo bảng lương ${created.code}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể tạo bảng lương.", "error");
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStep(0);
    }
  };

  const openLineEditor = (line: PayrollLine) => {
    setEditingLine(line);
    setEditValues({
      workDays: line.workDays,
      overtimeHours: line.overtimeHours,
      basePay: line.basePay,
      overtimePay: line.overtimePay,
      allowances: line.allowances,
      deductions: line.deductions,
      note: line.note ?? "",
      reason: "",
    });
  };

  const saveLine = () => {
    if (!editingLine || !editValues.reason.trim()) return;
    runMutation(() => updatePayrollLine(editingLine.id, {
      workDays: Number(editValues.workDays),
      overtimeHours: Number(editValues.overtimeHours),
      basePay: Number(editValues.basePay),
      overtimePay: Number(editValues.overtimePay),
      allowances: Number(editValues.allowances),
      deductions: Number(editValues.deductions),
      note: editValues.note,
    }, actor, editValues.reason.trim()), "Đã lưu điều chỉnh và ghi nhận lịch sử");
    setEditingLine(null);
  };

  const handleNextAction = (run: PayrollRun) => {
    if (run.status === "admin_review") {
      runMutation(() => transitionPayrollRun(run.id, "project_approval", { type: "approve", title: "Admin/BCSX xác nhận bảng lương", description: "Đã đối chiếu dữ liệu thực tế và chuyển CDA/GSDA xác nhận.", actor }), "Đã chuyển CDA/GSDA xác nhận");
    } else if (run.status === "project_approval") {
      runMutation(() => transitionPayrollRun(run.id, "payslip_confirmation", { type: "publish", title: "CDA/GSDA xác nhận & phát hành phiếu lương", description: `Đã phát hành ${run.employeeCount} phiếu lương tới ứng dụng NLĐ.`, actor }), "Đã phát hành phiếu lương cho NLĐ");
    } else if (run.status === "payslip_confirmation") {
      runMutation(() => syncPayslipConfirmations(run.id, actor), "NLĐ đã xác nhận đủ phiếu lương");
    } else if (run.status === "revenue_check") {
      setRevenueOpen(true);
    } else if (run.status === "explanation_required") {
      setExplanation(run.explanation ?? "");
      setExplanationOpen(true);
    } else if (run.status === "ready_to_finalize") {
      setLockOpen(true);
    }
  };

  const handleOwnerApprove = (feedback: PayrollFeedback) => {
    runMutation(() => reviewPayrollFeedback(feedback.id, "pending_accounting", actor), "Đã duyệt và chuyển phản hồi tới Kế toán C&B");
  };

  const submitFeedbackAction = () => {
    if (!feedbackAction || !feedbackNote.trim()) return;
    runMutation(() => reviewPayrollFeedback(feedbackAction.feedback.id, feedbackAction.action, actor, feedbackNote.trim()), feedbackAction.action === "adjusted" ? "Đã xác nhận điều chỉnh phản hồi" : "Đã từ chối phản hồi");
    setFeedbackAction(null);
    setFeedbackNote("");
  };

  const renderFeedbackActions = (feedback: PayrollFeedback) => {
    if (feedback.status === "pending_owner") {
      return <Button size="sm" variant="primary" onClick={() => handleOwnerApprove(feedback)}><UserCheck />CDA/GSDA duyệt</Button>;
    }
    if (feedback.status === "pending_accounting") {
      return (
        <div className="feedback-actions">
          <Button size="sm" variant="primary" onClick={() => { setFeedbackAction({ feedback, action: "adjusted" }); setFeedbackNote(""); }}><Check />Đã điều chỉnh</Button>
          <Button size="sm" onClick={() => { setFeedbackAction({ feedback, action: "rejected" }); setFeedbackNote(""); }}><XCircle />Từ chối</Button>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="payroll-page-heading">
        <div>
          <div className="eyebrow"><Banknote /> VẬN HÀNH KỲ LƯƠNG</div>
          <h1>Bảng lương</h1>
          <p>Tạo từ bảng công đã chốt, kiểm soát phê duyệt, xử lý phản hồi và khóa dữ liệu theo PKT.QT06.V05.</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus />Tạo bảng lương</Button>
      </div>

      <section className="payroll-stat-grid" aria-label="Tổng quan bảng lương">
        <article><span className="payroll-stat-icon active"><FileClock /></span><div><small>Đang xử lý</small><strong>{activeRuns}</strong><p>Kỳ lương chưa hoàn tất</p></div></article>
        <article><span className="payroll-stat-icon approval"><ShieldCheck /></span><div><small>Chờ phê duyệt</small><strong>{awaitingApproval}</strong><p>Cần hành động theo vai trò</p></div></article>
        <article><span className="payroll-stat-icon feedback"><MessageSquareText /></span><div><small>Phản hồi mở</small><strong>{unresolvedFeedbacks}</strong><p>Từ phiếu lương NLĐ</p></div></article>
        <article><span className="payroll-stat-icon locked"><LockKeyhole /></span><div><small>Đã khóa</small><strong>{lockedRuns}</strong><p>Hoàn tất đủ quy trình</p></div></article>
      </section>

      <section className="content-card payroll-list-card">
          <div className="payroll-filter-bar table-card-toolbar">
            <div className="filter-panel-top">
              <div className="filter-panel-inputs">
                <label className="search-field payroll-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã bảng lương, dự án…" aria-label="Tìm bảng lương" /></label>
                <select className="filter-select payroll-project-filter" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Lọc theo dự án"><option value="all">Tất cả dự án</option>{workspace.projects.filter((item) => item.status === "active").map((project) => <option value={project.id} key={project.id}>{project.code} — {project.name}</option>)}</select>
                <MonthPicker value={monthFilter} onChange={setMonthFilter} className="payroll-period-filter" placeholder="Chọn kỳ lương" />
                <select className="filter-select payroll-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc theo trạng thái"><option value="all">Tất cả trạng thái</option>{Object.entries(statusConfig).map(([value, config]) => <option value={value} key={value}>{config.short}</option>)}</select>
              </div>
            </div>
          </div>
          {filteredRuns.length === 0 ? (
            <div className="payroll-empty"><Inbox /><h3>Chưa có bảng lương phù hợp</h3><p>Thay đổi bộ lọc hoặc tạo bảng lương từ một bảng công đã được duyệt.</p><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus />Tạo bảng lương</Button></div>
          ) : (
            <div className="payroll-table-wrap">
              <table className="payroll-table">
                <thead><tr><th>Bảng lương</th><th>Kỳ lương</th><th>Thực nhận</th><th>Tiến độ</th><th>Phản hồi</th><th>Cập nhật</th><th /></tr></thead>
                <tbody>{filteredRuns.map((run) => {
                  const project = getProject(workspace, run.projectId);
                  const stage = stageForStatus[run.status];
                  const hasUnresolvedFeedback = workspace.feedbacks.some((item) => item.payrollId === run.id && !["adjusted", "rejected"].includes(item.status));
                  return (
                    <tr key={run.id} onClick={() => { setSelectedPayrollId(run.id); setDetailTab("overview"); }}>
                      <td><div className="payroll-code-cell"><span className={run.status === "locked" ? "locked" : ""}>{run.status === "locked" ? <LockKeyhole /> : <FileSpreadsheet />}</span><div><strong>{run.code}</strong><small>{project?.code} · {project?.name}</small></div></div></td>
                      <td><strong>{formatMonthYear(run.period, true)}</strong><small>{run.employeeCount} NLĐ</small></td>
                      <td><strong className="money-value">{formatCurrency(run.netPayroll)}</strong><small>Khấu trừ {formatCurrency(run.totalDeductions)}</small></td>
                      <td><div className="payroll-progress-cell"><div><span style={{ width: `${Math.min(100, ((stage - 1) / 8) * 100)}%` }} /></div><StatusBadge tone={statusConfig[run.status].tone}>{statusConfig[run.status].short}</StatusBadge></div></td>
                      <td>{run.feedbackCount > 0 ? <button type="button" className={`payroll-feedback-trigger ${hasUnresolvedFeedback ? "warning" : "success"}`} aria-label={`Mở ${run.feedbackCount} phản hồi của ${run.code}`} onClick={(event) => { event.stopPropagation(); setSelectedPayrollId(run.id); setDetailTab("feedback"); }}><MessageSquareText /><span>{run.feedbackCount}</span></button> : <span className="muted-dash">—</span>}</td>
                      <td><span>{formatDate(run.updatedAt)}</span><small>{run.createdBy.split(" (")[0]}</small></td>
                      <td><button className="row-chevron" type="button" aria-label={`Mở ${run.code}`}><ChevronRight /></button></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
      </section>

      <Modal open={createOpen} onOpenChange={(open) => { if (!generating) setCreateOpen(open); }} title={generating ? "Đang tạo bảng lương" : "Tạo bảng lương mới"} description={generating ? "Hệ thống đang đối chiếu dữ liệu và thực hiện công thức tính." : "Chỉ bảng công đã duyệt cuối cùng và chưa dùng để tính lương mới được chọn."} size="lg" footer={generating ? undefined : <><Button onClick={() => setCreateOpen(false)}>Hủy</Button><Button variant="primary" disabled={!createSheetId} onClick={handleGenerate}>Tạo bảng lương</Button></>}>
        {generating ? (
          <div className="generation-panel">
            <div className="generation-orbit"><CircleDollarSign /><span>{generationProgress}%</span></div>
            <div className="generation-copy"><strong>{generationSteps[generationStep]}</strong><p>Vui lòng giữ cửa sổ này mở trong khi hệ thống xử lý.</p></div>
            <div className="generation-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={generationProgress}><span style={{ width: `${generationProgress}%` }} /></div>
            <div className="generation-steps">{generationSteps.map((step, index) => <div className={index < generationStep ? "done" : index === generationStep ? "active" : ""} key={step}>{index < generationStep ? <CheckCircle2 /> : <span>{index + 1}</span>}<small>{step}</small></div>)}</div>
          </div>
        ) : (
          <div className="create-payroll-form">
            <div className="form-grid">
              <label className="form-field"><span>1. Chọn dự án</span><select value={createProjectId} onChange={(event) => setCreateProjectId(event.target.value)}>{workspace.projects.filter((item) => item.status === "active").map((project) => <option value={project.id} key={project.id}>{project.code} — {project.name}</option>)}</select></label>
              <div className="form-field">
                <span>2. Chọn tháng cần xuất</span>
                <MonthPicker value={createPeriod} onChange={setCreatePeriod} variant="form" placeholder="Chọn tháng..." />
              </div>
            </div>
            <div className="attendance-picker-heading"><div><span>3. Chọn bảng công đã chốt</span><small>{createSheets.length} bảng công trong kỳ</small></div><Badge tone="info"><ShieldCheck />Điều kiện tạo lương</Badge></div>
            <div className="attendance-picker">
              {createSheets.length === 0 ? <div className="attendance-empty"><CalendarDays /><div><strong>Chưa có bảng công trong kỳ</strong><p>Hãy chọn dự án hoặc kỳ lương khác.</p></div></div> : createSheets.map((sheet) => {
                const disabled = sheet.status !== "approved" || Boolean(sheet.usedByPayrollId);
                return (
                  <label className={`${disabled ? "disabled" : ""} ${createSheetId === sheet.id ? "selected" : ""}`} key={sheet.id}>
                    <input type="radio" name="attendance-sheet" checked={createSheetId === sheet.id} disabled={disabled} onChange={() => setCreateSheetId(sheet.id)} />
                    <span className="attendance-icon"><FileSpreadsheet /></span>
                    <div><strong>{sheet.name}</strong><small>{sheet.code} · {sourceLabels[sheet.source]} · {sheet.employeeCount} NLĐ</small>{sheet.approvedAt && <em>Duyệt {formatDate(sheet.approvedAt)} bởi {sheet.approvedBy}</em>}</div>
                    {sheet.usedByPayrollId ? <Badge tone="neutral"><LockKeyhole />Đã tạo bảng lương</Badge> : sheet.status === "approved" ? <Badge tone="success"><CheckCircle2 />Đã chốt</Badge> : <Badge tone="warning"><Clock3 />Chờ duyệt</Badge>}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(selectedRun)} onOpenChange={(open) => { if (!open) setSelectedPayrollId(null); }} title={selectedRun?.code ?? "Chi tiết bảng lương"} description={selectedRun && selectedProject ? `${selectedProject.code} · ${selectedProject.name} · ${formatMonthYear(selectedRun.period, true)}` : undefined} size="xl">
        {selectedRun && selectedProject && (
          <div className="payroll-detail">
            <div className="payroll-detail-topline">
              <StatusBadge tone={statusConfig[selectedRun.status].tone}>{selectedRun.status === "locked" && <LockKeyhole />}{statusConfig[selectedRun.status].label}</StatusBadge>
              <span>Cập nhật {formatDate(selectedRun.updatedAt)}</span>
            </div>
            <div className="payroll-detail-tabs" role="tablist">
              {([['overview', 'Tổng quan'], ['lines', 'Chi tiết lương'], ['workflow', 'Quy trình duyệt'], ['feedback', `Phản hồi (${selectedFeedbacks.length})`]] as Array<[DetailTab, string]>).map(([value, label]) => <button type="button" className={detailTab === value ? "active" : ""} onClick={() => setDetailTab(value)} key={value}>{label}</button>)}
            </div>

            {detailTab === "overview" && (
              <div className="payroll-overview-tab">
                <div className="payroll-money-grid">
                  <article><span>Tổng thu nhập</span><strong>{formatCurrency(selectedRun.grossPayroll)}</strong><small>Trước khấu trừ</small></article>
                  <article><span>Tổng khấu trừ</span><strong>{formatCurrency(selectedRun.totalDeductions)}</strong><small>BHXH, thuế và phát sinh</small></article>
                  <article className="net"><span>Thực nhận</span><strong>{formatCurrency(selectedRun.netPayroll)}</strong><small>{selectedRun.employeeCount} người lao động</small></article>
                  <article><span>Phiếu lương xác nhận</span><strong>{selectedRun.confirmedPayslipCount}/{selectedRun.employeeCount}</strong><small>{selectedRun.feedbackCount} phản hồi</small></article>
                </div>
                <div className="payroll-overview-layout">
                  <section className="payroll-info-panel">
                    <h3>Nguồn dữ liệu</h3>
                    <dl><div><dt>Bảng công</dt><dd>{selectedSheet?.code}</dd></div><div><dt>Nguồn</dt><dd>{selectedSheet ? sourceLabels[selectedSheet.source] : "—"}</dd></div><div><dt>Trạng thái bảng công</dt><dd><Badge tone="success"><CheckCircle2 />Đã duyệt cuối</Badge></dd></div><div><dt>Khởi tạo bởi</dt><dd>{selectedRun.createdBy}</dd></div></dl>
                  </section>
                  <section className="payroll-next-panel">
                    <span className="next-kicker">HÀNH ĐỘNG TIẾP THEO</span>
                    <h3>{selectedRun.status === "locked" ? "Bảng lương đã hoàn tất" : statusConfig[selectedRun.status].label}</h3>
                    <p>{selectedRun.status === "locked" ? `Khóa bởi ${selectedRun.lockedBy} lúc ${formatDate(selectedRun.lockedAt)}.` : workflowSteps[Math.min(8, stageForStatus[selectedRun.status] - 1)]?.description}</p>
                    {getNextAction(selectedRun) && <Button variant="primary" onClick={() => handleNextAction(selectedRun)}>{getNextAction(selectedRun)?.icon}{getNextAction(selectedRun)?.label}</Button>}
                    {selectedRun.status === "payslip_confirmation" && selectedFeedbacks.some((item) => !["adjusted", "rejected"].includes(item.status)) && <small className="next-warning"><AlertTriangle />Cần xử lý hết phản hồi trước khi chuyển bước.</small>}
                  </section>
                </div>
                {(selectedRun.currentRevenue || selectedRun.varianceRate !== undefined) && <div className="variance-summary"><div><span>Doanh thu kỳ này</span><strong>{formatCurrency(selectedRun.currentRevenue ?? 0)}</strong></div><div><span>Chênh lệch A</span><strong className={Math.abs(selectedRun.varianceRate ?? 0) > 1.5 ? "danger" : "success"}>{(selectedRun.varianceRate ?? 0).toFixed(2)}%</strong></div><div><span>Quy đổi B</span><strong className={Math.abs(selectedRun.varianceAmount ?? 0) > 10_000_000 ? "danger" : "success"}>{formatCurrency(selectedRun.varianceAmount ?? 0)}</strong></div>{selectedRun.explanation && <p><b>Giải trình:</b> {selectedRun.explanation}</p>}</div>}
              </div>
            )}

            {detailTab === "lines" && (
              <div className="payroll-lines-tab">
                <div className="tab-context-note"><PencilLine /><div><strong>Cho phép chỉnh sửa trước khi khóa</strong><p>Mọi thay đổi phải có lý do. Điều chỉnh ngoài chế độ đã duyệt cần kèm phê duyệt của cấp quản lý theo quy định.</p></div></div>
                <div className="payroll-table-wrap"><table className="payroll-table payroll-lines-table"><thead><tr><th>Người lao động</th><th>Ngày công</th><th>OT</th><th>Lương công</th><th>Tăng ca</th><th>Phụ cấp</th><th>Khấu trừ</th><th>Thực nhận</th><th /></tr></thead><tbody>{selectedLines.map((line) => <tr key={line.id}><td><div className="line-employee"><UserAvatar name={line.employeeName} size="sm" /><div><strong>{line.employeeName}</strong><small>{line.employeeCode} · {line.position}</small></div></div></td><td>{line.workDays}</td><td>{line.overtimeHours}h</td><td>{formatCurrency(line.basePay)}</td><td>{formatCurrency(line.overtimePay)}</td><td>{formatCurrency(line.allowances)}</td><td className="deduction-value">−{formatCurrency(line.deductions)}</td><td><strong className="money-value">{formatCurrency(line.netPay)}</strong></td><td><Button variant="ghost" size="icon" disabled={selectedRun.status === "locked"} aria-label={`Sửa lương ${line.employeeName}`} onClick={() => openLineEditor(line)}><PencilLine /></Button></td></tr>)}</tbody></table></div>
              </div>
            )}

            {detailTab === "workflow" && (
              <div className="payroll-workflow-tab">
                <div className="workflow-column">{workflowSteps.map((item) => {
                  const stage = stageForStatus[selectedRun.status];
                  const isDone = item.step < stage || selectedRun.status === "locked";
                  const isActive = item.step === stage;
                  const isSkipped = item.step === 8 && stage > 8 && !selectedRun.explanation;
                  return <div className={`workflow-row ${isDone ? "done" : ""} ${isActive ? "active" : ""}`} key={item.step}><div className="workflow-marker">{isDone ? <Check /> : item.step}</div><div className="workflow-copy"><div><span>B{item.step}</span><h3>{item.title}</h3>{isSkipped && <Badge tone="neutral">Không cần giải trình</Badge>}</div><p>{item.description}</p><small><Users />{item.owner}<Clock3 />{item.time}</small></div></div>;
                })}</div>
                <aside className="audit-panel"><h3><History />Lịch sử xử lý</h3>{selectedAudits.length === 0 ? <p>Chưa có hoạt động.</p> : selectedAudits.map((event) => <article key={event.id}><span /><div><strong>{event.title}</strong><p>{event.description}</p><small>{event.actor} · {formatDate(event.createdAt)}</small></div></article>)}</aside>
              </div>
            )}

            {detailTab === "feedback" && (
              <div className="detail-feedback-list">
                {selectedFeedbacks.length === 0 ? <div className="payroll-empty compact"><MessageSquareText /><h3>Chưa có phản hồi</h3><p>Phản hồi từ phiếu lương trên ứng dụng NLĐ sẽ hiển thị tại đây.</p></div> : selectedFeedbacks.map((feedback) => <article className="detail-feedback-card" key={feedback.id}><UserAvatar name={feedback.employeeName} /><div className="detail-feedback-content"><div><strong>{feedback.employeeName}</strong><Badge tone="neutral">{feedbackCategoryLabels[feedback.category]}</Badge><StatusBadge tone={feedbackConfig[feedback.status].tone}>{feedbackConfig[feedback.status].label}</StatusBadge></div><p>{feedback.message}</p>{(feedback.accountingNote || feedback.rejectionReason) && <small><b>Kết quả xử lý:</b> {feedback.accountingNote || feedback.rejectionReason}</small>}<span>Gửi {formatDate(feedback.submittedAt)}</span></div>{renderFeedbackActions(feedback)}</article>)}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(editingLine)} onOpenChange={(open) => { if (!open) setEditingLine(null); }} title={`Điều chỉnh lương · ${editingLine?.employeeCode ?? ""}`} description={editingLine ? `${editingLine.employeeName} · ${editingLine.position}` : undefined} size="lg" footer={<><Button onClick={() => setEditingLine(null)}>Hủy</Button><Button variant="primary" disabled={!editValues.reason.trim()} onClick={saveLine}><Check />Lưu điều chỉnh</Button></>}>
        <div className="edit-payroll-form"><div className="form-grid"><label className="form-field"><span>Ngày công</span><input type="number" step="0.5" value={editValues.workDays} onChange={(event) => setEditValues((value) => ({ ...value, workDays: Number(event.target.value) }))} /></label><label className="form-field"><span>Giờ tăng ca</span><input type="number" step="0.5" value={editValues.overtimeHours} onChange={(event) => setEditValues((value) => ({ ...value, overtimeHours: Number(event.target.value) }))} /></label><MoneyField label="Lương theo công" value={editValues.basePay} onChange={(value) => setEditValues((current) => ({ ...current, basePay: value }))} /><MoneyField label="Tiền tăng ca" value={editValues.overtimePay} onChange={(value) => setEditValues((current) => ({ ...current, overtimePay: value }))} /><MoneyField label="Tổng phụ cấp" value={editValues.allowances} onChange={(value) => setEditValues((current) => ({ ...current, allowances: value }))} /><MoneyField label="Tổng khấu trừ" value={editValues.deductions} onChange={(value) => setEditValues((current) => ({ ...current, deductions: value }))} /><label className="form-field form-field-wide"><span>Ghi chú dòng lương</span><textarea rows={2} value={editValues.note} onChange={(event) => setEditValues((value) => ({ ...value, note: event.target.value }))} placeholder="Ghi chú hiển thị trong lịch sử dòng lương…" /></label><label className="form-field form-field-wide"><span>Lý do điều chỉnh <b>*</b></span><textarea rows={3} value={editValues.reason} onChange={(event) => setEditValues((value) => ({ ...value, reason: event.target.value }))} placeholder="Nêu rõ căn cứ điều chỉnh, bộ phận xác nhận hoặc quyết định phê duyệt…" /></label></div><div className="edit-net-preview"><span>Thực nhận sau điều chỉnh</span><strong>{formatCurrency(editValues.basePay + editValues.overtimePay + editValues.allowances - editValues.deductions)}</strong></div></div>
      </Modal>

      <Modal open={revenueOpen} onOpenChange={setRevenueOpen} title="Cập nhật doanh thu & kiểm tra chênh lệch" description="Hệ thống tính A và B theo Bước 7 của quy trình." size="md" footer={<><Button onClick={() => setRevenueOpen(false)}>Hủy</Button><Button variant="primary" disabled={revenueValue <= 0 || !selectedRun} onClick={() => { if (!selectedRun) return; const needsExplanation = recordRevenueCheck(selectedRun.id, revenueValue, actor); refresh(); setRevenueOpen(false); notify(needsExplanation ? "Chênh lệch vượt ngưỡng, cần CDA/GSDA giải trình" : "Chênh lệch trong ngưỡng cho phép", needsExplanation ? "warning" : "success"); }}><BarChart3 />Kiểm tra chênh lệch</Button></>}>
        <div className="revenue-form"><label className="form-field"><span>Doanh thu dự án kỳ này</span><input type="number" min={1} value={revenueValue} onChange={(event) => setRevenueValue(Number(event.target.value))} /></label><div className="formula-note"><strong>Công thức kiểm soát</strong><p>A = Chi phí lương/Doanh thu kỳ này − tỷ lệ kỳ trước</p><p>B = A × Doanh thu kỳ này</p><small>Không yêu cầu giải trình khi đồng thời −1,5% ≤ A ≤ 1,5% và −10 triệu ≤ B ≤ 10 triệu.</small></div></div>
      </Modal>

      <Modal open={explanationOpen} onOpenChange={setExplanationOpen} title="Giải trình chênh lệch" description="CDA/GSDA nêu nguyên nhân và số tiền chênh lệch để C&B tiếp nhận, lưu hồ sơ." size="md" footer={<><Button onClick={() => setExplanationOpen(false)}>Hủy</Button><Button variant="primary" disabled={!explanation.trim() || !selectedRun} onClick={() => { if (!selectedRun) return; runMutation(() => submitPayrollExplanation(selectedRun.id, explanation.trim(), actor), "Đã lưu giải trình chênh lệch"); setExplanationOpen(false); }}><Send />Gửi giải trình</Button></>}><label className="form-field"><span>Nội dung giải trình <b>*</b></span><textarea rows={6} value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Ví dụ: tăng ca theo đơn hàng phát sinh, tăng số lượng NLĐ, doanh thu chưa ghi nhận đủ trong kỳ…" /></label></Modal>

      <Modal open={lockOpen} onOpenChange={setLockOpen} title="Hoàn tất và khóa bảng lương?" description="Thao tác này xác nhận dữ liệu đã hoàn tất đủ quy trình duyệt." size="sm" footer={<><Button onClick={() => setLockOpen(false)}>Hủy</Button><Button variant="primary" disabled={!selectedRun} onClick={() => { if (!selectedRun) return; runMutation(() => lockPayrollRun(selectedRun.id, actor), "Đã hoàn tất và khóa bảng lương"); setLockOpen(false); }}><LockKeyhole />Khóa bảng lương</Button></>}><div className="lock-confirm"><LockKeyhole /><div><strong>Không thể chỉnh sửa sau khi khóa</strong><p>Bảng lương được lưu làm cơ sở lập danh sách chuyển khoản/tiền mặt và thực hiện công đoạn chi lương.</p></div></div></Modal>

      <Modal open={Boolean(feedbackAction)} onOpenChange={(open) => { if (!open) setFeedbackAction(null); }} title={feedbackAction?.action === "adjusted" ? "Xác nhận đã điều chỉnh" : "Từ chối phản hồi"} description={feedbackAction ? `${feedbackAction.feedback.employeeCode} · ${feedbackAction.feedback.employeeName}` : undefined} size="sm" footer={<><Button onClick={() => setFeedbackAction(null)}>Hủy</Button><Button variant={feedbackAction?.action === "rejected" ? "danger" : "primary"} disabled={!feedbackNote.trim()} onClick={submitFeedbackAction}>{feedbackAction?.action === "adjusted" ? <Check /> : <XCircle />}{feedbackAction?.action === "adjusted" ? "Hoàn tất xử lý" : "Từ chối phản hồi"}</Button></>}><div className="feedback-resolution"><blockquote>{feedbackAction?.feedback.message}</blockquote><label className="form-field"><span>{feedbackAction?.action === "adjusted" ? "Nội dung đã điều chỉnh" : "Lý do từ chối"} <b>*</b></span><textarea rows={4} value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} placeholder={feedbackAction?.action === "adjusted" ? "Nêu rõ thông tin đã cập nhật trên bảng lương…" : "Nêu rõ căn cứ không chấp nhận yêu cầu…"} /></label></div></Modal>
    </>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="form-field"><span>{label}</span><div className="money-input"><input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} /><em>VNĐ</em></div></label>;
}
