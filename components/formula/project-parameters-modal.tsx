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
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import type { ProjectCustomVariable } from "@/lib/types";

interface ProjectParametersModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onVariablesChange?: (variables: ProjectCustomVariable[]) => void;
}

export function ProjectParametersModal({
  projectId,
  isOpen,
  onClose,
  onVariablesChange,
}: ProjectParametersModalProps) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  // Query custom variables
  const { data: serverVariables = [], isLoading } = useQuery({
    queryKey: ["project-custom-variables", projectId],
    queryFn: () => api.getProjectCustomVariables(projectId),
    enabled: isOpen,
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
      onClose();
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

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Tham số & Biến đầu vào của dự án"
      description="Cấu hình các giá trị tham số đặc thù do Backend cung cấp để áp dụng vào các công thức tính lương của dự án."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted hover:text-foreground gap-1.5"
            onClick={handleResetToDefault}
            title="Điền giá trị gợi ý mặc định cho các biến"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Điền giá trị mẫu
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saveMutation.isPending ? "Đang lưu..." : isDirty ? "Lưu thay đổi (*)" : "Đã lưu"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* Status Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/70 text-xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">
              Tổng số tham số: {stats.total}
            </span>
          </div>

          <div>
            {stats.missing === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Check className="w-3 h-3" /> Đầy đủ ({stats.filled}/{stats.total})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                <AlertCircle className="w-3 h-3" /> Cần nhập {stats.missing} tham số
              </span>
            )}
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar p-0.5">
          {serverVariables.map((v) => {
            const draftVal = draftValues[v.code] ?? "";
            const hasValue = draftVal.trim() !== "" && !isNaN(Number(draftVal));
            const isChanged =
              (draftVal.trim() === "" ? null : Number(draftVal)) !== v.value;

            return (
              <div
                key={v.code}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${
                  isChanged
                    ? "bg-primary/5 border-primary/40 shadow-xs"
                    : hasValue
                    ? "bg-card border-border/80 shadow-2xs hover:border-border"
                    : "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                }`}
              >
                {/* Top: Name & Status */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <strong className="text-xs font-bold text-foreground leading-snug">
                      {v.name}
                    </strong>
                    {hasValue ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" title="Đã có giá trị" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1 animate-pulse" title="Chưa nhập giá trị" />
                    )}
                  </div>

                  {v.description && (
                    <p className="text-[11px] text-muted leading-relaxed line-clamp-2" title={v.description}>
                      {v.description}
                    </p>
                  )}
                </div>

                {/* Bottom: Value Input with Unit & Suggestion */}
                <div className="space-y-1 pt-1">
                  <div className="inline-cell-wrap !min-h-[36px]">
                    <input
                      type="number"
                      step="any"
                      className="inline-cell-input no-spinner"
                      placeholder="0"
                      value={draftVal}
                      onChange={(e) => handleChangeValue(v.code, e.target.value)}
                    />
                    {v.unit && <span className="inline-cell-unit">{v.unit}</span>}
                  </div>

                  {v.defaultValue !== undefined && v.defaultValue !== null && draftVal === "" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleChangeValue(v.code, String(v.defaultValue))}
                        className="text-primary hover:underline font-sans cursor-pointer text-[10.5px]"
                        title={`Gợi ý: ${v.defaultValue}`}
                      >
                        Gợi ý: {v.defaultValue.toLocaleString("vi-VN")} {v.unit}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
