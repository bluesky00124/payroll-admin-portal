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

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type TabId = "policies" | "formulas";

export function ProjectDetail({ projectId, embedded = false }: { projectId: string; embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>("policies");
  const projectQuery = useQuery({ queryKey: ["project", projectId], queryFn: () => api.getProject(projectId) });

  if (projectQuery.isLoading) {
    const loadingEl = <LoadingBlock rows={7} />;
    return embedded ? loadingEl : <AdminShell detailLabel="Đang tải…">{loadingEl}</AdminShell>;
  }

  if (projectQuery.isError || !projectQuery.data) {
    const errorEl = (
      <ErrorState
        message={(projectQuery.error as Error)?.message ?? "Không tìm thấy dự án"}
        retry={() => projectQuery.refetch()}
      />
    );
    return embedded ? errorEl : <AdminShell detailLabel="Không tìm thấy">{errorEl}</AdminShell>;
  }

  const project = projectQuery.data;

  const content = (
    <div className="project-detail-container">
      {/* Read-only Project Header (Compact) */}
      <header className="detail-header">
        <div className="flex items-center justify-between gap-4 flex-wrap w-full">
          <div className="detail-code-row">
            {embedded && (
              <Link href="/projects" className="button button-secondary button-sm flex items-center gap-1.5 mr-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </Link>
            )}
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
    </div>
  );

  return embedded ? content : <AdminShell detailLabel={project.code}>{content}</AdminShell>;
}
