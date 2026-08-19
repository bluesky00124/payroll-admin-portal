import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { resetMockDatabase } from "@/lib/mock-db";

describe("Employees Module & HR Workflows", () => {
  it("lấy danh sách nhân viên và lọc theo dự án", async () => {
    resetMockDatabase();
    const all = await api.getEmployees();
    expect(all.length).toBeGreaterThan(5);

    const jssEmps = await api.getEmployees({ projectId: "prj-jss" });
    expect(jssEmps.length).toBeGreaterThanOrEqual(4);
    expect(jssEmps.every((e) => e.projectId === "prj-jss")).toBe(true);
  });

  it("BCSX khai báo người phụ thuộc (Mode 2) -> Kế toán kiểm tra & xác nhận (Pass)", async () => {
    resetMockDatabase();
    const emps = await api.getEmployees({ projectId: "prj-jss" });
    const emp = emps[0];

    // BCSX declares dependent
    const newDep = await api.createDependent({
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.name,
      fullName: "Nguyễn Văn Con",
      relationship: "child",
      dob: "2020-05-15",
      idCardOrTaxCode: "079220001122",
      startDate: "2026-08",
      attachmentType: "cccd_2_sided",
      attachmentName: "CCCD_NguyenVanCon.pdf",
      creationMode: "bcsx_declare",
    });

    expect(newDep.status).toBe("pending_approval");

    // Accountant confirms/passes
    const confirmed = await api.confirmDependents([newDep.id], "Trần Thu Trang (Kế toán)");
    expect(confirmed.length).toBe(1);
    expect(confirmed[0].status).toBe("approved");

    // Check tax config auto synchronization
    const taxConfigs = await api.getTaxConfigs({ projectId: "prj-jss" });
    const empTax = taxConfigs.find((t) => t.employeeId === emp.id);
    expect(empTax?.approvedDependentsCount).toBeGreaterThanOrEqual(1);
    expect(empTax?.dependentDeduction).toBe(empTax!.approvedDependentsCount * 4400000);
  });

  it("ghi đè ngày công chuẩn riêng cho nhân viên", async () => {
    resetMockDatabase();
    const workdays = await api.getStandardWorkdays({ projectId: "prj-jss" });
    const target = workdays[0];

    const updated = await api.saveStandardWorkdayOverride(target.id, {
      overrideDays: 22,
      isOverridden: true,
      reason: "Hợp đồng thử việc 22 ngày công",
    });

    expect(updated.isOverridden).toBe(true);
    expect(updated.overrideDays).toBe(22);
    expect(updated.reason).toBe("Hợp đồng thử việc 22 ngày công");
  });

  it("tải lên danh sách Excel cập nhật ngày công chuẩn đồng loạt", async () => {
    resetMockDatabase();
    const workdays = await api.getStandardWorkdays({ projectId: "prj-jss" });
    const target = workdays[1];

    const imported = await api.batchImportStandardWorkdays({
      projectId: "prj-jss",
      items: [
        {
          employeeCode: target.employeeCode,
          overrideDays: 24,
          reason: "Chế độ ca kíp xoay vòng 24 công",
        },
      ],
    });

    expect(imported.length).toBeGreaterThan(0);
    const updatedTarget = imported.find((r) => r.employeeCode === target.employeeCode);
    expect(updatedTarget?.overrideDays).toBe(24);
    expect(updatedTarget?.isOverridden).toBe(true);
  });

  it("quản lý phép năm và tính trừ số ngày phép còn lại", async () => {
    resetMockDatabase();
    const leaveRecords = await api.getLeaveRecords({ projectId: "prj-jss" });
    const rec = leaveRecords[0];
    const initialRemaining = rec.remainingDays;

    const updated = await api.addLeaveHistory(rec.employeeId, {
      from: "2026-08-10",
      to: "2026-08-11",
      days: 2.0,
      leaveType: "annual",
      reason: "Nghỉ phép cá nhân",
      approvedBy: "Quản lý dự án",
    });

    expect(updated.usedDays).toBe(rec.usedDays + 2.0);
    expect(updated.remainingDays).toBe(initialRemaining - 2.0);
    expect(updated.history[0].days).toBe(2.0);
  });

  it("quản lý Sổ BHXH Master và luồng khai báo biến động (D02-LT) -> Kế toán xác nhận BHXH", async () => {
    resetMockDatabase();
    // 1. Lấy danh sách Sổ BHXH Master
    const masterList = await api.getInsuranceMasterRecords({ projectId: "prj-jss" });
    expect(masterList.length).toBeGreaterThan(0);
    const targetEmp = masterList[0];
    const oldSalary = targetEmp.insuranceSalary;

    // 2. Chủ dự án khai báo biến động tăng lương đóng BHXH
    const createdChange = await api.createInsuranceChange({
      employeeId: targetEmp.employeeId,
      employeeCode: targetEmp.employeeCode,
      employeeName: targetEmp.employeeName,
      projectId: targetEmp.projectId,
      period: "2026-08",
      changeType: "salary_adjust",
      oldSalary,
      newSalary: 8500000,
      effectiveMonth: "2026-08",
      reason: "Tăng lương vị trí Tổ trưởng",
    });

    expect(createdChange.status).toBe("pending_agency_verification");
    expect(createdChange.newSalary).toBe(8500000);

    // 3. Kế toán đối chiếu với cơ quan BHXH và bấm Xác nhận
    const verifiedChange = await api.verifyInsuranceChange(createdChange.id, {
      verifiedBy: "Trần Thu Trang (Kế toán BHXH)",
      agencyReceiptCode: "BHXH-7901-202608-TEST01",
    });

    expect(verifiedChange.status).toBe("verified");
    expect(verifiedChange.agencyReceiptCode).toBe("BHXH-7901-202608-TEST01");

    // 4. Kiểm tra Sổ BHXH Master tự động cập nhật mức lương đóng mới
    const updatedMasterList = await api.getInsuranceMasterRecords({ projectId: "prj-jss" });
    const updatedMasterEmp = updatedMasterList.find((m) => m.employeeId === targetEmp.employeeId);
    expect(updatedMasterEmp?.insuranceSalary).toBe(8500000);
    expect(updatedMasterEmp?.status).toBe("active");
  });

  it("quản lý Công đoàn phí: cập nhật trạng thái tham gia và tự động ghi log lịch sử", async () => {
    resetMockDatabase();
    const list = await api.getUnionFees({ projectId: "prj-jss" });
    expect(list.length).toBeGreaterThan(0);
    const target = list[0];
    expect(target.isParticipating).toBe(true);

    // Bỏ tham gia Công đoàn
    const updated = await api.updateUnionFee(target.id, {
      isParticipating: false,
      note: "Người lao động làm đơn xin rút khỏi Công đoàn",
    });

    expect(updated.isParticipating).toBe(false);
    expect(updated.history).toBeDefined();
    expect(updated.history![0].actionType).toBe("leave");
    expect(updated.history![0].actionLabel).toBe("Hủy tham gia Công đoàn");
    expect(updated.history![0].note).toBe("Người lao động làm đơn xin rút khỏi Công đoàn");
  });

  it("quản lý Chế độ & Phụ cấp: tùy biến phụ cấp riêng và khôi phục về chuẩn dự án", async () => {
    resetMockDatabase();
    const list = await api.getEmployeePolicies({ projectId: "prj-jss" });
    expect(list.length).toBeGreaterThan(0);
    const target = list[0];

    // Cập nhật phụ cấp trách nhiệm riêng 2,000,000đ
    const updatedPolicies = target.policies.map((p) => {
      if (p.policyCode === "RESPONSIBILITY_ALLOWANCE" || p.policyId === "pol-responsibility") {
        return {
          ...p,
          isEnabled: true,
          isCustom: true,
          customValue: { amount: 2000000 },
          reason: "Quyết định bổ nhiệm Trưởng chuyền mở rộng",
        };
      }
      return p;
    });

    const updated = await api.updateEmployeePolicies(target.employeeId, {
      policies: updatedPolicies,
      baseSalary: 7500000,
    });

    expect(updated.baseSalary).toBe(7500000);
    expect(updated.customPolicyCount).toBeGreaterThan(0);
    const respAllowance = updated.policies.find((p) => p.policyCode === "RESPONSIBILITY_ALLOWANCE" || p.policyId === "pol-responsibility");
    expect(respAllowance?.customValue?.amount).toBe(2000000);
    expect(respAllowance?.isCustom).toBe(true);

    // Khôi phục về mặc định dự án
    const resetResult = await api.resetEmployeePoliciesToDefault(target.employeeId);
    expect(resetResult.customPolicyCount).toBe(0);
    const resetResp = resetResult.policies.find((p) => p.policyCode === "RESPONSIBILITY_ALLOWANCE" || p.policyId === "pol-responsibility");
    expect(resetResp?.isCustom).toBe(false);
  });

  it("tải lên danh sách Excel cập nhật phụ cấp nhân sự hàng loạt", async () => {
    resetMockDatabase();
    const list = await api.getEmployeePolicies({ projectId: "prj-jss" });
    const target = list[1];

    const imported = await api.batchImportEmployeePolicies({
      projectId: "prj-jss",
      items: [
        {
          employeeCode: target.employeeCode,
          policyCode: "TRAVEL_ALLOWANCE",
          amount: 800000,
          reason: "Hỗ trợ công tác xa 30km",
        },
      ],
    });

    expect(imported.length).toBeGreaterThan(0);
    const updatedEmp = imported.find((r) => r.employeeCode === target.employeeCode);
    const travelAllowance = updatedEmp?.policies.find((p) => p.policyCode === "TRAVEL_ALLOWANCE");
    expect(travelAllowance?.isCustom).toBe(true);
    expect(travelAllowance?.customValue?.amount).toBe(800000);
  });
});
