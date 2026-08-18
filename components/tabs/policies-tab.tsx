"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Save, Search, ScrollText, Trash2, X } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, Modal, StatusBadge, TablePaginationFooter, TableRowActions } from "@/components/ui";
import { api } from "@/lib/api";
import { type PolicyDefinition, type ProjectPolicy, type TargetRole } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function calculateAutoFillValues(
  policyId: string,
  baseSalaryShiftLeader = 7000000,
  baseSalaryChinhThuc = 6300000
): Record<TargetRole, Record<string, string | number | boolean>> | null {
  const hourlyShiftLeader = Math.round(baseSalaryShiftLeader / 208);
  const hourlyChinhThuc = Math.round(baseSalaryChinhThuc / 208);
  const hourlyHocViec = hourlyChinhThuc;

  switch (policyId) {
    case "pol-base-salary":
      return {
        shift_leader: { amount: baseSalaryShiftLeader, std_days: 26 },
        chinh_thuc: { amount: baseSalaryChinhThuc, std_days: 26 },
        hoc_viec: { amount: baseSalaryChinhThuc, std_days: 26 },
      };
    case "pol-insurance-salary":
      return {
        shift_leader: { amount: 8000000 },
        chinh_thuc: { amount: baseSalaryChinhThuc },
        hoc_viec: { amount: baseSalaryChinhThuc },
      };
    case "pol-hourly-rate":
      return {
        shift_leader: { amount: hourlyShiftLeader },
        chinh_thuc: { amount: hourlyChinhThuc },
        hoc_viec: { amount: hourlyHocViec },
      };
    case "pol-ot-15-day":
      return {
        shift_leader: { multiplier: 1.5, hourly_rate: hourlyShiftLeader },
        chinh_thuc: { multiplier: 1.5, hourly_rate: hourlyChinhThuc },
        hoc_viec: { multiplier: 1.5, hourly_rate: hourlyHocViec },
      };
    case "pol-ot-20-night-regular":
      return {
        shift_leader: { multiplier: 2.0 },
        chinh_thuc: { multiplier: 2.0 },
        hoc_viec: { multiplier: 2.0 },
      };
    case "pol-ot-21-night-regular":
      return {
        shift_leader: { multiplier: 2.1 },
        chinh_thuc: { multiplier: 2.1 },
        hoc_viec: { multiplier: 2.1 },
      };
    case "pol-ot-20-weekend":
      return {
        shift_leader: { multiplier: 2.0 },
        chinh_thuc: { multiplier: 2.0 },
        hoc_viec: { multiplier: 2.0 },
      };
    case "pol-ot-27-weekend-night":
      return {
        shift_leader: { multiplier: 2.7 },
        chinh_thuc: { multiplier: 2.7 },
        hoc_viec: { multiplier: 2.7 },
      };
    case "pol-ot-30-holiday":
      return {
        shift_leader: { multiplier: 3.0 },
        chinh_thuc: { multiplier: 3.0 },
        hoc_viec: { multiplier: 3.0 },
      };
    case "pol-ot-39-holiday-night":
      return {
        shift_leader: { multiplier: 3.9 },
        chinh_thuc: { multiplier: 3.9 },
        hoc_viec: { multiplier: 3.9 },
      };
    case "pol-night-allowance-30":
      return {
        shift_leader: { multiplier: 30 },
        chinh_thuc: { multiplier: 30 },
        hoc_viec: { multiplier: 30 },
      };
    case "pol-social-insurance":
      return {
        shift_leader: { employee_rate: 10.5, company_rate: 21.5 },
        chinh_thuc: { employee_rate: 10.5, company_rate: 21.5 },
        hoc_viec: { employee_rate: 10.5, company_rate: 21.5 },
      };
    case "pol-union":
      return {
        shift_leader: { amount: 23400 },
        chinh_thuc: { amount: 23400 },
        hoc_viec: { amount: 23400 },
      };
    case "pol-housing":
      return {
        shift_leader: { amount: 250000 },
        chinh_thuc: { amount: 250000 },
        hoc_viec: { amount: 250000 },
      };
    case "pol-travel":
      return {
        shift_leader: { amount: 300000 },
        chinh_thuc: { amount: 300000 },
        hoc_viec: { amount: 300000 },
      };
    case "pol-responsibility":
      return {
        shift_leader: { amount: 1000000 },
        chinh_thuc: { amount: 0 },
        hoc_viec: { amount: 0 },
      };
    case "pol-insurance-247":
      return {
        shift_leader: { amount: 84000 },
        chinh_thuc: { amount: 84000 },
        hoc_viec: { amount: 84000 },
      };
    case "pol-health-checkup":
      return {
        shift_leader: { amount: 400000 },
        chinh_thuc: { amount: 400000 },
        hoc_viec: { amount: 400000 },
      };
    default:
      return null;
  }
}

