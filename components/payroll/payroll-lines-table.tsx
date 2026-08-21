"use client";

import { PencilLine, Search } from "lucide-react";
import { Badge, Button, UserAvatar } from "@/components/ui";
import { getPayrollLineDetail } from "@/lib/payroll-line-detail";
import type { PayrollLine, PayrollLineDetail } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type PayrollLineView = "summary" | "attendance" | "income" | "deductions";
type PayrollLineCellKind = "currency" | "hours" | "days" | "number" | "text";

interface PayrollLineColumn {
  key: string;
  label: string;
  kind: PayrollLineCellKind;
  value: (line: PayrollLine, detail: PayrollLineDetail) => number | string;
  aggregate?: boolean;
  emphasis?: "income" | "deduction" | "net";
}

interface PayrollLineColumnGroup {
  label: string;
  tone: "attendance" | "income" | "deduction" | "payment";
  columns: PayrollLineColumn[];
}

const viewMeta: Record<PayrollLineView, { label: string; description: string }> = {
  summary: { label: "Tổng hợp bảng lương", description: "Các chỉ tiêu chính để kiểm tra nhanh tổng lương và thực lãnh." },
  attendance: { label: "Công & tăng ca", description: "Giờ làm việc, giờ tăng ca và các loại ngày nghỉ từ bảng công đã chốt." },
  income: { label: "Chi tiết thu nhập", description: "Lương, tăng ca, phụ cấp và thưởng cấu thành tổng thu nhập." },
  deductions: { label: "Khấu trừ & thanh toán", description: "Bảo hiểm, thuế, công đoàn, tạm ứng và phương thức chi trả." },
};

