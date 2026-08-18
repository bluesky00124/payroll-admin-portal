"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import type { ProjectOvertimeConfig } from "@/lib/types";

export function AttendanceTab({ projectId, embedded = false }: { projectId: string; embedded?: boolean }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const typesQuery = useQuery({ queryKey: ["overtime-types"], queryFn: api.getOvertimeTypes });
  const configsQuery = useQuery({ queryKey: ["overtime-configs", projectId], queryFn: () => api.getOvertimeConfigs(projectId) });

  const [configs, setConfigs] = useState<ProjectOvertimeConfig[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<number>(1.5);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectOvertimeConfig | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (configsQuery.data) setConfigs(structuredClone(configsQuery.data));
  }, [configsQuery.data]);

  const typeMap = useMemo(() => new Map((typesQuery.data ?? []).map((item) => [item.id, item])), [typesQuery.data]);

  const availableTypes = useMemo(() => {
    const existingIds = new Set(configs.map((c) => c.overtimeTypeId));
    return (typesQuery.data ?? []).filter((t) => !existingIds.has(t.id));
  }, [typesQuery.data, configs]);

  const visibleConfigs = useMemo(() => {
    if (!search.trim()) return configs;
    const term = search.toLowerCase();
    return configs.filter((c) => {
      const type = typeMap.get(c.overtimeTypeId);
      return type?.name.toLowerCase().includes(term) || type?.code.toLowerCase().includes(term);
    });
  }, [configs, search, typeMap]);

  // Start editing a specific row
  const startEditingRow = (config: ProjectOvertimeConfig) => {
    setEditingRowId(config.id);
    setEditingValue(config.multiplier);
  };

  // Save single row mutation
  const saveRowMutation = useMutation({
    mutationFn: async (config: ProjectOvertimeConfig) => {
      const updatedConfigs = configs.map((c) => (c.id === config.id ? { ...c, multiplier: editingValue } : c));
      return api.saveOvertimeConfigs(projectId, updatedConfigs);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["overtime-configs", projectId], saved);
      setConfigs(saved);
      setEditingRowId(null);
      notify("Đã cập nhật hệ số tăng ca");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  // Add new overtime type to project
  const addOvertimeTypeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTypeId) throw new Error("Vui lòng chọn loại tăng ca");
      const targetType = typeMap.get(selectedTypeId);
      const newConfig: ProjectOvertimeConfig = {
        id: `${projectId}-${selectedTypeId}-${Date.now()}`,
        projectId,
        overtimeTypeId: selectedTypeId,
        enabled: true,
        multiplier: targetType?.defaultMultiplier ?? 1.5,
        base: "base_salary",
        divisor: "fixed_208",
        hoursSource: targetType?.code ?? "OT",
        taxable: true,
        effectiveFrom: new Date().toISOString(),
      };
      const updated = [...configs, newConfig];
      return api.saveOvertimeConfigs(projectId, updated);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["overtime-configs", projectId], saved);
      setConfigs(saved);
      setModalOpen(false);
      setSelectedTypeId("");
      notify("Đã thêm chế độ tăng ca vào dự án");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  // Delete overtime type from project
  const deleteOvertimeTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const updated = configs.filter((c) => c.id !== id);
      return api.saveOvertimeConfigs(projectId, updated);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["overtime-configs", projectId], saved);
      setConfigs(saved);
      setDeleteTarget(null);
      notify("Đã xóa chế độ tăng ca khỏi dự án");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  if (typesQuery.isLoading || configsQuery.isLoading) return <LoadingBlock rows={7} />;
  if (typesQuery.isError || configsQuery.isError)
    return (
      <ErrorState
        message="Không thể tải danh sách chi phí tăng ca."
        retry={() => {
          typesQuery.refetch();
          configsQuery.refetch();
        }}
      />
    );

  return (
    <>
      <div className="tab-heading">
        <div>
          <span className="section-kicker">QUY CHẾ SWM-DN 2026</span>
          <h2>Danh sách chi phí tăng ca dự án</h2>
        </div>
        <div className="heading-actions">
          {availableTypes.length > 0 && (
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus /> Thêm chế độ tăng ca
            </Button>
          )}
        </div>
      </div>

      <section className="content-card">
        <div className="table-toolbar">
          <label className="search-field">
            <Search />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm chi phí tăng ca..." />
          </label>
          <div className="toolbar-actions">
            <Badge tone="info">
              {configs.length} chế độ tăng ca
            </Badge>
          </div>
        </div>

        {visibleConfigs.length === 0 ? (
          <EmptyState
            title="Chưa có chi phí tăng ca"
            description={search ? "Không tìm thấy chế độ tăng ca phù hợp với từ khóa." : "Nhấn 'Thêm chế độ tăng ca' để cấu hình loại tăng ca cho dự án này."}
            action={
              availableTypes.length > 0 && !search ? (
                <Button variant="primary" onClick={() => setModalOpen(true)}>
                  <Plus /> Thêm chế độ tăng ca
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table policy-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th>Loại tăng ca</th>
                  <th style={{ width: "240px" }}>Hệ số đơn giá</th>
                  <th style={{ width: "140px" }} className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleConfigs.map((config, index) => {
                  const type = typeMap.get(config.overtimeTypeId);
                  const isEditingThisRow = editingRowId === config.id;

                  return (
                    <tr key={config.id} className={isEditingThisRow ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                      <td className="text-center font-mono text-xs text-muted font-medium">{index + 1}</td>
                      <td>
                        <div className="name-description">
                          <strong className="text-foreground font-semibold text-sm">{type?.name}</strong>
                          {type?.description && (
                            <small className="text-muted block text-xs mt-0.5">{type.description}</small>
                          )}
                        </div>
                      </td>

                      {/* Multiplier Cell */}
                      <td>
                        {isEditingThisRow ? (
                          <div className="inline-cell-wrap" style={{ maxWidth: "140px" }}>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="inline-cell-input"
                              value={editingValue}
                              onChange={(e) => setEditingValue(Number(e.target.value))}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span className="font-semibold text-sky-600 dark:text-sky-400 text-sm">
                            {config.multiplier}
                          </span>
                        )}
                      </td>

                      {/* Action Cell (Matching PoliciesTab) */}
                      <td className="text-center">
                        {isEditingThisRow ? (
                          <div className="flex items-center gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => saveRowMutation.mutate(config)}
                              disabled={saveRowMutation.isPending}
                              title="Lưu dòng này"
                            >
                              <Save className="w-3.5 h-3.5" /> Lưu
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingRowId(null)}
                              title="Hủy sửa"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEditingRow(config)}
                              aria-label={`Sửa ${type?.name}`}
                              title="Chỉnh sửa dòng này"
                            >
                              <Pencil className="w-4 h-4 text-primary" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTarget(config)}
                              aria-label={`Xóa ${type?.name}`}
                              title="Xóa chế độ này khỏi dự án"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal: Add Overtime Type to Project */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Thêm chế độ tăng ca vào dự án"
        description="Chọn loại tăng ca từ quy chế chung để áp dụng cho dự án này."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={!selectedTypeId || addOvertimeTypeMutation.isPending}
              onClick={() => addOvertimeTypeMutation.mutate()}
            >
              {addOvertimeTypeMutation.isPending ? "Đang thêm…" : "Thêm vào dự án"}
            </Button>
          </>
        }
      >
        <div className="policy-picker">
          {availableTypes.map((type) => (
            <label key={type.id} className={selectedTypeId === type.id ? "selected" : ""}>
              <input
                type="radio"
                name="overtime-type-picker"
                checked={selectedTypeId === type.id}
                onChange={() => setSelectedTypeId(type.id)}
              />
              <span>
                <strong>{type.name}</strong>
                <small>{type.description}</small>
              </span>
            </label>
          ))}
        </div>
      </Modal>

      {/* Modal: Confirm Delete */}
      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Bỏ chế độ tăng ca khỏi dự án?"
        description={`Bạn có chắc muốn bỏ '${typeMap.get(deleteTarget?.overtimeTypeId ?? "")?.name}' khỏi dự án này?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              disabled={deleteOvertimeTypeMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteOvertimeTypeMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteOvertimeTypeMutation.isPending ? "Đang xóa…" : "Xóa khỏi dự án"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Hành động này sẽ gỡ bỏ chế độ tăng ca khỏi dự án. Bạn có thể thêm lại bất kỳ lúc nào.
        </p>
      </Modal>
    </>
  );
}
