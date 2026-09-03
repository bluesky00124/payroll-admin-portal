"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, LoadingBlock } from "@/components/ui";
import { api } from "@/lib/api";

export function ProjectsList() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const projectsQuery = useQuery({
    queryKey: ["projects", debouncedQuery, "all", page],
    queryFn: () => api.getProjects({ q: debouncedQuery, status: "all", page, pageSize: 6 }),
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Quản lý dự án</h1>
        </div>
      </div>

      <section className="content-card project-card">
        <div className="table-toolbar">
          <label className="search-field">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm mã, tên dự án, chủ dự án..."
              aria-label="Tìm dự án"
            />
          </label>
          <div className="table-toolbar-meta">
            <span className="total-projects-pill">
              <span className="status-dot-pulse" />
              <span>{projectsQuery.data?.meta?.total ?? 0} dự án</span>
            </span>
          </div>
        </div>

        {projectsQuery.isLoading ? (
          <LoadingBlock rows={6} />
        ) : projectsQuery.isError ? (
          <ErrorState message={(projectsQuery.error as Error).message} retry={() => projectsQuery.refetch()} />
        ) : projectsQuery.data?.data.length === 0 ? (
          <EmptyState title="Không tìm thấy dự án" description="Thử thay đổi từ khóa tìm kiếm." />
        ) : (
          <div className="project-grid">
            {projectsQuery.data?.data.map((project) => (
              <div
                key={project.id}
                className="project-card-item"
                onClick={() => router.push(`/projects/${project.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="project-card-heading mb-3.5">
                  <h3 className="project-card-title mb-1.5">{project.name}</h3>
                  <div>
                    <span className="project-code-badge">{project.code}</span>
                  </div>
                </div>

                <div className="project-info-grid">
                  <div className="info-row">
                    <span className="info-label">
                      <UserRound className="info-icon" /> Chủ dự án:
                    </span>
                    <strong className="info-value truncate" title={project.manager}>
                      {project.manager}
                    </strong>
                  </div>

                  {project.managerPhone && (
                    <div className="info-row">
                      <span className="info-label pl-5">SĐT:</span>
                      <span className="info-value contact-value">{project.managerPhone}</span>
                    </div>
                  )}

                  {project.managerEmail && (
                    <div className="info-row">
                      <span className="info-label pl-5">Email:</span>
                      <span className="info-value contact-value break-all" title={project.managerEmail}>
                        {project.managerEmail}
                      </span>
                    </div>
                  )}

                  <div className="info-divider" />

                  <div className="info-row">
                    <span className="info-label">
                      <UsersRound className="info-icon" /> Nhân viên đang làm việc:
                    </span>
                    <strong className="info-value employee-count">
                      {project.employeeCount.toLocaleString("vi-VN")} nhân viên
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="table-footer">
          <span>
            Hiển thị {projectsQuery.data?.data.length ?? 0} / {projectsQuery.data?.meta?.total ?? 0} dự án
          </span>
          <div>
            <Button
              size="icon"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              aria-label="Trang trước"
            >
              <ChevronLeft />
            </Button>
            <span>
              Trang {page} / {projectsQuery.data?.meta?.totalPages ?? 1}
            </span>
            <Button
              size="icon"
              variant="ghost"
              disabled={page >= (projectsQuery.data?.meta?.totalPages ?? 1)}
              onClick={() => setPage((value) => value + 1)}
              aria-label="Trang sau"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
