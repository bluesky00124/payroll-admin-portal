"use client";

import type { Project } from "@/lib/types";

export function OverviewTab({ project }: { project: Project; embedded?: boolean }) {
  return (
    <div className="project-info-panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        <div className="info-panel-item">
          <span className="info-panel-label">Chủ dự án</span>
          <strong className="info-panel-value">{project.manager}</strong>
          {(project.managerPhone || project.managerEmail) && (
            <div className="text-xs text-muted font-normal mt-1 space-y-0.5">
              {project.managerPhone && (
                <div>SĐT: <span className="text-foreground/85 font-medium">{project.managerPhone}</span></div>
              )}
              {project.managerEmail && (
                <div className="break-all">Email: <span className="text-foreground/85">{project.managerEmail}</span></div>
              )}
            </div>
          )}
        </div>

        <div className="info-panel-item">
          <span className="info-panel-label">Địa điểm triển khai</span>
          <strong className="info-panel-value">{project.location}</strong>
        </div>

        <div className="info-panel-item">
          <span className="info-panel-label">Chu kỳ lương</span>
          <strong className="info-panel-value">
            {project.payrollCycle || "Chốt công ngày 25 hàng tháng"}
          </strong>
        </div>

        <div className="info-panel-item">
          <span className="info-panel-label">Nhân viên đang làm việc</span>
          <strong className="info-panel-value text-primary">
            {project.employeeCount?.toLocaleString("vi-VN") ?? 0} nhân viên
          </strong>
        </div>
      </div>
    </div>
  );
}


