import type {
  ActivityLogItem,
  ActivityLogModule,
  ApiResponse,
  AttendanceConfig,
  DataMapping,
  Dependent,
  Employee,
  FormulaVariable,
  InsuranceChangeRecord,
  InsuranceRecord,
  LeaveHistoryItem,
  LeaveRecord,
  OvertimeType,
  PaginationMeta,
  PolicyDefinition,
  Project,
  ProjectCustomVariable,
  ProjectOvertimeConfig,
  ProjectPolicy,
  SalaryFormula,
  StandardWorkdayRecord,
  TaxConfigRecord,
  TestEmployee,
  TestRunResult,
  UnionFeeRecord,
  EmployeePolicyItem,
  EmployeePolicyRecord,
  ProjectEmployeeGroup,
  ProjectPoliciesResponseData,
  OtherDeductionRecord,
  OtherIncomeRecord,
} from "@/lib/types";

import { handlers } from "@/mocks/handlers";
import { formatDate } from "@/lib/utils";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<{ data: T; meta?: PaginationMeta }> {
  // 1. Chạy trực tiếp qua MSW handlers in-memory nếu đang ở môi trường nhúng / không có API server
  try {
    const baseOrigin =
      typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null"
        ? window.location.origin
        : "http://localhost";
    const fullUrl = url.startsWith("http") ? url : new URL(url, baseOrigin).href;
    const req = new Request(fullUrl, init);
    for (const handler of handlers) {
      const result = await handler.run({ request: req });
      if (result && result.response) {
        const payload = (await result.response.json()) as ApiResponse<T>;
        if (!result.response.ok || payload.error) {
          throw new ApiRequestError(
            payload.error?.message ?? "Yêu cầu thất bại",
            payload.error?.code ?? "UNKNOWN_ERROR",
            result.response.status,
            payload.error?.fields
          );
        }
        return { data: payload.data, meta: payload.meta };
      }
    }
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    // Nếu có lỗi parse trong in-memory handler, fallback tiếp tục thử fetch
  }

  // 2. Fallback fetch thông thường
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiRequestError(`API endpoint không tồn tại (Status: ${response.status})`, "NOT_FOUND", response.status);
  }
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.error) {
    throw new ApiRequestError(payload.error?.message ?? "Yêu cầu thất bại", payload.error?.code ?? "UNKNOWN_ERROR", response.status, payload.error?.fields);
  }
  return { data: payload.data, meta: payload.meta };
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    if ((window as any).API_BASE_URL) return (window as any).API_BASE_URL;
    const widget = document.querySelector("payroll-projects, payroll-widget, payroll-employees");
    const attrUrl = widget?.getAttribute("api-base-url");
    if (attrUrl) return attrUrl;
  }
  return "https://bruh.thanhf.dev/api/";
}

export function getAuthToken(): string {
  if (typeof window !== "undefined") {
    if ((window as any).__SERVER_TOKEN) return (window as any).__SERVER_TOKEN;
    const widget = document.querySelector("payroll-projects, payroll-widget, payroll-employees");
    const attrToken = widget?.getAttribute("auth-token");
    if (attrToken) return attrToken;
  }
  return "";
}

const cachedProjectsMap = new Map<string, Project>();

