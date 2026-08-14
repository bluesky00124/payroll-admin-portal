"use client";

import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function OverviewTab({ project }: { project: Project; embedded?: boolean }) {
  return (
    <div className="project-info-panel">
      <div className="info-panel-grid">
        <div className="info-panel-item">
          <span className="info-panel-label">Chủ dự án (Owner)</span>
          <strong className="info-panel-value">{project.manager}</strong>
        </div>

        <div className="info-panel-item">
          <span className="info-panel-label">Địa điểm triển khai</span>
          <strong className="info-panel-value">{project.location}</strong>
        </div>

        <div className="info-panel-item">
          <span className="info-panel-label">Ngày start dự án</span>
          <strong className="info-panel-value">{formatDate(project.effectiveFrom)}</strong>
        </div>

        <div className="info-panel-item wide">
          <span className="info-panel-label">Chu kỳ lương</span>
          <strong className="info-panel-value">
            {project.payrollCycle || "Chốt công ngày 25 hàng tháng (Từ 26 tháng trước đến 25 tháng này)"}
          </strong>
        </div>

        <div className="info-panel-item">
          <span className="info-panel-label">Ngày thanh toán lương</span>
          <strong className="info-panel-value">Cuối tháng (Chuyển khoản)</strong>
        </div>
      </div>
    </div>
  );
}
