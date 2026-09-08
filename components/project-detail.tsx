"use client";

import { useQuery } from "@tanstack/react-query";
import { FunctionSquare, LoaderCircle, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { FormulaTab } from "@/components/tabs/formula-tab";
import { PoliciesTab } from "@/components/tabs/policies-tab";
import { ErrorState, LoadingBlock } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, hideGsLoading, showGsLoading } from "@/lib/utils";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type TabId = "policies" | "formulas";

export function ProjectDetail({ projectId, embedded = false }: { projectId: string; embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>("policies");
  const projectQuery = useQuery({ queryKey: ["project", projectId], queryFn: () => api.getProject(projectId) });

  useEffect(() => {
    if (projectQuery.isFetching && Boolean(projectQuery.data)) {
      showGsLoading("Đang đồng bộ thông tin dự án...");
    } else {
      hideGsLoading();
    }
    return () => hideGsLoading();
  }, [projectQuery.isFetching, Boolean(projectQuery.data)]);

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
      {/* Back button navigation (SOP Standard Text Link) */}
      {embedded && (
        <div className="mb-3.5">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Về danh sách dự án</span>
          </Link>
        </div>
      )}

      {/* Level 1: Page Header (Project Title & Code Badge) */}
      <div className="project-detail-page-header mb-3.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="project-page-title">{project.name}</h1>
          <span className="project-code-badge">{project.code}</span>
        </div>
      </div>

      {/* Level 2: Project Metadata Strip (Clean SaaS Style) */}
      <div className="project-meta-strip mb-6">
        {/* Item 1: Chủ dự án */}
        <div className="meta-strip-item">
          <span className="meta-strip-label">Chủ dự án:</span>
          <strong className="meta-strip-value">{project.manager || "—"}</strong>
          {(project.managerPhone || project.managerEmail) && (
            <span className="meta-strip-contact">
              {project.managerPhone && (
                <span className="contact-chunk">
                  <span className="text-muted/60">•</span>
                  <span className="text-muted text-xs">SĐT:</span>
                  <span className="font-medium text-foreground">{project.managerPhone}</span>
                </span>
              )}
              {project.managerEmail && (
                <span className="contact-chunk" title={project.managerEmail}>
                  <span className="text-muted/60">•</span>
                  <span className="text-muted text-xs">Email:</span>
                  <span className="font-medium text-foreground">{project.managerEmail}</span>
                </span>
              )}
            </span>
          )}
        </div>

        <div className="meta-strip-divider" />

        {/* Item 2: Chu kỳ tính lương */}
        <div className="meta-strip-item">
          <span className="meta-strip-label">Chu kỳ lương:</span>
          <strong className="meta-strip-value">
            {project.payrollCycle || "Hàng tháng"}
          </strong>
        </div>

        <div className="meta-strip-divider" />

        {/* Item 3: Quy mô nhân sự */}
        <div className="meta-strip-item">
          <span className="meta-strip-label">Nhân sự:</span>
          <strong className="meta-strip-value meta-strip-highlight">
            {(project.employeeCount ?? 0).toLocaleString("vi-VN")} nhân viên
          </strong>
        </div>
      </div>

      {/* Horizontal Tabs Navigation (Minimalist Underline) */}
      <nav className="project-tabs-nav" aria-label="Cấu hình dự án">
        <button
          type="button"
          className={`project-tab-btn ${activeTab === "policies" ? "active" : ""}`}
          onClick={() => setActiveTab("policies")}
        >
          <ScrollText className="w-4 h-4" />
          <span>Danh sách chế độ</span>
          {activeTab === "policies" && <span className="tab-indicator" />}
        </button>
        <button
          type="button"
          className={`project-tab-btn ${activeTab === "formulas" ? "active" : ""}`}
          onClick={() => setActiveTab("formulas")}
        >
          <FunctionSquare className="w-4 h-4" />
          <span>Công thức tính lương</span>
          {activeTab === "formulas" && <span className="tab-indicator" />}
        </button>
      </nav>

      {/* Active Tab Content Area */}
      <div className="tab-content-area">
        {activeTab === "policies" && <PoliciesTab projectId={project.id} embedded />}
        {activeTab === "formulas" && <FormulaTab projectId={project.id} embedded />}
      </div>
    </div>
  );

  return embedded ? content : <AdminShell detailLabel={project.code}>{content}</AdminShell>;
}
