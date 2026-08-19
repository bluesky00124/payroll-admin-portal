"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, LoadingBlock, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { resetMockDatabase } from "@/lib/mock-db";
import type { Employee, GroupColorTone, ProjectEmployeeGroup } from "@/lib/types";

interface ManageEmployeeGroupsModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_CONFIG: Record<
  GroupColorTone,
  { label: string; dotClass: string; bgClass: string; textClass: string; badgeTone: "info" | "success" | "warning" | "neutral" }
> = {
  primary: {
    label: "Xanh lục",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    textClass: "text-emerald-600 dark:text-emerald-400",
    badgeTone: "success",
  },
  info: {
    label: "Xanh dương",
    dotClass: "bg-sky-500",
    bgClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    textClass: "text-sky-600 dark:text-sky-400",
    badgeTone: "info",
  },
  success: {
    label: "Xanh lá",
    dotClass: "bg-green-500",
    bgClass: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    textClass: "text-green-600 dark:text-green-400",
    badgeTone: "success",
  },
  warning: {
    label: "Cam hổ phách",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    textClass: "text-amber-600 dark:text-amber-400",
    badgeTone: "warning",
  },
  purple: {
    label: "Tím thạch anh",
    dotClass: "bg-purple-500",
    bgClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    textClass: "text-purple-600 dark:text-purple-400",
    badgeTone: "info",
  },
  neutral: {
    label: "Xám trung tính",
    dotClass: "bg-slate-500",
    bgClass: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
    textClass: "text-slate-600 dark:text-slate-400",
    badgeTone: "neutral",
  },
};

