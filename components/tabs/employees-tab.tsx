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
import { useEffect, useState, type ReactNode } from "react";
import { DependentsSubtab } from "@/components/employees/dependents-subtab";
import { InsuranceSubtab } from "@/components/employees/insurance-subtab";
import { LeaveSubtab } from "@/components/employees/leave-subtab";
import { OtherDeductionsSubtab } from "@/components/employees/other-deductions-subtab";
import { OtherIncomesSubtab } from "@/components/employees/other-incomes-subtab";
import { EmployeePoliciesSubtab } from "@/components/employees/policies-subtab";
import { StandardWorkdaysSubtab } from "@/components/employees/standard-workdays-subtab";
import { UnionFeesSubtab } from "@/components/employees/union-fees-subtab";
import { EmptyState, ErrorState, GsProjectCombobox, LoadingBlock } from "@/components/ui";
import { api } from "@/lib/api";
import { hideGsLoading, showGsLoading } from "@/lib/utils";

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

  const initialDefaultId = () => {
    if (projectId) return projectId;
    if (typeof window !== "undefined") {
      const serverProjects = (window as any).__SERVER_PROJECTS;
      if (Array.isArray(serverProjects) && serverProjects.length > 0) {
        return String(serverProjects[0].id ?? serverProjects[0].ProjectId ?? serverProjects[0].Id ?? "");
      }
    }
    return "";
  };

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialDefaultId);
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);

  const effectiveProjectId = embedded ? projectId || "" : selectedProjectId;

  const projectsQuery = useQuery({
    queryKey: ["projects-lookup"],
    queryFn: () => api.getLookupProjects(),
    enabled: !embedded,
  });

  const projects = projectsQuery.data ?? [];

  // Tự động chọn dự án đầu tiên khi danh sách dự án tải xong nếu chưa có dự án nào được chọn
  useEffect(() => {
    if (!projectId && !selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projectId, projects, selectedProjectId]);

  const employeesQuery = useQuery({
    queryKey: ["employees", effectiveProjectId],
    queryFn: () => api.getEmployees({ projectId: (!effectiveProjectId || effectiveProjectId === "all") ? undefined : effectiveProjectId }),
    enabled: Boolean(effectiveProjectId || embedded),
  });

  const employees = employeesQuery.data ?? [];

  useEffect(() => {
    if (employeesQuery.isFetching && Boolean(employeesQuery.data)) {
      showGsLoading("Đang tải dữ liệu người lao động...");
    } else {
      hideGsLoading();
    }
    return () => hideGsLoading();
  }, [employeesQuery.isFetching, Boolean(employeesQuery.data)]);

  return (
    <div className="employees-main-tab">
      {/* Top Header & Project Filter */}
      <div className="page-heading">
        <div>
          <h1>Người lao động</h1>
        </div>

        <div className="heading-actions flex items-center gap-2">
          {headerAction}
          {!embedded && (
            <div style={{ minWidth: "300px" }}>
              <GsProjectCombobox
                items={projects}
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                placeholder="Tất cả dự án"
                allowAll={true}
              />
            </div>
          )}
        </div>
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
              onClick={() => {
                setHeaderAction(null);
                setActiveSubtab(tab.id);
              }}
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
              <DependentsSubtab
                projectId={effectiveProjectId}
                employees={employees}
                setHeaderAction={setHeaderAction}
              />
            )}
            {activeSubtab === "leave" && (
              <LeaveSubtab
                projectId={effectiveProjectId}
                employees={employees}
                setHeaderAction={setHeaderAction}
              />
            )}
            {activeSubtab === "union" && (
              <UnionFeesSubtab
                projectId={effectiveProjectId}
                employees={employees}
                setHeaderAction={setHeaderAction}
              />
            )}
            {activeSubtab === "workdays" && (
              <StandardWorkdaysSubtab
                projectId={effectiveProjectId}
                employees={employees}
                setHeaderAction={setHeaderAction}
              />
            )}
            {activeSubtab === "insurance" && (
              <InsuranceSubtab
                projectId={effectiveProjectId}
                employees={employees}
                setHeaderAction={setHeaderAction}
              />
            )}
            {activeSubtab === "policies" && (
              <EmployeePoliciesSubtab
                projectId={effectiveProjectId}
                employees={employees}
                setHeaderAction={setHeaderAction}
              />
            )}
            {activeSubtab === "deductions" && (
              <OtherDeductionsSubtab
                projectId={effectiveProjectId}
                employees={employees}
                setHeaderAction={setHeaderAction}
              />
            )}
            {activeSubtab === "incomes" && (
              <OtherIncomesSubtab
                projectId={effectiveProjectId}
                employees={employees}
                setHeaderAction={setHeaderAction}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
