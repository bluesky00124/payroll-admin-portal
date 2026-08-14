export type ProjectStatus = "active" | "draft" | "archived";
export type TabState = "complete" | "warning" | "incomplete" | "unsaved";
export type PolicyCategory = "allowance" | "bonus" | "leave" | "deduction";
export type FieldType = "money" | "number" | "percentage" | "boolean" | "select";

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  manager: string;
  employeeCount: number;
  status: ProjectStatus;
  payrollCycle: string;
  effectiveFrom: string;
  effectiveTo?: string;
  templateName: string;
  updatedAt: string;
  tabStates: Record<ProjectTab, TabState>;
}

export type ProjectTab =
  | "overview"
  | "policies"
  | "attendance"
  | "formulas";

export interface PolicyFieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  min?: number;
  max?: number;
  unit?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
}

export type TargetRole = "shift_leader" | "chinh_thuc" | "hoc_viec";

export interface TargetRoleInfo {
  key: TargetRole;
  label: string;
  badgeTone: "info" | "success" | "warning";
}

export const TARGET_ROLES: TargetRoleInfo[] = [
  { key: "shift_leader", label: "Quản lý / Shift Leader", badgeTone: "info" },
  { key: "chinh_thuc", label: "Công nhân chính thức", badgeTone: "success" },
  { key: "hoc_viec", label: "Học việc (29 ngày)", badgeTone: "warning" },
];

export interface PolicyDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: PolicyCategory;
  fields: PolicyFieldDefinition[];
  formula?: string;
  targetValues?: Partial<Record<TargetRole, Record<string, string | number | boolean>>>;
}

export interface ProjectPolicy {
  id: string;
  projectId: string;
  policyId: string;
  values: Record<string, string | number | boolean>;
  targetValues?: Partial<Record<TargetRole, Record<string, string | number | boolean>>>;
  effectiveFrom: string;
  effectiveTo?: string;
  enabled: boolean;
}

export interface AttendanceConfig {
  projectId: string;
  attendanceType?: string;
  standardWorkDaysOption?: string;
  benefitDeduction?: string;
  standardWorkDays: number;
  hoursPerDay: number;
  weeklyDayOff: string;
  nightShiftFrom: string;
  nightShiftTo: string;
  holidayCalendar: string;
}

export interface OvertimeType {
  id: string;
  code: string;
  name: string;
  defaultMultiplier: number;
  unit: "hour";
  description: string;
}

export interface ProjectOvertimeConfig {
  id: string;
  projectId: string;
  overtimeTypeId: string;
  enabled: boolean;
  multiplier: number;
  base: "base_salary" | "base_plus_responsibility" | "insurance_salary";
  divisor: "monthly_hours" | "fixed_208" | "fixed_26_days";
  formulaOption?: string;
  hoursSource: string;
  taxable: boolean;
  effectiveFrom: string;
}

export type BinaryOperator = "+" | "-" | "*" | "/";

export type ExpressionNode =
  | { type: "variable"; variableCode: string }
  | { type: "constant"; value: number }
  | {
      type: "binary";
      operator: BinaryOperator;
      left: ExpressionNode;
      right: ExpressionNode;
    };

export interface RoundingRule {
  mode: "none" | "nearest" | "up" | "down";
  precision: 1 | 100 | 1000;
}

export interface SalaryFormula {
  id: string;
  projectId: string;
  code: string;
  name: string;
  outputVariable: string;
  category: "attendance" | "income" | "deduction" | "aggregate" | "net";
  order: number;
  expression: ExpressionNode;
  rounding: RoundingRule;
  enabled: boolean;
}

export interface FormulaVariable {
  code: string;
  name: string;
  group: "employee" | "attendance" | "policy" | "formula";
  sampleValue: number;
  unit: string;
}

export interface DataMapping {
  id: string;
  projectId: string;
  sourceType: "employee" | "attendance" | "overtime" | "bonus" | "advance" | "deduction";
  sourceName: string;
  joinKey: string;
  status: "valid" | "warning" | "invalid";
  fields: Array<{
    sourceField: string;
    systemField: string;
    dataType: "text" | "number" | "date";
    required: boolean;
  }>;
  sampleRows: Array<Record<string, string | number>>;
}

export interface TestEmployee {
  id: string;
  code: string;
  name: string;
  role: string;
  baseSalary: number;
  workHours: number;
  overtimeHours: number;
}

export interface TestRunResult {
  employee: TestEmployee;
  period: string;
  breakdown: Array<{
    code: string;
    name: string;
    amount: number;
    status: "matched" | "warning";
  }>;
  grossIncome: number;
  totalDeductions: number;
  netPay: number;
  expectedNetPay: number;
  difference: number;
  warnings: string[];
}

export interface MockDatabase {
  schemaVersion: number;
  projects: Project[];
  policyDefinitions: PolicyDefinition[];
  projectPolicies: ProjectPolicy[];
  attendanceConfigs: AttendanceConfig[];
  overtimeTypes: OvertimeType[];
  overtimeConfigs: ProjectOvertimeConfig[];
  formulas: SalaryFormula[];
  formulaVariables: FormulaVariable[];
  dataMappings: DataMapping[];
  testEmployees: TestEmployee[];
}