const columnGroups: Record<PayrollLineView, PayrollLineColumnGroup[]> = {
  summary: [
    { label: "Công & tăng ca", tone: "attendance", columns: [
      { key: "workDays", label: "Ngày công", kind: "days", value: (line) => line.workDays },
      { key: "overtimeHours", label: "Tổng giờ OT", kind: "hours", value: (line) => line.overtimeHours },
    ] },
    { label: "Thu nhập", tone: "income", columns: [
      { key: "basePay", label: "Lương thường", kind: "currency", value: (line) => line.basePay },
      { key: "overtimePay", label: "Lương tăng ca", kind: "currency", value: (line) => line.overtimePay },
      { key: "allowances", label: "Phụ cấp & thưởng", kind: "currency", value: (line) => line.allowances },
      { key: "grossPay", label: "Tổng lương", kind: "currency", value: (_line, detail) => detail.income.grossPay, emphasis: "income" },
    ] },
    { label: "Khấu trừ", tone: "deduction", columns: [
      { key: "insuranceTotal", label: "BH bắt buộc", kind: "currency", value: (_line, detail) => detail.deductions.insuranceTotal },
      { key: "personalIncomeTax", label: "Thuế TNCN", kind: "currency", value: (_line, detail) => detail.deductions.personalIncomeTax },
      { key: "deductions", label: "Tổng trừ", kind: "currency", value: (line) => line.deductions, emphasis: "deduction" },
    ] },
    { label: "Thanh toán", tone: "payment", columns: [
      { key: "netPay", label: "Thực lãnh", kind: "currency", value: (line) => line.netPay, emphasis: "net" },
      { key: "paymentMethod", label: "Hình thức", kind: "text", value: (_line, detail) => detail.payment.method === "transfer" ? "Chuyển khoản" : "Tiền mặt", aggregate: false },
    ] },
  ],
  attendance: [
    { label: "Giờ làm việc", tone: "attendance", columns: [
      { key: "regularHours", label: "Giờ thường", kind: "hours", value: (_line, detail) => detail.attendance.regularHours },
      { key: "nightHours", label: "Giờ đêm 30%", kind: "hours", value: (_line, detail) => detail.attendance.nightHours },
      { key: "otWeekday", label: "OT ngày thường 150%", kind: "hours", value: (_line, detail) => detail.attendance.overtimeWeekdayHours },
      { key: "otNightWeekday", label: "OT đêm ngày thường 200%", kind: "hours", value: (_line, detail) => detail.attendance.overtimeNightWeekdayHours },
      { key: "otWeekend", label: "OT cuối tuần 200%", kind: "hours", value: (_line, detail) => detail.attendance.overtimeWeekendHours },
      { key: "otNightWeekend", label: "OT đêm cuối tuần 270%", kind: "hours", value: (_line, detail) => detail.attendance.overtimeNightWeekendHours },
      { key: "otHoliday", label: "OT lễ/Tết 300%", kind: "hours", value: (_line, detail) => detail.attendance.overtimeHolidayHours },
      { key: "totalHours", label: "Tổng giờ công", kind: "hours", value: (_line, detail) => detail.attendance.totalHours },
    ] },
    { label: "Ngày công & nghỉ", tone: "payment", columns: [
      { key: "allowanceDays", label: "Ngày tính phụ cấp", kind: "days", value: (_line, detail) => detail.attendance.workDaysForAllowance },
      { key: "holidayLeave", label: "Nghỉ lễ", kind: "days", value: (_line, detail) => detail.attendance.holidayLeaveDays },
      { key: "regimeLeave", label: "Nghỉ chế độ", kind: "days", value: (_line, detail) => detail.attendance.regimeLeaveDays },
      { key: "annualLeave", label: "Phép năm", kind: "days", value: (_line, detail) => detail.attendance.annualLeaveDays },
      { key: "rosterLeave", label: "Nghỉ tua", kind: "days", value: (_line, detail) => detail.attendance.rosterLeaveDays },
      { key: "approvedLeave", label: "Nghỉ có phép", kind: "days", value: (_line, detail) => detail.attendance.approvedLeaveDays },
      { key: "unapprovedLeave", label: "Nghỉ không phép", kind: "days", value: (_line, detail) => detail.attendance.unapprovedLeaveDays },
      { key: "paidDays", label: "Tổng ngày tính lương", kind: "days", value: (_line, detail) => detail.attendance.totalPaidDays },
    ] },
  ],
  income: [
    { label: "Lương & thưởng", tone: "income", columns: [
      { key: "contractSalary", label: "Lương cơ bản", kind: "currency", value: (_line, detail) => detail.income.contractualSalary },
      { key: "regularPay", label: "Lương thường", kind: "currency", value: (_line, detail) => detail.income.regularPay },
      { key: "attendanceBonus", label: "Thưởng chuyên cần", kind: "currency", value: (_line, detail) => detail.income.attendanceBonus },
      { key: "performanceBonus", label: "Thưởng HTCV", kind: "currency", value: (_line, detail) => detail.income.performanceBonus },
      { key: "productivityBonus", label: "Thưởng năng suất", kind: "currency", value: (_line, detail) => detail.income.productivityBonus },
      { key: "salaryAdjustment", label: "Điều chỉnh lương", kind: "currency", value: (_line, detail) => detail.income.salaryAdjustment },
      { key: "benefitPay", label: "Lương chế độ", kind: "currency", value: (_line, detail) => detail.income.benefitPay },
    ] },
    { label: "Phụ cấp", tone: "payment", columns: [
      { key: "phone", label: "Điện thoại", kind: "currency", value: (_line, detail) => detail.income.phoneAllowance },
      { key: "insuranceAllowance", label: "Phụ cấp BHXH", kind: "currency", value: (_line, detail) => detail.income.insuranceAllowance },
      { key: "otherAllowance", label: "Phụ cấp khác", kind: "currency", value: (_line, detail) => detail.income.otherAllowance },
      { key: "meal", label: "Tiền cơm", kind: "currency", value: (_line, detail) => detail.income.mealAllowance },
      { key: "annualLeavePay", label: "Lương phép năm", kind: "currency", value: (_line, detail) => detail.income.annualLeavePay },
      { key: "nightAllowance", label: "Phụ cấp đêm 30%", kind: "currency", value: (_line, detail) => detail.income.nightAllowance },
      { key: "annualLeaveSettlement", label: "Tiền phép nghỉ việc", kind: "currency", value: (_line, detail) => detail.income.annualLeaveSettlement },
      { key: "projectBonus", label: "Thưởng dự án", kind: "currency", value: (_line, detail) => detail.income.projectBonus },
      { key: "projectSupport", label: "Hỗ trợ dự án", kind: "currency", value: (_line, detail) => detail.income.projectSupport },
    ] },
    { label: "Lương tăng ca", tone: "attendance", columns: [
      { key: "otWeekdayPay", label: "Ngày thường 150%", kind: "currency", value: (_line, detail) => detail.income.overtimeWeekdayPay },
      { key: "otNightWeekdayPay", label: "Đêm ngày thường 200%", kind: "currency", value: (_line, detail) => detail.income.overtimeNightWeekdayPay },
      { key: "otWeekendPay", label: "Cuối tuần 200%", kind: "currency", value: (_line, detail) => detail.income.overtimeWeekendPay },
      { key: "otNightWeekendPay", label: "Đêm cuối tuần 270%", kind: "currency", value: (_line, detail) => detail.income.overtimeNightWeekendPay },
      { key: "otHolidayPay", label: "Lễ/Tết 300%", kind: "currency", value: (_line, detail) => detail.income.overtimeHolidayPay },
    ] },
    { label: "Tổng", tone: "income", columns: [
      { key: "grossIncome", label: "Tổng lương", kind: "currency", value: (_line, detail) => detail.income.grossPay, emphasis: "income" },
    ] },
  ],
  deductions: [
    { label: "Bảo hiểm", tone: "deduction", columns: [
      { key: "socialInsurance", label: "BHXH 8%", kind: "currency", value: (_line, detail) => detail.deductions.socialInsurance },
      { key: "healthInsurance", label: "BHYT 1,5%", kind: "currency", value: (_line, detail) => detail.deductions.healthInsurance },
      { key: "unemploymentInsurance", label: "BHTN 1%", kind: "currency", value: (_line, detail) => detail.deductions.unemploymentInsurance },
      { key: "insuranceTotal", label: "Tổng BH 10,5%", kind: "currency", value: (_line, detail) => detail.deductions.insuranceTotal },
      { key: "insuranceAdjustment", label: "Điều chỉnh BH tháng trước", kind: "currency", value: (_line, detail) => detail.deductions.insuranceAdjustment },
      { key: "healthCardArrears", label: "Truy thu thẻ BHYT", kind: "currency", value: (_line, detail) => detail.deductions.healthCardArrears },
    ] },
    { label: "Thuế & công đoàn", tone: "payment", columns: [
      { key: "unionFee", label: "Phí công đoàn", kind: "currency", value: (_line, detail) => detail.deductions.unionFee },
      { key: "personalIncomeTax", label: "Thuế TNCN", kind: "currency", value: (_line, detail) => detail.deductions.personalIncomeTax },
    ] },
    { label: "Khấu trừ phát sinh", tone: "deduction", columns: [
      { key: "uniform", label: "Khấu hao đồng phục", kind: "currency", value: (_line, detail) => detail.deductions.uniformDepreciation },
      { key: "violation", label: "Vi phạm / hao hụt", kind: "currency", value: (_line, detail) => detail.deductions.violation },
      { key: "retention", label: "Tạm giữ", kind: "currency", value: (_line, detail) => detail.deductions.retention },
      { key: "ekkoAdvance", label: "Tạm ứng Ekko", kind: "currency", value: (_line, detail) => detail.deductions.ekkoAdvance },
      { key: "salaryAdvance", label: "Tạm ứng lương", kind: "currency", value: (_line, detail) => detail.deductions.salaryAdvance },
      { key: "totalDeductions", label: "Tổng trừ", kind: "currency", value: (_line, detail) => detail.deductions.total, emphasis: "deduction" },
    ] },
    { label: "Thanh toán", tone: "payment", columns: [
      { key: "netAfterDeduction", label: "Thực lãnh", kind: "currency", value: (line) => line.netPay, emphasis: "net" },
      { key: "transferAmount", label: "Chuyển khoản", kind: "currency", value: (_line, detail) => detail.payment.transferAmount },
      { key: "cashAmount", label: "Tiền mặt", kind: "currency", value: (_line, detail) => detail.payment.cashAmount },
    ] },
  ],
};

const quantityFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

const formatCell = (column: PayrollLineColumn, value: number | string) => {
  if (column.kind === "text") return String(value);
  const numericValue = Number(value);
  if (!numericValue) return "—";
  if (column.kind === "currency") return formatCurrency(numericValue);
  return quantityFormatter.format(numericValue);
};

export function PayrollLinesTable({
  lines,
  view,
  locked,
  query,
  onQueryChange,
  onEdit,
}: {
  lines: PayrollLine[];
  view: PayrollLineView;
  locked: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onEdit: (line: PayrollLine) => void;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visibleLines = lines.filter((line) =>
    `${line.employeeCode} ${line.employeeName} ${line.position}`.toLocaleLowerCase("vi").includes(normalizedQuery),
  );
  const groups = columnGroups[view];

  return (
    <section className="payroll-detail-section payroll-line-section">
      <div className="payroll-section-toolbar">
        <div><h2>{viewMeta[view].label}</h2><p>{viewMeta[view].description}</p></div>
        <label className="search-field payroll-line-search"><Search /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm mã, tên hoặc chức vụ…" aria-label="Tìm người lao động trong bảng lương" /></label>
      </div>
      <div className="payroll-line-table-caption"><div><strong>{viewMeta[view].label}</strong><span>Dữ liệu tại thời điểm lập bảng lương</span></div><Badge tone="neutral">{visibleLines.length} người lao động</Badge></div>
      {visibleLines.length === 0 ? (
        <div className="payroll-empty compact"><Search /><h3>Không tìm thấy người lao động</h3><p>Thử thay đổi từ khóa tìm kiếm trong bảng lương.</p></div>
      ) : (
        <div className="payroll-table-wrap payroll-lines-table-wrap">
          <table className={`payroll-table payroll-lines-table payroll-lines-${view}`}>
            <thead>
              <tr className="payroll-line-group-row">
                <th className="payroll-line-employee-sticky" rowSpan={2} scope="col">Người lao động</th>
                {groups.map((group) => <th className={`payroll-line-group group-${group.tone}`} colSpan={group.columns.length} scope="colgroup" key={group.label}>{group.label}</th>)}
                <th className="payroll-line-action-sticky" rowSpan={2} scope="col" aria-label="Thao tác" />
              </tr>
              <tr>{groups.flatMap((group) => group.columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>))}</tr>
            </thead>
            <tbody>{visibleLines.map((line) => {
              const detail = getPayrollLineDetail(line);
              return (
                <tr key={line.id}>
                  <td className="payroll-line-employee-sticky"><div className="line-employee"><UserAvatar name={line.employeeName} size="sm" /><div><strong>{line.employeeName}</strong><small>{line.employeeCode} · {line.position}</small>{line.note && <em>{line.note}</em>}</div></div></td>
                  {groups.flatMap((group) => group.columns.map((column) => {
                    const value = column.value(line, detail);
                    return <td className={`payroll-line-data-cell kind-${column.kind} ${column.emphasis ? `emphasis-${column.emphasis}` : ""}`} key={column.key}>{formatCell(column, value)}</td>;
                  }))}
                  <td className="payroll-line-action-sticky"><Button variant="ghost" size="icon" disabled={locked} aria-label={`Sửa lương ${line.employeeName}`} onClick={() => onEdit(line)}><PencilLine /></Button></td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr><td className="payroll-line-employee-sticky"><strong>Tổng cộng</strong><small>{visibleLines.length} NLĐ</small></td>{groups.flatMap((group) => group.columns.map((column) => {
              if (column.aggregate === false || column.kind === "text") return <td key={column.key}>—</td>;
              const total = visibleLines.reduce((sum, line) => sum + Number(column.value(line, getPayrollLineDetail(line)) || 0), 0);
              return <td className={`${column.emphasis ? `emphasis-${column.emphasis}` : ""}`} key={column.key}>{formatCell(column, total)}</td>;
            }))}<td className="payroll-line-action-sticky" /></tr></tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
