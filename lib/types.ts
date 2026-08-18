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

export interface Employee {
  id: string;
  code: string;
  name: string;
  idCard: string;
  phone: string;
  email?: string;
  projectId: string;
  projectCode: string;
  department: string;
  position: string;
  joinDate: string;
  status: "active" | "resigned" | "probation";
}

export interface Dependent {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeIdCard?: string;
  employeeTaxCode?: string;
  projectId: string;
  projectCode?: string;
  fullName: string;
  relationship: "child" | "spouse" | "parent" | "other";
  dob: string;
  idCardOrTaxCode: string;
  taxCode?: string;
  startDate: string; // YYYY-MM
  endDate?: string;  // YYYY-MM
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: "cccd_2_sided" | "disability_cert" | "birth_cert";
  creationMode: "accountant_import" | "bcsx_declare";
  status: "pending_approval" | "approved" | "rejected";
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface LeaveHistoryItem {
  id: string;
  from: string;
  to: string;
  days: number;
  leaveType: "annual" | "compensatory" | "unpaid" | "sick";
  reason: string;
  approvedBy: string;
  approvedAt: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectCode?: string;
  contractType: "official" | "probation" | "seasonal"; // Loại hợp đồng lao động
  employeeStatus: "active" | "resigned" | "probation";  // Trạng thái nhân sự
  eligibilityStatus: "eligible" | "probation_ineligible" | "resigned"; // Tình trạng hưởng phép năm
  entitlementDate?: string; // YYYY-MM-DD (Thời điểm bắt đầu được hưởng phép năm)
  resignationDate?: string; // YYYY-MM-DD (Thời điểm nghỉ việc nếu đã thôi việc)
  accruedDays: number;     // Số ngày phép đã tích lũy lũy kế đến kỳ hiện tại (VD: 8 tháng = 8 ngày)
  availableDays: number;   // Số ngày phép khả dụng có thể sử dụng ngay tại thời điểm hiện tại
  totalEntitled: number;   // Tổng số ngày phép tiêu chuẩn cả năm (12 ngày)
  seniorityDays: number;   // Số ngày phép thâm niên
  usedDays: number;        // Số ngày phép đã sử dụng
  remainingDays: number;   // Tổng số ngày phép còn lại cả năm = (totalEntitled + seniorityDays) - usedDays
  history: LeaveHistoryItem[];
}

export interface UnionFeeRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  period: string; // YYYY-MM
  feeType: "percentage" | "fixed";
  amount: number;
  isParticipating: boolean;
  importedAt?: string;
  importedBy?: string;
}

export interface StandardWorkdayRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  projectStandardDays: number;
  overrideDays?: number;
  isOverridden: boolean;
  reason?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface InsuranceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  insuranceBookNumber: string; // Mã số BHXH 10 chữ số
  insuranceSalary: number;
  employeeRate: number; // 10.5
  companyRate: number;  // 21.5
  fromDate?: string;     // YYYY-MM-DD
  toDate?: string;       // YYYY-MM-DD
  effectiveMonth: string; // YYYY-MM
  status: "active" | "suspended" | "stopped";
  hospitalName?: string; // Nơi ĐK KCB ban đầu
  verifiedBy?: string;
  verifiedAt?: string;
}

export type InsuranceChangeType =
  | "increase"      // Báo tăng mới (ký HĐLĐ)
  | "decrease"      // Báo giảm hẳn (nghỉ việc)
  | "salary_adjust" // Điều chỉnh mức lương đóng
  | "suspend"       // Tạm dừng (thai sản, nghỉ không lương > 14 ngày)
  | "resume";       // Đóng trở lại sau tạm dừng

export interface InsuranceChangeRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  period: string; // YYYY-MM (Kỳ biến động, vd "2026-08")
  changeType: InsuranceChangeType;
  oldSalary?: number;
  newSalary: number;
  effectiveMonth: string; // YYYY-MM
  reason: string;
  status: "pending_agency_verification" | "verified" | "rejected";
  agencyReceiptCode?: string; // Mã hồ sơ điện tử cơ quan BHXH
  documentName?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface TaxConfigRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  projectId: string;
  taxCode: string;
  taxType: "progressive" | "flat_10" | "non_resident_20" | "commitment_08";
  hasCommitment08: boolean;
  approvedDependentsCount: number;
  personalDeduction: number;
  dependentDeduction: number;
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
  employees: Employee[];
  dependents: Dependent[];
  leaveRecords: LeaveRecord[];
  unionFees: UnionFeeRecord[];
  standardWorkdays: StandardWorkdayRecord[];
  insuranceRecords: InsuranceRecord[];
  insuranceChanges: InsuranceChangeRecord[];
  taxConfigs: TaxConfigRecord[];
}
