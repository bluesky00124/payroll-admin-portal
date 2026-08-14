import { describe, expect, it } from "vitest";
import { mutateMockDatabase, readMockDatabase, resetMockDatabase } from "@/lib/mock-db";

describe("mock database", () => {
  it("seed 6 dự án và persist thay đổi qua LocalStorage", () => {
    const seed = readMockDatabase();
    expect(seed.projects).toHaveLength(6);
    mutateMockDatabase((database) => { database.projects[0].name = "Tên đã chỉnh"; });
    expect(readMockDatabase().projects[0].name).toBe("Tên đã chỉnh");
  });

  it("reset về seed khi dữ liệu hỏng hoặc schema cũ", () => {
    window.localStorage.setItem("payroll-admin-demo-db-v1", "not-json");
    expect(readMockDatabase().projects).toHaveLength(6);
    const database = readMockDatabase();
    database.schemaVersion = -1;
    window.localStorage.setItem("payroll-admin-demo-db-v1", JSON.stringify(database));
    expect(readMockDatabase().schemaVersion).toBe(2);
    expect(resetMockDatabase().projects[0].code).toBe("JSS-ST");
  });
});
