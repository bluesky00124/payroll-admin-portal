import { mutateMockDatabase, readMockDatabase } from "@/lib/mock-db";
import type {
  MockDatabase,
  PayrollAuditEvent,
  PayrollFeedbackStatus,
  PayrollLine,
  PayrollRun,
  PayrollStatus,
} from "@/lib/types";
import { uid } from "@/lib/utils";

export interface CreatePayrollInput {
  projectId: string;
  period: string;
  attendanceSheetId: string;
  actor: string;
}

export interface PayrollWorkspace {
  projects: MockDatabase["projects"];
  attendanceSheets: MockDatabase["payrollAttendanceSheets"];
  payrollRuns: MockDatabase["payrollRuns"];
  payrollLines: MockDatabase["payrollLines"];
  feedbacks: MockDatabase["payrollFeedbacks"];
  auditEvents: MockDatabase["payrollAuditEvents"];
}

const now = () => new Date().toISOString();

const addAudit = (
  database: MockDatabase,
  payrollId: string,
  event: Omit<PayrollAuditEvent, "id" | "payrollId" | "createdAt">,
) => {
  database.payrollAuditEvents.push({
    ...event,
    id: uid("pay-audit"),
    payrollId,
    createdAt: now(),
  });
};

const updateTotals = (database: MockDatabase, payrollId: string) => {
  const run = database.payrollRuns.find((item) => item.id === payrollId);
  if (!run) return;
  const lines = database.payrollLines.filter((item) => item.payrollId === payrollId);
  run.grossPayroll = lines.reduce((total, item) => total + item.basePay + item.overtimePay + item.allowances, 0);
  run.totalDeductions = lines.reduce((total, item) => total + item.deductions, 0);
  run.netPayroll = lines.reduce((total, item) => total + item.netPay, 0);
  run.feedbackCount = database.payrollFeedbacks.filter((item) => item.payrollId === payrollId).length;
  run.updatedAt = now();
};

export function getPayrollWorkspace(): PayrollWorkspace {
  const database = readMockDatabase();
  return {
    projects: database.projects,
    attendanceSheets: database.payrollAttendanceSheets,
    payrollRuns: database.payrollRuns,
    payrollLines: database.payrollLines,
    feedbacks: database.payrollFeedbacks,
    auditEvents: database.payrollAuditEvents,
  };
}

export function createPayrollRun(input: CreatePayrollInput): PayrollRun {
  let created: PayrollRun | undefined;
  mutateMockDatabase((database) => {
    const project = database.projects.find((item) => item.id === input.projectId);
    const sheet = database.payrollAttendanceSheets.find((item) => item.id === input.attendanceSheetId);
    if (!project || !sheet || sheet.projectId !== input.projectId || sheet.period !== input.period) {
      throw new Error("Bảng công không khớp với dự án hoặc kỳ lương đã chọn.");
    }
    if (sheet.status !== "approved") throw new Error("Bảng công chưa được phê duyệt cuối cùng.");
    if (sheet.usedByPayrollId) throw new Error("Bảng công này đã được dùng để tạo bảng lương.");

    const runId = uid("payroll");
    const stamp = now();
    const version = database.payrollRuns.filter((item) => item.projectId === input.projectId && item.period === input.period).length + 1;
    const code = `BL-${project.code}-${input.period.replace("-", "")}-V${version}`;
    const employees = database.employees.filter((item) => item.projectId === input.projectId);

    const generatedLines: PayrollLine[] = employees.map((employee, index) => {
      const policy = database.employeePolicies.find((item) => item.employeeId === employee.id);
      const baseSalary = policy?.baseSalary ?? 6_300_000;
      const workDays = Math.max(22, 26 - (index % 4));
      const overtimeHours = 8 + ((index * 3) % 11);
      const basePay = Math.round((baseSalary / 26) * workDays);
      const overtimePay = Math.round((baseSalary / 208) * overtimeHours * 1.5);
      const allowances = policy?.totalAllowance ?? 950_000 + (index % 3) * 100_000;
      const deductions = Math.round((policy?.insuranceSalary ?? baseSalary) * 0.105) + 50_000;
      return {
        id: uid("pay-line"),
        payrollId: runId,
        employeeId: employee.id,
        employeeCode: employee.code,
        employeeName: employee.name,
        position: employee.position,
        workDays,
        overtimeHours,
        basePay,
        overtimePay,
        allowances,
        deductions,
        netPay: basePay + overtimePay + allowances - deductions,
      };
    });

    created = {
      id: runId,
      code,
      projectId: input.projectId,
      period: input.period,
      attendanceSheetId: sheet.id,
      status: "admin_review",
      employeeCount: generatedLines.length,
      confirmedPayslipCount: 0,
      grossPayroll: generatedLines.reduce((total, item) => total + item.basePay + item.overtimePay + item.allowances, 0),
      totalDeductions: generatedLines.reduce((total, item) => total + item.deductions, 0),
      netPayroll: generatedLines.reduce((total, item) => total + item.netPay, 0),
      feedbackCount: 0,
      createdBy: input.actor,
      createdAt: stamp,
      updatedAt: stamp,
    };
    database.payrollRuns.push(created);
    database.payrollLines.push(...generatedLines);
    sheet.usedByPayrollId = runId;
    addAudit(database, runId, {
      type: "create",
      title: "Khởi tạo bảng lương",
      description: `Đã đối chiếu Master Data và tạo bảng lương từ ${sheet.code}.`,
      actor: input.actor,
    });
  });
  if (!created) throw new Error("Không thể tạo bảng lương.");
  return created;
}

