"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Search,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock, TablePaginationFooter } from "@/components/ui";
import { api } from "@/lib/api";
import { hideGsLoading, showGsLoading } from "@/lib/utils";

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
    queryFn: () => api.getProjects({ q: debouncedQuery, status: "all", page, pageSize: 8 }),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    // Lần đầu tải trang sẽ dùng Skeleton, chỉ kích hoạt GS Loading toàn màn hình khi chuyển trang hoặc tìm kiếm sau đó
    if (projectsQuery.isFetching && Boolean(projectsQuery.data)) {
      showGsLoading("Đang tải danh sách dự án...");
    } else {
      hideGsLoading();
    }

    return () => {
      hideGsLoading();
    };
  }, [projectsQuery.isFetching, Boolean(projectsQuery.data)]);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <BriefcaseBusiness size={14} className="!w-3.5 !h-3.5" />
            CẤU HÌNH DỰ ÁN
          </div>
          <h1>Quản lý dự án</h1>
        </div>
      </div>

      <section className="content-card project-card">
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={15} className="!w-3.5 !h-3.5" />
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

        {projectsQuery.isLoading && !projectsQuery.data ? (
          <LoadingBlock rows={6} />
        ) : projectsQuery.isError ? (
          <ErrorState message={(projectsQuery.error as Error).message} retry={() => projectsQuery.refetch()} />
        ) : projectsQuery.data?.data.length === 0 ? (
          <EmptyState title="Không tìm thấy dự án" description="Thử thay đổi từ khóa tìm kiếm." />
        ) : (
          <div
            className="project-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4"
            style={{
              opacity: projectsQuery.isFetching ? 0.65 : 1,
              transition: "opacity 0.2s ease-in-out",
              pointerEvents: projectsQuery.isFetching ? "none" : "auto",
            }}
          >
            {projectsQuery.data?.data.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                {/* Header: Title & Code Badge */}
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3 min-h-[44px]">
                    <h3 className="font-bold text-[15px] leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 min-w-0">
                      {project.name}
                    </h3>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {project.code}
                    </span>
                  </div>

                  {/* Metadata List */}
                  <div className="space-y-2 py-3 border-y border-border/60 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted text-[11.5px]">Chủ dự án</span>
                      <span className="font-semibold text-foreground truncate max-w-[190px]" title={project.manager}>
                        {project.manager}
                      </span>
                    </div>

                    {project.managerPhone && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted text-[11.5px]">Số điện thoại</span>
                        <span className="font-medium text-foreground/80 font-mono text-[11.5px]">
                          {project.managerPhone}
                        </span>
                      </div>
                    )}

                    {project.managerEmail && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted text-[11.5px]">Email</span>
                        <span
                          className="font-medium text-foreground/80 text-[11.5px] truncate max-w-[190px]"
                          title={project.managerEmail}
                        >
                          {project.managerEmail}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Headcount & Action */}
                <div className="flex items-center justify-between pt-3.5 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <UsersRound size={14} className="!w-3.5 !h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block leading-none mb-0.5">Tổng nhân viên</span>
                      <strong className="text-xs font-bold text-foreground">
                        {project.employeeCount.toLocaleString("vi-VN")} nhân viên
                      </strong>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                    <span>Chi tiết</span>
                    <ArrowRight size={13} className="!w-3.5 !h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <TablePaginationFooter
          totalItems={projectsQuery.data?.meta?.total ?? 0}
          currentPage={page}
          pageSize={8}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </section>
    </>
  );
}
