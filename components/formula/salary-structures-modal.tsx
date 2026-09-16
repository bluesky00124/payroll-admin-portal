"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Scale,
  ScrollText,
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import type { SalaryStructure, SalaryStructurePayload } from "@/lib/types";

interface SalaryStructuresModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onStructuresCountChange?: (count: number) => void;
}

export function SalaryStructuresModal({
  projectId,
  isOpen,
  onClose,
  onStructuresCountChange,
}: SalaryStructuresModalProps) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  // Mode: "list" | "create" | "edit"
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<SalaryStructure | null>(null);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Query salary structures
  const {
    data: structures = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["salary-structures", projectId],
    queryFn: async () => {
      const res = await api.getSalaryStructures(projectId);
      if (onStructuresCountChange) {
        onStructuresCountChange(res.length);
      }
      return res;
    },
    enabled: isOpen,
  });

  // Filtered list by search
  const filteredStructures = useMemo(() => {
    if (!searchQuery.trim()) return structures;
    const q = searchQuery.toLowerCase().trim();
    return structures.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [structures, searchQuery]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload: SalaryStructurePayload) =>
      api.createSalaryStructure(projectId, payload),
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ["salary-structures", projectId] });
      notify(`Đã tạo quy chế lương "${newItem.name}" thành công!`);
      resetForm();
      setViewMode("list");
    },
    onError: (err: Error) => {
      notify(err.message || "Không thể tạo quy chế lương", "error");
      setFormError(err.message || "Lỗi khi tạo quy chế lương");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SalaryStructurePayload }) =>
      api.updateSalaryStructure(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-structures", projectId] });
      notify("Đã cập nhật quy chế lương thành công!");
      resetForm();
      setViewMode("list");
    },
    onError: (err: Error) => {
      notify(err.message || "Không thể cập nhật quy chế lương", "error");
      setFormError(err.message || "Lỗi khi cập nhật quy chế lương");
    },
  });

  const resetForm = () => {
    setFormCode("");
    setFormName("");
    setFormDescription("");
    setFormIsActive(true);
    setFormError(null);
    setEditingItem(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setViewMode("create");
  };

  const handleOpenEdit = (item: SalaryStructure) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormIsActive(item.isActive);
    setFormError(null);
    setViewMode("edit");
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedCode = formCode.trim();
    const trimmedName = formName.trim();

    if (!trimmedCode) {
      setFormError("Vui lòng nhập Mã quy chế lương");
      return;
    }

    if (!trimmedName) {
      setFormError("Vui lòng nhập Tên quy chế lương");
      return;
    }

    const payload: SalaryStructurePayload = {
      StructureCode: trimmedCode,
      StructureName: trimmedName,
      Description: formDescription.trim(),
      IsActive: formIsActive,
    };

    if (viewMode === "create") {
      createMutation.mutate(payload);
    } else if (viewMode === "edit" && editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    }
  };

  const handleToggleStatusQuick = (item: SalaryStructure) => {
    const nextStatus = !item.isActive;
    const payload: SalaryStructurePayload = {
      StructureCode: item.code,
      StructureName: item.name,
      Description: item.description || "",
      IsActive: nextStatus,
    };
    updateMutation.mutate({ id: item.id, payload });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          setViewMode("list");
          onClose();
        }
      }}
      title="Quy chế & Cấu trúc lương của dự án"
      description="Quản lý các quy chế lương, văn bản chính sách và cấu trúc chi trả áp dụng cho dự án."
      size="lg"
      footer={
        viewMode === "list" ? (
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Tổng cộng: <strong className="text-foreground">{structures.length}</strong> quy chế
            </div>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm();
                setViewMode("list");
              }}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setViewMode("list");
                }}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveForm}
                disabled={isSubmitting}
                className="gap-1.5 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />{" "}
                    {viewMode === "create" ? "Tạo quy chế" : "Lưu thay đổi"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-4 py-1">
        {/* VIEW 1: LIST VIEW */}
        {viewMode === "list" && (
          <div className="space-y-3.5">
            {/* Action bar: Search + Add button */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <label className="search-field flex-1 max-w-sm h-8 min-h-[32px] gap-2 px-2.5">
                <Search className="w-3.5 h-3.5 text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Tìm kiếm mã hoặc tên quy chế..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-0.5 rounded text-muted hover:text-foreground shrink-0"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </label>

              <Button
                type="button"
                variant="primary"
                onClick={handleOpenCreate}
                className="h-8 text-xs gap-1.5 font-semibold shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm quy chế mới
              </Button>
            </div>

            {/* List Content */}
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Đang tải danh sách quy chế lương...</span>
              </div>
            ) : isError ? (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs text-center space-y-2">
                <p>Không thể tải danh sách quy chế lương.</p>
                <Button size="sm" variant="secondary" onClick={() => refetch()}>
                  Thử lại
                </Button>
              </div>
            ) : filteredStructures.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl border border-dashed border-border bg-secondary/20 flex flex-col items-center justify-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <strong className="text-xs font-bold text-foreground block">
                    {searchQuery ? "Không tìm thấy quy chế phù hợp" : "Chưa có quy chế lương nào"}
                  </strong>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    {searchQuery
                      ? `Không có quy chế nào khớp với từ khóa "${searchQuery}". Hãy thử tìm với từ khóa khác.`
                      : "Dự án hiện chưa được thiết lập quy chế lương nào. Hãy tạo quy chế đầu tiên để chuẩn hóa cơ cấu chi trả."}
                  </p>
                </div>
                {!searchQuery && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleOpenCreate}
                    className="gap-1.5 mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo quy chế đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredStructures.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border/80">
                          {item.code}
                        </span>
                        <strong className="text-xs font-bold text-foreground">
                          {item.name}
                        </strong>
                        <Badge tone={item.isActive ? "success" : "neutral"}>
                          {item.isActive ? "Đang áp dụng" : "Tạm dừng"}
                        </Badge>
                      </div>

                      {item.description ? (
                        <p className="text-[11.5px] text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted/60 italic">Không có mô tả</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50 w-full sm:w-auto justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatusQuick(item)}
                        title={item.isActive ? "Bấm để tạm dừng" : "Bấm để kích hoạt"}
                        className="text-xs text-muted hover:text-foreground h-8 px-2"
                        disabled={updateMutation.isPending}
                      >
                        {item.isActive ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đang bật
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <RotateCcw className="w-3.5 h-3.5" /> Bật lại
                          </span>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 text-xs gap-1 font-semibold"
                        title="Chỉnh sửa quy chế"
                      >
                        <Pencil className="w-3.5 h-3.5 text-primary" /> Sửa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: CREATE / EDIT FORM */}
        {(viewMode === "create" || viewMode === "edit") && (
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {viewMode === "create" ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </div>
                <div>
                  <strong className="text-xs font-bold text-foreground block">
                    {viewMode === "create"
                      ? "Thêm mới Quy chế / Cấu trúc lương"
                      : `Chỉnh sửa: ${editingItem?.code}`}
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Điền các thông tin quy chế để áp dụng vào hệ thống tính lương dự án.
                  </span>
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Field 1: StructureCode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>
                    Mã quy chế lương <span className="text-destructive">*</span>
                  </span>
                  <span className="text-[10.5px] font-normal text-muted-foreground">
                    VD: STR_KCV_NM_2026, QC_LUONG_V03
                  </span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã quy chế (viết hoa, không dấu)..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>

              {/* Field 2: StructureName */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Tên quy chế lương <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Cấu trúc bảng lương KCV-NM theo Quy chế V03..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                />
              </div>

              {/* Field 3: Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Mô tả / Căn cứ ban hành</span>
                  <span className="text-[10.5px] font-normal text-muted-foreground">Tùy chọn</span>
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ghi chú thêm về phạm vi áp dụng, ngày có hiệu lực hoặc căn cứ quyết định..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                />
              </div>

              {/* Field 4: IsActive Toggle */}
              <div className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between gap-3">
                <div>
                  <strong className="text-xs font-bold text-foreground block">
                    Trạng thái áp dụng
                  </strong>
                  <span className="text-[11px] text-muted-foreground">
                    Khi bật, quy chế này sẽ sẵn sàng để áp dụng cho chu kỳ tính lương của dự án.
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ml-2 text-xs font-semibold text-foreground">
                    {formIsActive ? "Đang bật" : "Tạm dừng"}
                  </span>
                </label>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
