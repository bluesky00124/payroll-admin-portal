import { describe, expect, it } from "vitest";
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
} from "@/lib/payroll-store";

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
    transitionPayrollRun("pay-jss-2026-08", "project_approval", {
      type: "approve",
      title: "Admin/BCSX xác nhận",
      description: "Đã đối chiếu dữ liệu dự án.",
      actor: "Bùi Minh Hạnh (BCSX)",
    });
    transitionPayrollRun("pay-jss-2026-08", "payslip_confirmation", {
      type: "publish",
      title: "CDA/GSDA xác nhận & phát hành",
      description: "Đã phát hành phiếu lương.",
      actor: "Trần Minh Anh (CDA)",
    });

    const run = getPayrollWorkspace().payrollRuns.find((item) => item.id === "pay-jss-2026-08");
    expect(run?.status).toBe("payslip_confirmation");
    expect(run?.publishedAt).toBeTruthy();
  });
});