export function ManageEmployeeGroupsModal({
  projectId,
  isOpen,
  onClose,
}: ManageEmployeeGroupsModalProps) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  // Selected Group in Left Sidebar
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Create/Edit Group form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColorTone, setFormColorTone] = useState<GroupColorTone>("primary");
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Add Member Popover / Drawer state
  const [isAddMemberDrawerOpen, setIsAddMemberDrawerOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [selectedEmpIdsToAdd, setSelectedEmpIdsToAdd] = useState<Set<string>>(new Set());

  // Member Table Filter & Batch state
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedRosterEmpIds, setSelectedRosterEmpIds] = useState<Set<string>>(new Set());
  const [batchTargetGroupId, setBatchTargetGroupId] = useState<string>("");

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

  // Active Selected Group
  const activeGroup = useMemo(() => {
    if (selectedGroupId) {
      return groups.find((g) => g.id === selectedGroupId || g.code === selectedGroupId) ?? groups[0];
    }
    return groups[0];
  }, [groups, selectedGroupId]);

  // Active Group Members
  const activeGroupMembers = useMemo(() => {
    if (!activeGroup) return [];
    return employees.filter((emp) => {
      if (emp.groupId === activeGroup.id || emp.groupId === activeGroup.code) return true;
      if (!emp.groupId && activeGroup.isDefault) return true;
      return false;
    });
  }, [employees, activeGroup]);

  // Filtered Active Group Members (for Table search)
  const filteredActiveMembers = useMemo(() => {
    if (!memberSearch.trim()) return activeGroupMembers;
    const q = memberSearch.toLowerCase();
    return activeGroupMembers.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        (emp.position && emp.position.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q))
    );
  }, [activeGroupMembers, memberSearch]);

  // Candidate Employees to Add (Employees not in active group)
  const candidateEmployeesToAdd = useMemo(() => {
    if (!activeGroup) return [];
    return employees
      .filter((emp) => {
        if (emp.groupId === activeGroup.id || emp.groupId === activeGroup.code) return false;
        if (!emp.groupId && activeGroup.isDefault) return false;
        return true;
      })
      .filter((emp) => {
        if (!addMemberSearch.trim()) return true;
        const q = addMemberSearch.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.code.toLowerCase().includes(q) ||
          (emp.position && emp.position.toLowerCase().includes(q)) ||
          (emp.department && emp.department.toLowerCase().includes(q))
        );
      });
  }, [employees, activeGroup, addMemberSearch]);

  // Batch target group initialization
  useMemo(() => {
    const otherGroup = groups.find((g) => g.id !== activeGroup?.id);
    if (otherGroup && !batchTargetGroupId) {
      setBatchTargetGroupId(otherGroup.id);
    }
  }, [groups, activeGroup, batchTargetGroupId]);

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (payload: Partial<ProjectEmployeeGroup>) =>
      api.createProjectEmployeeGroup(projectId, payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      resetForm();
      if (created?.id) setSelectedGroupId(created.id);
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
      resetForm();
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
      setSelectedGroupId("");
      notify("Đã xóa nhóm người lao động!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ groupId, employeeIds }: { groupId: string; employeeIds: string[] }) =>
      api.assignEmployeesToGroup(projectId, groupId, { employeeIds }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      queryClient.invalidateQueries({ queryKey: ["employees", projectId] });
      setSelectedEmpIdsToAdd(new Set());
      setSelectedRosterEmpIds(new Set());
      setIsAddMemberDrawerOpen(false);
      const targetGrp = groups.find((g) => g.id === vars.groupId || g.code === vars.groupId);
      notify(`Đã chuyển ${vars.employeeIds.length} nhân sự sang "${targetGrp?.name ?? "nhóm mới"}"!`);
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingGroupId(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormColorTone("primary");
    setFormIsDefault(false);
  };

  const handleOpenCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (group: ProjectEmployeeGroup) => {
    setIsFormOpen(true);
    setEditingGroupId(group.id);
    setFormName(group.name);
    setFormCode(group.code);
    setFormDescription(group.description ?? "");
    setFormColorTone(group.colorTone);
    setFormIsDefault(Boolean(group.isDefault));
  };

  const handleSaveGroupForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      notify("Vui lòng nhập tên nhóm người lao động", "warning");
      return;
    }

    const payload: Partial<ProjectEmployeeGroup> = {
      name: formName.trim(),
      code: formCode.trim() || formName.trim().toLowerCase().replace(/\s+/g, "_"),
      description: formDescription.trim(),
      colorTone: formColorTone,
      isDefault: formIsDefault,
    };

    if (editingGroupId) {
      updateGroupMutation.mutate({ id: editingGroupId, payload });
    } else {
      createGroupMutation.mutate(payload);
    }
  };

  const handleBatchAssignFromDrawer = () => {
    if (!activeGroup || selectedEmpIdsToAdd.size === 0) return;
    assignMutation.mutate({
      groupId: activeGroup.id,
      employeeIds: Array.from(selectedEmpIdsToAdd),
    });
  };

  const handleBatchTransferFromRoster = () => {
    if (!batchTargetGroupId || selectedRosterEmpIds.size === 0) return;
    assignMutation.mutate({
      groupId: batchTargetGroupId,
      employeeIds: Array.from(selectedRosterEmpIds),
    });
  };

  const toggleSelectEmpToAdd = (id: string) => {
    setSelectedEmpIdsToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectRosterEmp = (id: string) => {
    setSelectedRosterEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllRoster = () => {
    if (selectedRosterEmpIds.size === filteredActiveMembers.length && filteredActiveMembers.length > 0) {
      setSelectedRosterEmpIds(new Set());
    } else {
      setSelectedRosterEmpIds(new Set(filteredActiveMembers.map((e) => e.id)));
    }
  };

  const getMonogram = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getEmployeeCurrentGroupName = (emp: Employee) => {
    const found = groups.find((g) => g.id === emp.groupId || g.code === emp.groupId);
    if (found) return found.name;
    const def = groups.find((g) => g.isDefault);
    return def ? def.name : "Chưa phân nhóm";
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Quản lý Nhóm người lao động & Phân bổ Chế độ"
      description="Tổ chức các nhóm lao động theo đặc thù dự án (Quản lý, Chính thức, Học việc, Thời vụ...) để thiết lập chính sách lương và chế độ tương ứng."
      size="xl"
    >
      <div className="space-y-4">
        {groupsQuery.isLoading || employeesQuery.isLoading ? (
          <LoadingBlock rows={7} />
        ) : (
          /* SEAMLESS MASTER-DETAIL WORKSPACE (CLEAN & BORDERLESS) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[460px]">
            {/* LEFT COLUMN: Groups Navigation Sidebar (4 Cols) */}
            <aside className="lg:col-span-4 flex flex-col justify-between p-2 rounded-xl bg-secondary/30 space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                      Nhóm lao động ({groups.length})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="h-7 text-xs px-2.5"
                    onClick={handleOpenCreateForm}
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo nhóm
                  </Button>
                </div>

                {/* Groups List: Clean Apple-style rows without heavy card borders */}
                <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                  {groups.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">
                      Chưa có nhóm nào. Bấm &quot;Tạo nhóm&quot; để bắt đầu.
                    </div>
                  ) : (
                    groups.map((group) => {
                      const isSelected = activeGroup?.id === group.id;
                      const count = group.employeeCount ?? 0;
                      const config = COLOR_CONFIG[group.colorTone] ?? COLOR_CONFIG.primary;

                      return (
                        <div
                          key={group.id}
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            setIsFormOpen(false);
                            setIsAddMemberDrawerOpen(false);
                          }}
                          className={`group/card relative px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-card text-foreground shadow-xs ring-1 ring-border/80"
                              : "text-muted hover:text-foreground hover:bg-card/50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Flat Pastel Monogram (No border) */}
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${config.bgClass}`}
                            >
                              {getMonogram(group.name)}
                            </div>

                            {/* Name & Code */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-semibold text-xs truncate block ${isSelected ? "text-primary" : "text-foreground"}`}>
                                  {group.name}
                                </span>
                                {group.isDefault && (
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-secondary/80 text-muted font-medium flex-shrink-0">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-muted/80 block truncate">
                                Mã: {group.code}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <span className="text-[11px] font-mono text-muted px-2 py-0.5 rounded-full bg-secondary/60">
                              {count} NV
                            </span>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover/card:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditForm(group);
                              }}
                              title="Sửa nhóm"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sidebar Footer Stats */}
              <div className="pt-2 px-2 border-t border-border/40 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted">
                  <span>Tổng nhân sự dự án:</span>
                  <strong className="text-foreground font-mono">{employees.length} người</strong>
                </div>
                <div className="w-full bg-secondary/80 rounded-full h-1.5 overflow-hidden flex">
                  {groups.map((g) => {
                    const pct = employees.length > 0 ? ((g.employeeCount ?? 0) / employees.length) * 100 : 0;
                    return (
                      <div
                        key={g.id}
                        style={{ width: `${pct}%` }}
                        className={`${COLOR_CONFIG[g.colorTone]?.dotClass || "bg-primary"} h-full`}
                        title={`${g.name}: ${g.employeeCount ?? 0} nhân sự (${Math.round(pct)}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* RIGHT COLUMN: Active Group Workspace & Member Management (8 Cols) */}
            <main className="lg:col-span-8 flex flex-col justify-between space-y-4">
              {isFormOpen ? (
                /* INLINE FORM: CREATE / EDIT GROUP */
                <form onSubmit={handleSaveGroupForm} className="p-4 rounded-xl bg-secondary/20 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      {editingGroupId ? <Pencil className="w-4 h-4 text-primary" /> : <FolderPlus className="w-4 h-4 text-primary" />}
                      <h4 className="font-semibold text-sm text-foreground">
                        {editingGroupId ? `Chỉnh sửa nhóm: ${formName || "Nhóm lao động"}` : "Tạo nhóm người lao động mới"}
                      </h4>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={resetForm} title="Đóng biểu mẫu">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Tên nhóm lao động <span className="text-rose-500">*</span>
                      </label>
                      <input
                        className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="VD: Quản lý / Shift Leader, Lao động thời vụ..."
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Mã nhóm (Mã định danh hệ thống)
                      </label>
                      <input
                        className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="VD: shift_leader, chinh_thuc, thoi_vu..."
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Mô tả tiêu chuẩn &amp; đối tượng áp dụng
                      </label>
                      <input
                        className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Mô tả tiêu chuẩn xếp loại của nhóm này trong chính sách lương..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1.5 block">
                        Tông màu nhận diện
                      </label>
                      <div className="flex items-center gap-2">
                        {(Object.keys(COLOR_CONFIG) as GroupColorTone[]).map((tone) => {
                          const conf = COLOR_CONFIG[tone];
                          return (
                            <button
                              key={tone}
                              type="button"
                              onClick={() => setFormColorTone(tone)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${conf.dotClass} ${
                                formColorTone === tone ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-70 hover:opacity-100"
                              }`}
                              title={conf.label}
                            >
                              {formColorTone === tone && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={formIsDefault}
                          onChange={(e) => setFormIsDefault(e.target.checked)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        Đặt làm nhóm mặc định cho nhân sự mới
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                    <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                      Hủy bỏ
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lưu nhóm
                    </Button>
                  </div>
                </form>
              ) : isAddMemberDrawerOpen ? (
                /* DRAWER: ADD MEMBERS FROM OTHER GROUPS */
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-primary" />
                        Thêm nhân sự vào nhóm &quot;{activeGroup?.name}&quot;
                      </h4>
                      <p className="text-xs text-muted mt-0.5">
                        Chọn nhân sự từ các nhóm khác hoặc chưa phân nhóm để chuyển vào nhóm này.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAddMemberDrawerOpen(false)}
                      title="Quay lại"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Search & Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="search-field !h-8 text-xs flex-1">
                      <Search className="w-3.5 h-3.5" />
                      <input
                        placeholder="Tìm theo tên, mã NV, phòng ban..."
                        value={addMemberSearch}
                        onChange={(e) => setAddMemberSearch(e.target.value)}
                      />
                    </label>

                    {selectedEmpIdsToAdd.size > 0 && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-8 text-xs font-semibold"
                        onClick={handleBatchAssignFromDrawer}
                        disabled={assignMutation.isPending}
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Thêm {selectedEmpIdsToAdd.size} nhân sự đã chọn
                      </Button>
                    )}
                  </div>

                  {/* Candidate List */}
                  {candidateEmployeesToAdd.length === 0 ? (
                    <div className="py-12 text-center rounded-xl bg-secondary/15 space-y-1">
                      <Users className="w-7 h-7 text-muted mx-auto" />
                      <h5 className="text-xs font-semibold text-foreground">
                        {addMemberSearch ? "Không tìm thấy nhân sự phù hợp" : "Tất cả nhân sự trong dự án đã thuộc nhóm này"}
                      </h5>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40 max-h-[280px] overflow-y-auto pr-1">
                      {candidateEmployeesToAdd.map((emp) => {
                        const isChecked = selectedEmpIdsToAdd.has(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                              isChecked
                                ? "bg-primary/5 dark:bg-primary/10"
                                : "hover:bg-secondary/40"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectEmpToAdd(emp.id)}
                                className="rounded text-primary focus:ring-primary"
                              />
                              <div className="space-y-0.5">
                                <span className="font-semibold text-foreground block">{emp.name}</span>
                                <span className="text-[11px] font-mono text-muted block">
                                  {emp.code} · {emp.position || "Công nhân"} ·{" "}
                                  <span className="text-primary font-sans font-medium">
                                    Đang ở: {getEmployeeCurrentGroupName(emp)}
                                  </span>
                                </span>
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-6 text-[11px] px-2"
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

                  <div className="flex justify-end pt-2 border-t border-border/40">
                    <Button size="sm" variant="secondary" onClick={() => setIsAddMemberDrawerOpen(false)}>
                      Quay lại danh sách
                    </Button>
                  </div>
                </div>
              ) : activeGroup ? (
                /* VIEW ACTIVE GROUP & MEMBER ROSTER */
                <div className="space-y-3.5">
                  {/* Clean Typography Header (No bulky bordered hero box) */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-foreground">{activeGroup.name}</span>
                        <Badge tone={COLOR_CONFIG[activeGroup.colorTone]?.badgeTone || "info"}>
                          {activeGroupMembers.length} nhân sự
                        </Badge>
                        {activeGroup.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted font-medium">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted max-w-lg">
                        {activeGroup.description || "Chưa có mô tả chi tiết cho nhóm này."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => handleOpenEditForm(activeGroup)}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Sửa nhóm
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-8 text-xs"
                        onClick={() => {
                          setSelectedEmpIdsToAdd(new Set());
                          setIsAddMemberDrawerOpen(true);
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Thêm nhân sự
                      </Button>
                    </div>
                  </div>

                  {/* Member Roster Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="search-field !h-8 text-xs flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5" />
                      <input
                        placeholder={`Tìm trong nhóm ${activeGroup.name}...`}
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                    </label>

                    {selectedRosterEmpIds.size > 0 && (
                      <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-lg animate-in fade-in duration-150">
                        <span className="text-xs text-primary font-semibold">
                          Đã chọn {selectedRosterEmpIds.size} NV:
                        </span>
                        <select
                          className="h-7 px-2 text-xs font-semibold rounded border border-border bg-background text-foreground focus:outline-none"
                          value={batchTargetGroupId}
                          onChange={(e) => setBatchTargetGroupId(e.target.value)}
                        >
                          {groups
                            .filter((g) => g.id !== activeGroup.id)
                            .map((g) => (
                              <option key={g.id} value={g.id}>
                                Chuyển sang: {g.name}
                              </option>
                            ))}
                        </select>
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-7 text-xs"
                          onClick={handleBatchTransferFromRoster}
                          disabled={assignMutation.isPending}
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Áp dụng
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Members Table */}
                  {filteredActiveMembers.length === 0 ? (
                    <div className="py-12 text-center rounded-xl bg-secondary/15 space-y-2">
                      <Users className="w-7 h-7 text-muted mx-auto" />
                      <h5 className="text-xs font-semibold text-foreground">
                        {memberSearch
                          ? "Không tìm thấy nhân sự phù hợp"
                          : `Chưa có nhân sự nào trong nhóm "${activeGroup.name}"`}
                      </h5>
                      <p className="text-[11px] text-muted max-w-xs mx-auto">
                        Bấm &quot;Thêm nhân sự&quot; để phân bổ nhân sự từ các nhóm khác hoặc từ danh sách chưa phân nhóm.
                      </p>
                      {!memberSearch && (
                        <div className="pt-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setIsAddMemberDrawerOpen(true)}
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Thêm nhân sự ngay
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden bg-card border border-border/40">
                      <div className="max-h-[280px] overflow-y-auto">
                        <table className="data-table !m-0">
                          <thead className="sticky top-0 bg-secondary/80 backdrop-blur z-10">
                            <tr>
                              <th style={{ width: "36px" }} className="text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedRosterEmpIds.size === filteredActiveMembers.length && filteredActiveMembers.length > 0}
                                  onChange={toggleSelectAllRoster}
                                  className="rounded text-primary focus:ring-primary"
                                  title="Chọn tất cả"
                                />
                              </th>
                              <th style={{ width: "40px" }} className="text-center">STT</th>
                              <th>Nhân viên</th>
                              <th>Vị trí &amp; Phòng ban</th>
                              <th style={{ width: "190px" }} className="text-center">Chuyển sang nhóm</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredActiveMembers.map((emp, index) => {
                              const isChecked = selectedRosterEmpIds.has(emp.id);

                              return (
                                <tr
                                  key={emp.id}
                                  className={`transition-colors ${isChecked ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                                >
                                  <td className="text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSelectRosterEmp(emp.id)}
                                      className="rounded text-primary focus:ring-primary"
                                    />
                                  </td>
                                  <td className="text-center text-muted text-xs font-medium">{index + 1}</td>
                                  <td>
                                    <div className="space-y-0.5">
                                      <span className="font-semibold text-xs text-foreground block">{emp.name}</span>
                                      <span className="text-[11px] font-mono text-muted block">
                                        {emp.code} · {emp.phone}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="space-y-0.5">
                                      <span className="text-xs text-foreground block">{emp.position || "Công nhân"}</span>
                                      <span className="text-[11px] text-muted block">{emp.department || "Xưởng sản xuất"}</span>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <select
                                      className="h-7 px-2 text-[11px] font-semibold rounded border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                      value={activeGroup.id}
                                      onChange={(e) => {
                                        const targetGId = e.target.value;
                                        if (targetGId && targetGId !== activeGroup.id) {
                                          assignMutation.mutate({
                                            groupId: targetGId,
                                            employeeIds: [emp.id],
                                          });
                                        }
                                      }}
                                      title="Chuyển sang nhóm khác"
                                    >
                                      {groups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                          → {g.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-muted">
                  Vui lòng chọn một nhóm từ danh sách bên trái.
                </div>
              )}
            </main>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
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
  );
}
