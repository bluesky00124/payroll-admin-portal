import { delay, http, HttpResponse } from "msw";
import { applyRounding, evaluateExpression, validateFormulas } from "@/lib/formula-engine";
import { mutateMockDatabase, readMockDatabase } from "@/lib/mock-db";
import type {
  ApiResponse,
  AttendanceConfig,
  DataMapping,
  Dependent,
  Employee,
  EmployeePolicyItem,
  EmployeePolicyRecord,
  InsuranceChangeRecord,
  InsuranceRecord,
  LeaveHistoryItem,
  LeaveRecord,
  Project,
  ProjectOvertimeConfig,
  ProjectPolicy,
  SalaryFormula,
  StandardWorkdayRecord,
  TaxConfigRecord,
  TestRunResult,
  UnionFeeRecord,
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

  // --- EMPLOYEE MANAGEMENT HANDLERS ---
  http.get("/api/employees", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const database = readMockDatabase();
    let list = database.employees ?? [];
    if (projId && projId !== "all") {
      list = list.filter((e) => e.projectId === projId);
    }
    if (q) {
      list = list.filter(
        (e) =>
          e.code.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.phone.includes(q) ||
          e.idCard.includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q)
      );
    }
    return ok(list);
  }),

  http.get("/api/dependents", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const employeeId = url.searchParams.get("employeeId");
    const status = url.searchParams.get("status");
    const database = readMockDatabase();
    let list = database.dependents ?? [];
    if (projId && projId !== "all") {
      list = list.filter((d) => d.projectId === projId);
    }
    if (employeeId) {
      list = list.filter((d) => d.employeeId === employeeId);
    }
    if (status && status !== "all") {
      list = list.filter((d) => d.status === status);
    }
    return ok(list);
  }),

  http.post("/api/dependents", async ({ request }) => {
    await delay(300);
    const payload = (await request.json()) as Partial<Dependent>;
    const database = readMockDatabase();
    const employee = database.employees.find((e) => e.id === payload.employeeId || e.code === payload.employeeCode);
    const newDep: Dependent = {
      id: uid("dep"),
      employeeId: employee?.id ?? payload.employeeId ?? "",
      employeeCode: employee?.code ?? payload.employeeCode ?? "",
      employeeName: employee?.name ?? payload.employeeName ?? "",
      projectId: employee?.projectId ?? payload.projectId ?? "",
      fullName: payload.fullName ?? "",
      relationship: payload.relationship ?? "child",
      dob: payload.dob ?? "2020-01-01",
      idCardOrTaxCode: payload.idCardOrTaxCode ?? "",
      startDate: payload.startDate ?? new Date().toISOString().slice(0, 7),
      endDate: payload.endDate,
      attachmentUrl: payload.attachmentUrl ?? "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80",
      attachmentName: payload.attachmentName ?? "CCCD_DinhKem.pdf",
      attachmentType: payload.attachmentType ?? "cccd_2_sided",
      creationMode: payload.creationMode ?? "bcsx_declare",
      status: "pending_approval",
    };
    mutateMockDatabase((db) => {
      db.dependents = [newDep, ...(db.dependents ?? [])];
    });
    return ok(newDep);
  }),

  http.post("/api/dependents/import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as { projectId: string; items: Partial<Dependent>[] };
    const database = readMockDatabase();
    const newDeps: Dependent[] = (payload.items ?? []).map((item) => {
      const emp = database.employees.find((e) => e.code === item.employeeCode || e.id === item.employeeId);
      return {
        id: uid("dep"),
        employeeId: emp?.id ?? item.employeeId ?? "",
        employeeCode: emp?.code ?? item.employeeCode ?? "",
        employeeName: emp?.name ?? item.employeeName ?? "",
        projectId: payload.projectId,
        fullName: item.fullName ?? "",
        relationship: item.relationship ?? "child",
        dob: item.dob ?? "2019-01-01",
        idCardOrTaxCode: item.idCardOrTaxCode ?? "",
        startDate: item.startDate ?? "2026-08",
        attachmentUrl: item.attachmentUrl ?? "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80",
        attachmentName: item.attachmentName ?? "CCCD_Import.pdf",
        attachmentType: item.attachmentType ?? "cccd_2_sided",
        creationMode: "accountant_import",
        status: "pending_approval",
      };
    });
    mutateMockDatabase((db) => {
      db.dependents = [...newDeps, ...(db.dependents ?? [])];
    });
    return ok(newDeps);
  }),

  http.post("/api/dependents/confirm", async ({ request }) => {
    await delay(300);
    const payload = (await request.json()) as { ids: string[]; verifiedBy?: string };
    const targetIds = new Set(payload.ids ?? []);
    const verifiedBy = payload.verifiedBy ?? "Trần Thu Trang (Kế toán)";
    const verifiedAt = new Date().toISOString().replace("T", " ").slice(0, 16);

    let updatedList: Dependent[] = [];
    mutateMockDatabase((db) => {
      db.dependents = (db.dependents ?? []).map((d) => {
        if (targetIds.has(d.id)) {
          return {
            ...d,
            status: "approved",
            verifiedBy,
            verifiedAt,
            rejectionReason: undefined,
          };
        }
        return d;
      });
      updatedList = db.dependents.filter((d) => targetIds.has(d.id));

      // Synchronize Tax Config approved dependents count
      const empIds = new Set(updatedList.map((d) => d.employeeId));
      db.taxConfigs = (db.taxConfigs ?? []).map((tc) => {
        if (empIds.has(tc.employeeId)) {
          const approvedCount = db.dependents.filter((d) => d.employeeId === tc.employeeId && d.status === "approved").length;
          return {
            ...tc,
            approvedDependentsCount: approvedCount,
            dependentDeduction: approvedCount * 4400000,
          };
        }
        return tc;
      });
    });
    return ok(updatedList);
  }),

  http.post("/api/dependents/:id/reject", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { reason: string };
    const verifiedBy = "Trần Thu Trang (Kế toán)";
    const verifiedAt = new Date().toISOString().replace("T", " ").slice(0, 16);

    let rejectedItem: Dependent | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.dependents ?? []).findIndex((d) => d.id === id);
      if (idx >= 0) {
        db.dependents[idx] = {
          ...db.dependents[idx],
          status: "rejected",
          verifiedBy,
          verifiedAt,
          rejectionReason: payload.reason,
        };
        rejectedItem = db.dependents[idx];

        // Sync Tax Config
        const empId = rejectedItem.employeeId;
        const approvedCount = db.dependents.filter((d) => d.employeeId === empId && d.status === "approved").length;
        const tcIdx = (db.taxConfigs ?? []).findIndex((tc) => tc.employeeId === empId);
        if (tcIdx >= 0) {
          db.taxConfigs[tcIdx] = {
            ...db.taxConfigs[tcIdx],
            approvedDependentsCount: approvedCount,
            dependentDeduction: approvedCount * 4400000,
          };
        }
      }
    });
    return rejectedItem ? ok(rejectedItem) : fail(404, "DEPENDENT_NOT_FOUND", "Không tìm thấy người phụ thuộc");
  }),

  http.put("/api/dependents/:id", async ({ params, request }) => {
    await delay(250);
    const id = String(params.id);
    const payload = (await request.json()) as Partial<Dependent>;

    let updatedItem: Dependent | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.dependents ?? []).findIndex((d) => d.id === id);
      if (idx >= 0) {
        db.dependents[idx] = {
          ...db.dependents[idx],
          ...payload,
        };
        updatedItem = db.dependents[idx];

        const empId = db.dependents[idx].employeeId;
        const approvedCount = db.dependents.filter((d) => d.employeeId === empId && d.status === "approved").length;
        const tcIdx = (db.taxConfigs ?? []).findIndex((t) => t.employeeId === empId);
        if (tcIdx >= 0) {
          db.taxConfigs[tcIdx] = {
            ...db.taxConfigs[tcIdx],
            approvedDependentsCount: approvedCount,
            dependentDeduction: approvedCount * 4400000,
          };
        }
      }
    });
    return updatedItem ? ok(updatedItem) : fail(404, "DEPENDENT_NOT_FOUND", "Không tìm thấy người phụ thuộc");
  }),

  http.patch("/api/dependents/:id/attachment", async ({ params, request }) => {
    await delay(250);
    const id = String(params.id);
    const payload = (await request.json()) as { attachmentType: string; attachmentName: string; attachmentUrl?: string };

    let updatedItem: Dependent | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.dependents ?? []).findIndex((d) => d.id === id);
      if (idx >= 0) {
        db.dependents[idx] = {
          ...db.dependents[idx],
          attachmentType: payload.attachmentType as any,
          attachmentName: payload.attachmentName,
          attachmentUrl: payload.attachmentUrl ?? db.dependents[idx].attachmentUrl,
        };
        updatedItem = db.dependents[idx];
      }
    });
    return updatedItem ? ok(updatedItem) : fail(404, "DEPENDENT_NOT_FOUND", "Không tìm thấy người phụ thuộc");
  }),

  http.get("/api/leave-records", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.leaveRecords ?? [];
    if (projId && projId !== "all") {
      list = list.filter((l) => l.projectId === projId);
    }
    return ok(list);
  }),

  http.post("/api/leave-records/:employeeId/history", async ({ params, request }) => {
    await delay(300);
    const empId = String(params.employeeId);
    const payload = (await request.json()) as Omit<LeaveHistoryItem, "id" | "approvedAt">;
    const newHistory: LeaveHistoryItem = {
      id: uid("lh"),
      ...payload,
      approvedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    };
    let updatedRecord: LeaveRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.leaveRecords ?? []).findIndex((l) => l.employeeId === empId);
      if (idx >= 0) {
        const current = db.leaveRecords[idx];
        const usedDays = current.usedDays + payload.days;
        const totalWithSeniority = current.totalEntitled + (current.seniorityDays || 0);
        const remainingDays = Math.max(0, totalWithSeniority - usedDays);
        const availableDays = Math.max(0, (current.accruedDays || 8) - usedDays);
        db.leaveRecords[idx] = {
          ...current,
          usedDays,
          remainingDays,
          availableDays,
          history: [newHistory, ...current.history],
        };
        updatedRecord = db.leaveRecords[idx];
      }
    });
    return updatedRecord ? ok(updatedRecord) : fail(404, "LEAVE_RECORD_NOT_FOUND", "Không tìm thấy bản ghi phép năm");
  }),

  http.get("/api/union-fees", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const period = url.searchParams.get("period");
    const database = readMockDatabase();
    let list = database.unionFees ?? [];
    if (projId && projId !== "all") {
      list = list.filter((u) => u.projectId === projId);
    }
    if (period) {
      list = list.filter((u) => u.period === period);
    }
    return ok(list);
  }),

  http.post("/api/union-fees/import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as { projectId: string; period: string; items: Partial<UnionFeeRecord>[] };
    const database = readMockDatabase();
    const newRecords: UnionFeeRecord[] = (payload.items ?? []).map((item) => {
      const emp = database.employees.find((e) => e.code === item.employeeCode || e.id === item.employeeId);
      return {
        id: `union-${emp?.id ?? uid("uf")}`,
        employeeId: emp?.id ?? item.employeeId ?? "",
        employeeCode: emp?.code ?? item.employeeCode ?? "",
        employeeName: emp?.name ?? item.employeeName ?? "",
        projectId: payload.projectId,
        period: payload.period,
        feeType: item.feeType ?? "percentage",
        amount: item.amount ?? 23400,
        isParticipating: item.isParticipating !== false,
        importedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        importedBy: "Kế toán tiền lương",
      };
    });
    mutateMockDatabase((db) => {
      const existing = (db.unionFees ?? []).filter((u) => u.projectId !== payload.projectId || u.period !== payload.period);
      db.unionFees = [...newRecords, ...existing];
    });
    return ok(newRecords);
  }),

  http.patch("/api/union-fees/:id", async ({ params, request }) => {
    await delay(200);
    const { id } = params;
    const payload = (await request.json()) as Partial<UnionFeeRecord> & { note?: string };
    let updated: UnionFeeRecord | null = null;
    mutateMockDatabase((db) => {
      const idx = (db.unionFees ?? []).findIndex((u) => u.id === id);
      if (idx !== -1) {
        const cur = db.unionFees[idx];
        const newIsPart = payload.isParticipating !== undefined ? payload.isParticipating : cur.isParticipating;
        const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16);
        const actionLabel = newIsPart ? "Đăng ký tham gia Công đoàn" : "Hủy tham gia Công đoàn";
        const historyItem = {
          id: `ufh-${Date.now()}`,
          actionDate: nowStr,
          actionType: newIsPart ? ("join" as const) : ("leave" as const),
          actionLabel,
          amount: newIsPart ? cur.amount : 0,
          changedBy: "Trần Minh Anh (Kế toán C&B)",
          note: payload.note || (newIsPart ? "Kích hoạt tham gia lại Công đoàn" : "Hủy tham gia trích nộp Công đoàn"),
        };
        db.unionFees[idx] = {
          ...cur,
          ...payload,
          isParticipating: newIsPart,
          joinedUnionDate: newIsPart ? (cur.joinedUnionDate || nowStr.slice(0, 10)) : undefined,
          history: [historyItem, ...(cur.history ?? [])],
        };
        updated = db.unionFees[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "NOT_FOUND", "Không tìm thấy bản ghi Công đoàn phí");
  }),

  http.get("/api/standard-workdays", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.standardWorkdays ?? [];
    if (projId && projId !== "all") {
      list = list.filter((w) => w.projectId === projId);
    }
    return ok(list);
  }),

  http.patch("/api/standard-workdays/:id", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { overrideDays?: number; isOverridden: boolean; reason?: string };
    let updated: StandardWorkdayRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.standardWorkdays ?? []).findIndex((w) => w.id === id);
      if (idx >= 0) {
        db.standardWorkdays[idx] = {
          ...db.standardWorkdays[idx],
          overrideDays: payload.overrideDays,
          isOverridden: payload.isOverridden,
          reason: payload.reason,
          updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          updatedBy: "Kế toán tiền lương",
        };
        updated = db.standardWorkdays[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy bản ghi");
  }),

  http.post("/api/standard-workdays/batch-import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as {
      projectId: string;
      items: Array<{ employeeCode: string; overrideDays: number; reason?: string }>;
    };
    const database = readMockDatabase();
    const updatedList: StandardWorkdayRecord[] = [];
    mutateMockDatabase((db) => {
      payload.items.forEach((item) => {
        const emp = database.employees.find((e) => e.code === item.employeeCode);
        if (emp) {
          const idx = (db.standardWorkdays ?? []).findIndex((w) => w.employeeId === emp.id || w.employeeCode === emp.code);
          const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16);
          if (idx >= 0) {
            db.standardWorkdays[idx] = {
              ...db.standardWorkdays[idx],
              overrideDays: item.overrideDays,
              isOverridden: true,
              reason: item.reason || "Cập nhật ngày công chuẩn từ tệp Excel",
              updatedAt: nowStr,
              updatedBy: "Kế toán C&B",
            };
            updatedList.push(db.standardWorkdays[idx]);
          } else {
            const newRec: StandardWorkdayRecord = {
              id: `workday-${emp.id}`,
              employeeId: emp.id,
              employeeCode: emp.code,
              employeeName: emp.name,
              projectId: payload.projectId,
              projectStandardDays: 26,
              overrideDays: item.overrideDays,
              isOverridden: true,
              reason: item.reason || "Cập nhật ngày công chuẩn từ tệp Excel",
              updatedAt: nowStr,
              updatedBy: "Kế toán C&B",
            };
            db.standardWorkdays = [...(db.standardWorkdays ?? []), newRec];
            updatedList.push(newRec);
          }
        }
      });
    });
    return ok(updatedList);
  }),

  http.get("/api/insurance-records", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const database = readMockDatabase();
    let list = database.insuranceRecords ?? [];
    if (projId && projId !== "all") {
      list = list.filter((i) => i.projectId === projId);
    }
    if (fromDate) {
      list = list.filter((i) => !i.toDate || i.toDate >= fromDate);
    }
    if (toDate) {
      list = list.filter((i) => !i.fromDate || i.fromDate <= toDate);
    }
    return ok(list);
  }),

  http.get("/api/insurance/master", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.insuranceRecords ?? [];
    if (projId && projId !== "all") {
      list = list.filter((i) => i.projectId === projId);
    }
    return ok(list);
  }),

  http.get("/api/insurance/changes", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const period = url.searchParams.get("period");
    const status = url.searchParams.get("status");
    const database = readMockDatabase();
    let list = database.insuranceChanges ?? [];
    if (projId && projId !== "all") {
      list = list.filter((c) => c.projectId === projId);
    }
    if (period) {
      list = list.filter((c) => c.period === period);
    }
    if (status && status !== "all") {
      list = list.filter((c) => c.status === status);
    }
    return ok(list);
  }),

  http.post("/api/insurance/changes", async ({ request }) => {
    await delay(300);
    const payload = (await request.json()) as Partial<InsuranceChangeRecord>;
    const database = readMockDatabase();
    const emp = (database.employees ?? []).find((e) => e.id === payload.employeeId);
    const master = (database.insuranceRecords ?? []).find((m) => m.employeeId === payload.employeeId);

    const newRecord: InsuranceChangeRecord = {
      id: `ins-chg-${Date.now()}`,
      employeeId: payload.employeeId ?? "",
      employeeCode: emp?.code ?? payload.employeeCode ?? "",
      employeeName: emp?.name ?? payload.employeeName ?? "",
      projectId: emp?.projectId ?? payload.projectId ?? "prj-jss",
      period: payload.period ?? "2026-08",
      changeType: payload.changeType ?? "salary_adjust",
      oldSalary: master?.insuranceSalary ?? payload.oldSalary ?? 6300000,
      newSalary: payload.newSalary ?? 6300000,
      effectiveMonth: payload.effectiveMonth ?? payload.period ?? "2026-08",
      reason: payload.reason ?? "Điều chỉnh theo thỏa thuận HĐLĐ",
      status: "pending_agency_verification",
      documentName: payload.documentName,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    };

    mutateMockDatabase((db) => {
      db.insuranceChanges = [newRecord, ...(db.insuranceChanges ?? [])];
    });

    return ok(newRecord);
  }),

  http.post("/api/insurance/changes/batch-import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as { items: Partial<InsuranceChangeRecord>[] };
    const database = readMockDatabase();
    const created: InsuranceChangeRecord[] = [];

    mutateMockDatabase((db) => {
      payload.items.forEach((item, idx) => {
        const emp = (database.employees ?? []).find((e) => e.id === item.employeeId || e.code === item.employeeCode);
        const master = (database.insuranceRecords ?? []).find((m) => m.employeeId === (emp?.id ?? item.employeeId));

        const rec: InsuranceChangeRecord = {
          id: `ins-chg-${Date.now()}-${idx}`,
          employeeId: emp?.id ?? item.employeeId ?? `emp-${idx}`,
          employeeCode: emp?.code ?? item.employeeCode ?? "",
          employeeName: emp?.name ?? item.employeeName ?? "",
          projectId: emp?.projectId ?? item.projectId ?? "prj-jss",
          period: item.period ?? "2026-08",
          changeType: item.changeType ?? "salary_adjust",
          oldSalary: master?.insuranceSalary ?? item.oldSalary ?? 6300000,
          newSalary: item.newSalary ?? 6300000,
          effectiveMonth: item.effectiveMonth ?? item.period ?? "2026-08",
          reason: item.reason ?? "Import danh sách biến động D02-LT",
          status: "pending_agency_verification",
          documentName: item.documentName ?? "DanhSachBienDong_D02_LT.xlsx",
          createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        };
        created.push(rec);
      });

      db.insuranceChanges = [...created, ...(db.insuranceChanges ?? [])];
    });

    return ok(created);
  }),

  http.post("/api/insurance/changes/:id/verify", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { verifiedBy?: string; agencyReceiptCode?: string };
    let updatedChange: InsuranceChangeRecord | undefined;

    mutateMockDatabase((db) => {
      const idx = (db.insuranceChanges ?? []).findIndex((c) => c.id === id);
      if (idx >= 0) {
        const change = db.insuranceChanges[idx];
        const verifiedBy = payload.verifiedBy ?? "Trần Thu Trang (Kế toán BHXH)";
        const verifiedAt = new Date().toISOString().replace("T", " ").slice(0, 16);
        const agencyReceiptCode = payload.agencyReceiptCode ?? `BHXH-7901-${change.period.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;

        db.insuranceChanges[idx] = {
          ...change,
          status: "verified",
          agencyReceiptCode,
          verifiedBy,
          verifiedAt,
        };
        updatedChange = db.insuranceChanges[idx];

        // Tự động đồng bộ cập nhật vào Sổ BHXH Master
        const masterIdx = (db.insuranceRecords ?? []).findIndex((m) => m.employeeId === change.employeeId);
        if (masterIdx >= 0) {
          const master = db.insuranceRecords[masterIdx];
          let nextStatus: "active" | "suspended" | "stopped" = master.status;
          let nextSalary = master.insuranceSalary;

          if (change.changeType === "increase" || change.changeType === "salary_adjust" || change.changeType === "resume") {
            nextStatus = "active";
            nextSalary = change.newSalary;
          } else if (change.changeType === "decrease") {
            nextStatus = "stopped";
          } else if (change.changeType === "suspend") {
            nextStatus = "suspended";
          }

          db.insuranceRecords[masterIdx] = {
            ...master,
            insuranceSalary: nextSalary,
            status: nextStatus,
            effectiveMonth: change.effectiveMonth,
            verifiedBy,
            verifiedAt,
          };
        }
      }
    });

    return updatedChange ? ok(updatedChange) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy hồ sơ biến động BHXH");
  }),

  http.post("/api/insurance/changes/batch-verify", async ({ request }) => {
    await delay(350);
    const payload = (await request.json()) as { ids: string[]; verifiedBy?: string; agencyReceiptCode?: string };
    const idSet = new Set(payload.ids ?? []);
    const verifiedBy = payload.verifiedBy ?? "Trần Thu Trang (Kế toán BHXH)";
    const verifiedAt = new Date().toISOString().replace("T", " ").slice(0, 16);
    let updatedList: InsuranceChangeRecord[] = [];

    mutateMockDatabase((db) => {
      db.insuranceChanges = (db.insuranceChanges ?? []).map((change) => {
        if (idSet.has(change.id)) {
          const agencyReceiptCode = payload.agencyReceiptCode ?? `BHXH-7901-${change.period.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
          const updated = {
            ...change,
            status: "verified" as const,
            agencyReceiptCode,
            verifiedBy,
            verifiedAt,
          };

          // Đồng bộ vào Master
          const masterIdx = (db.insuranceRecords ?? []).findIndex((m) => m.employeeId === change.employeeId);
          if (masterIdx >= 0) {
            const master = db.insuranceRecords[masterIdx];
            let nextStatus: "active" | "suspended" | "stopped" = master.status;
            let nextSalary = master.insuranceSalary;

            if (change.changeType === "increase" || change.changeType === "salary_adjust" || change.changeType === "resume") {
              nextStatus = "active";
              nextSalary = change.newSalary;
            } else if (change.changeType === "decrease") {
              nextStatus = "stopped";
            } else if (change.changeType === "suspend") {
              nextStatus = "suspended";
            }

            db.insuranceRecords[masterIdx] = {
              ...master,
              insuranceSalary: nextSalary,
              status: nextStatus,
              effectiveMonth: change.effectiveMonth,
              verifiedBy,
              verifiedAt,
            };
          }

          return updated;
        }
        return change;
      });

      updatedList = db.insuranceChanges.filter((c) => idSet.has(c.id));
    });

    return ok(updatedList);
  }),

  http.post("/api/insurance/changes/:id/reject", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { rejectionReason: string };
    let updatedChange: InsuranceChangeRecord | undefined;

    mutateMockDatabase((db) => {
      const idx = (db.insuranceChanges ?? []).findIndex((c) => c.id === id);
      if (idx >= 0) {
        db.insuranceChanges[idx] = {
          ...db.insuranceChanges[idx],
          status: "rejected",
          rejectionReason: payload.rejectionReason || "Không khớp thông tin hợp đồng / cơ quan BHXH",
          verifiedBy: "Trần Thu Trang (Kế toán BHXH)",
          verifiedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        };
        updatedChange = db.insuranceChanges[idx];
      }
    });

    return updatedChange ? ok(updatedChange) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy bản ghi biến động");
  }),

  http.post("/api/insurance-records/:id/verify", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as { verifiedBy?: string };
    let updated: InsuranceRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.insuranceRecords ?? []).findIndex((i) => i.id === id);
      if (idx >= 0) {
        db.insuranceRecords[idx] = {
          ...db.insuranceRecords[idx],
          status: "active",
          verifiedBy: payload.verifiedBy ?? "Trần Thu Trang (Kế toán BHXH)",
          verifiedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        };
        updated = db.insuranceRecords[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy hồ sơ BHXH");
  }),

  http.post("/api/insurance-records/batch-verify", async ({ request }) => {
    await delay(300);
    const payload = (await request.json()) as { ids: string[]; verifiedBy?: string };
    const idSet = new Set(payload.ids ?? []);
    const verifiedBy = payload.verifiedBy ?? "Trần Thu Trang (Kế toán BHXH)";
    const verifiedAt = new Date().toISOString().replace("T", " ").slice(0, 16);
    let updatedList: InsuranceRecord[] = [];
    mutateMockDatabase((db) => {
      db.insuranceRecords = (db.insuranceRecords ?? []).map((i) => {
        if (idSet.has(i.id)) {
          return {
            ...i,
            status: "active",
            verifiedBy,
            verifiedAt,
          };
        }
        return i;
      });
      updatedList = db.insuranceRecords.filter((i) => idSet.has(i.id));
    });
    return ok(updatedList);
  }),

  http.get("/api/tax-configs", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.taxConfigs ?? [];
    if (projId && projId !== "all") {
      list = list.filter((t) => t.projectId === projId);
    }
    return ok(list);
  }),

  http.patch("/api/tax-configs/:id", async ({ params, request }) => {
    await delay(300);
    const id = String(params.id);
    const payload = (await request.json()) as Partial<TaxConfigRecord>;
    let updated: TaxConfigRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.taxConfigs ?? []).findIndex((t) => t.id === id);
      if (idx >= 0) {
        db.taxConfigs[idx] = {
          ...db.taxConfigs[idx],
          ...payload,
        };
        updated = db.taxConfigs[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy cấu hình thuế");
  }),

  http.get("/api/employee-policies", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const projId = url.searchParams.get("projectId");
    const database = readMockDatabase();
    let list = database.employeePolicies ?? [];
    if (projId && projId !== "all") {
      list = list.filter((p) => p.projectId === projId);
    }
    return ok(list);
  }),

  http.get("/api/employee-policies/:employeeId", async ({ params }) => {
    await delay(150);
    const empId = String(params.employeeId);
    const database = readMockDatabase();
    const item = (database.employeePolicies ?? []).find(
      (p) => p.employeeId === empId || p.id === empId || p.employeeCode === empId
    );
    return item ? ok(item) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy chế độ nhân sự");
  }),

  http.put("/api/employee-policies/:employeeId", async ({ params, request }) => {
    await delay(300);
    const empId = String(params.employeeId);
    const payload = (await request.json()) as {
      policies: EmployeePolicyItem[];
      baseSalary?: number;
      insuranceSalary?: number;
    };
    let updated: EmployeePolicyRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.employeePolicies ?? []).findIndex(
        (p) => p.employeeId === empId || p.id === empId || p.employeeCode === empId
      );
      if (idx >= 0) {
        const cur = db.employeePolicies[idx];
        const newPolicies = payload.policies ?? cur.policies;

        const baseSalItem = newPolicies.find((i) => i.policyId === "pol-base-salary");
        const insSalItem = newPolicies.find((i) => i.policyId === "pol-insurance-salary");

        const baseSalary =
          payload.baseSalary ??
          Number(
            (baseSalItem?.isCustom ? baseSalItem.customValue?.amount : baseSalItem?.defaultValue?.amount) ||
              cur.baseSalary
          );

        const insuranceSalary =
          payload.insuranceSalary ??
          Number(
            (insSalItem?.isCustom ? insSalItem.customValue?.amount : insSalItem?.defaultValue?.amount) ||
              cur.insuranceSalary
          );

        const totalAllowance = newPolicies
          .filter(
            (i) =>
              i.isEnabled &&
              i.policyId !== "pol-base-salary" &&
              i.policyId !== "pol-insurance-salary" &&
              i.policyId !== "pol-hourly-rate" &&
              !i.policyId.startsWith("pol-ot")
          )
          .reduce((sum, i) => {
            const val = i.isCustom ? i.customValue?.amount : i.defaultValue?.amount;
            return sum + (typeof val === "number" ? val : 0);
          }, 0);

        const customPolicyCount = newPolicies.filter((i) => i.isCustom).length;
        const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16);

        db.employeePolicies[idx] = {
          ...cur,
          baseSalary,
          insuranceSalary,
          totalAllowance,
          customPolicyCount,
          policies: newPolicies,
          updatedAt: nowStr,
          updatedBy: "Kế toán tiền lương",
        };
        updated = db.employeePolicies[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy chế độ nhân sự");
  }),

  http.post("/api/employee-policies/batch-import", async ({ request }) => {
    await delay(400);
    const payload = (await request.json()) as {
      projectId: string;
      items: Array<{ employeeCode: string; policyCode: string; amount: number; isEnabled?: boolean; reason?: string }>;
    };
    const updatedList: EmployeePolicyRecord[] = [];
    mutateMockDatabase((db) => {
      payload.items.forEach((item) => {
        const idx = (db.employeePolicies ?? []).findIndex((p) => p.employeeCode === item.employeeCode);
        if (idx >= 0) {
          const cur = db.employeePolicies[idx];
          const newPolicies = cur.policies.map((p) => {
            if (p.policyCode === item.policyCode || p.policyId === item.policyCode) {
              return {
                ...p,
                isEnabled: item.isEnabled !== undefined ? item.isEnabled : true,
                isCustom: true,
                customValue: { ...p.customValue, amount: item.amount },
                reason: item.reason || "Cập nhật phụ cấp từ tệp Excel",
                updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
                updatedBy: "Kế toán C&B",
              };
            }
            return p;
          });

          const totalAllowance = newPolicies
            .filter(
              (i) =>
                i.isEnabled &&
                i.policyId !== "pol-base-salary" &&
                i.policyId !== "pol-insurance-salary" &&
                i.policyId !== "pol-hourly-rate" &&
                !i.policyId.startsWith("pol-ot")
            )
            .reduce((sum, i) => {
              const val = i.isCustom ? i.customValue?.amount : i.defaultValue?.amount;
              return sum + (typeof val === "number" ? val : 0);
            }, 0);

          db.employeePolicies[idx] = {
            ...cur,
            policies: newPolicies,
            totalAllowance,
            customPolicyCount: newPolicies.filter((i) => i.isCustom).length,
            updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
            updatedBy: "Kế toán C&B",
          };
          updatedList.push(db.employeePolicies[idx]);
        }
      });
    });
    return ok(updatedList);
  }),

  http.post("/api/employee-policies/:employeeId/reset", async ({ params }) => {
    await delay(300);
    const empId = String(params.employeeId);
    let updated: EmployeePolicyRecord | undefined;
    mutateMockDatabase((db) => {
      const idx = (db.employeePolicies ?? []).findIndex(
        (p) => p.employeeId === empId || p.id === empId || p.employeeCode === empId
      );
      if (idx >= 0) {
        const cur = db.employeePolicies[idx];
        const resetPolicies = cur.policies.map((p) => ({
          ...p,
          isCustom: false,
          customValue: { ...p.defaultValue },
          isEnabled: (p.policyId !== "pol-responsibility" && p.policyCode !== "RESPONSIBILITY_ALLOWANCE") || cur.role === "shift_leader",
          reason: undefined,
          updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          updatedBy: "Hệ thống (Mặc định dự án)",
        }));

        const totalAllowance = resetPolicies
          .filter(
            (i) =>
              i.isEnabled &&
              i.policyId !== "pol-base-salary" &&
              i.policyId !== "pol-insurance-salary" &&
              i.policyId !== "pol-hourly-rate" &&
              !i.policyId.startsWith("pol-ot")
          )
          .reduce((sum, i) => {
            const val = i.defaultValue?.amount;
            return sum + (typeof val === "number" ? val : 0);
          }, 0);

        db.employeePolicies[idx] = {
          ...cur,
          baseSalary: cur.role === "shift_leader" ? 7000000 : 6300000,
          insuranceSalary: cur.role === "shift_leader" ? 8000000 : 6300000,
          totalAllowance,
          customPolicyCount: 0,
          policies: resetPolicies,
          updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
          updatedBy: "Hệ thống (Mặc định dự án)",
        };
        updated = db.employeePolicies[idx];
      }
    });
    return updated ? ok(updated) : fail(404, "RECORD_NOT_FOUND", "Không tìm thấy chế độ nhân sự");
  }),
];
