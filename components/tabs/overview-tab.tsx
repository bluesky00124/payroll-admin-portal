"use client";

import { CalendarDays, MapPin, UserRound, Users } from "lucide-react";
import type { Project } from "@/lib/types";

export function OverviewTab({ project }: { project: Project; embedded?: boolean }) {
  return (
    <div className="project-overview-section">
      <div className="project-overview-heading">
        <h2>TỔNG QUAN</h2>
      </div>

      <div className="overview-stats-grid">
        {/* Card 1: Chủ dự án */}
        <div className="stat-card">
          <div className="stat-icon stat-icon-cyan">
            <UserRound className="w-5 h-5" />
          </div>
          <div className="stat-body">
            <span className="stat-label">Chủ dự án</span>
            <div className="stat-value font-semibold text-foreground truncate">
              {project.manager || "—"}
            </div>
            {(project.managerPhone || project.managerEmail) && (
              <div className="stat-subinfo">
                {project.managerPhone && (
                  <span className="stat-subitem">
                    <span className="stat-sublabel">SĐT:</span>
                    <span className="stat-subval">{project.managerPhone}</span>
                  </span>
                )}
                {project.managerEmail && (
                  <span className="stat-subitem" title={project.managerEmail}>
                    <span className="stat-sublabel">Email:</span>
                    <span className="stat-subval">{project.managerEmail}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Địa điểm triển khai */}
        <div className="stat-card">
          <div className="stat-icon stat-icon-emerald">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="stat-body">
            <span className="stat-label">Địa điểm triển khai</span>
            <div className="stat-value font-semibold text-foreground">
              {project.location || "Chưa thiết lập"}
            </div>
          </div>
        </div>

        {/* Card 3: Chu kỳ lương */}
        <div className="stat-card">
          <div className="stat-icon stat-icon-indigo">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="stat-body">
            <span className="stat-label">Chu kỳ tính lương</span>
            <div className="stat-value font-semibold text-foreground">
              {project.payrollCycle || "Hàng tháng"}
            </div>
          </div>
        </div>

        {/* Card 4: Nhân viên đang làm việc */}
        <div className="stat-card">
          <div className="stat-icon stat-icon-amber">
            <Users className="w-5 h-5" />
          </div>
          <div className="stat-body">
            <span className="stat-label">Nhân viên đang làm việc</span>
            <div className="stat-value font-bold text-primary">
              {(project.employeeCount ?? 0).toLocaleString("vi-VN")} nhân viên
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


