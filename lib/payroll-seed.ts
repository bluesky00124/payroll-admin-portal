import type {
  PayrollAttendanceSheet,
  PayrollAuditEvent,
  PayrollFeedback,
  PayrollLine,
  PayrollRun,
} from "@/lib/types";

const payrollRuns: PayrollRun[] = [
  {
    id: "pay-jss-2026-08",
    code: "BL-JSS-ST-202608-V1",
    projectId: "prj-jss",
    period: "2026-08",
    attendanceSheetId: "att-jss-2026-08-final",
    status: "admin_review",
    employeeCount: 6,
    confirmedPayslipCount: 0,
    grossPayroll: 49824000,
    totalDeductions: 5731000,
    netPayroll: 44093000,
    feedbackCount: 0,
    createdBy: "Trần Thu Trang (Kế toán C&B)",
    createdAt: "2026-08-20T09:10:00.000Z",
    updatedAt: "2026-08-20T09:12:00.000Z",
  },
  {
    id: "pay-swm-2026-08",
    code: "BL-SWM-DN-202608-V1",
    projectId: "prj-swm",
    period: "2026-08",
    attendanceSheetId: "att-swm-2026-08-final",
    status: "payslip_confirmation",
    employeeCount: 3,
    confirmedPayslipCount: 1,
    grossPayroll: 27135000,
    totalDeductions: 3020000,
    netPayroll: 24115000,
    feedbackCount: 2,
    createdBy: "Trần Thu Trang (Kế toán C&B)",
    createdAt: "2026-08-18T08:30:00.000Z",
    updatedAt: "2026-08-20T14:25:00.000Z",
    publishedAt: "2026-08-20T08:00:00.000Z",
  },
  {
    id: "pay-jss-2026-07",
    code: "BL-JSS-ST-202607-V1",
    projectId: "prj-jss",
    period: "2026-07",
    attendanceSheetId: "att-jss-2026-07-final",
    status: "locked",
    employeeCount: 6,
    confirmedPayslipCount: 6,
    grossPayroll: 48680000,
    totalDeductions: 5612000,
    netPayroll: 43068000,
    feedbackCount: 1,
    previousPayrollCost: 47120000,
    previousRevenue: 610000000,
    currentRevenue: 625000000,
    varianceRate: 0.08,
    varianceAmount: 500000,
    createdBy: "Trần Thu Trang (Kế toán C&B)",
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-24T16:35:00.000Z",
    publishedAt: "2026-07-22T09:00:00.000Z",
    lockedAt: "2026-07-24T16:35:00.000Z",
    lockedBy: "Trần Thu Trang (Kế toán C&B)",
  },
];

const payrollAttendanceSheets: PayrollAttendanceSheet[] = [
  { id: "att-jss-2026-08-final", projectId: "prj-jss", period: "2026-08", code: "BCC-JSS-082026-01", name: "Bảng công hệ thống - Đợt chốt cuối", source: "system", status: "approved", employeeCount: 6, approvedAt: "2026-08-19T17:20:00.000Z", approvedBy: "Trần Minh Anh (CDA)", usedByPayrollId: "pay-jss-2026-08" },
  { id: "att-jss-2026-08-supplement", projectId: "prj-jss", period: "2026-08", code: "BCC-JSS-082026-02", name: "Bảng công bổ sung ca đêm", source: "excel", status: "approved", employeeCount: 6, approvedAt: "2026-08-20T16:10:00.000Z", approvedBy: "Trần Minh Anh (CDA)" },
  { id: "att-swm-2026-08-final", projectId: "prj-swm", period: "2026-08", code: "BCC-SWM-082026-01", name: "Bảng công khách hàng đã xác nhận", source: "customer", status: "approved", employeeCount: 3, approvedAt: "2026-08-17T15:40:00.000Z", approvedBy: "Nguyễn Thu Hà (CDA)", usedByPayrollId: "pay-swm-2026-08" },
  { id: "att-lgt-2026-08-final", projectId: "prj-logistics", period: "2026-08", code: "BCC-LGT-082026-01", name: "Bảng công GPS - Đã chốt", source: "system", status: "approved", employeeCount: 3, approvedAt: "2026-08-20T11:00:00.000Z", approvedBy: "Phạm Quốc Bảo (CDA)" },
  { id: "att-rtl-2026-08-pending", projectId: "prj-retail", period: "2026-08", code: "BCC-RTL-082026-01", name: "Bảng công ca bán lẻ", source: "excel", status: "pending", employeeCount: 2 },
  { id: "att-jss-2026-07-final", projectId: "prj-jss", period: "2026-07", code: "BCC-JSS-072026-01", name: "Bảng công hệ thống - Đợt chốt cuối", source: "system", status: "approved", employeeCount: 6, approvedAt: "2026-07-19T17:00:00.000Z", approvedBy: "Trần Minh Anh (CDA)", usedByPayrollId: "pay-jss-2026-07" },
];

