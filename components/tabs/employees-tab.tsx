"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Coins,
  FileSpreadsheet,
  Filter,
  Palmtree,
  Percent,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { DependentsSubtab } from "@/components/employees/dependents-subtab";
import { InsuranceSubtab } from "@/components/employees/insurance-subtab";
import { LeaveSubtab } from "@/components/employees/leave-subtab";
import { StandardWorkdaysSubtab } from "@/components/employees/standard-workdays-subtab";
import { TaxSubtab } from "@/components/employees/tax-subtab";
import { UnionFeesSubtab } from "@/components/employees/union-fees-subtab";
import { Badge, EmptyState, ErrorState, LoadingBlock } from "@/components/ui";
import { api } from "@/lib/api";

type EmployeeSubtab = "dependents" | "leave" | "union" | "workdays" | "insurance" | "tax";

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
          <div className="heading-actions">
            <div className="project-select-filter">
              <Filter />
              <label htmlFor="project-filter-select" className="sr-only">Lọc theo dự án</label>
              <select
                id="project-filter-select"
                className="filter-select"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="all">Tất cả dự án ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Sub-navigation tabs */}
      <nav className="employee-subnav" aria-label="Phân hệ người lao động">
        <button
          type="button"
          className={`subnav-item ${activeSubtab === "dependents" ? "active" : ""}`}
          onClick={() => setActiveSubtab("dependents")}
        >
          <Users />
          <span>Người phụ thuộc</span>
        </button>

        <button
          type="button"
          className={`subnav-item ${activeSubtab === "leave" ? "active" : ""}`}
          onClick={() => setActiveSubtab("leave")}
        >
          <Palmtree />
          <span>Phép năm</span>
        </button>

        <button
          type="button"
          className={`subnav-item ${activeSubtab === "union" ? "active" : ""}`}
          onClick={() => setActiveSubtab("union")}
        >
          <Coins />
          <span>Công đoàn phí</span>
        </button>

        <button
          type="button"
          className={`subnav-item ${activeSubtab === "workdays" ? "active" : ""}`}
          onClick={() => setActiveSubtab("workdays")}
        >
          <CalendarDays />
          <span>Ngày công chuẩn</span>
        </button>

        <button
          type="button"
          className={`subnav-item ${activeSubtab === "insurance" ? "active" : ""}`}
          onClick={() => setActiveSubtab("insurance")}
        >
          <ShieldCheck />
          <span>Bảo hiểm xã hội</span>
        </button>

        <button
          type="button"
          className={`subnav-item ${activeSubtab === "tax" ? "active" : ""}`}
          onClick={() => setActiveSubtab("tax")}
        >
          <Percent />
          <span>Thuế TNCN</span>
        </button>
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
            {activeSubtab === "tax" && (
              <TaxSubtab
                projectId={effectiveProjectId}
                employees={employees}
                onNavigateToDependents={() => setActiveSubtab("dependents")}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
