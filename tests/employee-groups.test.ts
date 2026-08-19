import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("Project Employee Groups & Assignment API", () => {
  it("lấy danh sách nhóm người lao động theo dự án", async () => {
    const groups = await api.getProjectEmployeeGroups("prj-jss");
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBeGreaterThanOrEqual(3);
    const shiftLeaderGroup = groups.find((g) => g.code === "shift_leader");
    expect(shiftLeaderGroup).toBeDefined();
    expect(shiftLeaderGroup?.name).toContain("Quản lý");
  });

  it("tạo nhóm người lao động mới cho dự án", async () => {
    const newGroup = await api.createProjectEmployeeGroup("prj-jss", {
      name: "Lao động thời vụ Tết",
      code: "thoi_vu_tet",
      description: "Nhân sự thời vụ ngắn hạn dịp Tết",
      colorTone: "warning",
    });

    expect(newGroup.id).toBeDefined();
    expect(newGroup.name).toBe("Lao động thời vụ Tết");
    expect(newGroup.projectId).toBe("prj-jss");

    const groupsAfter = await api.getProjectEmployeeGroups("prj-jss");
    expect(groupsAfter.some((g) => g.id === newGroup.id)).toBe(true);
  });

  it("phân bổ và gán nhân sự vào nhóm lao động", async () => {
    const groups = await api.getProjectEmployeeGroups("prj-jss");
    const targetGroup = groups[0];
    expect(targetGroup).toBeDefined();

    const employees = await api.getEmployees({ projectId: "prj-jss" });
    const empList = Array.isArray(employees) ? employees : (employees as any).data ?? [];
    expect(empList.length).toBeGreaterThan(0);

    const empToAssign = empList.slice(0, 2).map((e: any) => e.id);
    const assignResult = await api.assignEmployeesToGroup("prj-jss", targetGroup.id, {
      employeeIds: empToAssign,
    });

    expect(assignResult.success).toBe(true);
    expect(assignResult.updatedCount).toBe(2);
  });

  it("xóa nhóm người lao động khỏi dự án", async () => {
    const created = await api.createProjectEmployeeGroup("prj-jss", {
      name: "Nhóm tạm thời cần xóa",
      code: "nhom_tam",
      colorTone: "neutral",
    });

    const deleteResult = await api.deleteProjectEmployeeGroup("prj-jss", created.id);
    expect(deleteResult.success).toBe(true);

    const groupsAfter = await api.getProjectEmployeeGroups("prj-jss");
    expect(groupsAfter.some((g) => g.id === created.id)).toBe(false);
  });
});
