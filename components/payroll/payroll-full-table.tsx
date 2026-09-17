"use client";

import { Search } from "lucide-react";
import type { PayrollMatrix } from "@/lib/payroll-types";
import { formatCurrency } from "@/lib/utils";

export function PayrollFullTable({
  matrix,
  query,
  onQueryChange,
  canViewSensitive,
}: {
  matrix: PayrollMatrix;
  query: string;
  onQueryChange: (value: string) => void;
  canViewSensitive: boolean;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visibleRows = matrix.rows.filter((row) =>
    `${row.employeeCode} ${row.fullName}`.toLocaleLowerCase("vi").includes(normalizedQuery),
  );

  const formatCell = (val: any, type: string) => {
    if (val == null) return "—";
    if (type === "currency") return formatCurrency(Number(val));
    if (type === "number") return Number(val).toLocaleString("vi-VN");
    return String(val);
  };

  const maskValue = (value: string | undefined, visible: boolean, keep = 4) => {
    if (!value) return "—";
    if (visible || value === "—") return value;
    return `${"•".repeat(Math.max(4, value.length - keep))}${value.slice(-keep)}`;
  };

  return (
    <section className="payroll-detail-section payroll-full-section">
      <div className="payroll-section-toolbar">
        <div>
          <h2>Bảng lương chi tiết</h2>
        </div>
        <label className="search-field payroll-line-search">
          <Search />
          <input 
            value={query} 
            onChange={(event) => onQueryChange(event.target.value)} 
            placeholder="Tìm mã hoặc tên…" 
            aria-label="Tìm người lao động trong bảng lương" 
          />
        </label>
      </div>

      {visibleRows.length === 0 ? (
        <div className="payroll-empty compact">
          <Search />
          <h3>Không tìm thấy người lao động</h3>
          <p>Thử thay đổi từ khóa tìm kiếm trong bảng lương.</p>
        </div>
      ) : (
        <div className="payroll-table-wrap payroll-lines-table-wrap payroll-full-table-wrap overflow-x-auto">
          <table className="payroll-table payroll-lines-table payroll-unified-table w-full">
            <thead>
              <tr className="payroll-unified-section-row">
                {matrix.columns.map((col) => (
                  <th 
                    key={col.key}
                    className={`whitespace-nowrap px-4 py-2 border-b text-left text-sm font-semibold text-muted-foreground ${col.isFixed ? "sticky left-0 bg-background z-10" : ""}`}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, idx) => (
                <tr key={row.employeeCode || idx} className="hover:bg-muted/30">
                  {matrix.columns.map((col) => {
                    let val = row[col.key];
                    if (col.key === "bankAccountNumber") val = maskValue(val, canViewSensitive);
                    
                    return (
                      <td 
                        key={col.key} 
                        className={`whitespace-nowrap px-4 py-2 border-b text-sm ${col.dataType === 'currency' || col.dataType === 'number' ? 'text-right' : ''} ${col.isFixed ? "sticky left-0 bg-background z-10 shadow-[1px_0_0_0_var(--border)]" : ""}`}
                      >
                        {formatCell(val, col.dataType)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                {matrix.columns.map((col) => {
                  if (col.key === "employeeCode") return <td key={col.key} className="px-4 py-2 border-t sticky left-0 bg-muted/90 z-10">Tổng cộng</td>;
                  if (col.dataType === "currency") {
                    const total = visibleRows.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
                    return <td key={col.key} className="px-4 py-2 border-t text-right">{formatCurrency(total)}</td>;
                  }
                  if (col.dataType === "number") {
                     const total = visibleRows.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
                     return <td key={col.key} className="px-4 py-2 border-t text-right">{total.toLocaleString("vi-VN")}</td>;
                  }
                  return <td key={col.key} className="px-4 py-2 border-t" />;
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="payroll-full-table-footnote mt-3 text-sm text-muted-foreground">Bảng hiển thị động theo ma trận công thức tính lương.</p>
    </section>
  );
}
