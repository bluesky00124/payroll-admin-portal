import type {
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

  // Employee Management APIs
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
  confirmDependents: (ids: string[], verifiedBy?: string) =>
    request<Dependent[]>("/api/dependents/confirm", { method: "POST", body: JSON.stringify({ ids, verifiedBy }) }).then((item) => item.data),
  rejectDependent: (id: string, reason: string) =>
    request<Dependent>(`/api/dependents/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }).then((item) => item.data),
  updateDependent: (id: string, payload: Partial<Dependent>) =>
    request<Dependent>(`/api/dependents/${id}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  updateDependentAttachment: (id: string, payload: { attachmentType: string; attachmentName: string; attachmentUrl?: string }) =>
    request<Dependent>(`/api/dependents/${id}/attachment`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
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
  updateEmployeePolicies: (employeeId: string, payload: { policies: EmployeePolicyItem[]; baseSalary?: number; insuranceSalary?: number }) =>
    request<EmployeePolicyRecord>(`/api/employee-policies/${employeeId}`, { method: "PUT", body: JSON.stringify(payload) }).then((item) => item.data),
  batchImportEmployeePolicies: (payload: { projectId: string; items: Array<{ employeeCode: string; policyCode: string; amount: number; isEnabled?: boolean; reason?: string }> }) =>
    request<EmployeePolicyRecord[]>("/api/employee-policies/batch-import", { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  resetEmployeePoliciesToDefault: (employeeId: string) =>
    request<EmployeePolicyRecord>(`/api/employee-policies/${employeeId}/reset`, { method: "POST" }).then((item) => item.data),
  getProjectEmployeeGroups: (projectId: string) =>
    request<ProjectEmployeeGroup[]>(`/api/projects/${projectId}/employee-groups`).then((item) => item.data),
  createProjectEmployeeGroup: (projectId: string, payload: Partial<ProjectEmployeeGroup>) =>
    request<ProjectEmployeeGroup>(`/api/projects/${projectId}/employee-groups`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
  updateProjectEmployeeGroup: (projectId: string, groupId: string, payload: Partial<ProjectEmployeeGroup>) =>
    request<ProjectEmployeeGroup>(`/api/projects/${projectId}/employee-groups/${groupId}`, { method: "PATCH", body: JSON.stringify(payload) }).then((item) => item.data),
  deleteProjectEmployeeGroup: (projectId: string, groupId: string) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/employee-groups/${groupId}`, { method: "DELETE" }).then((item) => item.data),
  assignEmployeesToGroup: (projectId: string, groupId: string, payload: { employeeIds: string[] }) =>
    request<{ success: boolean; updatedCount: number }>(`/api/projects/${projectId}/employee-groups/${groupId}/assign`, { method: "POST", body: JSON.stringify(payload) }).then((item) => item.data),
};
