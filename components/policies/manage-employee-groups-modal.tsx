"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, LoadingBlock, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { resetMockDatabase } from "@/lib/mock-db";
import type { Employee, ProjectEmployeeGroup } from "@/lib/types";

interface ManageEmployeeGroupsModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ManageEmployeeGroupsModal({
  projectId,
  isOpen,
  onClose,
}: ManageEmployeeGroupsModalProps) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  // Active Category / Group Filter ("all" | "unassigned" | groupId)
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Multi-select state for bulk actions
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>("");

  // Table search
  const [searchQuery, setSearchQuery] = useState("");

  // Group Create/Edit Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectEmployeeGroup | null>(null);
  const [groupFormName, setGroupFormName] = useState("");
  const [groupFormDescription, setGroupFormDescription] = useState("");

  // Group Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<ProjectEmployeeGroup | null>(null);

  // Add Members to Active Group Modal State
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [addMembersSearch, setAddMembersSearch] = useState("");
  const [selectedToAddIds, setSelectedToAddIds] = useState<Set<string>>(new Set());

  // Queries
  const groupsQuery = useQuery({
    queryKey: ["project-employee-groups", projectId],
    queryFn: () => api.getProjectEmployeeGroups(projectId),
    enabled: isOpen,
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", projectId],
    queryFn: () => api.getEmployees({ projectId }),
    enabled: isOpen,
  });

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const employees = useMemo(() => {
    const raw = employeesQuery.data;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : (raw as { data: Employee[] }).data ?? [];
  }, [employeesQuery.data]);

  // Group Helper Map
  const groupMap = useMemo(() => {
    const map = new Map<string, ProjectEmployeeGroup>();
    groups.forEach((g) => {
      map.set(g.id, g);
      if (g.code) map.set(g.code, g);
    });
    return map;
  }, [groups]);

  // Unassigned employees count
  const unassignedEmployees = useMemo(() => {
    return employees.filter((emp) => !emp.groupId || !groupMap.has(emp.groupId));
  }, [employees, groupMap]);

  // Active Group object if a specific group is selected
  const activeGroup = useMemo(() => {
    if (selectedCategory === "all" || selectedCategory === "unassigned") return null;
    return groups.find((g) => g.id === selectedCategory || g.code === selectedCategory) ?? null;
  }, [groups, selectedCategory]);

  // Filtered employees according to selected category
  const categoryEmployees = useMemo(() => {
    if (selectedCategory === "all") return employees;
    if (selectedCategory === "unassigned") return unassignedEmployees;
    return employees.filter(
      (emp) => emp.groupId === selectedCategory || (activeGroup && emp.groupId === activeGroup.code)
    );
  }, [selectedCategory, employees, unassignedEmployees, activeGroup]);

  // Filtered employees by search query
  const displayedEmployees = useMemo(() => {
    if (!searchQuery.trim()) return categoryEmployees;
    const q = searchQuery.toLowerCase();
    return categoryEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        (emp.position && emp.position.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q))
    );
  }, [categoryEmployees, searchQuery]);

  // Candidate employees to add into active group
  const candidateEmployeesToAdd = useMemo(() => {
    if (!activeGroup) return [];
    const activeIds = new Set(categoryEmployees.map((e) => e.id));
    return employees
      .filter((emp) => !activeIds.has(emp.id))
      .filter((emp) => {
        if (!addMembersSearch.trim()) return true;
        const q = addMembersSearch.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.code.toLowerCase().includes(q) ||
          (emp.position && emp.position.toLowerCase().includes(q)) ||
          (emp.department && emp.department.toLowerCase().includes(q))
        );
      });
  }, [activeGroup, categoryEmployees, employees, addMembersSearch]);

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (payload: Partial<ProjectEmployeeGroup>) =>
      api.createProjectEmployeeGroup(projectId, payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setIsGroupModalOpen(false);
      if (created?.id) setSelectedCategory(created.id);
      notify("Đã tạo nhóm người lao động mới thành công!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProjectEmployeeGroup> }) =>
      api.updateProjectEmployeeGroup(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setIsGroupModalOpen(false);
      notify("Đã cập nhật thông tin nhóm lao động!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => api.deleteProjectEmployeeGroup(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["employees", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setIsDeleteModalOpen(false);
      setDeletingGroup(null);
      setSelectedCategory("all");
      notify("Đã xóa nhóm người lao động thành công!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ groupId, employeeIds }: { groupId: string; employeeIds: string[] }) =>
      api.assignEmployeesToGroup(projectId, groupId, { employeeIds }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["employees", projectId] });
      setSelectedEmpIds(new Set());
      setSelectedToAddIds(new Set());
      setIsAddMembersModalOpen(false);
      const targetGrp = groups.find((g) => g.id === vars.groupId || g.code === vars.groupId);
      notify(`Đã chuyển ${vars.employeeIds.length} nhân sự sang "${targetGrp?.name ?? "nhóm mới"}"!`);
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  // Action handlers
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormName("");
    setGroupFormDescription("");
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group: ProjectEmployeeGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingGroup(group);
    setGroupFormName(group.name);
    setGroupFormDescription(group.description ?? "");
    setIsGroupModalOpen(true);
  };

  const handleOpenDeleteGroup = (group: ProjectEmployeeGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingGroup(group);
    setIsDeleteModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormName.trim()) {
      notify("Vui lòng nhập tên nhóm người lao động", "warning");
      return;
    }

    const payload: Partial<ProjectEmployeeGroup> = {
      name: groupFormName.trim(),
      description: groupFormDescription.trim(),
    };

    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, payload });
    } else {
      createGroupMutation.mutate(payload);
    }
  };

  const handleExecuteBulkTransfer = () => {
    if (!bulkTargetGroupId || selectedEmpIds.size === 0) return;
    assignMutation.mutate({
      groupId: bulkTargetGroupId,
      employeeIds: Array.from(selectedEmpIds),
    });
  };

  const handleExecuteAddMembers = () => {
    if (!activeGroup || selectedToAddIds.size === 0) return;
    assignMutation.mutate({
      groupId: activeGroup.id,
      employeeIds: Array.from(selectedToAddIds),
    });
  };

  const toggleSelectEmp = (id: string) => {
    setSelectedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmpIds.size === displayedEmployees.length && displayedEmployees.length > 0) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(displayedEmployees.map((e) => e.id)));
    }
  };

  const toggleSelectToAdd = (id: string) => {
    setSelectedToAddIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getMonogram = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getGroupNameOfEmployee = (emp: Employee) => {
    if (!emp.groupId) return null;
    const found = groupMap.get(emp.groupId);
    return found ? found.name : null;
  };

  return (
    <>
      <Modal
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title="Quản lý Nhóm người lao động"
        description="Tổ chức và phân bổ nhân sự vào các nhóm áp dụng chính sách lương phù hợp"
        size="xl"
      >
        <div className="space-y-4">
          {groupsQuery.isLoading || employeesQuery.isLoading ? (
            <LoadingBlock rows={8} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[520px]">
              {/* LEFT COLUMN: Categories & Groups Tree (4 Cols) */}
              <aside className="lg:col-span-4 flex flex-col justify-between p-3.5 rounded-2xl bg-secondary/35 border border-border/70">
                <div className="space-y-3">
                  {/* Header & Create Button */}
                  <div className="flex items-center justify-between px-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                        Phân loại nhân sự
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      className="h-7 text-xs px-2.5 shadow-2xs font-semibold"
                      onClick={handleOpenCreateGroup}
                    >
                      <Plus className="w-3.5 h-3.5" /> Tạo nhóm
                    </Button>
                  </div>

                  {/* System Level Categories (Tất cả / Chưa phân nhóm) */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedEmpIds(new Set());
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                        selectedCategory === "all"
                          ? "bg-card border-primary/40 text-primary shadow-xs font-bold"
                          : "bg-transparent border-transparent text-muted hover:bg-card/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        <span>Tất cả nhân sự</span>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground font-semibold">
                        {employees.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("unassigned");
                        setSelectedEmpIds(new Set());
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                        selectedCategory === "unassigned"
                          ? "bg-card border-primary/40 text-primary shadow-xs font-bold"
                          : "bg-transparent border-transparent text-muted hover:bg-card/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Chưa phân nhóm</span>
                      </div>
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          unassignedEmployees.length > 0
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-secondary text-muted"
                        }`}
                      >
                        {unassignedEmployees.length}
                      </span>
                    </button>
                  </div>

                  {/* Section Divider: Project Groups */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between px-1 pb-1.5 border-b border-border/50 text-[11px] font-bold text-muted uppercase tracking-wider">
                      <span>Nhóm lao động ({groups.length})</span>
                    </div>

                    <div className="space-y-1 pt-1.5 max-h-[330px] overflow-y-auto custom-scrollbar">
                      {groups.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted">
                          Chưa có nhóm nào. Bấm &quot;Tạo nhóm&quot; để thiết lập.
                        </div>
                      ) : (
                        groups.map((group) => {
                          const isSelected = selectedCategory === group.id;
                          const count = group.employeeCount ?? 0;

                          return (
                            <div
                              key={group.id}
                              onClick={() => {
                                setSelectedCategory(group.id);
                                setSelectedEmpIds(new Set());
                              }}
                              className={`group/item relative px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                                isSelected
                                  ? "bg-card border-primary/40 text-foreground shadow-xs"
                                  : "bg-transparent border-transparent hover:bg-card/70 hover:border-border/60 text-muted hover:text-foreground"
                              }`}
                            >
                              {/* Active edge highlight */}
                              {isSelected && (
                                <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-primary rounded-r-full" />
                              )}

                              <div className="min-w-0 flex-1 pr-2">
                                <span
                                  className={`text-xs truncate block ${
                                    isSelected ? "font-bold text-primary" : "font-semibold text-foreground"
                                  }`}
                                >
                                  {group.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[11px] font-mono font-medium text-muted px-2 py-0.5 rounded-full bg-secondary/80 border border-border/50">
                                  {count} NV
                                </span>

                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                  onClick={(e) => handleOpenEditGroup(group, e)}
                                  title="Chỉnh sửa nhóm"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>

                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                  onClick={(e) => handleOpenDeleteGroup(group, e)}
                                  title="Xóa nhóm"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </aside>

              {/* RIGHT COLUMN: Personnel Roster & Bulk Actions (8 Cols) */}
              <main className="lg:col-span-8 flex flex-col justify-between space-y-3.5">
                {/* Header of the Selected View */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-base text-foreground tracking-tight">
                        {selectedCategory === "all"
                          ? "Tất cả nhân sự dự án"
                          : selectedCategory === "unassigned"
                          ? "Nhân sự chưa phân nhóm"
                          : activeGroup?.name || "Danh sách nhân sự"}
                      </h4>
                      <Badge tone={selectedCategory === "unassigned" && unassignedEmployees.length > 0 ? "warning" : "neutral"}>
                        {categoryEmployees.length} nhân sự
                      </Badge>
                    </div>
                    <p className="text-xs text-muted max-w-lg leading-relaxed">
                      {selectedCategory === "all"
                        ? "Xem toàn bộ nhân sự và phân bổ vào các nhóm lao động phù hợp."
                        : selectedCategory === "unassigned"
                        ? "Danh sách nhân sự cần được chỉ định vào nhóm để áp dụng chính sách lương tương ứng."
                        : activeGroup?.description || "Các nhân sự thuộc nhóm này được áp dụng cùng chính sách lương."}
                    </p>
                  </div>

                  {activeGroup && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs font-medium border-border"
                        onClick={() => handleOpenEditGroup(activeGroup)}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Sửa nhóm
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-8 text-xs font-semibold shadow-2xs"
                        onClick={() => {
                          setSelectedToAddIds(new Set());
                          setAddMembersSearch("");
                          setIsAddMembersModalOpen(true);
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Thêm nhân sự vào nhóm
                      </Button>
                    </div>
                  )}
                </div>

                {/* Toolbar & Prominent Bulk Action Bar */}
                <div className="space-y-2.5">
                  {/* Search input */}
                  <div className="flex items-center gap-3">
                    <label className="search-field search-field-full flex-1">
                      <Search />
                      <input
                        type="text"
                        placeholder="Tìm theo tên, mã nhân viên, vị trí, xưởng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="text-muted hover:text-foreground p-0.5 rounded-full hover:bg-secondary shrink-0"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </label>
                  </div>

                  {/* PROMINENT BULK ACTION BAR */}
                  {selectedEmpIds.size > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-primary/10 border border-primary/25 shadow-xs animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4" /> Đã chọn {selectedEmpIds.size} nhân sự
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px] text-muted hover:text-foreground"
                          onClick={() => setSelectedEmpIds(new Set())}
                        >
                          Bỏ chọn
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          className="h-8 pl-2.5 pr-7 text-xs font-semibold rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
                          value={bulkTargetGroupId}
                          onChange={(e) => setBulkTargetGroupId(e.target.value)}
                        >
                          <option value="">-- Chọn nhóm đích cần chuyển --</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              Chuyển vào: {g.name}
                            </option>
                          ))}
                        </select>

                        <Button
                          size="sm"
                          variant="primary"
                          className="h-8 text-xs font-semibold shadow-2xs gap-1.5"
                          onClick={handleExecuteBulkTransfer}
                          disabled={!bulkTargetGroupId || assignMutation.isPending}
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Chuyển nhóm
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Employees Table */}
                {displayedEmployees.length === 0 ? (
                  <div className="py-14 px-4 flex flex-col items-center justify-center text-center rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                    <Users className="w-8 h-8 text-muted mx-auto" />
                    <h5 className="text-xs font-semibold text-foreground text-center">
                      {searchQuery
                        ? "Không tìm thấy nhân sự phù hợp"
                        : selectedCategory === "unassigned"
                        ? "Tuyệt vời! Toàn bộ nhân sự dự án đã được phân vào nhóm."
                        : `Chưa có nhân sự nào trong nhóm này.`}
                    </h5>
                    <p className="text-[11px] text-muted max-w-md mx-auto text-center leading-relaxed">
                      {activeGroup
                        ? 'Bấm "Thêm nhân sự vào nhóm" ở trên để phân bổ nhân sự từ danh sách dự án vào nhóm này.'
                        : "Chọn một nhóm lao động từ danh sách bên trái hoặc sử dụng ô tìm kiếm."}
                    </p>
                    {activeGroup && !searchQuery && (
                      <div className="pt-2 flex justify-center">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedToAddIds(new Set());
                            setAddMembersSearch("");
                            setIsAddMembersModalOpen(true);
                          }}
                          className="shadow-2xs"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Thêm nhân sự ngay
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden flex-1 flex flex-col">
                    <div className="max-h-[340px] overflow-y-auto custom-scrollbar flex-1">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-secondary/85 backdrop-blur-xs z-10 border-b border-border/80">
                          <tr>
                            <th className="w-10 px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  selectedEmpIds.size === displayedEmployees.length &&
                                  displayedEmployees.length > 0
                                }
                                onChange={toggleSelectAll}
                                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                                title="Chọn tất cả"
                              />
                            </th>
                            <th className="w-12 px-2 py-2.5 text-center text-[11px] font-bold text-muted uppercase tracking-wider">
                              STT
                            </th>
                            <th className="px-3 py-2.5 text-[11px] font-bold text-muted uppercase tracking-wider">
                              Nhân viên
                            </th>
                            <th className="px-3 py-2.5 text-[11px] font-bold text-muted uppercase tracking-wider">
                              Vị trí &amp; Phòng ban
                            </th>
                            <th className="px-3 py-2.5 text-[11px] font-bold text-muted uppercase tracking-wider">
                              Nhóm hiện tại
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {displayedEmployees.map((emp, index) => {
                            const isChecked = selectedEmpIds.has(emp.id);
                            const groupName = getGroupNameOfEmployee(emp);

                            return (
                              <tr
                                key={emp.id}
                                onClick={() => toggleSelectEmp(emp.id)}
                                className={`transition-colors cursor-pointer group hover:bg-secondary/30 ${
                                  isChecked ? "bg-primary/5" : ""
                                }`}
                              >
                                <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSelectEmp(emp.id)}
                                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                                  />
                                </td>
                                <td className="px-2 py-2.5 text-center text-xs font-mono text-muted">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-secondary/80 text-foreground flex items-center justify-center font-bold text-[10px] shrink-0 border border-border/60">
                                      {getMonogram(emp.name)}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-semibold text-xs text-foreground block truncate">
                                        {emp.name}
                                      </span>
                                      <span className="text-[11px] font-mono text-muted block truncate">
                                        {emp.code}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="space-y-0.5">
                                    <span className="text-xs text-foreground font-medium block truncate">
                                      {emp.position || "Công nhân"}
                                    </span>
                                    <span className="text-[11px] text-muted block truncate">
                                      {emp.department || "Xưởng sản xuất"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  {groupName ? (
                                    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                      {groupName}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                      Chưa phân nhóm
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </main>
            </div>
          )}

          {/* MODAL FOOTER */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted hover:text-foreground gap-1.5"
              onClick={() => {
                resetMockDatabase();
                queryClient.invalidateQueries();
                notify("Đã làm mới và nạp lại toàn bộ dữ liệu mẫu thành công!");
              }}
              title="Khôi phục toàn bộ nhóm và nhân sự mẫu về mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Nạp lại dữ liệu mẫu
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* DIALOG: CREATE / EDIT GROUP */}
      <Modal
        open={isGroupModalOpen}
        onOpenChange={setIsGroupModalOpen}
        title={editingGroup ? `Chỉnh sửa nhóm: ${editingGroup.name}` : "Tạo nhóm người lao động mới"}
        description="Đặt tên và mô tả đối tượng áp dụng cho nhóm lao động trong dự án"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsGroupModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveGroup}
              disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> {editingGroup ? "Lưu thay đổi" : "Tạo nhóm"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveGroup} className="space-y-4 py-1">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Tên nhóm người lao động <span className="text-rose-500">*</span>
            </label>
            <input
              className="w-full h-9 px-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-2xs"
              placeholder="VD: Quản lý / Shift Leader, Lao động chính thức..."
              value={groupFormName}
              onChange={(e) => setGroupFormName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Mô tả tiêu chuẩn &amp; đối tượng áp dụng
            </label>
            <textarea
              className="w-full min-h-[80px] p-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-2xs resize-none"
              placeholder="Mô tả tiêu chuẩn xếp loại của nhóm này trong bảng chính sách lương..."
              value={groupFormDescription}
              onChange={(e) => setGroupFormDescription(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* DIALOG: DELETE GROUP CONFIRMATION */}
      <Modal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title={`Xác nhận xóa nhóm "${deletingGroup?.name}"?`}
        description="Các nhân sự trong nhóm này sẽ được chuyển về trạng thái 'Chưa phân nhóm'. Dữ liệu nhân sự không bị mất."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => deletingGroup && deleteGroupMutation.mutate(deletingGroup.id)}
              disabled={deleteGroupMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa nhóm
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted leading-relaxed">
          Bạn có chắc chắn muốn xóa nhóm <strong>{deletingGroup?.name}</strong>? Thao tác này sẽ xóa cấu hình nhóm khỏi bảng ma trận chính sách của dự án.
        </p>
      </Modal>

      {/* DIALOG: ADD MEMBERS TO ACTIVE GROUP */}
      <Modal
        open={isAddMembersModalOpen}
        onOpenChange={setIsAddMembersModalOpen}
        title={`Thêm nhân sự vào nhóm "${activeGroup?.name}"`}
        description="Chọn một hoặc nhiều nhân sự từ các nhóm khác hoặc chưa phân nhóm để chuyển vào nhóm này"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddMembersModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteAddMembers}
              disabled={selectedToAddIds.size === 0 || assignMutation.isPending}
            >
              <UserCheck className="w-3.5 h-3.5" /> Thêm {selectedToAddIds.size} nhân sự đã chọn
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-1">
          {/* Search bar inside add modal */}
          <label className="search-field search-field-full">
            <Search />
            <input
              type="text"
              placeholder="Tìm nhân sự cần thêm theo tên, mã NV, vị trí..."
              value={addMembersSearch}
              onChange={(e) => setAddMembersSearch(e.target.value)}
              autoFocus
            />
            {addMembersSearch && (
              <button
                type="button"
                onClick={() => setAddMembersSearch("")}
                className="text-muted hover:text-foreground p-0.5 rounded-full hover:bg-secondary shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>

          {/* Candidate list */}
          {candidateEmployeesToAdd.length === 0 ? (
            <div className="py-10 text-center rounded-xl bg-secondary/30 border border-border/70 space-y-1">
              <Users className="w-7 h-7 text-muted mx-auto" />
              <h5 className="text-xs font-semibold text-foreground">
                {addMembersSearch
                  ? "Không tìm thấy nhân sự phù hợp"
                  : "Tất cả nhân sự trong dự án đã thuộc nhóm này."}
              </h5>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs max-h-[300px] overflow-y-auto custom-scrollbar p-1 divide-y divide-border/40">
              {candidateEmployeesToAdd.map((emp) => {
                const isChecked = selectedToAddIds.has(emp.id);
                const currentGrpName = getGroupNameOfEmployee(emp);

                return (
                  <label
                    key={emp.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                      isChecked ? "bg-primary/5" : "hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectToAdd(emp.id)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold text-foreground block truncate">{emp.name}</span>
                        <span className="text-[11px] font-mono text-muted block truncate">
                          {emp.code} · {emp.position || "Công nhân"} ·{" "}
                          <span className="text-primary font-sans font-medium">
                            Đang ở: {currentGrpName || "Chưa phân nhóm"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-6.5 text-[11px] px-2 shrink-0 border-border"
                      onClick={(e) => {
                        e.preventDefault();
                        if (!activeGroup) return;
                        assignMutation.mutate({
                          groupId: activeGroup.id,
                          employeeIds: [emp.id],
                        });
                      }}
                    >
                      + Thêm ngay
                    </Button>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
