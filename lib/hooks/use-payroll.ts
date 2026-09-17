import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "../payroll-api";
import { PayrollMatrix } from "../payroll-types";

// === Hook for Projects (theo phân quyền Bearer Token) ===
export function usePayrollProjects() {
  return useQuery({
    queryKey: ["payroll-projects"],
    queryFn: () => payrollApi.getPayrollProjects(),
  });
}

// 1.1 Hook for Approved Timesheets (Dành cho Popup Tạo bảng lương mới)
export function useApprovedTimesheets(
  params: { month: number; year: number; projectId?: number },
  enabled = true
) {
  return useQuery({
    queryKey: ["approved-timesheets", params],
    queryFn: () => payrollApi.getApprovedTimesheets(params),
    enabled: enabled && !!params.month && !!params.year,
  });
}

// 1.2 Quản lý bảng lương
export function usePayrollPeriods(params: {
  month: number;
  year: number;
  projectId?: number;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["payroll-periods", params],
    queryFn: () => payrollApi.getPeriods(params),
    placeholderData: (prev) => prev,
  });
}

export function usePayrollDetail(id: number) {
  return useQuery({
    queryKey: ["payroll-period", id],
    queryFn: () => payrollApi.getPeriodDetail(id),
    enabled: !!id,
  });
}

// 2. Đầu vào & Tính toán
export function useSyncTimesheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payrollApi.syncTimesheet,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      if (variables.payrollPeriodId) {
        queryClient.invalidateQueries({ queryKey: ["payroll-period", variables.payrollPeriodId] });
      }
    },
  });
}

export function useCalculatePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeCode }: { id: number; employeeCode?: string }) => payrollApi.calculatePayroll(id, employeeCode || null),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-period", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["payroll-summary", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["payroll-matrix", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["payroll-employees", variables.id] });
    },
  });
}

export function usePayrollSummary(id: number) {
  return useQuery({
    queryKey: ["payroll-summary", id],
    queryFn: () => payrollApi.getSummary(id),
    enabled: !!id,
  });
}

export function usePayrollEmployees(id: number, params?: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["payroll-employees", id, params],
    queryFn: () => payrollApi.getEmployees(id, params),
    enabled: !!id,
  });
}

export function usePayslipDetail(id: number, employeeCode: string) {
  return useQuery({
    queryKey: ["payslip", id, employeeCode],
    queryFn: () => payrollApi.getPayslipDetail(id, employeeCode),
    enabled: !!id && !!employeeCode,
  });
}

export function usePayrollMatrix(id: number, params?: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["payroll-matrix", id, params],
    queryFn: () => payrollApi.getPayrollMatrix(id, params),
    enabled: !!id,
  });
}

// 3. Quy trình phê duyệt
export function useSubmitWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => payrollApi.submitWorkflow(id, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-period", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-timeline", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
    },
  });
}

export function useApproveWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { note?: string; stepData?: any; justification?: string } }) => payrollApi.approveWorkflow(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-period", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-timeline", variables.id] });
    },
  });
}

export function useRejectWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => payrollApi.rejectWorkflow(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-period", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-timeline", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
    },
  });
}

export function useWorkflowTimeline(id: number) {
  return useQuery({
    queryKey: ["workflow-timeline", id],
    queryFn: () => payrollApi.getWorkflowTimeline(id),
    enabled: !!id,
  });
}

// 5. Quản lý xác nhận
export function useConfirmationStats(id: number, params?: { status?: string; search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["confirmation-stats", id, params],
    queryFn: () => payrollApi.getConfirmationStats(id, params),
    enabled: !!id,
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmationId, resolutionNote }: { id: number; confirmationId: number; resolutionNote: string }) => payrollApi.resolveDispute(id, confirmationId, resolutionNote),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["confirmation-stats", variables.id] });
    },
  });
}