export function transitionPayrollRun(
  payrollId: string,
  nextStatus: PayrollStatus,
  event: Omit<PayrollAuditEvent, "id" | "payrollId" | "createdAt">,
) {
  mutateMockDatabase((database) => {
    const run = database.payrollRuns.find((item) => item.id === payrollId);
    if (!run) throw new Error("Không tìm thấy bảng lương.");
    if (run.status === "locked") throw new Error("Bảng lương đã khóa, không thể thay đổi.");
    run.status = nextStatus;
    run.updatedAt = now();
    if (nextStatus === "payslip_confirmation") run.publishedAt = run.updatedAt;
    addAudit(database, payrollId, event);
  });
}

export function updatePayrollLine(
  lineId: string,
  values: Pick<PayrollLine, "workDays" | "overtimeHours" | "basePay" | "overtimePay" | "allowances" | "deductions" | "note">,
  actor: string,
  reason: string,
) {
  mutateMockDatabase((database) => {
    const line = database.payrollLines.find((item) => item.id === lineId);
    if (!line) throw new Error("Không tìm thấy dòng lương.");
    const run = database.payrollRuns.find((item) => item.id === line.payrollId);
    if (!run || run.status === "locked") throw new Error("Bảng lương đã khóa, không thể chỉnh sửa.");
    Object.assign(line, values, {
      netPay: values.basePay + values.overtimePay + values.allowances - values.deductions,
      updatedAt: now(),
      updatedBy: actor,
    });
    updateTotals(database, line.payrollId);
    addAudit(database, line.payrollId, {
      type: "edit",
      title: `Điều chỉnh lương ${line.employeeCode}`,
      description: reason,
      actor,
    });
  });
}

export function reviewPayrollFeedback(
  feedbackId: string,
  nextStatus: PayrollFeedbackStatus,
  actor: string,
  note?: string,
) {
  mutateMockDatabase((database) => {
    const feedback = database.payrollFeedbacks.find((item) => item.id === feedbackId);
    if (!feedback) throw new Error("Không tìm thấy phản hồi.");
    const run = database.payrollRuns.find((item) => item.id === feedback.payrollId);
    if (!run || run.status === "locked") throw new Error("Bảng lương đã khóa, không thể xử lý phản hồi.");
    feedback.status = nextStatus;
    if (nextStatus === "pending_accounting") {
      feedback.ownerReviewedAt = now();
      feedback.ownerReviewedBy = actor;
    }
    if (nextStatus === "adjusted") {
      feedback.accountingNote = note;
      feedback.resolvedAt = now();
    }
    if (nextStatus === "rejected") {
      feedback.rejectionReason = note;
      feedback.resolvedAt = now();
    }
    addAudit(database, feedback.payrollId, {
      type: "feedback",
      title: nextStatus === "pending_accounting" ? "CDA/GSDA duyệt phản hồi" : nextStatus === "adjusted" ? "C&B xác nhận đã điều chỉnh" : "Từ chối phản hồi phiếu lương",
      description: note || feedback.message,
      actor,
    });
  });
}

