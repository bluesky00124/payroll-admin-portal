"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Coins,
  Filter,
  Palmtree,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { DependentsSubtab } from "@/components/employees/dependents-subtab";
import { InsuranceSubtab } from "@/components/employees/insurance-subtab";
import { LeaveSubtab } from "@/components/employees/leave-subtab";
import { OtherDeductionsSubtab } from "@/components/employees/other-deductions-subtab";
import { OtherIncomesSubtab } from "@/components/employees/other-incomes-subtab";
import { EmployeePoliciesSubtab } from "@/components/employees/policies-subtab";
import { StandardWorkdaysSubtab } from "@/components/employees/standard-workdays-subtab";
import { UnionFeesSubtab } from "@/components/employees/union-fees-subtab";
import { EmptyState, ErrorState, LoadingBlock, SearchableSelect } from "@/components/ui";
import { api } from "@/lib/api";

type EmployeeSubtab =
  | "dependents"
  | "leave"
  | "union"
  | "workdays"
  | "insurance"
  | "policies"
  | "deductions"
  | "incomes";

const SUBTABS: { id: EmployeeSubtab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dependents", label: "Người phụ thuộc", icon: Users },
  { id: "leave", label: "Phép năm", icon: Palmtree },
  { id: "union", label: "Công đoàn phí", icon: Coins },
  { id: "workdays", label: "Ngày công chuẩn", icon: CalendarDays },
  { id: "insurance", label: "Bảo hiểm xã hội", icon: ShieldCheck },
  { id: "policies", label: "Chế độ & Phụ cấp", icon: ScrollText },
  { id: "deductions", label: "Khoản trừ khác", icon: ReceiptText },
  { id: "incomes", label: "Thu nhập khác", icon: WalletCards },
];

export function EmployeesTab({
  projectId,
  embedded = false,
}: {
  projectId?: string;
  embedded?: boolean;
}) {
  const [activeSubtab, setActiveSubtab] = useState<EmployeeSubtab>("dependents");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || "all");

  const effectiveProjectId = embedded ? projectId || "all" : selectedProjectId;

  const projectsQuery = useQuery({
    queryKey: ["projects-lookup"],
    queryFn: () => api.getProjects({ pageSize: 100 }),
    enabled: !embedded,
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", effectiveProjectId],
    queryFn: () => api.getEmployees({ projectId: effectiveProjectId === "all" ? undefined : effectiveProjectId }),
  });

  const projects = projectsQuery.data?.data ?? [];
  const employees = employeesQuery.data ?? [];

  return (
    <div className="employees-main-tab">
      {/* Top Header & Project Filter (Shown when not embedded or standalone) */}
      <div className="tab-heading mb-4">
        <div>
          <span className="section-kicker">QUẢN TRỊ NHÂN SỰ &amp; DỮ LIỆU TÍNH LƯƠNG</span>
          <h2>Người lao động theo dự án</h2>
        </div>

        {!embedded && (
          <div className="heading-actions" style={{ minWidth: "280px" }}>
            <SearchableSelect
              icon={<Filter />}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="Chọn dự án..."
              searchPlaceholder="Tìm mã hoặc tên dự án..."
              options={[
                { value: "all", label: `Tất cả dự án (${projects.length})` },
                ...projects.map((p) => ({
                  value: p.id,
                  label: `${p.code} - ${p.name}`,
                  subLabel: p.client || p.location,
                })),
              ]}
            />
          </div>
        )}
      </div>

      {/* Sub-navigation tabs (Clean Minimalist Underline) */}
      <nav className="employee-subnav" aria-label="Phân hệ người lao động">
        {SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubtab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`subnav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveSubtab(tab.id)}
            >
              <Icon />
              <span>{tab.label}</span>
              {isActive && <span className="subnav-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Subtab Content Area */}
      <section className="subtab-content-area mt-4">
        {employeesQuery.isLoading ? (
          <LoadingBlock rows={7} />
        ) : employeesQuery.isError ? (
          <ErrorState
            message="Không thể tải danh sách nhân viên"
            retry={() => employeesQuery.refetch()}
          />
        ) : (
          <>
            {activeSubtab === "dependents" && (
              <DependentsSubtab projectId={effectiveProjectId} employees={employees} />
            )}
            {activeSubtab === "leave" && (
              <LeaveSubtab projectId={effectiveProjectId} employees={employees} />
            )}
            {activeSubtab === "union" && (
              <UnionFeesSubtab projectId={effectiveProjectId} employees={employees} />
            )}
            {activeSubtab === "workdays" && (
              <StandardWorkdaysSubtab projectId={effectiveProjectId} employees={employees} />
            )}
            {activeSubtab === "insurance" && (
              <InsuranceSubtab projectId={effectiveProjectId} employees={employees} />
            )}
            {activeSubtab === "policies" && (
              <EmployeePoliciesSubtab projectId={effectiveProjectId} employees={employees} />
            )}
            {activeSubtab === "deductions" && (
              <OtherDeductionsSubtab projectId={effectiveProjectId} employees={employees} />
            )}
            {activeSubtab === "incomes" && (
              <OtherIncomesSubtab projectId={effectiveProjectId} employees={employees} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
