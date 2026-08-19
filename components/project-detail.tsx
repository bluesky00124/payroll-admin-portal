"use client";

import { useQuery } from "@tanstack/react-query";
import { FunctionSquare, LoaderCircle, ScrollText } from "lucide-react";
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
      <header className="detail-header mb-4">
        <div>
          <div className="detail-code-row">
            <span className="project-monogram">{project.code.slice(0, 2)}</span>
            <div>
              <div className="title-with-status">
                <h1>{project.code}</h1>
              </div>
              <p>
                {project.name} · {project.client}
              </p>
            </div>
          </div>
        </div>
        <div className="detail-meta">
          <div className="bg-secondary/60 px-3 py-1.5 rounded-lg border border-border/40">
            <span>Hiệu lực từ:</span>
            <strong>{formatDate(project.effectiveFrom)}</strong>
          </div>
        </div>
      </header>

      {/* Read-only Project Information Overview Grid */}
      <div className="mb-6">
        <OverviewTab project={project} embedded />
      </div>

      {/* Horizontal Tabs Navigation */}
      <nav className="project-tabs-nav" aria-label="Cấu hình dự án">
        <button
          type="button"
          className={`project-tab-btn ${activeTab === "policies" ? "active" : ""}`}
          onClick={() => setActiveTab("policies")}
        >
          <ScrollText />
          Danh sách chế độ
        </button>
        <button
          type="button"
          className={`project-tab-btn ${activeTab === "formulas" ? "active" : ""}`}
          onClick={() => setActiveTab("formulas")}
        >
          <FunctionSquare />
          Công thức tính lương
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
