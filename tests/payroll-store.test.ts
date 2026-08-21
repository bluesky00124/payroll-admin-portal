import { describe, expect, it } from "vitest";
import {
  createPayrollRun,
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
  syncPayslipConfirmations,
  updatePayrollLine,
} from "@/lib/payroll-store";
import { createPayrollDailyAttendance, getPayrollLineDetail } from "@/lib/payroll-line-detail";

const accountant = "Trần Thu Trang (Kế toán C&B)";

describe("payroll workflow store", () => {
  it("chỉ tạo một bảng lương từ bảng công đã duyệt và chưa sử dụng", () => {
    const created = createPayrollRun({
      projectId: "prj-logistics",
      period: "2026-08",
      attendanceSheetId: "att-lgt-2026-08-final",
      actor: accountant,
    });

    const workspace = getPayrollWorkspace();
    expect(created.status).toBe("admin_review");
    expect(created.code).toBe("BL-LGT-BD-202608-V1");
    const createdLines = workspace.payrollLines.filter((line) => line.payrollId === created.id);
    expect(createdLines).toHaveLength(3);
    expect(createdLines[0].detail?.income.grossPay).toBe(createdLines[0].basePay + createdLines[0].overtimePay + createdLines[0].allowances);
    expect(createdLines[0].detail?.deductions.total).toBe(createdLines[0].deductions);
    expect(createdLines[0].detail?.payment.transferAmount || createdLines[0].detail?.payment.cashAmount).toBe(createdLines[0].netPay);
    expect(workspace.attendanceSheets.find((sheet) => sheet.id === "att-lgt-2026-08-final")?.usedByPayrollId).toBe(created.id);

    expect(() => createPayrollRun({
      projectId: "prj-logistics",
      period: "2026-08",
      attendanceSheetId: "att-lgt-2026-08-final",
      actor: accountant,
    })).toThrow("đã được dùng");
  });

  it("ghi lịch sử khi chỉnh sửa và chặn chỉnh sửa bảng lương đã khóa", () => {
    const line = getPayrollWorkspace().payrollLines.find((item) => item.payrollId === "pay-jss-2026-08");
    expect(line).toBeDefined();

    updatePayrollLine(line!.id, {
      workDays: 26,
      overtimeHours: 16,
      basePay: line!.basePay,
      overtimePay: line!.overtimePay + 200_000,
      allowances: line!.allowances,
      deductions: line!.deductions,
      note: "Bổ sung OT",
    }, accountant, "Bổ sung 2 giờ OT theo xác nhận khách hàng");

    const updated = getPayrollWorkspace();
    const updatedLine = updated.payrollLines.find((item) => item.id === line!.id);
    expect(updatedLine?.netPay).toBe(line!.netPay + 200_000);
    expect(updatedLine?.detail?.income.grossPay).toBe(updatedLine!.basePay + updatedLine!.overtimePay + updatedLine!.allowances);
    expect(updated.auditEvents.some((event) => event.payrollId === "pay-jss-2026-08" && event.type === "edit")).toBe(true);

    const lockedLine = updated.payrollLines.find((item) => item.payrollId === "pay-jss-2026-07");
    if (lockedLine) {
      expect(() => updatePayrollLine(lockedLine.id, { ...lockedLine, note: "Không hợp lệ" }, accountant, "Test")).toThrow("đã khóa");
    }
  });

  it("xử lý phản hồi, kiểm tra doanh thu, giải trình và khóa đúng thứ tự", () => {
    reviewPayrollFeedback("fb-swm-001", "pending_accounting", "Nguyễn Thu Hà (CDA)");
    reviewPayrollFeedback("fb-swm-001", "adjusted", accountant, "Đã bổ sung 4 giờ OT.");
    reviewPayrollFeedback("fb-swm-002", "rejected", accountant, "Khoản phụ cấp không áp dụng trong kỳ.");

    syncPayslipConfirmations("pay-swm-2026-08", "Hệ thống ứng dụng NLĐ");
    expect(getPayrollWorkspace().payrollRuns.find((run) => run.id === "pay-swm-2026-08")?.status).toBe("revenue_check");

    expect(recordRevenueCheck("pay-swm-2026-08", 600_000_000, "Lê Thanh Tâm (Kế toán Thanh toán)")).toBe(true);
    expect(getPayrollWorkspace().payrollRuns.find((run) => run.id === "pay-swm-2026-08")?.status).toBe("explanation_required");

    submitPayrollExplanation("pay-swm-2026-08", "Tăng sản lượng và số giờ OT theo đơn hàng phát sinh.", "Nguyễn Thu Hà (CDA)");
    lockPayrollRun("pay-swm-2026-08", accountant);

    const locked = getPayrollWorkspace().payrollRuns.find((run) => run.id === "pay-swm-2026-08");
    expect(locked?.status).toBe("locked");
    expect(locked?.lockedBy).toBe(accountant);
  });

  it("duyệt qua Admin/BCSX rồi CDA/GSDA và phát hành phiếu lương", () => {
    confirmPayrollReview("pay-jss-2026-08", "Bùi Minh Hạnh (BCSX)");
    confirmProjectPayroll("pay-jss-2026-08", "Trần Minh Anh (CDA)");

    expect(getPayrollWorkspace().payrollRuns.find((item) => item.id === "pay-jss-2026-08")?.status).toBe("payslip_publish");

    publishPayrollPayslips("pay-jss-2026-08", accountant);

    const run = getPayrollWorkspace().payrollRuns.find((item) => item.id === "pay-jss-2026-08");
    expect(run?.status).toBe("payslip_confirmation");
    expect(run?.publishedAt).toBeTruthy();
  });

  it("trả lại Kế toán điều chỉnh và gửi đúng bước duyệt lại", () => {
    requestPayrollCorrection("pay-jss-2026-08", 3, "Bùi Minh Hạnh (BCSX)", "Thiếu xác nhận ngày công khách hàng.");
    let run = getPayrollWorkspace().payrollRuns.find((item) => item.id === "pay-jss-2026-08");
    expect(run?.status).toBe("correction_required");
    expect(run?.returnToStep).toBe(3);

    resubmitPayrollCorrection("pay-jss-2026-08", accountant, "Đã bổ sung biên bản xác nhận khách hàng.");
    run = getPayrollWorkspace().payrollRuns.find((item) => item.id === "pay-jss-2026-08");
    expect(run?.status).toBe("admin_review");
    expect(run?.returnToStep).toBeUndefined();
  });

  it("tạo đủ dữ liệu ngân hàng và mã công theo từng ngày trong kỳ", () => {
    const line = getPayrollWorkspace().payrollLines.find((item) => item.payrollId === "pay-jss-2026-08");
    expect(line).toBeDefined();

    const detail = getPayrollLineDetail(line!);
    const days = createPayrollDailyAttendance(line!, "2026-08");

    expect(detail.payment.bankName).toBeTruthy();
    expect(detail.payment.bankAccount).toBeTruthy();
    expect(days).toHaveLength(31);
    expect(days.reduce((total, item) => total + item.hours, 0)).toBe(line!.workDays * 8);
    expect(days.reduce((total, item) => total + item.overtimeHours, 0)).toBe(line!.overtimeHours);
  });
});
