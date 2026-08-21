"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  History,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, EmptyState, LoadingBlock, StatusBadge, TablePaginationFooter } from "@/components/ui";
import { api } from "@/lib/api";
import type { ActivityLogItem, ActivityLogModule } from "@/lib/types";

interface SubtabActivityLogProps {
  projectId: string;
  module: ActivityLogModule;
  title?: string;
  description?: string;
}

type FilterTab = "all" | "approved" | "created" | "updated" | "rejected";

export function SubtabActivityLog({
  projectId,
  module,
  title = "Nhật ký hoạt động & Thay đổi",
  description = "Lịch sử ghi nhận các thao tác cập nhật, phê duyệt và điều chỉnh dữ liệu nhân sự",
}: SubtabActivityLogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const logsQuery = useQuery({
    queryKey: ["activity-logs", projectId, module],
    queryFn: () => api.getActivityLogs({ projectId, module }),
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: logs.length,
      approved: logs.filter((l) => l.actionType === "approve").length,
      created: logs.filter((l) => l.actionType === "create" || l.actionType === "join").length,
      updated: logs.filter(
        (l) => l.actionType === "update" || l.actionType === "override" || l.actionType === "restore" || l.actionType === "import"
      ).length,
      rejected: logs.filter((l) => l.actionType === "reject" || l.actionType === "leave" || l.actionType === "delete").length,
    };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // 1. Tab filter
      if (activeTab === "approved" && item.actionType !== "approve") return false;
      if (activeTab === "created" && item.actionType !== "create" && item.actionType !== "join") return false;
      if (
        activeTab === "updated" &&
        item.actionType !== "update" &&
        item.actionType !== "override" &&
        item.actionType !== "restore" &&
        item.actionType !== "import"
      )
        return false;
      if (activeTab === "rejected" && item.actionType !== "reject" && item.actionType !== "leave" && item.actionType !== "delete")
        return false;

      // 2. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchEmp =
          (item.employeeName && item.employeeName.toLowerCase().includes(q)) ||
          (item.employeeCode && item.employeeCode.toLowerCase().includes(q));
        const matchLabel = item.actionLabel.toLowerCase().includes(q);
        const matchDetails = item.details.toLowerCase().includes(q);
        const matchUser = item.changedBy.toLowerCase().includes(q);
        const matchReason = item.reason && item.reason.toLowerCase().includes(q);

        if (!matchEmp && !matchLabel && !matchDetails && !matchUser && !matchReason) {
          return false;
        }
      }

      return true;
    });
  }, [logs, activeTab, searchTerm]);

  // Paginated Logs
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  // Group paginated logs by date
  const groupedLogs = useMemo(() => {
    const groups: Array<{
      dateKey: string;
      title: string;
      subTitle?: string;
      items: ActivityLogItem[];
    }> = [];

    const dateMap = new Map<string, ActivityLogItem[]>();

    paginatedLogs.forEach((item) => {
      const datePart = item.createdAt ? item.createdAt.slice(0, 10) : "2026-08-20";
      if (!dateMap.has(datePart)) {
        dateMap.set(datePart, []);
      }
      dateMap.get(datePart)!.push(item);
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    Array.from(dateMap.entries()).forEach(([dateKey, items]) => {
      let title = dateKey;
      let subTitle = "";

      if (dateKey === todayStr || dateKey === "2026-08-20") {
        title = "Hôm nay";
        subTitle = "20/08/2026";
      } else if (dateKey === yesterday || dateKey === "2026-08-19") {
        title = "Hôm qua";
        subTitle = "19/08/2026";
      } else {
        try {
          const [y, m, d] = dateKey.split("-");
          title = `Ngày ${d}/${m}/${y}`;
        } catch {
          title = dateKey;
        }
      }

      groups.push({ dateKey, title, subTitle, items });
    });

    return groups;
  }, [paginatedLogs]);

  const toggleCollapseDate = (dateKey: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const formatLogTime = (isoString: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const getActionTone = (actionType: ActivityLogItem["actionType"]): "success" | "warning" | "danger" | "info" | "neutral" => {
    switch (actionType) {
      case "approve":
      case "create":
      case "join":
        return "success";
      case "reject":
      case "leave":
      case "delete":
        return "danger";
      case "import":
      case "override":
        return "warning";
      case "update":
      case "restore":
        return "info";
      default:
        return "neutral";
    }
  };

  const getActionVerb = (actionType: ActivityLogItem["actionType"]) => {
    switch (actionType) {
      case "approve":
        return "đã xét duyệt hồ sơ cho";
      case "create":
        return "đã khai báo / tạo mới cho";
      case "update":
        return "đã cập nhật chế độ cho";
      case "override":
        return "đã ghi đè dữ liệu cho";
      case "restore":
        return "đã hoàn tác về chuẩn cho";
      case "join":
        return "đã đăng ký tham gia cho";
      case "leave":
        return "đã dừng tham gia cho";
      case "reject":
        return "đã từ chối hồ sơ của";
      case "import":
        return "đã import đồng loạt cho";
      default:
        return "đã thao tác đối với";
    }
  };

  return (
    <div className="subtab-activity-log mt-6">
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {/* TOP HEADER */}
        <div className="p-4 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">{title}</h4>
                <Badge tone="neutral">{filteredLogs.length} sự kiện</Badge>
              </div>
              <p className="text-[11.5px] text-muted">{description}</p>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION (Identical to reference UI: All | Approved | Created | Updated | Rejected) */}
        <div className="px-4 pt-2 border-b border-border/60 flex items-center gap-6 overflow-x-auto bg-card">
          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setPage(1);
            }}
            className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span>Tất cả sự kiện</span>
            <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded-full bg-secondary border border-border/50 text-muted">
              {tabCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("approved");
              setPage(1);
            }}
            className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "approved"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span>Phê duyệt</span>
            <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
              {tabCounts.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("created");
              setPage(1);
            }}
            className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "created"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span>Khai báo / Tạo mới</span>
            <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/60">
              {tabCounts.created}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("updated");
              setPage(1);
            }}
            className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "updated"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span>Điều chỉnh &amp; Ghi đè</span>
            <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60">
              {tabCounts.updated}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("rejected");
              setPage(1);
            }}
            className={`pb-2.5 pt-1 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "rejected"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span>Từ chối / Ngừng</span>
            <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60">
              {tabCounts.rejected}
            </span>
          </button>
        </div>

        {/* SEARCH FILTER ROW */}
        <div className="p-3 border-b border-border/60 bg-secondary/15 flex items-center justify-between gap-3">
          <label className="search-field search-field-full flex-1 max-w-xl">
            <Search />
            <input
              type="text"
              placeholder="Tìm theo tên nhân viên, mã NV, người thực hiện, lý do, nội dung..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                className="text-muted hover:text-foreground p-0.5 rounded-full hover:bg-secondary shrink-0"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

        {/* TIMELINE FEED CONTENT */}
        <div className="p-4 sm:p-5">
          {logsQuery.isLoading ? (
            <LoadingBlock rows={5} />
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              title="Không tìm thấy nhật ký thao tác"
              description={
                searchTerm || activeTab !== "all"
                  ? "Không có sự kiện nào khớp với bộ lọc hiện tại. Vui lòng thử từ khóa khác."
                  : "Chưa có ghi nhận thao tác hoặc điều chỉnh nào cho phân hệ này."
              }
            />
          ) : (
            <div className="space-y-6">
              {groupedLogs.map((group) => {
                const isCollapsed = collapsedDates.has(group.dateKey);

                return (
                  <div key={group.dateKey} className="space-y-3">
                    {/* Date Section Header */}
                    <div
                      onClick={() => toggleCollapseDate(group.dateKey)}
                      className="flex items-center justify-between cursor-pointer group select-none py-1.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-secondary text-muted group-hover:text-foreground flex items-center justify-center transition-all border border-border/60 shrink-0">
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <h5 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                            {group.title}
                          </h5>
                          {group.subTitle && (
                            <span className="text-[11px] font-mono text-muted">
                              {group.subTitle}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-medium text-muted px-2.5 py-0.5 rounded-full bg-secondary/80 border border-border/50">
                        {group.items.length} ghi nhận
                      </span>
                    </div>

                    {/* Timeline Feed Container */}
                    {!isCollapsed && (
                      <div className="relative space-y-3.5 pt-1">
                        {/* Continuous vertical line centered with w-6 icon (x = 12px) */}
                        <div className="absolute left-[11px] top-2 bottom-3 w-[2px] bg-border/80 z-0 pointer-events-none" />

                        {group.items.map((item) => {
                          const relTime = getRelativeTime(item.createdAt);
                          const exactTime = formatLogTime(item.createdAt);
                          const tone = getActionTone(item.actionType);

                          return (
                            <div key={item.id} className="relative flex items-start gap-2.5 sm:gap-3.5 group/item z-1">
                              {/* Column 1: Node Dot (w-6 centered, matching exactly x=12px of the line and header icon) */}
                              <div className="w-6 pt-3 flex justify-center shrink-0">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card z-10 transition-transform group-hover/item:scale-125 shadow-2xs" />
                              </div>

                              {/* Column 2: Timestamp */}
                              <div className="w-14 sm:w-18 pt-2.5 shrink-0 text-left">
                                <span className="font-mono text-xs font-semibold text-muted block leading-tight">
                                  {exactTime}
                                </span>
                                {relTime && relTime !== exactTime && (
                                  <span className="text-[10px] text-muted/70 block truncate mt-0.5">
                                    {relTime}
                                  </span>
                                )}
                              </div>

                              {/* Column 3: Event Card */}
                              <div className="flex-1 min-w-0 p-3.5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-2xs transition-all space-y-2">
                                {/* Card Header: Actor Text + Status Badge */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1 text-xs text-foreground">
                                    <strong className="font-bold text-foreground">{item.changedBy}</strong>{" "}
                                    <span className="text-muted">{getActionVerb(item.actionType)}</span>{" "}
                                    {item.employeeName && (
                                      <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-secondary/80 border border-border/60 text-foreground text-[11px]">
                                        {item.employeeCode && (
                                          <span className="font-mono text-[10.5px] text-primary">
                                            {item.employeeCode}
                                          </span>
                                        )}
                                        <span>{item.employeeName}</span>
                                      </span>
                                    )}
                                  </div>

                                  <StatusBadge tone={tone} className="shrink-0">
                                    {item.actionLabel}
                                  </StatusBadge>
                                </div>

                                {/* Card Body: Main detail message */}
                                <div className="text-xs text-foreground font-medium leading-relaxed bg-secondary/20 p-2.5 rounded-xl border border-border/40">
                                  {item.details}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ATTACHED PAGINATION FOOTER */}
        {filteredLogs.length > 0 && (
          <TablePaginationFooter
            currentPage={page}
            pageSize={pageSize}
            totalItems={filteredLogs.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
