import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { PayrollDetailPage } from "@/components/payroll/payroll-detail-page";

export async function generateMetadata({ params }: { params: Promise<{ payrollId: string }> }): Promise<Metadata> {
  const { payrollId } = await params;
  return {
    title: `Chi tiết bảng lương ${payrollId}`,
    description: "Chi tiết công, thu nhập, khấu trừ, ngân hàng và quy trình duyệt bảng lương.",
  };
}

export default async function PayrollDetailRoute({ params }: { params: Promise<{ payrollId: string }> }) {
  const { payrollId } = await params;
  return <AdminShell detailLabel="Chi tiết bảng lương"><PayrollDetailPage payrollId={payrollId} /></AdminShell>;
}
