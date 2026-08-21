"use client";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileClock,
  FileSpreadsheet,
  Inbox,
  LockKeyhole,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast, useUserRole } from "@/components/providers";
import { getWorkflowStage, roleActors, sourceLabels, statusConfig } from "@/components/payroll/payroll-config";
import { Badge, Button, Modal, MonthPicker, StatusBadge, TablePaginationFooter } from "@/components/ui";
import { createPayrollRun, getPayrollWorkspace, type PayrollWorkspace } from "@/lib/payroll-store";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";

const generationSteps = [
  "Kiểm tra trạng thái bảng công",
  "Đối chiếu Master Data nhân sự",
  "Tổng hợp chế độ lương và bảo hiểm",
  "Tính thu nhập, khấu trừ, thực nhận",
  "Hoàn thiện bảng lương dự án",
];

function getProject(workspace: PayrollWorkspace, projectId: string) {
  return workspace.projects.find((item) => item.id === projectId);
}

export function PayrollWorkspacePage() {
  const [workspace, setWorkspace] = useState<PayrollWorkspace | null>(null);
  const [projectFilter, setProjectFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("2026-08");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [createProjectId, setCreateProjectId] = useState("prj-jss");
  const [createPeriod, setCreatePeriod] = useState("2026-08");
  const [createSheetId, setCreateSheetId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState(0);
  const { role } = useUserRole();
  const { notify } = useToast();
  const router = useRouter();
  const actor = roleActors[role];

  const refresh = () => setWorkspace(getPayrollWorkspace());
  useEffect(() => refresh(), []);

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

  useEffect(() => setPage(1), [projectFilter, monthFilter, statusFilter, query]);
  const paginatedRuns = useMemo(() => filteredRuns.slice((page - 1) * pageSize, page * pageSize), [filteredRuns, page, pageSize]);

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
      notify(`Đã tạo bảng lương ${created.code}`);
      router.push(`/payroll/${created.id}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể tạo bảng lương.", "error");
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStep(0);
    }
  };

  if (!workspace) return <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải dữ liệu bảng lương…</div>;

  const unresolvedFeedbacks = workspace.feedbacks.filter((item) => !["adjusted", "rejected"].includes(item.status)).length;
  const activeRuns = workspace.payrollRuns.filter((item) => item.status !== "locked").length;
  const lockedRuns = workspace.payrollRuns.filter((item) => item.status === "locked").length;
  const awaitingApproval = workspace.payrollRuns.filter((item) => ["admin_review", "correction_required", "project_approval", "explanation_required"].includes(item.status)).length;

  return (
    <>
      <div className="payroll-page-heading">
        <div><div className="eyebrow"><Banknote /> VẬN HÀNH KỲ LƯƠNG</div><h1>Bảng lương</h1><p>Tạo từ bảng công đã chốt, duyệt theo quy trình và khóa sau khi hoàn tất.</p></div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}><Plus />Tạo bảng lương</Button>
      </div>

      <section className="payroll-stat-grid" aria-label="Tổng quan bảng lương">
        <article><span className="payroll-stat-icon active"><FileClock /></span><div><small>Đang xử lý</small><strong>{activeRuns}</strong><p>Kỳ lương chưa hoàn tất</p></div></article>
        <article><span className="payroll-stat-icon approval"><ShieldCheck /></span><div><small>Chờ phê duyệt</small><strong>{awaitingApproval}</strong><p>Cần hành động theo vai trò</p></div></article>
        <article><span className="payroll-stat-icon feedback"><MessageSquareText /></span><div><small>Phản hồi mở</small><strong>{unresolvedFeedbacks}</strong><p>Từ phiếu lương NLĐ</p></div></article>
        <article><span className="payroll-stat-icon locked"><LockKeyhole /></span><div><small>Đã khóa</small><strong>{lockedRuns}</strong><p>Hoàn tất đủ quy trình</p></div></article>
      </section>

      <section className="content-card payroll-list-card">
        <div className="payroll-filter-bar table-card-toolbar"><div className="filter-panel-top"><div className="filter-panel-inputs">
          <label className="search-field payroll-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã bảng lương, dự án…" aria-label="Tìm bảng lương" /></label>
          <select className="filter-select payroll-project-filter" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Lọc theo dự án"><option value="all">Tất cả dự án</option>{workspace.projects.filter((item) => item.status === "active").map((project) => <option value={project.id} key={project.id}>{project.code} — {project.name}</option>)}</select>
          <MonthPicker value={monthFilter} onChange={setMonthFilter} className="payroll-period-filter" placeholder="Chọn kỳ lương" />
          <select className="filter-select payroll-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc theo trạng thái"><option value="all">Tất cả trạng thái</option>{Object.entries(statusConfig).map(([value, config]) => <option value={value} key={value}>{config.short}</option>)}</select>
        </div></div></div>
        {filteredRuns.length === 0 ? <div className="payroll-empty"><Inbox /><h3>Chưa có bảng lương phù hợp</h3><p>Thay đổi bộ lọc hoặc tạo bảng lương từ một bảng công đã được duyệt.</p><Button variant="primary" onClick={() => setCreateOpen(true)}><Plus />Tạo bảng lương</Button></div> : <><div className="payroll-table-wrap"><table className="payroll-table"><thead><tr><th>Bảng lương</th><th>Kỳ lương</th><th>Thực nhận</th><th>Tiến độ</th><th>Phản hồi</th><th>Cập nhật</th><th /></tr></thead><tbody>{paginatedRuns.map((run) => {
          const project = getProject(workspace, run.projectId);
          const stage = getWorkflowStage(run);
          const hasUnresolvedFeedback = workspace.feedbacks.some((item) => item.payrollId === run.id && !["adjusted", "rejected"].includes(item.status));
          return <tr key={run.id} onClick={() => router.push(`/payroll/${run.id}`)}><td><div className="payroll-code-cell"><span className={run.status === "locked" ? "locked" : ""}>{run.status === "locked" ? <LockKeyhole /> : <FileSpreadsheet />}</span><div><strong>{run.code}</strong><small>{project?.code} · {project?.name}</small></div></div></td><td><strong>{formatMonthYear(run.period, true)}</strong><small>{run.employeeCount} NLĐ</small></td><td><strong className="money-value">{formatCurrency(run.netPayroll)}</strong><small>Khấu trừ {formatCurrency(run.totalDeductions)}</small></td><td><div className="payroll-progress-cell"><div><span style={{ width: `${Math.min(100, ((stage - 1) / 8) * 100)}%` }} /></div><StatusBadge tone={statusConfig[run.status].tone}>{statusConfig[run.status].short}</StatusBadge></div></td><td>{run.feedbackCount > 0 ? <button type="button" className={`payroll-feedback-trigger ${hasUnresolvedFeedback ? "warning" : "success"}`} aria-label={`Mở ${run.feedbackCount} phản hồi của ${run.code}`} onClick={(event) => { event.stopPropagation(); router.push(`/payroll/${run.id}?tab=feedback`); }}><MessageSquareText /><span>{run.feedbackCount}</span></button> : <span className="muted-dash">—</span>}</td><td><span>{formatDate(run.updatedAt)}</span><small>{run.createdBy.split(" (")[0]}</small></td><td><button className="row-chevron" type="button" aria-label={`Mở ${run.code}`} onClick={(event) => { event.stopPropagation(); router.push(`/payroll/${run.id}`); }}><ChevronRight /></button></td></tr>;
        })}</tbody></table></div><TablePaginationFooter totalItems={filteredRuns.length} currentPage={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }} /></>}
      </section>

      <Modal open={createOpen} onOpenChange={(open) => { if (!generating) setCreateOpen(open); }} title={generating ? "Đang tạo bảng lương" : "Tạo bảng lương mới"} description={generating ? "Hệ thống đang đối chiếu dữ liệu và thực hiện công thức tính." : "Chỉ bảng công đã duyệt cuối cùng và chưa dùng để tính lương mới được chọn."} size="lg" footer={generating ? undefined : <><Button onClick={() => setCreateOpen(false)}>Hủy</Button><Button variant="primary" disabled={!createSheetId} onClick={handleGenerate}>Tạo bảng lương</Button></>}>
        {generating ? <div className="generation-panel"><div className="generation-orbit"><CircleDollarSign /><span>{generationProgress}%</span></div><div className="generation-copy"><strong>{generationSteps[generationStep]}</strong><p>Vui lòng giữ cửa sổ này mở trong khi hệ thống xử lý.</p></div><div className="generation-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={generationProgress}><span style={{ width: `${generationProgress}%` }} /></div><div className="generation-steps">{generationSteps.map((step, index) => <div className={index < generationStep ? "done" : index === generationStep ? "active" : ""} key={step}>{index < generationStep ? <CheckCircle2 /> : <span>{index + 1}</span>}<small>{step}</small></div>)}</div></div> : <div className="create-payroll-form"><div className="form-grid"><label className="form-field"><span>1. Chọn dự án</span><select value={createProjectId} onChange={(event) => setCreateProjectId(event.target.value)}>{workspace.projects.filter((item) => item.status === "active").map((project) => <option value={project.id} key={project.id}>{project.code} — {project.name}</option>)}</select></label><div className="form-field"><span>2. Chọn tháng</span><MonthPicker value={createPeriod} onChange={setCreatePeriod} variant="form" placeholder="Chọn tháng..." /></div></div><div className="attendance-picker-heading"><div><span>3. Chọn bảng công đã chốt</span><small>{createSheets.length} bảng công trong kỳ</small></div><Badge tone="info"><ShieldCheck />Điều kiện tạo lương</Badge></div><div className="attendance-picker">{createSheets.length === 0 ? <div className="attendance-empty"><CalendarDays /><div><strong>Chưa có bảng công trong kỳ</strong><p>Hãy chọn dự án hoặc kỳ lương khác.</p></div></div> : createSheets.map((sheet) => { const disabled = sheet.status !== "approved" || Boolean(sheet.usedByPayrollId); return <label className={`${disabled ? "disabled" : ""} ${createSheetId === sheet.id ? "selected" : ""}`} key={sheet.id}><input type="radio" name="attendance-sheet" checked={createSheetId === sheet.id} disabled={disabled} onChange={() => setCreateSheetId(sheet.id)} /><span className="attendance-icon"><FileSpreadsheet /></span><div><strong>{sheet.name}</strong><small>{sheet.code} · {sourceLabels[sheet.source]} · {sheet.employeeCount} NLĐ</small>{sheet.approvedAt && <em>Duyệt {formatDate(sheet.approvedAt)} bởi {sheet.approvedBy}</em>}</div>{sheet.usedByPayrollId ? <Badge tone="neutral"><LockKeyhole />Đã tạo bảng lương</Badge> : sheet.status === "approved" ? <Badge tone="success"><CheckCircle2 />Đã chốt</Badge> : <Badge tone="warning"><Clock3 />Chờ duyệt</Badge>}</label>; })}</div></div>}
      </Modal>
    </>
  );
}