function computeImplicitFormulaValues(
  currentMap: Record<string, Record<TargetRole, Record<string, string | number | boolean>>>
): Record<string, Record<TargetRole, Record<string, string | number | boolean>>> {
  const nextMap = { ...currentMap };

  const lcbShiftLeader = Number(nextMap["pol-base-salary"]?.shift_leader?.amount ?? 7000000);
  const lcbChinhThuc = Number(nextMap["pol-base-salary"]?.chinh_thuc?.amount ?? 6300000);

  const calculablePolicyIds = [
    "pol-base-salary",
    "pol-insurance-salary",
    "pol-hourly-rate",
    "pol-ot-15-day",
    "pol-ot-20-night-regular",
    "pol-ot-21-night-regular",
    "pol-ot-20-weekend",
    "pol-ot-27-weekend-night",
    "pol-ot-30-holiday",
    "pol-ot-39-holiday-night",
    "pol-night-allowance-30",
    "pol-social-insurance",
    "pol-union",
    "pol-housing",
    "pol-travel",
    "pol-responsibility",
    "pol-insurance-247",
    "pol-health-checkup",
  ];

  for (const pId of calculablePolicyIds) {
    const computed = calculateAutoFillValues(pId, lcbShiftLeader, lcbChinhThuc);
    if (computed) {
      const existing = nextMap[pId] ?? { shift_leader: {}, chinh_thuc: {}, hoc_viec: {} };
      nextMap[pId] = {
        shift_leader: { ...computed.shift_leader, ...existing.shift_leader },
        chinh_thuc: { ...computed.chinh_thuc, ...existing.chinh_thuc },
        hoc_viec: { ...computed.hoc_viec, ...existing.hoc_viec },
      };
    }
  }

  return nextMap;
}

