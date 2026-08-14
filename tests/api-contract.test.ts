import { describe, expect, it } from "vitest";
import type { ApiResponse, PolicyDefinition, Project } from "@/lib/types";

describe("mock API contract", () => {
  it("trả danh sách dự án có pagination meta", async () => {
    const response = await fetch("http://localhost/api/projects?page=1&pageSize=5");
    const payload = await response.json() as ApiResponse<Project[]>;
    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(5);
    expect(payload.meta).toMatchObject({ page: 1, pageSize: 5, total: 6, totalPages: 2 });
  });

  it("trả đủ danh mục chế độ động", async () => {
    const response = await fetch("http://localhost/api/policy-definitions");
    const payload = await response.json() as ApiResponse<PolicyDefinition[]>;
    expect(payload.data).toHaveLength(35);
    expect(payload.data.find((item) => item.code === "MEAL_ALLOWANCE")?.fields.length).toBeGreaterThan(0);
  });

  it("mô phỏng 404 và 409 đúng envelope", async () => {
    const missing = await fetch("http://localhost/api/projects/not-found");
    expect(missing.status).toBe(404);
    const duplicate = await fetch("http://localhost/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "JSS-ST", name: "Trùng mã", client: "Khách hàng mẫu" }) });
    const payload = await duplicate.json() as ApiResponse<Project>;
    expect(duplicate.status).toBe(409);
    expect(payload.error?.code).toBe("PROJECT_CODE_EXISTS");
  });
});