export function syncPayslipConfirmations(payrollId: string, actor: string) {
  mutateMockDatabase((database) => {
    const run = database.payrollRuns.find((item) => item.id === payrollId);
    if (!run || run.status !== "payslip_confirmation") throw new Error("Bảng lương chưa ở bước xác nhận phiếu lương.");
    const unresolved = database.payrollFeedbacks.some((item) => item.payrollId === payrollId && !["adjusted", "rejected"].includes(item.status));
    if (unresolved) throw new Error("Cần xử lý hết phản hồi của NLĐ trước khi chuyển bước.");
    run.confirmedPayslipCount = run.employeeCount;
    run.status = "revenue_check";
    run.updatedAt = now();
    addAudit(database, payrollId, {
      type: "approve",
      title: "NLĐ hoàn tất xác nhận phiếu lương",
      description: `${run.employeeCount}/${run.employeeCount} phiếu lương đã được xác nhận.`,
      actor,
    });
  });
}

export function recordRevenueCheck(payrollId: string, currentRevenue: number, actor: string) {
  let requiresExplanation = false;
  mutateMockDatabase((database) => {
    const run = database.payrollRuns.find((item) => item.id === payrollId);
    if (!run || run.status !== "revenue_check") throw new Error("Bảng lương chưa đến bước kiểm tra doanh thu.");
    const previous = database.payrollRuns
      .filter((item) => item.projectId === run.projectId && item.period < run.period && item.currentRevenue)
      .sort((a, b) => b.period.localeCompare(a.period))[0];
    const previousPayrollCost = previous?.grossPayroll ?? run.grossPayroll * 0.5;
    const previousRevenue = previous?.currentRevenue ?? currentRevenue * 0.98;
    const varianceRate = (run.grossPayroll / currentRevenue - previousPayrollCost / previousRevenue) * 100;
    const varianceAmount = (varianceRate / 100) * currentRevenue;
    requiresExplanation = Math.abs(varianceRate) > 1.5 || Math.abs(varianceAmount) > 10_000_000;
    Object.assign(run, {
      previousPayrollCost,
      previousRevenue,
      currentRevenue,
      varianceRate,
      varianceAmount,
      status: requiresExplanation ? "explanation_required" : "ready_to_finalize",
      updatedAt: now(),
    });
    addAudit(database, payrollId, {
      type: "revenue",
      title: "Cập nhật doanh thu và kiểm tra chênh lệch",
      description: requiresExplanation
        ? `Chênh lệch ${varianceRate.toFixed(2)}% cần CDA/GSDA giải trình.`
        : `Chênh lệch ${varianceRate.toFixed(2)}% nằm trong ngưỡng cho phép.`,
      actor,
    });
  });
  return requiresExplanation;
}

export function submitPayrollExplanation(payrollId: string, explanation: string, actor: string) {
  mutateMockDatabase((database) => {
    const run = database.payrollRuns.find((item) => item.id === payrollId);
    if (!run || run.status !== "explanation_required") throw new Error("Bảng lương không yêu cầu giải trình.");
    run.explanation = explanation;
    run.status = "ready_to_finalize";
    run.updatedAt = now();
    addAudit(database, payrollId, {
      type: "explain",
      title: "CDA/GSDA gửi giải trình chênh lệch",
      description: explanation,
      actor,
    });
  });
}

export function lockPayrollRun(payrollId: string, actor: string) {
  mutateMockDatabase((database) => {
    const run = database.payrollRuns.find((item) => item.id === payrollId);
    if (!run || run.status !== "ready_to_finalize") throw new Error("Bảng lương chưa hoàn tất đủ các bước duyệt.");
    const stamp = now();
    run.status = "locked";
    run.lockedAt = stamp;
    run.lockedBy = actor;
    run.updatedAt = stamp;
    addAudit(database, payrollId, {
      type: "lock",
      title: "Hoàn tất và khóa bảng lương",
      description: "Dữ liệu bảng lương được khóa, không thể chỉnh sửa thêm.",
      actor,
    });
  });
}