export function PoliciesTab({ projectId }: { projectId: string; embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProjectPolicy | null>(null);

  // Editable values map: policyId -> TargetRole -> fieldKey -> value
  const [roleValuesMap, setRoleValuesMap] = useState<
    Record<string, Record<TargetRole, Record<string, string | number | boolean>>>
  >({});

  const definitionsQuery = useQuery({ queryKey: ["policy-definitions"], queryFn: api.getPolicyDefinitions });
  const policiesQuery = useQuery({ queryKey: ["project-policies", projectId], queryFn: () => api.getProjectPolicies(projectId) });
  const definitions = useMemo(() => definitionsQuery.data ?? [], [definitionsQuery.data]);
  const policies = policiesQuery.data ?? [];
  const definitionMap = useMemo(() => new Map(definitions.map((item) => [item.id, item])), [definitions]);

  const assignedIds = useMemo(() => new Set(policies.map((item) => item.policyId)), [policies]);

  const modalDefinitions = useMemo(
    () =>
      definitions.filter(
        (definition) =>
          definition.id !== "pol-work-days" &&
          definition.code !== "STANDARD_WORK_DAYS" &&
          `${definition.code} ${definition.name} ${definition.description ?? ""}`
            .toLocaleLowerCase("vi")
            .includes(modalSearch.toLocaleLowerCase("vi"))
      ),
    [definitions, modalSearch]
  );

  const availableDefinitions = useMemo(
    () => modalDefinitions.filter((definition) => !assignedIds.has(definition.id)),
    [modalDefinitions, assignedIds]
  );

  // Sync server policies when loaded
  useEffect(() => {
    if (policies.length > 0 && definitions.length > 0 && !editingRowId) {
      let initialMap: Record<string, Record<TargetRole, Record<string, string | number | boolean>>> = {};
      for (const policy of policies) {
        const def = definitionMap.get(policy.policyId);
        initialMap[policy.policyId] = {
          shift_leader: { ...(def?.targetValues?.shift_leader ?? policy.targetValues?.shift_leader ?? policy.values) },
          chinh_thuc: { ...(def?.targetValues?.chinh_thuc ?? policy.targetValues?.chinh_thuc ?? policy.values) },
          hoc_viec: { ...(def?.targetValues?.hoc_viec ?? policy.targetValues?.hoc_viec ?? policy.values) },
        };
      }
      initialMap = computeImplicitFormulaValues(initialMap);
      setRoleValuesMap(initialMap);
    }
  }, [policies, definitions, definitionMap, editingRowId]);

  const visiblePolicies = policies.filter((policy) => {
    const definition = definitionMap.get(policy.policyId);
    return (
      definition &&
      definition.id !== "pol-work-days" &&
      definition.code !== "STANDARD_WORK_DAYS" &&
      `${definition.code} ${definition.name} ${definition.description}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi"))
    );
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedPolicies = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visiblePolicies.slice(start, start + pageSize);
  }, [visiblePolicies, page, pageSize]);

  const saveSingleRowMutation = useMutation({
    mutationFn: async (policy: ProjectPolicy) => {
      const targetVals = roleValuesMap[policy.policyId];
      if (!targetVals) return policy;

      const mainValues = targetVals.chinh_thuc ?? policy.values;
      return api.updateProjectPolicy(projectId, policy.id, {
        values: mainValues,
        targetValues: targetVals,
      });
    },
    onSuccess: (_, policy) => {
      const definition = definitionMap.get(policy.policyId);
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setEditingRowId(null);
      notify(`Đã lưu thay đổi cho "${definition?.name ?? "chế độ"}"`);
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const addPoliciesMutation = useMutation({
    mutationFn: async () => {
      return Promise.all(
        selectedIds.map((policyId) => {
          const definition = definitionMap.get(policyId);
          const lcbShiftLeader = Number(roleValuesMap["pol-base-salary"]?.shift_leader?.amount ?? 7000000);
          const lcbChinhThuc = Number(roleValuesMap["pol-base-salary"]?.chinh_thuc?.amount ?? 6300000);
          const computed = calculateAutoFillValues(policyId, lcbShiftLeader, lcbChinhThuc);

          const targetVals = computed ?? definition?.targetValues ?? {
            shift_leader: Object.fromEntries(definition?.fields.map((f) => [f.key, f.defaultValue ?? ""]) ?? []),
            chinh_thuc: Object.fromEntries(definition?.fields.map((f) => [f.key, f.defaultValue ?? ""]) ?? []),
            hoc_viec: Object.fromEntries(definition?.fields.map((f) => [f.key, f.defaultValue ?? ""]) ?? []),
          };

          const mainValues = targetVals?.chinh_thuc ?? {};

          return api.createProjectPolicy(projectId, {
            policyId,
            values: mainValues,
            targetValues: targetVals,
            effectiveFrom: "2026-09-01",
            enabled: true,
          });
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setModalOpen(false);
      notify(`Đã thêm ${selectedIds.length} chế độ vào dự án`);
      setSelectedIds([]);
      setModalSearch("");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (policy: ProjectPolicy) => api.deleteProjectPolicy(projectId, policy.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      setDeleteTarget(null);
      notify("Đã gỡ chế độ khỏi dự án");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const toggleSelection = (definition: PolicyDefinition) => {
    setSelectedIds((items) =>
      items.includes(definition.id) ? items.filter((id) => id !== definition.id) : [...items, definition.id]
    );
  };

  const handleCellChange = (
    policyId: string,
    role: TargetRole,
    key: string,
    value: string | number | boolean
  ) => {
    setRoleValuesMap((current) => {
      const existing = current[policyId] ?? { shift_leader: {}, chinh_thuc: {}, hoc_viec: {} };
      let nextState = {
        ...current,
        [policyId]: {
          ...existing,
          [role]: {
            ...existing[role],
            [key]: value,
          },
        },
      };

      // Implicit background re-calculation if LCB changes
      if (policyId === "pol-base-salary" && key === "amount") {
        nextState = computeImplicitFormulaValues(nextState);
      }

      return nextState;
    });
  };

  const getFormattedDisplay = (policy: ProjectPolicy, definition: PolicyDefinition, role: TargetRole) => {
    const roleDict = roleValuesMap[policy.policyId]?.[role] ?? policy.targetValues?.[role] ?? definition.targetValues?.[role];
    const firstField = definition.fields[0];
    if (!firstField) return "—";

    const val = roleDict?.[firstField.key] ?? policy.values[firstField.key];
    return formatFieldValue(firstField, val);
  };

  if (definitionsQuery.isLoading || policiesQuery.isLoading) return <LoadingBlock rows={7} />;
  if (definitionsQuery.isError || policiesQuery.isError)
    return (
      <ErrorState
        message="Không thể tải danh mục chế độ."
        retry={() => {
          definitionsQuery.refetch();
          policiesQuery.refetch();
        }}
      />
    );

  return (
    <div className="subtab-content">
      {/* Table Card */}
      <div className="table-card">
        {/* Table Card Toolbar */}
        <div className="table-card-toolbar">
          <div className="filter-panel-top">
            <div className="filter-panel-inputs">
              <label className="search-field">
                <Search />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm chế độ, mã chính sách..."
                />
              </label>
            </div>
            <div className="filter-panel-actions">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                <Plus /> Thêm chế độ
              </Button>
            </div>
          </div>
        </div>

        {visiblePolicies.length === 0 ? (
          <EmptyState
            title="Chưa có chế độ phù hợp"
            description="Thử thay đổi từ khóa tìm kiếm hoặc bổ sung chế độ mới."
            action={
              availableDefinitions.length > 0 ? (
                <Button variant="primary" onClick={() => setModalOpen(true)}>
                  <Plus /> Thêm chế độ
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table policy-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th>Nội dung chế độ</th>
                  <th style={{ width: "240px" }}>Quản lý / Shift Leader</th>
                  <th style={{ width: "240px" }}>Công nhân chính thức</th>
                  <th style={{ width: "80px" }} className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPolicies.map((policy, index) => {
                  const definition = definitionMap.get(policy.policyId)!;
                  const firstField = definition.fields[0];
                  const isEditingThisRow = editingRowId === policy.id;
                  const stt = (page - 1) * pageSize + index + 1;

                  const getRawVal = (role: TargetRole) => {
                    const roleDict = roleValuesMap[policy.policyId]?.[role];
                    if (roleDict && firstField && roleDict[firstField.key] !== undefined) {
                      return roleDict[firstField.key];
                    }
                    return firstField?.defaultValue ?? "";
                  };

                  return (
                    <tr key={policy.id} className={isEditingThisRow ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                      <td className="text-center text-muted font-medium">{stt}</td>
                      <td>
                        <strong className="text-foreground font-semibold">{definition.name}</strong>
                      </td>

                      {/* Shift Leader Cell */}
                      <td>
                        <PolicyCellRenderer
                          field={firstField}
                          value={getRawVal("shift_leader")}
                          isEditing={isEditingThisRow}
                          onChange={(val) => {
                            if (isEditingThisRow) {
                              handleCellChange(policy.policyId, "shift_leader", firstField?.key ?? "", val);
                            }
                          }}
                          colorClass="text-primary font-bold font-mono"
                        />
                      </td>

                      {/* Công nhân chính thức Cell */}
                      <td>
                        <PolicyCellRenderer
                          field={firstField}
                          value={getRawVal("chinh_thuc")}
                          isEditing={isEditingThisRow}
                          onChange={(val) => {
                            if (isEditingThisRow) {
                              handleCellChange(policy.policyId, "chinh_thuc", firstField?.key ?? "", val);
                            }
                          }}
                          colorClass="text-foreground font-semibold font-mono"
                        />
                      </td>

                      {/* Action Column */}
                      <td className="text-center">
                        {isEditingThisRow ? (
                          <div className="flex items-center gap-1.5 justify-center">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => saveSingleRowMutation.mutate(policy)}
                              disabled={saveSingleRowMutation.isPending}
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
                          <TableRowActions
                            items={[
                              {
                                key: "edit",
                                label: "Chỉnh sửa chế độ",
                                icon: <Pencil />,
                                onClick: () => setEditingRowId(policy.id),
                              },
                              {
                                key: "delete",
                                label: "Gỡ chế độ khỏi dự án",
                                icon: <Trash2 />,
                                danger: true,
                                onClick: () => setDeleteTarget(policy),
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Attached Table Footer */}
          <TablePaginationFooter
            totalItems={visiblePolicies.length}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>

      {/* Modal Popup to select and add policies */}
      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setSelectedIds([]);
            setModalSearch("");
          }
        }}
        title="Thêm chế độ vào dự án"
        description={`Chọn các chế độ từ danh mục hệ thống để bổ sung vào dự án (${modalDefinitions.length} chế độ danh mục).`}
        size="lg"
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              disabled={selectedIds.length === 0 || addPoliciesMutation.isPending}
              onClick={() => addPoliciesMutation.mutate()}
            >
              {addPoliciesMutation.isPending ? "Đang thêm…" : `Thêm ${selectedIds.length || ""} chế độ`}
            </Button>
          </>
        }
      >
        <label className="search-field modal-search mb-4 w-full">
          <Search />
          <input
            value={modalSearch}
            onChange={(event) => setModalSearch(event.target.value)}
            placeholder="Tìm tên hoặc mã chế độ..."
          />
        </label>

        {modalDefinitions.length === 0 ? (
          <div className="py-8 text-center text-muted text-sm">
            Không tìm thấy chế độ nào phù hợp với từ khóa tìm kiếm.
          </div>
        ) : (
          <div className="policy-picker">
            {modalDefinitions.map((definition) => {
              const isAlreadyAssigned = assignedIds.has(definition.id);
              const isSelected = selectedIds.includes(definition.id);

              return (
                <label
                  key={definition.id}
                  className={`policy-picker-item ${isAlreadyAssigned ? "disabled" : isSelected ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    disabled={isAlreadyAssigned}
                    checked={isAlreadyAssigned || isSelected}
                    onChange={() => !isAlreadyAssigned && toggleSelection(definition)}
                  />
                  <span>
                    <strong>{definition.name}</strong>
                    {definition.description && <small>{definition.description}</small>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Gỡ chế độ khỏi dự án?"
        description={deleteTarget ? definitionMap.get(deleteTarget.policyId)?.name : ""}
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="danger" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>
              Gỡ chế độ
            </Button>
          </>
        }
      >
        <p className="modal-note">Chế độ sẽ được xóa khỏi cấu hình hiện tại của dự án.</p>
      </Modal>
    </div>
  );
}

function PolicyCellRenderer({
  field,
  value,
  isEditing,
  onChange,
  colorClass = "text-sky-600 dark:text-sky-400",
}: {
  field?: PolicyDefinition["fields"][number];
  value: any;
  isEditing: boolean;
  onChange: (newVal: any) => void;
  colorClass?: string;
}) {
  const isBool =
    field?.type === "boolean" ||
    value === true ||
    value === false ||
    value === "true" ||
    value === "false" ||
    value === "Có" ||
    value === "Không";

  if (isBool) {
    const checked = value === true || value === "true" || value === "Có";

    if (!isEditing) {
      return (
        <div className="inline-flex items-center min-w-[110px]">
          <StatusBadge tone={checked ? "success" : "neutral"} dot={false}>
            {checked ? "Có áp dụng" : "Không áp dụng"}
          </StatusBadge>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onChange(checked ? "Không" : "Có")}
        className={`button button-sm min-w-[124px] justify-center transition-colors ${
          checked ? "button-primary" : "button-secondary"
        }`}
      >
        {checked ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0 opacity-60" />}
        <span className="truncate">{checked ? "Có áp dụng" : "Không áp dụng"}</span>
      </button>
    );
  }

  if (isEditing && field) {
    return <InlineCellEditor field={field} value={value} onChange={onChange} />;
  }

  return (
    <span className={cn("font-medium", colorClass)}>
      {formatFieldValue(field, value)}
    </span>
  );
}

function formatFieldValue(field?: PolicyDefinition["fields"][number], val?: any) {
  if (val === undefined || val === null || val === "") return "—";
  if (field?.type === "money" && (typeof val === "number" || !isNaN(Number(val)))) return formatCurrency(Number(val));
  if (field?.type === "percentage" && (typeof val === "number" || !isNaN(Number(val)))) return `${val}%`;
  if (typeof val === "boolean" || val === "Có" || val === "Không") return val ? "Có" : "Không";
  if (field?.type === "select") return String(val);
  const unitStr = field?.unit && field.unit !== "x" ? ` ${field.unit}` : "";
  return `${val}${unitStr}`.trim();
}

function InlineCellEditor({
  field,
  value,
  onChange,
}: {
  field: PolicyDefinition["fields"][number];
  value: string | number | boolean | undefined;
  onChange: (newValue: string | number | boolean) => void;
}) {
  if (field.type === "select") {
    return (
      <select
        className="inline-cell-select"
        value={String(value ?? field.defaultValue ?? "")}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "boolean") {
    const checked = value === true || value === "true" || value === "Có";
    return (
      <div className="flex items-center justify-start py-0.5">
        <input
          type="checkbox"
          className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary accent-primary cursor-pointer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "Có" : "Không")}
        />
      </div>
    );
  }

  if (field.type === "money" || field.type === "number" || field.type === "percentage") {
    return (
      <div className="inline-cell-wrap">
        <input
          type="number"
          step={field.type === "percentage" ? "0.1" : "1"}
          min={field.min}
          max={field.max}
          className="inline-cell-input"
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="0"
        />
        {field.unit && field.unit !== "x" && <span className="inline-cell-unit">{field.unit}</span>}
      </div>
    );
  }

  return (
    <div className="inline-cell-wrap">
      <input
        type="text"
        className="inline-cell-input"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function DynamicRoleField({
  definitionId,
  role,
  field,
  value,
  onChange,
}: {
  definitionId: string;
  role: TargetRole;
  field: PolicyDefinition["fields"][number];
  value: string | number | boolean | undefined;
  onChange: (definitionId: string, role: TargetRole, key: string, value: string | number | boolean) => void;
}) {
  return (
    <div className="form-field">
      <span>{field.label}</span>
      <InlineCellEditor
        field={field}
        value={value}
        onChange={(newVal) => onChange(definitionId, role, field.key, newVal)}
      />
    </div>
  );
}

export function DynamicField({
  definitionId,
  field,
  value,
  onChange,
}: {
  definitionId: string;
  field: PolicyDefinition["fields"][number];
  value: string | number | boolean | undefined;
  onChange: (definitionId: string, key: string, value: string | number | boolean) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="form-field boolean-field">
        <span>{field.label}</span>
        <select
          className="inline-cell-select"
          aria-label={field.label}
          value={value ? "true" : "false"}
          onChange={(e) => onChange(definitionId, field.key, e.target.value === "true")}
        >
          <option value="true">Có áp dụng</option>
          <option value="false">Không áp dụng</option>
        </select>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="form-field">
        <span>{field.label}</span>
        <select
          className="inline-cell-select"
          aria-label={field.label}
          value={String(value ?? field.defaultValue ?? "")}
          onChange={(e) => onChange(definitionId, field.key, e.target.value)}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="form-field">
      <span>{field.label}</span>
      <div className="inline-cell-wrap">
        <input
          type="number"
          aria-label={field.label}
          step={field.type === "percentage" ? "0.1" : "1"}
          min={field.min}
          max={field.max}
          className="inline-cell-input"
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) => onChange(definitionId, field.key, e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="0"
        />
        {field.unit && <span className="inline-cell-unit">{field.unit}</span>}
      </div>
    </label>
  );
}
