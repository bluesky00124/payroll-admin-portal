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

  // Selected Group in Left Sidebar
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Create/Edit Group form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
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
      title="Quản lý Nhóm người lao động"
      description="Tổ chức các nhóm lao động theo đặc thù dự án"
      size="xl"
    >
      <div className="space-y-4">
        {groupsQuery.isLoading || employeesQuery.isLoading ? (
          <LoadingBlock rows={7} />
        ) : (
          /* MODERN MASTER-DETAIL WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[480px]">
            {/* LEFT COLUMN: Groups Navigation Sidebar (4 Cols) */}
            <aside className="lg:col-span-4 flex flex-col justify-between p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-3.5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                      Nhóm lao động ({groups.length})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="h-7 text-xs px-2.5 shadow-2xs"
                    onClick={handleOpenCreateForm}
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo nhóm
                  </Button>
                </div>

                {/* Groups List: Clean cards with active indicator */}
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto p-1 -m-1 custom-scrollbar">
                  {groups.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">
                      Chưa có nhóm nào. Bấm &quot;Tạo nhóm&quot; để bắt đầu.
                    </div>
                  ) : (
                    groups.map((group) => {
                      const isSelected = activeGroup?.id === group.id;
                      const count = group.employeeCount ?? 0;

                      return (
                        <div
                          key={group.id}
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            setIsFormOpen(false);
                            setIsAddMemberDrawerOpen(false);
                          }}
                          className={`group/card relative px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between border ${
                            isSelected
                              ? "bg-card border-primary/40 shadow-xs text-foreground"
                              : "bg-transparent border-transparent hover:bg-card/70 hover:border-border/60 text-muted hover:text-foreground"
                          }`}
                        >
                          {/* Active edge highlight */}
                          {isSelected && (
                            <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-primary rounded-r-full" />
                          )}

                          <div className="min-w-0 flex-1 pr-2">
                            <span className={`font-semibold text-xs truncate block ${isSelected ? "text-primary font-bold" : "text-foreground"}`}>
                              {group.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                              <span className="font-mono truncate">Mã: {group.code}</span>
                              {group.isDefault && (
                                <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                                  Mặc định
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-mono font-medium text-muted px-2 py-0.5 rounded-full bg-secondary/80 border border-border/50">
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
              <div className="pt-3 px-1 border-t border-border/60 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted">
                  <span>Tổng nhân sự dự án:</span>
                  <strong className="text-foreground font-mono">{employees.length} người</strong>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div
                    style={{
                      width: `${employees.length > 0 ? (groups.reduce((acc, g) => acc + (g.employeeCount ?? 0), 0) / employees.length) * 100 : 0}%`,
                    }}
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                  />
                </div>
              </div>
            </aside>

            {/* RIGHT COLUMN: Active Group Workspace & Member Management (8 Cols) */}
            <main className="lg:col-span-8 flex flex-col justify-between space-y-4">
              {isFormOpen ? (
                /* INLINE FORM: CREATE / EDIT GROUP */
                <form onSubmit={handleSaveGroupForm} className="p-4 rounded-2xl bg-secondary/30 border border-border/70 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        {editingGroupId ? <Pencil className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        {editingGroupId ? `Chỉnh sửa nhóm: ${formName || "Nhóm lao động"}` : "Tạo nhóm người lao động mới"}
                      </h4>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={resetForm} title="Đóng biểu mẫu">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Tên nhóm lao động <span className="text-rose-500">*</span>
                      </label>
                      <input
                        className="w-full h-9 px-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-2xs"
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
                        className="w-full h-9 px-3 text-xs font-mono rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-2xs"
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
                        className="w-full h-9 px-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-2xs"
                        placeholder="Mô tả tiêu chuẩn xếp loại của nhóm này trong chính sách lương..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2 pt-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={formIsDefault}
                          onChange={(e) => setFormIsDefault(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                        />
                        Đặt làm nhóm mặc định cho nhân sự mới
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                    <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                      Hủy bỏ
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                      className="shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lưu nhóm
                    </Button>
                  </div>
                </form>
              ) : isAddMemberDrawerOpen ? (
                /* DRAWER: ADD MEMBERS FROM OTHER GROUPS */
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
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
                    <label className="search-field search-field-full flex-1">
                      <Search />
                      <input
                        type="text"
                        placeholder="Tìm theo tên, mã NV, phòng ban..."
                        value={addMemberSearch}
                        onChange={(e) => setAddMemberSearch(e.target.value)}
                      />
                      {addMemberSearch && (
                        <button
                          type="button"
                          onClick={() => setAddMemberSearch("")}
                          className="text-muted hover:text-foreground p-0.5 rounded-full hover:bg-secondary shrink-0"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </label>

                    {selectedEmpIdsToAdd.size > 0 && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-9 text-xs font-semibold shadow-xs"
                        onClick={handleBatchAssignFromDrawer}
                        disabled={assignMutation.isPending}
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Thêm {selectedEmpIdsToAdd.size} nhân sự đã chọn
                      </Button>
                    )}
                  </div>

                  {/* Candidate List */}
                  {candidateEmployeesToAdd.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-secondary/30 border border-border/70 space-y-1">
                      <Users className="w-7 h-7 text-muted mx-auto" />
                      <h5 className="text-xs font-semibold text-foreground">
                        {addMemberSearch ? "Không tìm thấy nhân sự phù hợp" : "Tất cả nhân sự trong dự án đã thuộc nhóm này"}
                      </h5>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                      <div className="divide-y divide-border/50 max-h-[290px] overflow-y-auto custom-scrollbar p-1">
                        {candidateEmployeesToAdd.map((emp) => {
                          const isChecked = selectedEmpIdsToAdd.has(emp.id);
                          return (
                            <label
                              key={emp.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                                isChecked
                                  ? "bg-primary/5"
                                  : "hover:bg-secondary/40"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectEmpToAdd(emp.id)}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                                />
                                <div className="space-y-0.5 min-w-0">
                                  <span className="font-semibold text-foreground block truncate">{emp.name}</span>
                                  <span className="text-[11px] font-mono text-muted block truncate">
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
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-border/60">
                    <Button size="sm" variant="secondary" onClick={() => setIsAddMemberDrawerOpen(false)}>
                      Quay lại danh sách
                    </Button>
                  </div>
                </div>
              ) : activeGroup ? (
                /* VIEW ACTIVE GROUP & MEMBER ROSTER */
                <div className="space-y-3.5">
                  {/* Clean Hero Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground tracking-tight">{activeGroup.name}</span>
                        <Badge tone="neutral">
                          {activeGroupMembers.length} nhân sự
                        </Badge>
                        {activeGroup.isDefault && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-secondary text-muted border border-border/60">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted max-w-lg leading-relaxed">
                        {activeGroup.description || "Chưa có mô tả chi tiết cho nhóm người lao động này."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs font-medium border-border"
                        onClick={() => handleOpenEditForm(activeGroup)}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Sửa nhóm
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-8 text-xs font-semibold shadow-2xs"
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
                    <label className="search-field search-field-full flex-1 min-w-[220px]">
                      <Search />
                      <input
                        type="text"
                        placeholder={`Tìm trong nhóm ${activeGroup.name}...`}
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                      {memberSearch && (
                        <button
                          type="button"
                          onClick={() => setMemberSearch("")}
                          className="text-muted hover:text-foreground p-0.5 rounded-full hover:bg-secondary shrink-0"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </label>

                    {selectedRosterEmpIds.size > 0 && (
                      <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-xl animate-in fade-in duration-150">
                        <span className="text-xs text-primary font-semibold">
                          Đã chọn {selectedRosterEmpIds.size} NV:
                        </span>
                        <select
                          className="h-7.5 pl-2.5 pr-7 text-xs font-semibold rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
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
                          className="h-7.5 text-xs shadow-2xs"
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
                    <div className="py-12 text-center rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
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
                            className="shadow-2xs"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Thêm nhân sự ngay
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-secondary/70 backdrop-blur-xs z-10 border-b border-border/80">
                            <tr>
                              <th className="w-10 px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedRosterEmpIds.size === filteredActiveMembers.length && filteredActiveMembers.length > 0}
                                  onChange={toggleSelectAllRoster}
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
                              <th className="w-[190px] px-3 py-2.5 text-center text-[11px] font-bold text-muted uppercase tracking-wider">
                                Chuyển sang nhóm
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {filteredActiveMembers.map((emp, index) => {
                              const isChecked = selectedRosterEmpIds.has(emp.id);

                              return (
                                <tr
                                  key={emp.id}
                                  className={`transition-colors group hover:bg-secondary/30 ${
                                    isChecked ? "bg-primary/5" : ""
                                  }`}
                                >
                                  <td className="px-3 py-2.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSelectRosterEmp(emp.id)}
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
                                          {emp.code} {emp.phone ? `· ${emp.phone}` : ""}
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
                                  <td className="px-3 py-2.5 text-center">
                                    <select
                                      className="w-full max-w-[170px] h-7.5 pl-2.5 pr-7 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all cursor-pointer shadow-2xs"
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
  );
}
