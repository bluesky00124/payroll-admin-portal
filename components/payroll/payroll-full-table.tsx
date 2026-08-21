"use client";

import { PencilLine, Search } from "lucide-react";
import { Button, UserAvatar } from "@/components/ui";
import {
  formatPayrollLineCell,
  payrollLineColumnGroups,
  type PayrollLineColumnGroup,
} from "@/components/payroll/payroll-lines-table";
import { createPayrollDailyAttendance, getPayrollLineDetail } from "@/lib/payroll-line-detail";
import type { Employee, PayrollLine, PayrollRun } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const detailSections: Array<{
  key: string;
  label: string;
  tone: "attendance" | "income" | "deduction";
  groups: PayrollLineColumnGroup[];
}> = [
  { key: "attendance", label: "Tổng hợp công & OT", tone: "attendance", groups: payrollLineColumnGroups.attendance },
  { key: "income", label: "Thu nhập", tone: "income", groups: payrollLineColumnGroups.income },
  { key: "deductions", label: "Khấu trừ & chi trả", tone: "deduction", groups: payrollLineColumnGroups.deductions },
];

const maskValue = (value: string | undefined, visible: boolean, keep = 4) => {
  if (!value) return "—";
  if (visible || value === "—") return value;
  return `${"•".repeat(Math.max(4, value.length - keep))}${value.slice(-keep)}`;
};

