import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { PayrollWorkspacePage } from "@/components/payroll/payroll-workspace";

export const metadata: Metadata = {
  title: "Bảng lương",
  description: "Khởi tạo, duyệt, điều chỉnh và khóa bảng lương theo dự án.",
};

export default function PayrollPage() {
  return (
    <AdminShell detailLabel="Quản lý bảng lương">
      <PayrollWorkspacePage />
    </AdminShell>
  );
}
