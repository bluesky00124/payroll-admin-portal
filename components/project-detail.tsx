"use client";

import { useQuery } from "@tanstack/react-query";
import { Factory, FunctionSquare, LoaderCircle, ScrollText } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { FormulaTab } from "@/components/tabs/formula-tab";
import { OverviewTab } from "@/components/tabs/overview-tab";
import { PoliciesTab } from "@/components/tabs/policies-tab";
import { ErrorState, LoadingBlock } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type TabId = "policies" | "formulas";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("policies");
  const projectQuery = useQuery({ queryKey: ["project", projectId], queryFn: () => api.getProject(projectId) });

  if (projectQuery.isLoading)
    return (
      <AdminShell detailLabel="Đang tải…">
        <LoadingBlock rows={7} />
      </AdminShell>
    );

  if (projectQuery.isError || !projectQuery.data)
    return (
      <AdminShell detailLabel="Không tìm thấy">
        <ErrorState
          message={(projectQuery.error as Error)?.message ?? "Không tìm thấy dự án"}
          retry={() => projectQuery.refetch()}
        />
      </AdminShell>
    );

  const project = projectQuery.data;

  return (
    <AdminShell detailLabel={project.code}>
      {/* Read-only Project Header (Compact) */}
      <header className="detail-header">
        <div>
          <div className="detail-code-row">
            <span className="project-monogram">
              <Factory className="w-4 h-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="title-with-status">
                <h1>{project.name}</h1>
              </div>
              <span className="font-mono font-bold text-primary text-xs tracking-wide">
                {project.code}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Read-only Project Information Overview Grid */}
      <div className="mb-6">
        <OverviewTab project={project} embedded />
      </div>

      {/* Horizontal Tabs Navigation (Minimalist Underline) */}
      <nav className="project-tabs-nav" aria-label="Cấu hình dự án">
        <button
          type="button"
          className={`project-tab-btn ${activeTab === "policies" ? "active" : ""}`}
          onClick={() => setActiveTab("policies")}
        >
          <ScrollText />
          <span>Danh sách chế độ</span>
          {activeTab === "policies" && <span className="tab-indicator" />}
        </button>
        <button
          type="button"
          className={`project-tab-btn ${activeTab === "formulas" ? "active" : ""}`}
          onClick={() => setActiveTab("formulas")}
        >
          <FunctionSquare />
          <span>Công thức tính lương</span>
          {activeTab === "formulas" && <span className="tab-indicator" />}
        </button>
      </nav>

      {/* Active Tab Content Area */}
      <div className="tab-content-area">
        {activeTab === "policies" && <PoliciesTab projectId={project.id} embedded />}
        {activeTab === "formulas" && <FormulaTab projectId={project.id} embedded />}
      </div>

      {projectQuery.isFetching && (
        <div className="corner-loading">
          <LoaderCircle className="spin" />
          Đang đồng bộ
        </div>
      )}
    </AdminShell>
  );
}
