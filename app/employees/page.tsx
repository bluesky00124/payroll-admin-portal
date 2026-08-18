import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { EmployeesTab } from "@/components/tabs/employees-tab";

export const metadata: Metadata = {
  title: "Người lao động | Payroll Admin Portal",
  description: "Quản trị danh sách người lao động, người phụ thuộc, phép năm, công đoàn phí, công chuẩn, BHXH và thuế TNCN theo dự án",
};

export default function EmployeesPage() {
  return (
    <AdminShell detailLabel="Quản trị người lao động">
      <EmployeesTab />
    </AdminShell>
  );
}
