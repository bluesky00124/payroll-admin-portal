"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CalendarDays, Check, Pencil, Plus, Save, Search, ScrollText, Trash2, Users, X } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, DatePicker, EmptyState, ErrorState, LoadingBlock, Modal, MonthPicker, SaveBar, StatusBadge, TablePaginationFooter, TableRowActions } from "@/components/ui";
import { api } from "@/lib/api";
import { type PolicyDefinition, type ProjectEmployeeGroup, type ProjectPolicy, type ProjectPolicyColumn, type ProjectPolicyRow, type TargetRole } from "@/lib/types";
import { ManageEmployeeGroupsModal } from "@/components/policies/manage-employee-groups-modal";
import { cn, formatCurrency, formatDate, hideGsLoading, showGsLoading } from "@/lib/utils";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProjectPolicyRow | null>(null);
  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Editable values map: policyId -> columnId -> value
  const [roleValuesMap, setRoleValuesMap] = useState<
    Record<string, Record<string, string | number>>
  >({});
  const [savedRoleValuesMap, setSavedRoleValuesMap] = useState<
    Record<string, Record<string, string | number>>
  >({});

  const definitionsQuery = useQuery({
    queryKey: ["policy-definitions", projectId],
    queryFn: () => api.getPolicyDefinitions(projectId),
  });
  const groupsQuery = useQuery({
    queryKey: ["project-employee-groups", projectId],
    queryFn: () => api.getProjectEmployeeGroups(projectId),
  });
  const policiesQuery = useQuery({
    queryKey: ["project-policies", projectId, page, pageSize, search],
    queryFn: () => api.getProjectPolicies(projectId, { pageIndex: page, pageSize, search }),
  });

  const definitions = useMemo(() => definitionsQuery.data ?? [], [definitionsQuery.data]);
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);
  const columns = useMemo(() => {
    if (groups.length > 0) {
      return groups.map((g) => ({
        id: g.id,
        name: g.name,
      }));
    }
    return policiesQuery.data?.columns ?? [];
  }, [groups, policiesQuery.data?.columns]);
  const rows = useMemo(() => policiesQuery.data?.rows ?? [], [policiesQuery.data]);
  const totalRow = policiesQuery.data?.totalRow ?? rows.length;

  const [effectiveDatesMap, setEffectiveDatesMap] = useState<Record<string, string>>({});
  const [savedEffectiveDatesMap, setSavedEffectiveDatesMap] = useState<Record<string, string>>({});
  const [effectiveToDatesMap, setEffectiveToDatesMap] = useState<Record<string, string>>({});
  const [savedEffectiveToDatesMap, setSavedEffectiveToDatesMap] = useState<Record<string, string>>({});

  const availableDefinitions = useMemo(
    () =>
      definitions.filter(
        (definition) =>
          !modalSearch ||
          `${definition.code} ${definition.name} ${definition.description ?? ""}`
            .toLocaleLowerCase("vi")
            .includes(modalSearch.toLocaleLowerCase("vi"))
      ),
    [definitions, modalSearch]
  );

  // Sync server policies when loaded
  useEffect(() => {
    if (rows.length > 0) {
      const initialMap: Record<string, Record<string, string | number>> = {};
      const datesMap: Record<string, string> = {};
      const toDatesMap: Record<string, string> = {};

      for (const row of rows) {
        const pId = String(row.policyId);
        initialMap[pId] = { ...(row.values || {}) };
        datesMap[pId] = row.effectiveFrom || "2026-07-01";
        toDatesMap[pId] = row.effectiveTo || "";
      }

      setRoleValuesMap(initialMap);
      setSavedRoleValuesMap(initialMap);
      setEffectiveDatesMap(datesMap);
      setSavedEffectiveDatesMap(datesMap);
      setEffectiveToDatesMap(toDatesMap);
      setSavedEffectiveToDatesMap(toDatesMap);
    }
  }, [rows]);

  const isDirty = useMemo(() => {
    if (Object.keys(savedRoleValuesMap).length === 0) return false;
    return rows.some((row) => {
      const pId = String(row.policyId);
      const curDate = effectiveDatesMap[pId];
      const savedDate = savedEffectiveDatesMap[pId];
      if (curDate && savedDate && curDate !== savedDate) return true;

      const curToDate = effectiveToDatesMap[pId] ?? "";
      const savedToDate = savedEffectiveToDatesMap[pId] ?? "";
      if (curToDate !== savedToDate) return true;

      const curVals = roleValuesMap[pId];
      const savedVals = savedRoleValuesMap[pId];
      if (!curVals || !savedVals) return false;
      return JSON.stringify(curVals) !== JSON.stringify(savedVals);
    });
  }, [rows, effectiveDatesMap, savedEffectiveDatesMap, effectiveToDatesMap, savedEffectiveToDatesMap, roleValuesMap, savedRoleValuesMap]);

  const handleReset = () => {
    setRoleValuesMap(savedRoleValuesMap);
    setEffectiveDatesMap(savedEffectiveDatesMap);
    setEffectiveToDatesMap(savedEffectiveToDatesMap);
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [modalEffectiveFrom, setModalEffectiveFrom] = useState(todayStr);
  const [modalEffectiveTo, setModalEffectiveTo] = useState(todayStr);

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const dirtyRows = rows.filter((row) => {
        const pId = String(row.policyId);
        const curDate = effectiveDatesMap[pId] ?? row.effectiveFrom ?? "";
        const savedDate = savedEffectiveDatesMap[pId] ?? row.effectiveFrom ?? "";
        const curToDate = effectiveToDatesMap[pId] ?? row.effectiveTo ?? "";
        const savedToDate = savedEffectiveToDatesMap[pId] ?? row.effectiveTo ?? "";
        const curVals = roleValuesMap[pId] ?? row.values ?? {};
        const savedVals = savedRoleValuesMap[pId] ?? row.values ?? {};
        return (
          curDate !== savedDate ||
          curToDate !== savedToDate ||
          JSON.stringify(curVals) !== JSON.stringify(savedVals)
        );
      });

      if (dirtyRows.length === 0) return;

      const activeGroups = (groups.length > 0
        ? groups.map((g) => ({ id: Number(g.id) }))
        : columns.map((c) => ({ id: Number(c.id) }))
      ).filter((g) => !isNaN(g.id) && g.id > 0);

      const batchPayload = dirtyRows.map((row) => {
        const pId = String(row.policyId);
        const rawEffFrom = effectiveDatesMap[pId] || row.effectiveFrom || todayStr;
        const effFrom = String(rawEffFrom).slice(0, 10);
        const rawEffTo = effectiveToDatesMap[pId] ?? row.effectiveTo ?? rawEffFrom;
        const effTo = rawEffTo ? String(rawEffTo).slice(0, 10) : effFrom;

        const curVals = roleValuesMap[pId] || row.values || {};
        const valuesPayload = activeGroups.map((g) => ({
          TargetGroupId: g.id,
          PolicyValue: String(curVals[String(g.id)] ?? row.values?.[String(g.id)] ?? ""),
        }));

        return {
          PolicyId: Number(row.policyId),
          EffectiveFrom: effFrom,
          EffectiveTo: effTo,
          Note: "",
          Values: valuesPayload,
        };
      });

      await api.updateProjectPolicyValues(projectId, batchPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-employee-groups", projectId] });
      setSavedRoleValuesMap(roleValuesMap);
      setSavedEffectiveDatesMap(effectiveDatesMap);
      setSavedEffectiveToDatesMap(effectiveToDatesMap);
      notify("Đã lưu thành công tất cả thay đổi chế độ!");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const addPoliciesMutation = useMutation({
    mutationFn: async () => {
      const policyItemIds = selectedIds
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0);
      if (policyItemIds.length === 0) {
        throw new Error("Vui lòng chọn ít nhất một chế độ.");
      }
      return api.addPoliciesToProject(projectId, {
        PolicyItemIds: policyItemIds,
        EffectiveFrom: modalEffectiveFrom || todayStr,
        EffectiveTo: modalEffectiveTo || modalEffectiveFrom || todayStr,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      queryClient.invalidateQueries({ queryKey: ["policy-definitions", projectId] });
      setModalOpen(false);
      notify(`Đã thêm ${selectedIds.length} chế độ vào dự án thành công`);
      setSelectedIds([]);
      setModalSearch("");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (row: ProjectPolicyRow) => api.deleteProjectPolicy(projectId, String(row.policyId)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      queryClient.invalidateQueries({ queryKey: ["policy-definitions", projectId] });
      setDeleteTarget(null);
      notify(res?.message || "Đã bỏ chế độ khỏi dự án thành công.");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const handleOpenAddPolicyModal = () => {
    if (columns.length === 0) {
      notify("Vui lòng tạo ít nhất một Nhóm người lao động trước khi thêm chế độ vào dự án!", "warning");
      setGroupsModalOpen(true);
      return;
    }
    setModalOpen(true);
  };

  const toggleSelection = (definition: PolicyDefinition) => {
    setSelectedIds((items) =>
      items.includes(definition.id) ? items.filter((id) => id !== definition.id) : [...items, definition.id]
    );
  };

  const handleCellChange = (
    policyId: string | number,
    columnId: string | number,
    value: string | number
  ) => {
    const pId = String(policyId);
    const cId = String(columnId);
    setRoleValuesMap((current) => ({
      ...current,
      [pId]: {
        ...(current[pId] || {}),
        [cId]: value,
      },
    }));
  };

  useEffect(() => {
    if (saveAllMutation.isPending) {
      showGsLoading("Đang lưu cấu hình chế độ...");
    } else if (addPoliciesMutation.isPending) {
      showGsLoading("Đang thêm chế độ mới...");
    } else if (deleteMutation.isPending) {
      showGsLoading("Đang xóa chế độ...");
    } else if (policiesQuery.isFetching && Boolean(policiesQuery.data)) {
      showGsLoading("Đang tải dữ liệu chế độ...");
    } else {
      hideGsLoading();
    }
    return () => hideGsLoading();
  }, [
    saveAllMutation.isPending,
    addPoliciesMutation.isPending,
    deleteMutation.isPending,
    policiesQuery.isFetching,
    Boolean(policiesQuery.data),
  ]);

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
    <div className="subtab-content relative pb-16">
      {/* Missing Groups Guidance Banner */}
      {columns.length === 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-300 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <strong className="text-xs font-bold block text-foreground">
                Dự án chưa có Nhóm người lao động nào
              </strong>
              <span className="text-[11px] text-muted-foreground block">
                Cần tạo nhóm người lao động để thiết lập các cột nhập giá trị và phân bổ nhân sự áp dụng chế độ.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="h-8 text-xs font-semibold shadow-2xs gap-1.5 shrink-0"
            onClick={() => setGroupsModalOpen(true)}
          >
            <Users className="w-3.5 h-3.5" /> Tạo nhóm lao động ngay
          </Button>
        </div>
      )}

      {/* Table Card */}
      <div className="table-card">
        {/* Table Card Toolbar */}
        <div className="table-card-toolbar">
          <div className="flex items-center justify-end gap-2.5 flex-wrap w-full">
            <label className="search-field" style={{ minWidth: "260px" }}>
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
            <Button variant="secondary" onClick={() => setGroupsModalOpen(true)}>
              <Users className="w-4 h-4" /> Quản lý nhóm {columns.length > 0 ? `(${columns.length})` : ""}
            </Button>
            <Button variant="primary" onClick={handleOpenAddPolicyModal}>
              <Plus /> Thêm chế độ
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={columns.length === 0 ? "Chưa có nhóm người lao động" : "Chưa có chế độ phù hợp"}
            description={
              columns.length === 0
                ? "Dự án mới cần được tạo ít nhất một Nhóm người lao động trước khi cấu hình chế độ lương."
                : "Thử thay đổi từ khóa tìm kiếm hoặc bổ sung chế độ mới."
            }
            action={
              columns.length === 0 ? (
                <Button variant="primary" onClick={() => setGroupsModalOpen(true)}>
                  <Users className="w-4 h-4" /> Tạo nhóm người lao động
                </Button>
              ) : availableDefinitions.length > 0 ? (
                <Button variant="primary" onClick={handleOpenAddPolicyModal}>
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
                    <th style={{ minWidth: "220px" }}>Nội dung chế độ</th>
                    {columns.map((col) => (
                      <th key={col.id} style={{ minWidth: "180px", maxWidth: "260px" }}>
                        <div className="flex items-center gap-1.5">
                          <span>{col.name}</span>
                        </div>
                      </th>
                    ))}
                    {columns.length === 0 && (
                      <th style={{ minWidth: "220px" }} className="text-center bg-amber-500/5 text-amber-700 dark:text-amber-400">
                        <div className="flex items-center justify-center gap-1.5 font-semibold text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Chưa có nhóm lao động</span>
                        </div>
                      </th>
                    )}
                    <th style={{ width: "165px" }} className="text-center">Áp dụng từ</th>
                    <th style={{ width: "165px" }} className="text-center">Ngày kết thúc</th>
                    <th style={{ width: "70px" }} className="text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const pId = String(row.policyId);
                    const rawStt = (page - 1) * pageSize + index + 1;
                    const stt = String(rawStt).padStart(2, "0");

                    return (
                      <tr key={row.policyId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="text-center text-muted font-medium">{stt}</td>
                        <td>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <strong className="text-foreground font-semibold">{row.policyName}</strong>
                            {row.policyCode && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted border border-border/50">
                                {row.policyCode}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Dynamic Columns from API */}
                        {columns.map((col) => {
                          const cId = String(col.id);
                          const cellVal = roleValuesMap[pId]?.[cId] ?? row.values?.[cId] ?? "";

                          return (
                            <td key={col.id}>
                              <RowCellEditor
                                dataType={row.dataType}
                                value={cellVal}
                                onChange={(newVal) => handleCellChange(row.policyId, col.id, newVal)}
                              />
                            </td>
                          );
                        })}

                        {/* Placeholder column when no groups exist */}
                        {columns.length === 0 && (
                          <td className="text-center py-2 px-3 bg-amber-500/5">
                            <button
                              type="button"
                              onClick={() => setGroupsModalOpen(true)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer py-1 px-2.5 rounded-lg bg-card border border-border shadow-2xs"
                            >
                              <Users className="w-3 h-3" /> + Tạo nhóm để nhập giá trị
                            </button>
                          </td>
                        )}

                        {/* Effective From Column */}
                        <td className="text-center">
                          <div className="inline-flex justify-center w-full" style={{ maxWidth: "160px", margin: "0 auto" }}>
                            <DatePicker
                              value={effectiveDatesMap[pId] || row.effectiveFrom || "2026-07-01"}
                              onChange={(newDate) => {
                                setEffectiveDatesMap((prev) => ({
                                  ...prev,
                                  [pId]: newDate,
                                }));
                              }}
                              title="Chọn ngày bắt đầu áp dụng"
                              placeholder="Chọn ngày..."
                            />
                          </div>
                        </td>

                        {/* Effective To Column */}
                        <td className="text-center">
                          <div className="inline-flex justify-center w-full" style={{ maxWidth: "160px", margin: "0 auto" }}>
                            <DatePicker
                              value={effectiveToDatesMap[pId] ?? row.effectiveTo ?? ""}
                              onChange={(newDate) => {
                                setEffectiveToDatesMap((prev) => ({
                                  ...prev,
                                  [pId]: newDate,
                                }));
                              }}
                              title="Chọn ngày kết thúc áp dụng"
                              placeholder="Chọn ngày..."
                            />
                          </div>
                        </td>

                        {/* Action Column */}
                        <td className="text-center">
                          <button
                            type="button"
                            className="button button-icon button-ghost text-muted hover:text-destructive transition-colors"
                            onClick={() => setDeleteTarget(row)}
                            title="Gỡ chế độ khỏi dự án"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Attached Table Footer */}
            <TablePaginationFooter
              totalItems={totalRow}
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

      {/* Floating SaveBar for Spreadsheet Changes */}
      <SaveBar
        visible={isDirty}
        saving={saveAllMutation.isPending}
        onSave={() => saveAllMutation.mutate()}
        onCancel={handleReset}
      />

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
        description="Chọn các chế độ từ danh mục hệ thống để bổ sung vào dự án."
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
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-lg border border-border/60">
            <div className="form-field mb-0">
              <span className="text-xs font-semibold text-foreground mb-1 block">Áp dụng từ <span className="text-destructive">*</span></span>
              <DatePicker
                value={modalEffectiveFrom}
                onChange={(val) => setModalEffectiveFrom(val)}
                title="Chọn ngày bắt đầu áp dụng"
                placeholder="Chọn ngày áp dụng..."
              />
            </div>
            <div className="form-field mb-0">
              <span className="text-xs font-semibold text-foreground mb-1 block">Ngày kết thúc</span>
              <DatePicker
                value={modalEffectiveTo}
                onChange={(val) => setModalEffectiveTo(val)}
                title="Chọn ngày kết thúc áp dụng"
                placeholder="Chọn ngày kết thúc..."
              />
            </div>
          </div>

          <label className="search-field modal-search w-full">
            <Search />
            <input
              value={modalSearch}
              onChange={(event) => setModalSearch(event.target.value)}
              placeholder="Tìm tên hoặc mã chế độ..."
            />
          </label>

          <div className="flex items-center justify-between text-xs px-1 text-muted">
            <span>
              Tổng số chế độ khả dụng: <strong className="text-foreground font-semibold">{availableDefinitions.length}</strong>
            </span>
            {selectedIds.length > 0 && (
              <span className="text-primary font-semibold">
                Đã chọn {selectedIds.length} chế độ
              </span>
            )}
          </div>

          {availableDefinitions.length === 0 ? (
            <div className="py-8 text-center text-muted text-sm bg-secondary/30 rounded-lg border border-border/60">
              {modalSearch
                ? "Không tìm thấy chế độ nào phù hợp với từ khóa tìm kiếm."
                : "Dự án đã được cấu hình tất cả các chế độ hiện có trong hệ thống."}
            </div>
          ) : (
            <div className="policy-picker">
              {availableDefinitions.map((definition) => {
                const isSelected = selectedIds.includes(definition.id);

                return (
                  <label
                    key={definition.id}
                    className={`policy-picker-item ${isSelected ? "selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(definition)}
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
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Gỡ chế độ khỏi dự án?"
        description={deleteTarget?.policyName || ""}
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

      {/* Manage Employee Groups Modal */}
      <ManageEmployeeGroupsModal
        projectId={projectId}
        isOpen={groupsModalOpen}
        onClose={() => setGroupsModalOpen(false)}
      />
    </div>
  );
}

function RowCellEditor({
  dataType,
  value,
  onChange,
}: {
  dataType: string;
  value: any;
  onChange: (newVal: any) => void;
}) {
  const normalizedType = String(dataType || "").toLowerCase().trim();

  // 1. Currency (Tiền tệ VNĐ)
  if (normalizedType === "currency") {
    const rawNumber = typeof value === "number" ? value : Number(String(value ?? "").replace(/\D/g, ""));
    const displayStr = isNaN(rawNumber) || value === "" || value === undefined ? "" : formatNumberWithDots(rawNumber);

    return (
      <div className="inline-cell-wrap">
        <input
          type="text"
          inputMode="numeric"
          className="inline-cell-input text-right font-semibold text-sky-600 dark:text-sky-400"
          value={displayStr}
          placeholder="0"
          onChange={(e) => {
            const rawDigits = e.target.value.replace(/\D/g, "");
            onChange(rawDigits === "" ? "" : rawDigits);
          }}
        />
        <span className="inline-cell-unit">VNĐ</span>
      </div>
    );
  }

  // 2. Percentage (Tỷ lệ phần trăm / Hệ số)
  if (normalizedType === "percentage") {
    return (
      <div className="inline-cell-wrap">
        <input
          type="number"
          step="any"
          className="inline-cell-input text-right font-semibold text-emerald-600 dark:text-emerald-400"
          value={value !== undefined && value !== null ? String(value) : ""}
          placeholder="0"
          onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value)}
        />
        <span className="inline-cell-unit">%</span>
      </div>
    );
  }

  // 3. Integer (Số nguyên)
  if (normalizedType === "integer") {
    return (
      <div className="inline-cell-wrap">
        <input
          type="number"
          step="1"
          className="inline-cell-input text-right font-semibold text-indigo-600 dark:text-indigo-400"
          value={value !== undefined && value !== null ? String(value) : ""}
          placeholder="0"
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              onChange("");
            } else {
              const intVal = parseInt(val, 10);
              onChange(isNaN(intVal) ? "" : intVal);
            }
          }}
        />
      </div>
    );
  }

  // 4. Decimal (Số thập phân)
  if (normalizedType === "decimal") {
    return (
      <div className="inline-cell-wrap">
        <input
          type="number"
          step="any"
          className="inline-cell-input text-right font-semibold text-amber-600 dark:text-amber-400"
          value={value !== undefined && value !== null ? String(value) : ""}
          placeholder="0.0"
          onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="inline-cell-wrap">
      <input
        type="text"
        className="inline-cell-input font-medium"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function formatNumberWithDots(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "number" ? val : Number(String(val).replace(/\D/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("vi-VN");
}

function PolicyCellRenderer({
  field,
  value,
  onChange,
  colorClass = "text-sky-600 dark:text-sky-400",
}: {
  field?: PolicyDefinition["fields"][number];
  value: any;
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

    return (
      <button
        type="button"
        onClick={() => onChange(checked ? "Không" : "Có")}
        className={cn(
          "interactive-status-pill",
          checked ? "status-applied" : "status-unapplied"
        )}
        title={checked ? "Click để chuyển sang Không áp dụng" : "Click để chuyển sang Có áp dụng"}
      >
        <span className={cn("status-pill-dot", checked ? "dot-applied" : "dot-unapplied")} />
        <span className="truncate">{checked ? "Có áp dụng" : "Không áp dụng"}</span>
      </button>
    );
  }

  if (field) {
    return <InlineCellEditor field={field} value={value} onChange={onChange} colorClass={colorClass} />;
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
  colorClass,
}: {
  field: PolicyDefinition["fields"][number];
  value: string | number | boolean | undefined;
  onChange: (newValue: string | number | boolean) => void;
  colorClass?: string;
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

  const isMoneyField =
    field.type === "money" ||
    Boolean(field.unit && (field.unit.includes("VNĐ") || field.unit.includes("VND") || field.unit.includes("đ")));

  // 1. Với các input tiền tệ (VNĐ/tháng, VNĐ, ...): BỎ NÚT TĂNG GIẢM + TỰ ĐỘNG FORMAT PHÂN CÁCH HÀNG NGHÌN
  if (isMoneyField) {
    const rawNumber = typeof value === "number" ? value : Number(String(value ?? "").replace(/\D/g, ""));
    const displayStr = isNaN(rawNumber) || value === "" || value === undefined ? "" : formatNumberWithDots(rawNumber);

    return (
      <div className="inline-cell-wrap">
        <input
          type="text"
          inputMode="numeric"
          className={cn("inline-cell-input text-right font-medium", colorClass)}
          value={displayStr}
          placeholder="0"
          onChange={(e) => {
            const rawDigits = e.target.value.replace(/\D/g, "");
            if (rawDigits === "") {
              onChange("");
            } else {
              onChange(Number(rawDigits));
            }
          }}
        />
        <span className="inline-cell-unit">{field.unit || "VNĐ/tháng"}</span>
      </div>
    );
  }

  // 2. Các input còn lại (Hệ số tăng ca 1.5x, Tỷ lệ %, Số ngày, Số giờ,...): GIỮ NGUYÊN NÚT TĂNG GIẢM
  if (field.type === "number" || field.type === "percentage") {
    return (
      <div className="inline-cell-wrap">
        <input
          type="number"
          step={field.type === "percentage" || field.unit === "x" ? "0.1" : "1"}
          min={field.min}
          max={field.max}
          className={cn("inline-cell-input", colorClass)}
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
        className={cn("inline-cell-input", colorClass)}
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
