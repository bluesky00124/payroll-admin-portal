"use client";

import {
  Banknote,
  CalendarCheck2,
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
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast, useUserRole } from "@/components/providers";
import { getWorkflowStage, statusConfig } from "@/components/payroll/payroll-config";
import { Badge, Button, Modal, MonthPicker, StatusBadge, TablePaginationFooter } from "@/components/ui";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/utils";
import { usePayrollPeriods, useSyncTimesheet, usePayrollProjects, useApprovedTimesheets } from "@/lib/hooks/use-payroll";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const generationSteps = [
  "Kiểm tra trạng thái bảng công",
  "Đối chiếu Master Data nhân sự",
  "Tổng hợp chế độ lương và bảo hiểm",
  "Tính thu nhập, khấu trừ, thực nhận",
  "Hoàn thiện bảng lương dự án",
];

export function PayrollWorkspacePage() {
  const [filterProject, setFilterProject] = useState("");
  const [monthFilter, setMonthFilter] = useState("2026-07");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [createProjectId, setCreateProjectId] = useState<number | "">("");
  const [createMonthFilter, setCreateMonthFilter] = useState("2026-07");
  const [createSheetId, setCreateSheetId] = useState<number | null>(null);
  
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState(0);
  
  const { notify } = useToast();
  const router = useRouter();

  // Query Projects from real API (phân quyền tự động từ Bearer Token Claims)
  const { data: projectsData, isLoading: isLoadingProjects } = usePayrollProjects();
  const projects = projectsData || [];

  const [year, month] = monthFilter ? monthFilter.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];

  // Load Payroll Periods with backend search
  const { data: periodsData, isLoading: isLoadingPeriods } = usePayrollPeriods({
    month,
    year,
    projectId: filterProject ? Number(filterProject) : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: query.trim() || undefined,
    page,
    pageSize,
  });

  // Approved timesheets for Create Modal
  const [createYear, createMonth] = createMonthFilter ? createMonthFilter.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const { data: approvedTimesheets, isLoading: isLoadingApproved } = useApprovedTimesheets(
    {
      projectId: createProjectId ? Number(createProjectId) : undefined,
      month: createMonth,
      year: createYear,
    },
    createOpen
  );

  const payrolls = periodsData?.data || [];
  const totalPayrolls = periodsData?.total || 0;

  const syncMutation = useSyncTimesheet();

  const handleOpenCreateModal = () => {
    setCreateProjectId(filterProject ? Number(filterProject) : "");
    setCreateMonthFilter(monthFilter || "2026-07");
    setCreateSheetId(null);
    setCreateOpen(true);
  };

  const handleGenerate = async () => {
    if (!createSheetId) return;
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
      
      const res = await syncMutation.mutateAsync({
        projectTimesheetId: createSheetId,
      });

      setGenerationProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setCreateOpen(false);
      notify(`Đã tạo/đồng bộ bảng lương thành công`);
      router.push(`/payroll/${res.payrollPeriodId}`);
    } catch (error: any) {
      notify(error.message || "Không thể tạo bảng lương.", "error");
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStep(0);
    }
  };

  if (isLoadingProjects) return <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải danh mục...</div>;

  return (
    <>
      <div className="payroll-page-title-simple">
        <h1>Bảng lương</h1>
      </div>

      <div className="payroll-header-controls">
        <div className="payroll-header-filters">
          <label className="payroll-filter-control">
            <span className="payroll-control-label">CHỌN DỰ ÁN</span>
            <select
            className="payroll-control-select"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">-- Tất cả dự án --</option>
            {projects.map((project: any) => {
              const pId = project.id ?? project.projectId ?? project.Id ?? project.ProjectId;
              const pCode = project.projectCode ?? project.ProjectCode;
              const pName = project.projectName ?? project.ProjectName;
              return (
                <option value={pId} key={pId}>
                  {pCode} — {pName}
                </option>
              );
            })}
          </select>
          </label>

          <div className="payroll-filter-control">
            <span className="payroll-control-label">THÁNG</span>
            <MonthPicker
              value={monthFilter}
              onChange={setMonthFilter}
              className="payroll-control-month"
              placeholder="Chọn tháng..."
            />
          </div>
        </div>

        <div className="payroll-header-actions">
          <Button
            variant="primary"
            className="payroll-action-btn"
            onClick={handleOpenCreateModal}
          >
            <FileSpreadsheet />
            Tạo bảng lương
          </Button>
        </div>
      </div>

      <section className="content-card payroll-list-card">
        {payrolls.length > 0 && (
          <div className="payroll-filter-bar table-card-toolbar">
            <div className="filter-panel-top">
              <div className="filter-panel-inputs">
                <label className="search-field payroll-search">
                  <Search />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm theo mã bảng lương, mã hoặc tên dự án..."
                    aria-label="Tìm bảng lương"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {isLoadingPeriods ? (
          <div className="payroll-loading"><RefreshCw className="spin" /> Đang tải dữ liệu bảng lương…</div>
        ) : payrolls.length === 0 ? (
          <div className="payroll-empty-sync">
            <div className="payroll-empty-icon-box">
              <Inbox />
            </div>
            <h3>Dữ liệu bảng lương trống</h3>
            <p>Vui lòng chọn dự án và tháng để xem bảng lương.</p>
            <Button variant="primary" onClick={handleOpenCreateModal}>
              <Plus />Tạo bảng lương
            </Button>
          </div>
        ) : (
          <>
            <div className="payroll-table-wrap">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Bảng lương</th>
                    <th>Kỳ lương</th>
                    <th>Thực nhận</th>
                    <th>Tiến độ</th>
                    <th>Cập nhật</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((run) => {
                    // Logic to map status to UI Config
                    const sConf = statusConfig[run.status] || { tone: "neutral", short: run.status };
                    
                    return (
                      <tr key={run.id} onClick={() => router.push(`/payroll/${run.id}`)}>
                        <td>
                          <div className="payroll-code-cell">
                            <span className={run.status === "locked" ? "locked" : ""}>
                              {run.status === "locked" ? <LockKeyhole /> : <FileSpreadsheet />}
                            </span>
                            <div>
                              <strong>{run.periodCode}</strong>
                              <small>{run.projectCode} · {run.projectName}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{run.month}/{run.year}</strong>
                          <small>{run.totalEmployees} NLĐ</small>
                        </td>
                        <td>
                          <strong className="money-value">{formatCurrency(run.totalNet)}</strong>
                        </td>
                        <td>
                          <div className="payroll-progress-cell">
                            <StatusBadge tone={sConf.tone as any}>
                              {sConf.short}
                            </StatusBadge>
                            {run.wfCurrentStepName && (
                              <small className="block mt-1 text-xs text-muted-foreground">
                                {run.wfCurrentStepName}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <span>{formatDate(run.createdAt)}</span>
                          <small>{run.createdByName || "System"}</small>
                        </td>
                        <td>
                          <button
                            className="row-chevron"
                            type="button"
                            aria-label={`Mở ${run.periodCode}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/payroll/${run.id}`);
                            }}
                          >
                            <ChevronRight />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePaginationFooter
              totalItems={totalPayrolls}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </>
        )}
      </section>

      <Modal open={createOpen} onOpenChange={(open) => { if (!generating) setCreateOpen(open); }} title={generating ? "Đang tạo bảng lương" : "Tạo bảng lương mới"} description={generating ? "Hệ thống đang đối chiếu dữ liệu và thực hiện công thức tính." : "Chọn bảng công đã duyệt để đồng bộ dữ liệu vào kỳ lương mới."} size="lg" footer={generating ? undefined : <><Button onClick={() => setCreateOpen(false)}>Hủy</Button><Button variant="primary" disabled={!createSheetId} onClick={handleGenerate}>Tạo bảng lương</Button></>}>
        {generating ? (
          <div className="generation-panel">
            <div className="generation-orbit"><CircleDollarSign /><span>{generationProgress}%</span></div>
            <div className="generation-copy"><strong>{generationSteps[generationStep]}</strong><p>Vui lòng giữ cửa sổ này mở trong khi hệ thống xử lý.</p></div>
            <div className="generation-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={generationProgress}><span style={{ width: `${generationProgress}%` }} /></div>
            <div className="generation-steps">{generationSteps.map((step, index) => <div className={index < generationStep ? "done" : index === generationStep ? "active" : ""} key={step}>{index < generationStep ? <CheckCircle2 /> : <span>{index + 1}</span>}<small>{step}</small></div>)}</div>
          </div>
        ) : (
          <div className="create-payroll-form">
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label className="form-field">
                <span>Chọn dự án</span>
                <select
                  className="payroll-control-select"
                  value={createProjectId}
                  onChange={(e) => {
                    setCreateProjectId(e.target.value ? Number(e.target.value) : "");
                    setCreateSheetId(null);
                  }}
                >
                  <option value="">-- Tất cả dự án --</option>
                  {projects.map((project: any) => {
                    const pId = project.id ?? project.projectId ?? project.Id ?? project.ProjectId;
                    const pCode = project.projectCode ?? project.ProjectCode;
                    const pName = project.projectName ?? project.ProjectName;
                    return (
                      <option value={pId} key={pId}>
                        {pCode} — {pName}
                      </option>
                    );
                  })}
                </select>
              </label>
              <div className="form-field">
                <span>Tháng chốt công</span>
                <MonthPicker
                  value={createMonthFilter}
                  onChange={(m) => {
                    setCreateMonthFilter(m);
                    setCreateSheetId(null);
                  }}
                  className="payroll-control-month"
                  placeholder="Chọn tháng..."
                />
              </div>
            </div>

            <div className="attendance-picker-section mt-2">
              <div className="attendance-picker-heading mb-2">
                <div>
                  <span>DANH SÁCH BẢNG CÔNG ĐÃ CHỐT</span>
                  <small>Chọn một bảng công chưa tạo bảng lương để đồng bộ dữ liệu tính toán.</small>
                </div>
              </div>

              {isLoadingApproved ? (
                <div className="payroll-loading py-6">
                  <RefreshCw className="spin" /> Đang tải danh sách bảng công đã chốt…
                </div>
              ) : !approvedTimesheets || approvedTimesheets.length === 0 ? (
                <div className="attendance-empty">
                  <Inbox />
                  <div>
                    <strong>Không tìm thấy bảng công đã chốt</strong>
                    <p>Dự án này chưa có bảng công nào được phê duyệt trong tháng {createMonth}/{createYear}.</p>
                  </div>
                </div>
              ) : (
                <div className="attendance-picker">
                  {approvedTimesheets.map((ts) => {
                    const isCreated = ts.isCreatedPayroll;
                    const isSelected = createSheetId === ts.projectTimesheetId;

                    return (
                      <label
                        key={ts.projectTimesheetId}
                        className={`${isCreated ? "disabled" : ""} ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          if (!isCreated) setCreateSheetId(ts.projectTimesheetId);
                        }}
                      >
                        <input
                          type="radio"
                          name="approvedTimesheet"
                          checked={isSelected}
                          disabled={isCreated}
                          onChange={() => {
                            if (!isCreated) setCreateSheetId(ts.projectTimesheetId);
                          }}
                        />
                        <span className="attendance-icon">
                          <CalendarCheck2 />
                        </span>
                        <div>
                          <strong>{ts.timesheetCode} — {ts.timesheetName}</strong>
                          <small>{ts.timesheetTypeName || "Bảng công"} · {ts.totalEmployees} NLĐ</small>
                          <em>
                            {ts.approvedByName ? `Duyệt bởi: ${ts.approvedByName}` : ""}
                            {ts.approvedAt ? ` · ${formatDate(ts.approvedAt)}` : ""}
                          </em>
                        </div>
                        <StatusBadge tone={isCreated ? "neutral" : "success"}>
                          {isCreated ? "Đã tạo bảng lương" : "Đã chốt"}
                        </StatusBadge>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