export function PayrollFullTable({
  run,
  lines,
  employees,
  locked,
  query,
  onQueryChange,
  onEdit,
  canViewSensitive,
}: {
  run: PayrollRun;
  lines: PayrollLine[];
  employees: Employee[];
  locked: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onEdit: (line: PayrollLine) => void;
  canViewSensitive: boolean;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visibleLines = lines.filter((line) =>
    `${line.employeeCode} ${line.employeeName} ${line.position}`.toLocaleLowerCase("vi").includes(normalizedQuery),
  );
  const rowData = visibleLines.map((line) => ({
    line,
    employee: employees.find((item) => item.id === line.employeeId),
    detail: getPayrollLineDetail(line),
    days: createPayrollDailyAttendance(line, run.period),
  }));
  const dayHeaders = rowData[0]?.days ?? createPayrollDailyAttendance({ employeeCode: "", workDays: 0, overtimeHours: 0 } as PayrollLine, run.period);
  const detailColumnCount = detailSections.reduce((total, section) => total + section.groups.reduce((groupTotal, group) => groupTotal + group.columns.length, 0), 0);

  return (
    <section className="payroll-detail-section payroll-full-section">
      <div className="payroll-section-toolbar">
        <div>
          <h2>Bảng lương chi tiết</h2>
          <p>Một bảng duy nhất theo thứ tự cột của file Excel: nhân sự, ngân hàng, công hằng ngày, thu nhập, khấu trừ và thanh toán.</p>
        </div>
        <label className="search-field payroll-line-search"><Search /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm mã, tên hoặc chức vụ…" aria-label="Tìm người lao động trong bảng lương" /></label>
      </div>

      <div className="payroll-full-table-meta">
        <div className="attendance-code-legend"><span><i className="work" />D8: đủ 8 giờ</span><span><i className="overtime" />D10–D12: có tăng ca</span><span><i className="leave" />P/XN: nghỉ phép/chế độ</span><span><i className="off" />N: nghỉ tuần</span><span><i className="unapproved" />OP: nghỉ không phép</span></div>
        <div className="payroll-sensitive-note">{canViewSensitive ? "Dữ liệu định danh hiển thị đầy đủ theo quyền Kế toán." : "CCCD và số tài khoản đang được che theo vai trò hiện tại."}</div>
      </div>

      {visibleLines.length === 0 ? (
        <div className="payroll-empty compact"><Search /><h3>Không tìm thấy người lao động</h3><p>Thử thay đổi từ khóa tìm kiếm trong bảng lương.</p></div>
      ) : (
        <div className="payroll-table-wrap payroll-lines-table-wrap payroll-full-table-wrap">
          <table className="payroll-table payroll-lines-table payroll-unified-table">
            <thead>
              <tr className="payroll-unified-section-row">
                <th className="payroll-line-employee-sticky" rowSpan={3}>Người lao động</th>
                <th className="payroll-unified-section section-employee" colSpan={5}>Thông tin nhân sự</th>
                <th className="payroll-unified-section section-bank" colSpan={3}>Thông tin ngân hàng</th>
                <th className="payroll-unified-section section-daily" colSpan={dayHeaders.length}>Công hằng ngày</th>
                {detailSections.map((section) => <th className={`payroll-unified-section section-${section.tone}`} colSpan={section.groups.reduce((total, group) => total + group.columns.length, 0)} key={section.key}>{section.label}</th>)}
                <th className="payroll-line-action-sticky" rowSpan={3} aria-label="Thao tác" />
              </tr>
              <tr className="payroll-unified-group-row">
                <th className="payroll-line-group group-employee" colSpan={5}>Hồ sơ tại thời điểm lập lương</th>
                <th className="payroll-line-group group-payment" colSpan={3}>Tài khoản nhận lương</th>
                <th className="payroll-line-group group-attendance" colSpan={dayHeaders.length}>Mã công 01–{dayHeaders.length}</th>
                {detailSections.flatMap((section) => section.groups.map((group) => <th className={`payroll-line-group group-${group.tone}`} colSpan={group.columns.length} key={`${section.key}-${group.label}`}>{group.label}</th>))}
              </tr>
              <tr className="payroll-unified-column-row">
                <th>CCCD</th><th>Điện thoại</th><th>Ngày vào làm</th><th>Bộ phận</th><th>Chức vụ</th>
                <th>Số tài khoản</th><th>Ngân hàng</th><th>Hình thức</th>
                {dayHeaders.map((entry) => <th className={`payroll-day-col ${entry.weekday.toLocaleLowerCase("vi").includes("cn") ? "weekend" : ""}`} key={entry.date}><span>{String(entry.day).padStart(2, "0")}</span><small>{entry.weekday}</small></th>)}
                {detailSections.flatMap((section) => section.groups.flatMap((group) => group.columns.map((column) => <th className={`payroll-col-${column.kind}`} key={`${section.key}-${group.label}-${column.key}`}>{column.label}</th>)))}
              </tr>
            </thead>
            <tbody>{rowData.map(({ line, employee, detail, days }) => (
              <tr key={line.id}>
                <td className="payroll-line-employee-sticky"><div className="line-employee"><UserAvatar name={line.employeeName} size="sm" /><div><strong>{line.employeeName}</strong><small>{line.employeeCode}</small>{line.note && <em>{line.note}</em>}</div></div></td>
                <td className="text-center font-mono">{maskValue(employee?.idCard, canViewSensitive, 3)}</td>
                <td className="text-center font-mono">{maskValue(employee?.phone, canViewSensitive, 3)}</td>
                <td className="text-center">{employee?.joinDate ? formatDate(employee.joinDate) : "—"}</td>
                <td>{employee?.department ?? "—"}</td><td>{line.position}</td>
                <td className="text-center bank-account-cell">{maskValue(detail.payment.bankAccount, canViewSensitive)}</td>
                <td>{detail.payment.bankName}</td><td className="text-center">{detail.payment.method === "transfer" ? "Chuyển khoản" : "Tiền mặt"}</td>
                {days.map((entry) => <td className={`payroll-full-day-cell status-${entry.status}`} title={`${entry.date}: ${entry.hours} giờ công, ${entry.overtimeHours} giờ OT`} key={entry.date}><strong>{entry.code}</strong>{entry.overtimeHours > 0 && <small>+{entry.overtimeHours}h</small>}</td>)}
                {detailSections.flatMap((section) => section.groups.flatMap((group) => group.columns.map((column) => {
                  const value = column.value(line, detail);
                  return <td className={`kind-${column.kind} ${column.emphasis ? `emphasis-${column.emphasis}` : ""}`} key={`${section.key}-${group.label}-${column.key}`}>{formatPayrollLineCell(column, value)}</td>;
                })))}
                <td className="payroll-line-action-sticky"><Button variant="ghost" size="icon" disabled={locked} aria-label={`Sửa lương ${line.employeeName}`} onClick={() => onEdit(line)}><PencilLine /></Button></td>
              </tr>
            ))}</tbody>
            <tfoot><tr>
              <td className="payroll-line-employee-sticky"><strong>Tổng cộng</strong><small>{visibleLines.length} NLĐ</small></td>
              <td className="payroll-full-footer-note" colSpan={8 + dayHeaders.length}>Tổng hợp toàn bộ dữ liệu trong cùng một bảng · {dayHeaders.length} ngày công lịch</td>
              {detailSections.flatMap((section) => section.groups.flatMap((group) => group.columns.map((column) => {
                if (column.aggregate === false || column.kind === "text") return <td className="text-center" key={`${section.key}-${group.label}-${column.key}`}>—</td>;
                const total = visibleLines.reduce((sum, line) => sum + Number(column.value(line, getPayrollLineDetail(line)) || 0), 0);
                return <td className={`kind-${column.kind} ${column.emphasis ? `emphasis-${column.emphasis}` : ""}`} key={`${section.key}-${group.label}-${column.key}`}>{formatPayrollLineCell(column, total)}</td>;
              })))}
              <td className="payroll-line-action-sticky" />
            </tr></tfoot>
          </table>
        </div>
      )}
      <p className="payroll-full-table-footnote">Bảng gồm {5 + 3 + dayHeaders.length + detailColumnCount} cột dữ liệu. Kéo ngang để xem toàn bộ như file Excel.</p>
    </section>
  );
}
