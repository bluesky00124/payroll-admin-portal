import { delay, http, HttpResponse } from "msw";
import { applyRounding, evaluateExpression, validateFormulas } from "@/lib/formula-engine";
import { mutateMockDatabase, readMockDatabase } from "@/lib/mock-db";
import type {
  ApiResponse,
  AttendanceConfig,
  DataMapping,
  Project,
  ProjectOvertimeConfig,
  ProjectPolicy,
  SalaryFormula,
  TestRunResult,
} from "@/lib/types";
import { uid } from "@/lib/utils";

const ok = <T,>(data: T, init?: ResponseInit) =>
  HttpResponse.json<ApiResponse<T>>({ data }, init);

const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  HttpResponse.json(
    { data: null, error: { code, message, fields } },
    { status },
  );

const projectId = (value: string | readonly string[] | undefined) => String(value ?? "");

export const handlers = [
  http.get("/api/projects", async ({ request }) => {
    await delay(320);
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").toLocaleLowerCase("vi");
    const status = url.searchParams.get("status") ?? "all";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.max(1, Number(url.searchParams.get("pageSize") ?? 5));
    const database = readMockDatabase();
    const filtered = database.projects
      .filter((project) => status === "all" || (status === "inactive" ? project.status !== "active" : project.status === status))
      .filter((project) => `${project.code} ${project.name} ${project.client}`.toLocaleLowerCase("vi").includes(query))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);
    return HttpResponse.json<ApiResponse<Project[]>>({
      data,
      meta: { page, pageSize, total: filtered.length, totalPages },
    });
  }),

  http.post("/api/projects", async ({ request }) => {
    await delay(420);
    const payload = (await request.json()) as Partial<Project>;
    const database = readMockDatabase();
    if (!payload.code || !payload.name || !payload.client) {
      return fail(422, "VALIDATION_ERROR", "Vui lòng nhập đủ thông tin bắt buộc.", {
        code: !payload.code ? "Mã dự án là bắt buộc" : "",
        name: !payload.name ? "Tên dự án là bắt buộc" : "",
        client: !payload.client ? "Khách hàng là bắt buộc" : "",
      });
    }
    if (database.projects.some((item) => item.code.toLocaleLowerCase() === payload.code!.toLocaleLowerCase())) {
      return fail(409, "PROJECT_CODE_EXISTS", "Mã dự án đã tồn tại.", { code: "Mã dự án đã được sử dụng" });
    }
    const now = new Date().toISOString();
    const project: Project = {
      id: uid("prj"), code: payload.code.toUpperCase(), name: payload.name, client: payload.client,
      location: payload.location ?? "Chưa cấu hình", manager: payload.manager ?? "C&B Admin", employeeCount: 0,
      status: "draft", payrollCycle: payload.payrollCycle ?? "Ngày 01 đến ngày cuối tháng",
      effectiveFrom: payload.effectiveFrom ?? now.slice(0, 10), templateName: payload.templateName ?? "Template chuẩn",
      updatedAt: now,
      tabStates: { overview: "complete", policies: "incomplete", attendance: "incomplete", formulas: "incomplete" },
    };
    mutateMockDatabase((db) => db.projects.push(project));
    return ok(project, { status: 201 });
  }),

  http.get("/api/projects/:projectId", async ({ params }) => {
    await delay(220);
    const project = readMockDatabase().projects.find((item) => item.id === projectId(params.projectId));
    return project ? ok(project) : fail(404, "PROJECT_NOT_FOUND", "Không tìm thấy dự án.");
  }),

  http.patch("/api/projects/:projectId", async ({ params, request }) => {
    await delay(300);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as Partial<Project>;
    let updated: Project | undefined;
    mutateMockDatabase((db) => {
      const index = db.projects.findIndex((item) => item.id === id);
      if (index < 0) return;
      updated = { ...db.projects[index], ...payload, id, updatedAt: new Date().toISOString() };
      db.projects[index] = updated;
    });
    return updated ? ok(updated) : fail(404, "PROJECT_NOT_FOUND", "Không tìm thấy dự án.");
  }),

  http.post("/api/projects/:projectId/clone", async ({ params }) => {
    await delay(450);
    const id = projectId(params.projectId);
    const database = readMockDatabase();
    const source = database.projects.find((item) => item.id === id);
    if (!source) return fail(404, "PROJECT_NOT_FOUND", "Không tìm thấy dự án.");
    const cloneId = uid("prj");
    const clone: Project = { ...source, id: cloneId, code: `${source.code}-COPY`, name: `${source.name} (Bản sao)`, employeeCount: 0, status: "draft", updatedAt: new Date().toISOString(), tabStates: { ...source.tabStates } };
    mutateMockDatabase((db) => {
      db.projects.push(clone);
      db.projectPolicies.push(...database.projectPolicies.filter((item) => item.projectId === id).map((item) => ({ ...item, id: uid("pp"), projectId: cloneId })));
      db.attendanceConfigs.push({ ...database.attendanceConfigs.find((item) => item.projectId === id)!, projectId: cloneId });
      db.overtimeConfigs.push(...database.overtimeConfigs.filter((item) => item.projectId === id).map((item) => ({ ...item, id: uid("otc"), projectId: cloneId })));
      db.formulas.push(...database.formulas.filter((item) => item.projectId === id).map((item) => ({ ...item, id: uid("formula"), projectId: cloneId })));
    });
    return ok(clone, { status: 201 });
  }),

  http.get("/api/policy-definitions", async () => {
    await delay(250);
    return ok(readMockDatabase().policyDefinitions);
  }),

  http.get("/api/projects/:projectId/policies", async ({ params }) => {
    await delay(250);
    const id = projectId(params.projectId);
    return ok(readMockDatabase().projectPolicies.filter((item) => item.projectId === id));
  }),

  http.post("/api/projects/:projectId/policies", async ({ params, request }) => {
    await delay(350);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as Omit<ProjectPolicy, "id" | "projectId">;
    const database = readMockDatabase();
    if (database.projectPolicies.some((item) => item.projectId === id && item.policyId === payload.policyId && item.enabled)) {
      return fail(409, "POLICY_EXISTS", "Chế độ này đang được áp dụng cho dự án.");
    }
    const policy: ProjectPolicy = { ...payload, id: uid("pp"), projectId: id };
    mutateMockDatabase((db) => db.projectPolicies.push(policy));
    return ok(policy, { status: 201 });
  }),

  http.patch("/api/projects/:projectId/policies/:policyId", async ({ params, request }) => {
    await delay(300);
    const id = projectId(params.projectId);
    const policyId = projectId(params.policyId);
    const payload = (await request.json()) as Partial<ProjectPolicy>;
    let updated: ProjectPolicy | undefined;
    mutateMockDatabase((db) => {
      const index = db.projectPolicies.findIndex((item) => item.projectId === id && item.id === policyId);
      if (index < 0) return;
      updated = { ...db.projectPolicies[index], ...payload, id: policyId, projectId: id };
      db.projectPolicies[index] = updated;
    });
    return updated ? ok(updated) : fail(404, "POLICY_NOT_FOUND", "Không tìm thấy chế độ dự án.");
  }),

  http.delete("/api/projects/:projectId/policies/:policyId", async ({ params }) => {
    await delay(280);
    const id = projectId(params.projectId);
    const policyId = projectId(params.policyId);
    let found = false;
    mutateMockDatabase((db) => {
      const before = db.projectPolicies.length;
      db.projectPolicies = db.projectPolicies.filter((item) => !(item.projectId === id && item.id === policyId));
      found = db.projectPolicies.length < before;
    });
    return found ? ok({ deleted: true }) : fail(404, "POLICY_NOT_FOUND", "Không tìm thấy chế độ dự án.");
  }),

  http.get("/api/projects/:projectId/attendance-config", async ({ params }) => {
    await delay(180);
    const id = projectId(params.projectId);
    const config = readMockDatabase().attendanceConfigs.find((item) => item.projectId === id);
    return config ? ok(config) : fail(404, "ATTENDANCE_CONFIG_NOT_FOUND", "Chưa có cấu hình chấm công.");
  }),

  http.put("/api/projects/:projectId/attendance-config", async ({ params, request }) => {
    await delay(320);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as AttendanceConfig;
    const config = { ...payload, projectId: id };
    mutateMockDatabase((db) => {
      const index = db.attendanceConfigs.findIndex((item) => item.projectId === id);
      if (index >= 0) db.attendanceConfigs[index] = config;
      else db.attendanceConfigs.push(config);
    });
    return ok(config);
  }),

  http.get("/api/overtime-types", async () => {
    await delay(180);
    return ok(readMockDatabase().overtimeTypes);
  }),

  http.get("/api/projects/:projectId/overtime-configs", async ({ params }) => {
    await delay(220);
    const id = projectId(params.projectId);
    return ok(readMockDatabase().overtimeConfigs.filter((item) => item.projectId === id));
  }),

  http.put("/api/projects/:projectId/overtime-configs", async ({ params, request }) => {
    await delay(360);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as ProjectOvertimeConfig[];
    const configs = payload.map((item) => ({ ...item, projectId: id }));
    mutateMockDatabase((db) => {
      db.overtimeConfigs = db.overtimeConfigs.filter((item) => item.projectId !== id);
      db.overtimeConfigs.push(...configs);
    });
    return ok(configs);
  }),

  http.get("/api/formula-variables", async () => {
    await delay(160);
    return ok(readMockDatabase().formulaVariables);
  }),

  http.get("/api/projects/:projectId/formulas", async ({ params }) => {
    await delay(220);
    const id = projectId(params.projectId);
    return ok(readMockDatabase().formulas.filter((item) => item.projectId === id).sort((a, b) => a.order - b.order));
  }),

  http.put("/api/projects/:projectId/formulas", async ({ params, request }) => {
    await delay(360);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as SalaryFormula[];
    const validation = validateFormulas(payload, readMockDatabase().formulaVariables);
    if (!validation.valid) return fail(422, "FORMULA_INVALID", validation.errors.join(" · "));
    const formulas = payload.map((item, index) => ({ ...item, projectId: id, order: index + 1 }));
    mutateMockDatabase((db) => {
      db.formulas = db.formulas.filter((item) => item.projectId !== id);
      db.formulas.push(...formulas);
    });
    return ok(formulas);
  }),

  http.post("/api/projects/:projectId/formulas/validate", async ({ params, request }) => {
    await delay(260);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as SalaryFormula[] | undefined;
    const database = readMockDatabase();
    const formulas = payload ?? database.formulas.filter((item) => item.projectId === id);
    return ok(validateFormulas(formulas, database.formulaVariables));
  }),

  http.get("/api/projects/:projectId/data-mappings", async ({ params }) => {
    await delay(220);
    const id = projectId(params.projectId);
    return ok(readMockDatabase().dataMappings.filter((item) => item.projectId === id));
  }),

  http.put("/api/projects/:projectId/data-mappings", async ({ params, request }) => {
    await delay(330);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as DataMapping[];
    const mappings = payload.map((item) => ({ ...item, projectId: id }));
    mutateMockDatabase((db) => {
      db.dataMappings = db.dataMappings.filter((item) => item.projectId !== id);
      db.dataMappings.push(...mappings);
    });
    return ok(mappings);
  }),

  http.post("/api/projects/:projectId/data-mappings/validate", async ({ params }) => {
    await delay(420);
    const id = projectId(params.projectId);
    const mappings = readMockDatabase().dataMappings.filter((item) => item.projectId === id);
    const issues = mappings.flatMap((mapping) => {
      if (mapping.status === "invalid") return [`${mapping.sourceName}: thiếu trường bắt buộc`];
      if (mapping.status === "warning") return [`${mapping.sourceName}: có cột chưa nhận diện`];
      return [];
    });
    return ok({ valid: issues.length === 0, issues, checkedAt: new Date().toISOString() });
  }),

  http.get("/api/test-employees", async () => {
    await delay(180);
    return ok(readMockDatabase().testEmployees);
  }),

  http.post("/api/projects/:projectId/test-runs", async ({ params, request }) => {
    await delay(650);
    const id = projectId(params.projectId);
    const payload = (await request.json()) as { employeeId: string; period: string };
    const database = readMockDatabase();
    const employee = database.testEmployees.find((item) => item.id === payload.employeeId);
    if (!employee) return fail(404, "EMPLOYEE_NOT_FOUND", "Không tìm thấy nhân viên kiểm thử.");
    const formulas = database.formulas.filter((item) => item.projectId === id && item.enabled).sort((a, b) => a.order - b.order);
    const variables: Record<string, number> = Object.fromEntries(database.formulaVariables.map((item) => [item.code, item.sampleValue]));
    variables.LUONG_CO_BAN = employee.baseSalary;
    variables.NEN_TINH_OT = employee.baseSalary;
    variables.GIO_THUONG = employee.workHours;
    variables.GIO_OT_150 = employee.overtimeHours;
    const breakdown = formulas.map((formula) => {
      const amount = applyRounding(evaluateExpression(formula.expression, variables), formula.rounding);
      variables[formula.outputVariable] = amount;
      return { code: formula.code, name: formula.name, amount, status: "matched" as const };
    });
    const grossIncome = variables.TONG_THU_NHAP ?? 0;
    const totalDeductions = variables.TONG_KHAU_TRU ?? 0;
    const netPay = variables.THUC_LANH ?? grossIncome - totalDeductions;
    const expectedNetPay = employee.id === "emp-demo-2" ? netPay + 1000 : netPay;
    const result: TestRunResult = { employee, period: payload.period, breakdown, grossIncome, totalDeductions, netPay, expectedNetPay, difference: netPay - expectedNetPay, warnings: employee.id === "emp-demo-2" ? ["Chênh lệch 1.000 ₫ do quy tắc làm tròn của dữ liệu đối chiếu."] : [] };
    return ok(result);
  }),
];