const jssLines: PayrollLine[] = [
  ["emp-jss-001", "NV-JSS-001", "Nguyễn Văn An", "Công nhân vận hành", 26, 14, 7000000, 706731, 1150000, 831000],
  ["emp-jss-002", "NV-JSS-002", "Trần Thị Mai", "Tổ trưởng sản xuất", 25, 18, 7692308, 1038462, 1350000, 960000],
  ["emp-jss-003", "NV-JSS-003", "Lê Hoàng Nam", "Công nhân đóng gói", 24, 9, 5815385, 409091, 950000, 711000],
  ["emp-jss-004", "NV-JSS-004", "Phạm Thị Dung", "Kiểm tra chất lượng", 26, 12, 7200000, 623077, 1050000, 852000],
  ["emp-jss-005", "NV-JSS-005", "Võ Quốc Huy", "Công nhân vận hành", 25, 16, 6730769, 807692, 1200000, 805000],
  ["emp-jss-006", "NV-JSS-006", "Đặng Ngọc Lan", "Nhân viên kho", 26, 10, 6900000, 497596, 1100000, 786000],
].map(([employeeId, employeeCode, employeeName, position, workDays, overtimeHours, basePay, overtimePay, allowances, deductions], index) => {
  const numericBasePay = Number(basePay);
  const numericOvertimePay = Number(overtimePay);
  const numericAllowances = Number(allowances);
  const numericDeductions = Number(deductions);
  return {
    id: `line-jss-2026-08-${index + 1}`,
    payrollId: "pay-jss-2026-08",
    employeeId: String(employeeId), employeeCode: String(employeeCode), employeeName: String(employeeName), position: String(position),
    workDays: Number(workDays), overtimeHours: Number(overtimeHours), basePay: numericBasePay, overtimePay: numericOvertimePay,
    allowances: numericAllowances, deductions: numericDeductions,
    netPay: numericBasePay + numericOvertimePay + numericAllowances - numericDeductions,
  };
});

const swmLines: PayrollLine[] = [
  { id: "line-swm-1", payrollId: "pay-swm-2026-08", employeeId: "emp-swm-001", employeeCode: "NV-SWM-001", employeeName: "Đỗ Minh Khang", position: "Tổ trưởng", workDays: 25, overtimeHours: 20, basePay: 8200000, overtimePay: 1185000, allowances: 1250000, deductions: 1010000, netPay: 9625000 },
  { id: "line-swm-2", payrollId: "pay-swm-2026-08", employeeId: "emp-swm-002", employeeCode: "NV-SWM-002", employeeName: "Nguyễn Thùy Linh", position: "Công nhân", workDays: 24, overtimeHours: 12, basePay: 6300000, overtimePay: 545000, allowances: 950000, deductions: 720000, netPay: 7075000 },
  { id: "line-swm-3", payrollId: "pay-swm-2026-08", employeeId: "emp-swm-003", employeeCode: "NV-SWM-003", employeeName: "Trần Quốc Toàn", position: "Công nhân", workDays: 26, overtimeHours: 17, basePay: 6800000, overtimePay: 805000, allowances: 1100000, deductions: 790000, netPay: 7915000 },
];

