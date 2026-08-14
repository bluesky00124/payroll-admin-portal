import type {
  ApiResponse,
  AttendanceConfig,
  DataMapping,
  FormulaVariable,
  OvertimeType,
  PaginationMeta,
  PolicyDefinition,
  Project,
  ProjectOvertimeConfig,
  ProjectPolicy,
  SalaryFormula,
  TestEmployee,
  TestRunResult,
} from "@/lib/types";

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
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.error) {
    throw new ApiRequestError(payload.error?.message ?? "Yêu cầu thất bại", payload.error?.code ?? "UNKNOWN_ERROR", response.status, payload.error?.fields);
  }
  return { data: payload.data, meta: payload.meta };
}

export const api = {
  getProjects: (params: { q?: string; status?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
    return request<Project[]>(`/api/projects?${query}`);
  },
  createProject: (payload: Partial<Project>) => request<Project>("/api/projects", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`).then((item) => item.data),
  updateProject: (id: string, payload: Partial<Project>) => request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  cloneProject: (id: string) => request<Project>(`/api/projects/${id}/clone`, { method: "POST" }).then((item) => item.data),
  getPolicyDefinitions: () => request<PolicyDefinition[]>("/api/policy-definitions").then((item) => item.data),
  getProjectPolicies: (id: string) => request<ProjectPolicy[]>(`/api/projects/${id}/policies`).then((item) => item.data),
  createProjectPolicy: (id: string, payload: Omit<ProjectPolicy, "id" | "projectId">) => request<ProjectPolicy>(`/api/projects/${id}/policies`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  updateProjectPolicy: (id: string, policyId: string, payload: Partial<ProjectPolicy>) => request<ProjectPolicy>(`/api/projects/${id}/policies/${policyId}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  deleteProjectPolicy: (id: string, policyId: string) => request<{ deleted: boolean }>(`/api/projects/${id}/policies/${policyId}`, { method: "DELETE" }).then((item) => item.data),
  getAttendanceConfig: (id: string) => request<AttendanceConfig>(`/api/projects/${id}/attendance-config`).then((item) => item.data),
  saveAttendanceConfig: (id: string, payload: AttendanceConfig) => request<AttendanceConfig>(`/api/projects/${id}/attendance-config`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  getOvertimeTypes: () => request<OvertimeType[]>("/api/overtime-types").then((item) => item.data),
  getOvertimeConfigs: (id: string) => request<ProjectOvertimeConfig[]>(`/api/projects/${id}/overtime-configs`).then((item) => item.data),
  saveOvertimeConfigs: (id: string, payload: ProjectOvertimeConfig[]) => request<ProjectOvertimeConfig[]>(`/api/projects/${id}/overtime-configs`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  getFormulaVariables: () => request<FormulaVariable[]>("/api/formula-variables").then((item) => item.data),
  getFormulas: (id: string) => request<SalaryFormula[]>(`/api/projects/${id}/formulas`).then((item) => item.data),
  saveFormulas: (id: string, payload: SalaryFormula[]) => request<SalaryFormula[]>(`/api/projects/${id}/formulas`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  validateFormulas: (id: string, payload: SalaryFormula[]) => request<{ valid: boolean; errors: string[] }>(`/api/projects/${id}/formulas/validate`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  getDataMappings: (id: string) => request<DataMapping[]>(`/api/projects/${id}/data-mappings`).then((item) => item.data),
  saveDataMappings: (id: string, payload: DataMapping[]) => request<DataMapping[]>(`/api/projects/${id}/data-mappings`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  validateDataMappings: (id: string) => request<{ valid: boolean; issues: string[]; checkedAt: string }>(`/api/projects/${id}/data-mappings/validate`, { method: "POST" }).then((item) => item.data),
  getTestEmployees: () => request<TestEmployee[]>("/api/test-employees").then((item) => item.data),
  runTest: (id: string, payload: { employeeId: string; period: string }) => request<TestRunResult>(`/api/projects/${id}/test-runs`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
};