export const api = {
  getLookupProjects: async (): Promise<Array<{ id: string; code: string; name: string }>> => {
    // 1. Kiểm tra cache window.__SERVER_PROJECTS (nếu ASP.NET inject sẵn như trang Dashboard)
    if (typeof window !== "undefined") {
      const serverProjects = (window as any).__SERVER_PROJECTS;
      if (Array.isArray(serverProjects) && serverProjects.length > 0) {
        return serverProjects.map((p: any) => ({
          id: String(p.id ?? p.ProjectId ?? p.Id ?? ""),
          code: String(p.code ?? p.ProjectCode ?? "").trim(),
          name: String(p.name ?? p.ProjectName ?? p.code ?? `Dự án #${p.id}`).trim(),
        }));
      }
    }

    // 2. Gọi API giống hệt trang Home/Dashboard: /api/project/getprojectbyuserid?status=true
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 && !rawBaseUrl.startsWith("/api/payroll") ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const userId = typeof window !== "undefined" && typeof (window as any).__SERVER_USER_ID === "number" ? (window as any).__SERVER_USER_ID : 0;

    const apiRoot = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
    const url = `${apiRoot}/project/getprojectbyuserid?status=true${userId > 0 ? `&UserId=${userId}` : ""}`;

    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { method: "GET", headers });
      if (response.ok) {
        const data = await response.json();
        const rawList: any[] = Array.isArray(data)
          ? data
          : data && Array.isArray(data.Data)
          ? data.Data
          : data && Array.isArray(data.data)
          ? data.data
          : [];

        if (rawList.length > 0) {
          return rawList
            .filter((p: any) => p && p.Active !== false && p.active !== false)
            .map((p: any) => {
              const pId = String(p.ProjectId ?? p.projectId ?? p.Id ?? p.id ?? "");
              const pCode = String(p.ProjectCode ?? p.projectCode ?? "").trim();
              const pName = String(p.ProjectName ?? p.projectName ?? pCode ?? `Dự án #${pId}`).trim();
              return {
                id: pId,
                code: pCode,
                name: pName,
              };
            });
        }
      }
    } catch (err) {
      console.warn("[getLookupProjects] Lỗi gọi /api/project/getprojectbyuserid, fallback:", err);
    }

    // 3. Fallback sang /web/payroll/projects nếu endpoint cũ không phản hồi
    try {
      const fallbackRes = await api.getProjects({ pageSize: 100 });
      return fallbackRes.data.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      }));
    } catch {
      return [];
    }
  },
  getProjects: async (params: { q?: string; status?: string; page?: number; pageSize?: number }) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const search = params.q ?? "";
    const pageIndex = params.page ?? 1;
    const pageSize = params.pageSize ?? 8;

    const query = new URLSearchParams();
    if (search) query.set("search", search);
    query.set("pageIndex", String(pageIndex));
    query.set("pageSize", String(pageSize));

    const url = `${baseUrl}/web/payroll/projects?${query.toString()}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh sách dự án (Status: ${response.status})`,
        "FETCH_PROJECTS_FAILED",
        response.status
      );
    }
    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy dữ liệu danh sách dự án",
        "API_ERROR",
        response.status
      );
    }

    const dataObj = resJson.data || {};
    const rawItems: any[] = Array.isArray(dataObj.items) ? dataObj.items : Array.isArray(dataObj) ? dataObj : [];
    const totalRow: number = typeof dataObj.totalRow === "number" ? dataObj.totalRow : rawItems.length;
    const currentPage: number = typeof dataObj.pageIndex === "number" ? dataObj.pageIndex : pageIndex;
    const currentPageSize: number = typeof dataObj.pageSize === "number" ? dataObj.pageSize : pageSize;
    const totalPages = Math.max(1, Math.ceil(totalRow / (currentPageSize || 1)));

    const items: Project[] = rawItems.map((item: any) => {
      const startCycle = item.payrollCycleStartDate;
      const endCycle = item.payrollCycleEndDate;
      let cycle = "Hàng tháng";
      if (startCycle && endCycle) {
        cycle = `${formatDate(startCycle)} - ${formatDate(endCycle)}`;
      } else if (startCycle) {
        cycle = `Từ ${formatDate(startCycle)}`;
      }

      return {
        id: String(item.projectId ?? item.id ?? ""),
        code: item.projectCode || "",
        name: item.projectName || "",
        client: item.projectName || "",
        location: "",
        manager: item.ownerName || "Chưa phân công",
        managerEmail: item.ownerEmail || undefined,
        managerPhone: item.ownerPhone || undefined,
        employeeCount: typeof item.totalActiveEmployees === "number" ? item.totalActiveEmployees : 0,
        status: "active",
        payrollCycle: cycle,
        payrollCycleStartDate: startCycle || undefined,
        payrollCycleEndDate: endCycle || undefined,
        effectiveFrom: "2026-01-01",
        templateName: "Quy chuẩn",
        updatedAt: new Date().toISOString(),
        tabStates: {
          overview: "complete",
          policies: "complete",
          attendance: "complete",
          formulas: "complete",
        },
      };
    });

    // Cache tất cả dự án để sử dụng trực tiếp trong detail mà không cần gọi API riêng
    for (const p of items) {
      cachedProjectsMap.set(p.id, p);
      if (p.code) cachedProjectsMap.set(p.code, p);
    }

    return {
      data: items,
      meta: {
        page: currentPage,
        pageSize: currentPageSize,
        total: totalRow,
        totalPages: totalPages,
      },
    };
  },
  createProject: (payload: Partial<Project>) => request<Project>("/api/projects", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getProject: async (id: string): Promise<Project> => {
    // 1. Lấy trực tiếp từ cache danh sách dự án
    const cached = cachedProjectsMap.get(String(id));
    if (cached) return cached;

    // 2. Nếu chưa có trong cache (F5 trực tiếp trang detail), lấy từ danh sách dự án
    try {
      const listRes = await api.getProjects({ pageSize: 100 });
      const found = listRes.data.find((p) => String(p.id) === String(id) || String(p.code) === String(id));
      if (found) return found;
    } catch {
      // Fallback
    }

    return {
      id: String(id),
      code: `PRJ-${id}`,
      name: `Dự án #${id}`,
      client: `Dự án #${id}`,
      location: "",
      manager: "Chưa phân công",
      employeeCount: 0,
      status: "active",
      payrollCycle: "Hàng tháng",
      effectiveFrom: "2026-01-01",
      templateName: "Quy chuẩn",
      updatedAt: new Date().toISOString(),
      tabStates: {
        overview: "complete",
        policies: "complete",
        attendance: "complete",
        formulas: "complete",
      },
    };
  },
  updateProject: (id: string, payload: Partial<Project>) => request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  cloneProject: (id: string) => request<Project>(`/api/projects/${id}/clone`, { method: "POST" }).then((item) => item.data),
  getPolicyDefinitions: async (projectId?: string | number): Promise<PolicyDefinition[]> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (projectId !== undefined && projectId !== null && String(projectId).trim() !== "") {
      query.set("projectId", String(projectId).trim());
    }
    const queryString = query.toString();
    const url = `${baseUrl}/web/payroll/policies${queryString ? `?${queryString}` : ""}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh mục chế độ (Status: ${response.status})`,
        "FETCH_POLICIES_FAILED",
        response.status
      );
    }
    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh mục chế độ",
        "API_ERROR",
        response.status
      );
    }

    const rawItems: any[] = Array.isArray(resJson.data) ? resJson.data : [];
    return rawItems.map((item: any) => {
      const isPercentage = item.dataType === "percentage" || String(item.typeName).toLowerCase().includes("phần trăm");
      return {
        id: String(item.id),
        code: item.policyCode || "",
        name: item.policyName || "",
        category: isPercentage ? "bonus" : "allowance",
        description: item.description || item.typeName || "",
        fields: [
          {
            key: isPercentage ? "multiplier" : "amount",
            label: item.policyName || "",
            type: isPercentage ? "percentage" : "money",
            unit: isPercentage ? "%" : "VNĐ/tháng",
            defaultValue: 0,
          },
        ],
        targetValues: {},
      };
    });
  },
  addPoliciesToProject: async (
    projectId: string,
    payload: {
      PolicyItemIds: number[];
      EffectiveFrom: string;
      EffectiveTo?: string;
    }
  ) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/policies`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        PolicyItemIds: payload.PolicyItemIds,
        EffectiveFrom: payload.EffectiveFrom,
        EffectiveTo: payload.EffectiveTo || payload.EffectiveFrom,
      }),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể thêm chế độ vào dự án (Status: ${response.status})`,
        "ADD_POLICIES_FAILED",
        response.status
      );
    }

    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi thêm chế độ vào dự án",
        "API_ERROR",
        response.status
      );
    }

    return resJson.data;
  },
  getProjectPolicies: async (
    id: string,
    params?: { pageIndex?: number; pageSize?: number; search?: string }
  ): Promise<ProjectPoliciesResponseData> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const pageIndex = params?.pageIndex ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const search = params?.search ?? "";

    const query = new URLSearchParams();
    query.set("pageIndex", String(pageIndex));
    query.set("pageSize", String(pageSize));
    if (search) query.set("search", search);

    const url = `${baseUrl}/web/payroll/projects/${id}/policies?${query.toString()}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tải danh sách chế độ dự án (Status: ${response.status})`,
        "FETCH_PROJECT_POLICIES_FAILED",
        response.status
      );
    }
    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách chế độ dự án",
        "API_ERROR",
        response.status
      );
    }

    const data = resJson.data || {};
    return {
      columns: Array.isArray(data.columns) ? data.columns : [],
      rows: Array.isArray(data.rows) ? data.rows : [],
      pageIndex: typeof data.pageIndex === "number" ? data.pageIndex : pageIndex,
      pageSize: typeof data.pageSize === "number" ? data.pageSize : pageSize,
      totalRow: typeof data.totalRow === "number" ? data.totalRow : (data.rows?.length ?? 0),
    };
  },
  updateProjectPolicyValues: async (
    projectId: string,
    payload: Array<{
      PolicyId: number | string;
      EffectiveFrom: string;
      EffectiveTo?: string;
      Note?: string;
      Values: Array<{
        TargetGroupId: number | string;
        PolicyValue: string;
      }>;
    }>
  ) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/policies`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const bodyData = payload.map((item) => ({
      PolicyId: Number(item.PolicyId),
      EffectiveFrom: item.EffectiveFrom,
      EffectiveTo: item.EffectiveTo || item.EffectiveFrom,
      Note: item.Note ?? "",
      Values: item.Values.map((v) => ({
        TargetGroupId: Number(v.TargetGroupId),
        PolicyValue: String(v.PolicyValue ?? ""),
      })),
    }));

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể cập nhật chế độ (Status: ${response.status})`,
        "UPDATE_POLICY_FAILED",
        response.status
      );
    }

    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi cập nhật chế độ",
        "API_ERROR",
        response.status
      );
    }

    return resJson;
  },
  deleteProjectPolicy: async (projectId: string, policyId: string | number) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/policies/${policyId}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể bỏ chế độ khỏi dự án (Status: ${response.status})`,
        "DELETE_POLICY_FAILED",
        response.status
      );
    }

    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi xóa chế độ khỏi dự án",
        "API_ERROR",
        response.status
      );
    }

    return resJson;
  },
  getAttendanceConfig: (id: string) => request<AttendanceConfig>(`/api/projects/${id}/attendance-config`).then((item) => item.data),
  saveAttendanceConfig: (id: string, payload: AttendanceConfig) => request<AttendanceConfig>(`/api/projects/${id}/attendance-config`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  getOvertimeTypes: () => request<OvertimeType[]>("/api/overtime-types").then((item) => item.data),
  getOvertimeConfigs: (id: string) => request<ProjectOvertimeConfig[]>(`/api/projects/${id}/overtime-configs`).then((item) => item.data),
  saveOvertimeConfigs: (id: string, payload: ProjectOvertimeConfig[]) => request<ProjectOvertimeConfig[]>(`/api/projects/${id}/overtime-configs`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
   getFormulaVariables: () => request<FormulaVariable[]>("/api/formula-variables").then((item) => item.data),
  getProjectCustomVariables: (id: string) => request<ProjectCustomVariable[]>(`/api/projects/${id}/custom-variables`).then((item) => item.data),
  saveProjectCustomVariables: (id: string, payload: Array<{ code: string; value: number | null }>) => request<ProjectCustomVariable[]>(`/api/projects/${id}/custom-variables`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  getFormulas: (id: string) => request<SalaryFormula[]>(`/api/projects/${id}/formulas`).then((item) => item.data),
  saveFormulas: (id: string, payload: SalaryFormula[]) => request<SalaryFormula[]>(`/api/projects/${id}/formulas`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  validateFormulas: (id: string, payload: SalaryFormula[]) => request<{ valid: boolean; errors: string[] }>(`/api/projects/${id}/formulas/validate`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getDataMappings: (id: string) => request<DataMapping[]>(`/api/projects/${id}/data-mappings`).then((item) => item.data),
  saveDataMappings: (id: string, payload: DataMapping[]) => request<DataMapping[]>(`/api/projects/${id}/data-mappings`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  validateDataMappings: (id: string) => request<{ valid: boolean; issues: string[]; checkedAt: string }>(`/api/projects/${id}/data-mappings/validate`, { method: "POST" }).then((item) => item.data),
  getTestEmployees: () => request<TestEmployee[]>("/api/test-employees").then((item) => item.data),
  runTest: (id: string, payload: { employeeId: string; period: string }) => request<TestRunResult>(`/api/projects/${id}/test-runs`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),

  // Employee Management APIs
  getProjectEmployees: async (
    projectId: string,
    params?: { pageIndex?: number; pageSize?: number; search?: string; isAssigned?: boolean }
  ): Promise<{ items: Employee[]; totalRow: number; pageIndex: number; pageSize: number }> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const pageIndex = params?.pageIndex ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const query = new URLSearchParams();
    query.set("pageIndex", String(pageIndex));
    query.set("pageSize", String(pageSize));
    if (params?.search) query.set("search", params.search);
    if (params?.isAssigned !== undefined && params?.isAssigned !== null) {
      query.set("isAssigned", String(params.isAssigned));
    }

    const url = `${baseUrl}/web/payroll/projects/${projectId}/employees?${query.toString()}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { method: "GET", headers });
      if (!response.ok) {
        throw new ApiRequestError(
          `Không thể tải danh sách nhân viên dự án (Status: ${response.status})`,
          "FETCH_PROJECT_EMPLOYEES_FAILED",
          response.status
        );
      }

      const resJson = await response.json();
      if (!resJson || resJson.success === false) {
        throw new ApiRequestError(
          resJson?.message || "Lỗi khi lấy danh sách nhân viên dự án",
          "API_ERROR",
          response.status
        );
      }

      const data = resJson.data || {};
      const rawList: any[] = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];

      const items: Employee[] = rawList.map((item: any) => ({
        id: String(item.employeeCode || item.id || `emp-${Math.random()}`),
        code: item.employeeCode || item.code || "",
        name: item.fullName || item.name || `Nhân viên #${item.employeeCode || item.id}`,
        idCard: item.idCard || "",
        phone: item.phone || "",
        email: item.email || "",
        gender: item.gender || "",
        projectId: String(projectId),
        projectCode: "",
        department: item.department || "",
        position: item.position || "Nhân viên",
        joinDate: item.joinDate || "",
        status: (item.status || "active") as "active" | "resigned" | "probation",
        groupId: item.currentGroupId !== null && item.currentGroupId !== undefined ? String(item.currentGroupId) : undefined,
        groupName: item.currentGroupName || undefined,
      }));

      return {
        items,
        totalRow: typeof data.totalRow === "number" ? data.totalRow : items.length,
        pageIndex: typeof data.pageIndex === "number" ? data.pageIndex : pageIndex,
        pageSize: typeof data.pageSize === "number" ? data.pageSize : pageSize,
      };
    } catch (err: any) {
      console.warn("[api.getProjectEmployees] Error:", err);
      if (err instanceof ApiRequestError) throw err;
      return { items: [], totalRow: 0, pageIndex: 1, pageSize: 20 };
    }
  },
  getEmployees: (params?: { projectId?: string; q?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<Employee[]>(`/api/employees?${query}`).then((item) => item.data);
  },
  getDependents: (params?: { projectId?: string; employeeId?: string; status?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<Dependent[]>(`/api/dependents?${query}`).then((item) => item.data);
  },
  createDependent: (payload: Partial<Dependent>) =>
    request<Dependent>("/api/dependents", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  importDependents: (payload: { projectId: string; items: Partial<Dependent>[] }) =>
    request<Dependent[]>("/api/dependents/import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  importDependentsFile: async (file: File): Promise<{ success: boolean; message?: string; data?: any }> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 && !rawBaseUrl.startsWith("/api/payroll") ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();

    const apiRoot = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
    const url = `${apiRoot}/web/payroll/dependents/import`;
    const headers: Record<string, string> = {
      Accept: "*/*",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = `Không thể nhập tệp mẫu (Mã lỗi ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.message) errorMsg = errJson.message;
        else if (errJson?.error) errorMsg = errJson.error;
      } catch (_) {}
      throw new ApiRequestError(errorMsg, "IMPORT_DEPENDENTS_FAILED", response.status);
    }

    const resJson = await response.json();
    return resJson;
  },
  confirmDependents: (ids: string[], verifiedBy?: string) =>
    request<Dependent[]>("/api/dependents/confirm", { method: "POST", body: JSON.stringify({ ids, verifiedBy }) }).then((item) => item.data),
  rejectDependent: (id: string, reason: string) =>
    request<Dependent>(`/api/dependents/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }).then((item) => item.data),
  updateDependent: (id: string, payload: Partial<Dependent>) =>
    request<Dependent>(`/api/dependents/${id}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  updateDependentAttachment: (id: string, payload: { attachmentType: string; attachmentName: string; attachmentUrl?: string }) =>
    request<Dependent>(`/api/dependents/${id}/attachment`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  downloadDependentImportTemplate: async (projectId?: string | number): Promise<void> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 && !rawBaseUrl.startsWith("/api/payroll") ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();

    const apiRoot = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
    const url = `${apiRoot}/web/payroll/dependents/download-import-template`;
    const headers: Record<string, string> = {
      Accept: "*/*",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      let errorMsg = `Không thể tải template (Mã lỗi ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.message) errorMsg = errJson.message;
        else if (errJson?.error) errorMsg = errJson.error;
      } catch (_) {}
      throw new ApiRequestError(errorMsg, "DOWNLOAD_TEMPLATE_FAILED", response.status);
    }

    const blob = await response.blob();
    let filename = "Mau_Nguoi_Phu_Thuoc.xlsx";
    const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "").trim();
      }
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },
  getLeaveRecords: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<LeaveRecord[]>(`/api/leave-records?${query}`).then((item) => item.data);
  },
  addLeaveHistory: (employeeId: string, item: Omit<LeaveHistoryItem, "id" | "approvedAt">) =>
    request<LeaveRecord>(`/api/leave-records/${employeeId}/history`, { method: "POST", body: JSON.stringify(item) }).then((item) => item.data),
  getUnionFees: (params?: { projectId?: string; period?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<UnionFeeRecord[]>(`/api/union-fees?${query}`).then((item) => item.data);
  },
  updateUnionFee: (id: string, payload: Partial<UnionFeeRecord> & { note?: string }) =>
    request<UnionFeeRecord>(`/api/union-fees/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  importUnionFees: (payload: { projectId: string; period: string; items: Partial<UnionFeeRecord>[] }) =>
    request<UnionFeeRecord[]>("/api/union-fees/import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getStandardWorkdays: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<StandardWorkdayRecord[]>(`/api/standard-workdays?${query}`).then((item) => item.data);
  },
  batchImportStandardWorkdays: (payload: { projectId: string; items: Array<{ employeeCode: string; overrideDays: number; reason?: string }> }) =>
    request<StandardWorkdayRecord[]>("/api/standard-workdays/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  saveStandardWorkdayOverride: (id: string, payload: { overrideDays?: number; isOverridden: boolean; reason?: string }) =>
    request<StandardWorkdayRecord>(`/api/standard-workdays/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  getInsuranceRecords: (params?: { projectId?: string; fromDate?: string; toDate?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<InsuranceRecord[]>(`/api/insurance-records?${query}`).then((item) => item.data);
  },
  getInsuranceMasterRecords: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<InsuranceRecord[]>(`/api/insurance/master?${query}`).then((item) => item.data);
  },
  getInsuranceChanges: (params?: { projectId?: string; period?: string; status?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<InsuranceChangeRecord[]>(`/api/insurance/changes?${query}`).then((item) => item.data);
  },
  createInsuranceChange: (payload: Partial<InsuranceChangeRecord>) =>
    request<InsuranceChangeRecord>("/api/insurance/changes", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  batchImportInsuranceChanges: (items: Partial<InsuranceChangeRecord>[]) =>
    request<InsuranceChangeRecord[]>("/api/insurance/changes/batch-import", { method: "POST", body: JSON.stringify({ items }) }).then((item) => item.data),
  verifyInsuranceChange: (id: string, payload?: { verifiedBy?: string; agencyReceiptCode?: string }) =>
    request<InsuranceChangeRecord>(`/api/insurance/changes/${id}/verify`, { method: "POST", body: JSON.stringify(payload ?? {}) }).then((item) => item.data),
  batchVerifyInsuranceChanges: (payload: { ids: string[]; verifiedBy?: string; agencyReceiptCode?: string }) =>
    request<InsuranceChangeRecord[]>("/api/insurance/changes/batch-verify", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  rejectInsuranceChange: (id: string, payload: { rejectionReason: string }) =>
    request<InsuranceChangeRecord>(`/api/insurance/changes/${id}/reject`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  verifyInsuranceRecord: (id: string, verifiedBy?: string) =>
    request<InsuranceRecord>(`/api/insurance-records/${id}/verify`, { method: "POST", body: JSON.stringify({ verifiedBy }) }).then((item) => item.data),
  batchVerifyInsurance: (ids: string[], verifiedBy?: string) =>
    request<InsuranceRecord[]>("/api/insurance-records/batch-verify", { method: "POST", body: JSON.stringify({ ids, verifiedBy }) }).then((item) => item.data),
  getTaxConfigs: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<TaxConfigRecord[]>(`/api/tax-configs?${query}`).then((item) => item.data);
  },
  updateTaxConfig: (id: string, payload: Partial<TaxConfigRecord>) =>
    request<TaxConfigRecord>(`/api/tax-configs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  getEmployeePolicies: (params?: { projectId?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<EmployeePolicyRecord[]>(`/api/employee-policies?${query}`).then((item) => item.data);
  },
  getEmployeePolicyDetail: (employeeId: string) =>
    request<EmployeePolicyRecord>(`/api/employee-policies/${employeeId}`).then((item) => item.data),
  updateEmployeePolicies: (employeeId: string, payload: { policies: EmployeePolicyItem[]; baseSalary?: number; insuranceSalary?: number; effectiveFrom?: string }) =>
    request<EmployeePolicyRecord>(`/api/employee-policies/${employeeId}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  batchImportEmployeePolicies: (payload: { projectId: string; items: Array<{ employeeCode: string; policyCode: string; amount: number; isEnabled?: boolean; reason?: string }> }) =>
    request<EmployeePolicyRecord[]>("/api/employee-policies/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  resetEmployeePoliciesToDefault: (employeeId: string) =>
    request<EmployeePolicyRecord>(`/api/employee-policies/${employeeId}/reset`, { method: "POST" }).then((item) => item.data),
  getProjectEmployeeGroups: async (projectId: string): Promise<ProjectEmployeeGroup[]> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể lấy danh sách nhóm nhân viên (Status: ${response.status})`,
        "FETCH_GROUPS_FAILED",
        response.status
      );
    }

    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi lấy danh sách nhóm nhân viên",
        "API_ERROR",
        response.status
      );
    }

    const rawItems: any[] = Array.isArray(resJson.data) ? resJson.data : [];
    return rawItems.map((item: any) => ({
      id: String(item.id),
      projectId: String(item.projectId),
      name: item.groupName || `Nhóm #${item.id}`,
      code: item.groupCode || `GRP_${item.id}`,
      colorTone: "primary",
      employeeCount: typeof item.employeeCount === "number" ? item.employeeCount : 0,
    }));
  },
  createProjectEmployeeGroup: async (projectId: string, payload: Partial<ProjectEmployeeGroup>): Promise<ProjectEmployeeGroup> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const groupName = payload.name || (payload as any).groupName || (payload as any).GroupName || "";
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        GroupName: groupName,
      }),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể tạo nhóm lao động (Status: ${response.status})`,
        "CREATE_GROUP_FAILED",
        response.status
      );
    }

    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi tạo nhóm lao động",
        "API_ERROR",
        response.status
      );
    }

    const item = resJson.data || {};
    return {
      id: String(item.id),
      projectId: String(item.projectId),
      name: item.groupName || groupName,
      code: item.groupCode || `GRP_${item.id}`,
      colorTone: "primary",
      employeeCount: typeof item.employeeCount === "number" ? item.employeeCount : 0,
    };
  },
  deleteProjectEmployeeGroup: async (projectId: string, groupId: string | number) => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups/${groupId}`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể xóa nhóm lao động (Status: ${response.status})`,
        "DELETE_GROUP_FAILED",
        response.status
      );
    }

    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi xóa nhóm lao động",
        "API_ERROR",
        response.status
      );
    }

    return resJson;
  },
  updateProjectEmployeeGroup: (projectId: string, groupId: string, payload: Partial<ProjectEmployeeGroup>) =>
    request<ProjectEmployeeGroup>(`/api/projects/${projectId}/employee-groups/${groupId}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  assignEmployeesToGroup: async (
    projectId: string,
    groupId: string | number,
    payload: { employeeCodes?: string[]; employeeIds?: string[] }
  ): Promise<{ success: boolean; message?: string }> => {
    const rawBaseUrl = getApiBaseUrl();
    const baseUrl = (rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : "https://bruh.thanhf.dev/api/").replace(/\/+$/, "");
    const token = getAuthToken();
    const url = `${baseUrl}/web/payroll/projects/${projectId}/employee-groups/${groupId}/employees`;
    const headers: Record<string, string> = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const employeeCodes = payload.employeeCodes || payload.employeeIds || [];

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        EmployeeCodes: employeeCodes,
      }),
    });

    if (!response.ok) {
      throw new ApiRequestError(
        `Không thể thêm nhân viên vào nhóm (Status: ${response.status})`,
        "ASSIGN_EMPLOYEES_FAILED",
        response.status
      );
    }

    const resJson = await response.json();
    if (!resJson || resJson.success === false) {
      throw new ApiRequestError(
        resJson?.message || "Lỗi khi thêm nhân viên vào nhóm",
        "API_ERROR",
        response.status
      );
    }

    return {
      success: true,
      message: resJson.message || "Thêm nhân viên vào nhóm thành công",
    };
  },
  getActivityLogs: (params?: { projectId?: string; module?: ActivityLogModule; q?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<ActivityLogItem[]>(`/api/activity-logs?${query}`).then((item) => item.data);
  },
  createActivityLog: (payload: Partial<ActivityLogItem>) =>
    request<ActivityLogItem>("/api/activity-logs", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  // Other Deductions API
  getOtherDeductions: (params?: { projectId?: string; period?: string; q?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<OtherDeductionRecord[]>(`/api/other-deductions?${query}`).then((item) => item.data);
  },
  createOtherDeduction: (payload: Partial<OtherDeductionRecord>) =>
    request<OtherDeductionRecord>("/api/other-deductions", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  updateOtherDeduction: (id: string, payload: Partial<OtherDeductionRecord>) =>
    request<OtherDeductionRecord>(`/api/other-deductions/${id}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  deleteOtherDeduction: (id: string) =>
    request<{ success: boolean }>(`/api/other-deductions/${id}`, { method: "DELETE" }).then((item) => item.data),
  batchImportOtherDeductions: (payload: { projectId: string; period: string; items: Array<Partial<OtherDeductionRecord>> }) =>
    request<OtherDeductionRecord[]>("/api/other-deductions/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  // Other Incomes API
  getOtherIncomes: (params?: { projectId?: string; period?: string; q?: string }) => {
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return request<OtherIncomeRecord[]>(`/api/other-incomes?${query}`).then((item) => item.data);
  },
  createOtherIncome: (payload: Partial<OtherIncomeRecord>) =>
    request<OtherIncomeRecord>("/api/other-incomes", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  updateOtherIncome: (id: string, payload: Partial<OtherIncomeRecord>) =>
    request<OtherIncomeRecord>(`/api/other-incomes/${id}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  deleteOtherIncome: (id: string) =>
    request<{ success: boolean }>(`/api/other-incomes/${id}`, { method: "DELETE" }).then((item) => item.data),
  batchImportOtherIncomes: (payload: { projectId: string; period: string; items: Array<Partial<OtherIncomeRecord>> }) =>
    request<OtherIncomeRecord[]>("/api/other-incomes/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
};