const payrollFeedbacks: PayrollFeedback[] = [
  { id: "fb-swm-001", payrollId: "pay-swm-2026-08", employeeId: "emp-swm-002", employeeCode: "NV-SWM-002", employeeName: "Nguyễn Thùy Linh", category: "overtime", message: "Phiếu lương đang ghi 12 giờ OT, em đã làm 16 giờ theo bảng xác nhận ca ngày 12/08.", status: "pending_owner", submittedAt: "2026-08-20T10:05:00.000Z" },
  { id: "fb-swm-002", payrollId: "pay-swm-2026-08", employeeId: "emp-swm-003", employeeCode: "NV-SWM-003", employeeName: "Trần Quốc Toàn", category: "allowance", message: "Chưa thấy phụ cấp ca đêm 250.000đ trong kỳ lương tháng 8.", status: "pending_accounting", submittedAt: "2026-08-20T09:15:00.000Z", ownerReviewedAt: "2026-08-20T13:40:00.000Z", ownerReviewedBy: "Nguyễn Thu Hà (CDA)" },
  { id: "fb-jss-2026-07-001", payrollId: "pay-jss-2026-07", employeeId: "emp-jss-004", employeeCode: "NV-JSS-004", employeeName: "Phạm Thị Dung", category: "attendance", message: "Thiếu 1 ngày công đã được khách hàng xác nhận.", status: "adjusted", submittedAt: "2026-07-22T10:00:00.000Z", ownerReviewedAt: "2026-07-22T13:00:00.000Z", ownerReviewedBy: "Trần Minh Anh (CDA)", accountingNote: "Đã bổ sung 1 ngày công theo biên bản xác nhận KH số 17/07.", resolvedAt: "2026-07-22T16:10:00.000Z" },
];

const payrollAuditEvents: PayrollAuditEvent[] = [
  { id: "audit-jss-aug-create", payrollId: "pay-jss-2026-08", type: "create", title: "Khởi tạo bảng lương", description: "Đã đối chiếu Master Data và tạo bảng lương từ BCC-JSS-082026-01.", actor: "Trần Thu Trang (Kế toán C&B)", createdAt: "2026-08-20T09:10:00.000Z" },
  { id: "audit-swm-create", payrollId: "pay-swm-2026-08", type: "create", title: "Khởi tạo bảng lương", description: "Tạo từ bảng công khách hàng đã xác nhận.", actor: "Trần Thu Trang (Kế toán C&B)", createdAt: "2026-08-18T08:30:00.000Z" },
  { id: "audit-swm-admin", payrollId: "pay-swm-2026-08", type: "approve", title: "Admin/BCSX xác nhận", description: "Đã đối chiếu ngày công, hồ sơ và các khoản khấu trừ.", actor: "Bùi Minh Hạnh (BCSX)", createdAt: "2026-08-19T14:20:00.000Z" },
  { id: "audit-swm-owner", payrollId: "pay-swm-2026-08", type: "approve", title: "CDA/GSDA xác nhận", description: "Bảng lương đủ điều kiện phát hành phiếu lương.", actor: "Nguyễn Thu Hà (CDA)", createdAt: "2026-08-20T07:55:00.000Z" },
  { id: "audit-swm-publish", payrollId: "pay-swm-2026-08", type: "publish", title: "Phát hành phiếu lương", description: "Đã gửi 3 phiếu lương tới ứng dụng NLĐ.", actor: "Trần Thu Trang (Kế toán C&B)", createdAt: "2026-08-20T08:00:00.000Z" },
  { id: "audit-jss-jul-lock", payrollId: "pay-jss-2026-07", type: "lock", title: "Hoàn tất và khóa bảng lương", description: "Dữ liệu được khóa sau khi hoàn tất duyệt và xử lý phản hồi.", actor: "Trần Thu Trang (Kế toán C&B)", createdAt: "2026-07-24T16:35:00.000Z" },
];

export const payrollSeed = {
  payrollAttendanceSheets,
  payrollRuns,
  payrollLines: [...jssLines, ...swmLines],
  payrollFeedbacks,
  payrollAuditEvents,
};
