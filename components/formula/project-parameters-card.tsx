"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  HelpCircle,
  Info,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button } from "@/components/ui";
import { api } from "@/lib/api";
import type { ProjectCustomVariable } from "@/lib/types";

interface ProjectParametersCardProps {
  projectId: string;
  onVariablesChange?: (variables: ProjectCustomVariable[]) => void;
}

export function ProjectParametersCard({
  projectId,
  onVariablesChange,
}: ProjectParametersCardProps) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  // Query custom variables
  const { data: serverVariables = [], isLoading } = useQuery({
    queryKey: ["project-custom-variables", projectId],
    queryFn: () => api.getProjectCustomVariables(projectId),
  });

  // Local draft values map: code -> string input
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync server data to draft values on load
  useEffect(() => {
    if (serverVariables.length > 0) {
      const initialMap: Record<string, string> = {};
      serverVariables.forEach((v) => {
        initialMap[v.code] = v.value !== null && v.value !== undefined ? String(v.value) : "";
      });
      setDraftValues(initialMap);
      setIsInitialized(true);
      if (onVariablesChange) {
        onVariablesChange(serverVariables);
      }
    }
  }, [serverVariables, onVariablesChange]);

  // Check dirty state
  const isDirty = useMemo(() => {
    if (!isInitialized) return false;
    return serverVariables.some((v) => {
      const draftStr = draftValues[v.code] ?? "";
      const draftNum = draftStr.trim() === "" ? null : Number(draftStr);
      return draftNum !== v.value;
    });
  }, [serverVariables, draftValues, isInitialized]);

  // Counts
  const stats = useMemo(() => {
    const total = serverVariables.length;
    let filled = 0;
    let missing = 0;

    serverVariables.forEach((v) => {
      const draftStr = (draftValues[v.code] ?? "").trim();
      if (draftStr !== "" && !isNaN(Number(draftStr))) {
        filled++;
      } else {
        missing++;
      }
    });

    return { total, filled, missing };
  }, [serverVariables, draftValues]);

  // Mutation to save
  const saveMutation = useMutation({
    mutationFn: (payload: Array<{ code: string; value: number | null }>) =>
      api.saveProjectCustomVariables(projectId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["project-custom-variables", projectId] });
      queryClient.invalidateQueries({ queryKey: ["formula-variables"] });
      queryClient.invalidateQueries({ queryKey: ["project-policies", projectId] });
      notify("Đã lưu các giá trị tham số đầu vào của dự án thành công!");
      if (onVariablesChange) {
        onVariablesChange(updated);
      }
    },
    onError: (err: Error) => {
      notify(err.message || "Không thể lưu tham số dự án", "error");
    },
  });

  const handleSave = () => {
    const payload = serverVariables.map((v) => {
      const valStr = (draftValues[v.code] ?? "").trim();
      return {
        code: v.code,
        value: valStr === "" ? null : Number(valStr),
      };
    });
    saveMutation.mutate(payload);
  };

  const handleResetToDefault = () => {
    const resetMap: Record<string, string> = {};
    serverVariables.forEach((v) => {
      if (v.defaultValue !== undefined && v.defaultValue !== null) {
        resetMap[v.code] = String(v.defaultValue);
      } else {
        resetMap[v.code] = "";
      }
    });
    setDraftValues(resetMap);
  };

  const handleChangeValue = (code: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [code]: value,
    }));
  };

  if (isLoading && !isInitialized) {
    return (
      <div className="content-card p-4 border border-border/80 rounded-2xl bg-card animate-pulse">
        <div className="h-5 w-48 bg-secondary rounded mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="h-20 bg-secondary/50 rounded-xl" />
          <div className="h-20 bg-secondary/50 rounded-xl" />
          <div className="h-20 bg-secondary/50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (serverVariables.length === 0) {
    return null;
  }

  return (
    <div className="content-card p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-3.5 transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-sm font-bold text-foreground">
                Tham số &amp; Biến đầu vào của dự án
              </strong>
              {stats.missing === 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="w-3 h-3" /> Đầy đủ ({stats.filled}/{stats.total})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  <AlertCircle className="w-3 h-3" /> Cần nhập {stats.missing} tham số
                </span>
              )}
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Các biến đặc thù do Backend cung cấp cho dự án. Nhập giá trị để áp dụng vào các công thức lương.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted hover:text-foreground gap-1.5"
            onClick={handleResetToDefault}
            title="Điền giá trị gợi ý mặc định cho các biến"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Điền giá trị mẫu
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-8 text-xs font-semibold shadow-2xs gap-1.5"
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "Đang lưu..." : isDirty ? "Lưu tham số (*)" : "Đã lưu"}
          </Button>
        </div>
      </div>

      {/* Parameter Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {serverVariables.map((v) => {
          const draftVal = draftValues[v.code] ?? "";
          const hasValue = draftVal.trim() !== "" && !isNaN(Number(draftVal));
          const isChanged =
            (draftVal.trim() === "" ? null : Number(draftVal)) !== v.value;

          return (
            <div
              key={v.code}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2 relative group ${
                isChanged
                  ? "bg-primary/5 border-primary/40 shadow-xs"
                  : hasValue
                  ? "bg-secondary/25 border-border/70 hover:border-border"
                  : "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
              }`}
            >
              {/* Top: Name & Status */}
              <div className="space-y-0.5">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-foreground leading-tight line-clamp-1" title={v.name}>
                    {v.name}
                  </span>
                  {hasValue ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" title="Đã có giá trị" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1 animate-pulse" title="Chưa nhập giá trị" />
                  )}
                </div>

                {v.defaultValue !== undefined && v.defaultValue !== null && draftVal === "" && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleChangeValue(v.code, String(v.defaultValue))}
                      className="text-primary hover:underline font-sans cursor-pointer text-[10.5px]"
                      title={`Gợi ý: ${v.defaultValue}`}
                    >
                      Mẫu gợi ý: {v.defaultValue.toLocaleString("vi-VN")} {v.unit}
                    </button>
                  </div>
                )}
              </div>

              {/* Description preview if present */}
              {v.description && (
                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed" title={v.description}>
                  {v.description}
                </p>
              )}

              {/* Bottom: Value Input with Unit */}
              <div className="relative flex items-center pt-1">
                <input
                  type="number"
                  step="any"
                  className={`w-full h-8 pl-2.5 pr-14 text-xs font-semibold rounded-lg border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                    !hasValue
                      ? "border-amber-500/50 focus:border-amber-500"
                      : isChanged
                      ? "border-primary focus:border-primary"
                      : "border-border focus:border-primary"
                  }`}
                  placeholder="Chưa nhập..."
                  value={draftVal}
                  onChange={(e) => handleChangeValue(v.code, e.target.value)}
                />
                <span className="absolute right-2.5 text-[11px] font-medium text-muted pointer-events-none select-none">
                  {v.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
