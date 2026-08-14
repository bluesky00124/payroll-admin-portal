"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Database, Eye, Link2, Plus, RefreshCw, TableProperties } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, ErrorState, LoadingBlock, SaveBar } from "@/components/ui";
import { api } from "@/lib/api";
import type { DataMapping } from "@/lib/types";

const sourceLabels: Record<DataMapping["sourceType"], string> = {
  employee: "Nhân viên",
  attendance: "Chấm công",
  overtime: "Tăng ca",
  bonus: "Thưởng",
  advance: "Tạm ứng",
  deduction: "Khấu trừ",
};

const systemFields = [
  ["employee_code", "Mã nhân viên"],
  ["full_name", "Họ và tên"],
  ["base_salary", "Lương cơ bản"],
  ["regular_hours", "Giờ công thường"],
  ["overtime_hours", "Giờ tăng ca"],
  ["bonus_amount", "Số tiền thưởng"],
  ["advance_amount", "Số tiền tạm ứng"],
  ["deduction_amount", "Số tiền khấu trừ"],
] as const;

function statusTone(status: DataMapping["status"]) {
  if (status === "valid") return "success" as const;
  if (status === "warning") return "warning" as const;
  return "danger" as const;
}

function statusLabel(status: DataMapping["status"]) {
  if (status === "valid") return "Hợp lệ";
  if (status === "warning") return "Có cảnh báo";
  return "Không hợp lệ";
}

export function SourcesTab({ projectId }: { projectId: string }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const mappingsQuery = useQuery({ queryKey: ["data-mappings", projectId], queryFn: () => api.getDataMappings(projectId) });
  const [mappings, setMappings] = useState<DataMapping[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; issues: string[]; checkedAt: string } | null>(null);

  useEffect(() => {
    if (!mappingsQuery.data) return;
    setMappings(structuredClone(mappingsQuery.data));
    setSelectedId((current) => current ?? mappingsQuery.data[0]?.id ?? null);
  }, [mappingsQuery.data]);

  const selected = mappings.find((item) => item.id === selectedId) ?? mappings[0];
  const mappedFields = useMemo(() => selected?.fields.filter((field) => field.systemField).length ?? 0, [selected]);

  const updateSelected = (updater: (mapping: DataMapping) => DataMapping) => {
    if (!selected) return;
    setMappings((items) => items.map((item) => item.id === selected.id ? updater(item) : item));
    setDirty(true);
    setValidation(null);
  };

  const cancel = () => {
    setMappings(structuredClone(mappingsQuery.data ?? []));
    setDirty(false);
    setValidation(null);
  };

  const saveMutation = useMutation({
    mutationFn: () => api.saveDataMappings(projectId, mappings),
    onSuccess: (saved) => {
      queryClient.setQueryData(["data-mappings", projectId], saved);
      setMappings(structuredClone(saved));
      setDirty(false);
      notify("Đã lưu cấu hình nguồn dữ liệu");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (dirty) await api.saveDataMappings(projectId, mappings);
      return api.validateDataMappings(projectId);
    },
    onSuccess: (result) => {
      setValidation(result);
      if (dirty) {
        queryClient.setQueryData(["data-mappings", projectId], mappings);
        setDirty(false);
      }
      notify(result.valid ? "Tất cả nguồn dữ liệu hợp lệ" : `Phát hiện ${result.issues.length} vấn đề`, result.valid ? "success" : "warning");
    },
    onError: (error: Error) => notify(error.message, "error"),
  });

  if (mappingsQuery.isLoading) return <LoadingBlock rows={8} />;
  if (mappingsQuery.isError) return <ErrorState message="Không thể tải cấu hình nguồn dữ liệu." retry={() => mappingsQuery.refetch()} />;

  return (
    <>
      <div className="tab-heading">
        <div><span className="section-kicker">DATA CONTRACT</span><h2>Nguồn dữ liệu</h2><p>Ghép các cột đầu vào vào mô hình dữ liệu chuẩn trước khi chạy bảng lương.</p></div>
        <div className="heading-actions"><Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}><RefreshCw className={validateMutation.isPending ? "spin" : ""} />Kiểm tra mapping</Button><Button variant="primary" disabled><Plus />Thêm nguồn</Button></div>
      </div>

      <div className="source-summary-grid">
        <article><Database /><span><small>Nguồn đã kết nối</small><strong>{mappings.length}/6</strong></span></article>
        <article><Link2 /><span><small>Trường đã mapping</small><strong>{mappings.reduce((sum, item) => sum + item.fields.length, 0)}</strong></span></article>
        <article><AlertTriangle /><span><small>Cần xử lý</small><strong>{mappings.filter((item) => item.status !== "valid").length}</strong></span></article>
      </div>

      <div className="mapping-workspace">
        <aside className="source-list">
          <div className="sequence-heading"><span>NGUỒN ĐẦU VÀO</span><Badge tone="info">{mappings.length} nguồn</Badge></div>
          {mappings.map((mapping) => (
            <button type="button" key={mapping.id} className={selected?.id === mapping.id ? "selected" : ""} onClick={() => setSelectedId(mapping.id)}>
              <span className="source-icon"><TableProperties /></span>
              <span><strong>{mapping.sourceName}</strong><small>{sourceLabels[mapping.sourceType]} · {mapping.fields.length} cột</small></span>
              <Badge tone={statusTone(mapping.status)}>{statusLabel(mapping.status)}</Badge>
            </button>
          ))}
          <div className="source-catalog-note"><Plus /><span><strong>3 nguồn chưa kết nối</strong><small>Tăng ca, thưởng và tạm ứng có thể bổ sung khi backend sẵn sàng.</small></span></div>
        </aside>

        {selected && <section className="mapping-editor">
          <div className="mapping-editor-heading">
            <div><span>CẤU HÌNH ĐANG CHỌN</span><h3>{selected.sourceName}</h3><p>{sourceLabels[selected.sourceType]} · Cập nhật từ mock API</p></div>
            <Badge tone={statusTone(selected.status)}>{statusLabel(selected.status)}</Badge>
          </div>

          <div className="join-key-panel">
            <div><Link2 /><span><strong>Khóa liên kết</strong><small>Dùng để hợp nhất các nguồn thành một bản ghi lương.</small></span></div>
            <select value={selected.joinKey} onChange={(event) => updateSelected((mapping) => ({ ...mapping, joinKey: event.target.value }))}>
              {selected.fields.map((field) => <option key={field.systemField} value={field.systemField}>{field.systemField}</option>)}
            </select>
          </div>

          <div className="mapping-table-card">
            <div className="card-heading"><div><h3>Ánh xạ trường dữ liệu</h3><p>{mappedFields}/{selected.fields.length} trường được nhận diện</p></div><Badge tone={mappedFields === selected.fields.length ? "success" : "warning"}>{mappedFields === selected.fields.length ? "Đủ cột" : "Thiếu cột"}</Badge></div>
            <div className="table-scroll"><table className="mapping-table"><thead><tr><th>Cột nguồn</th><th>Trường hệ thống</th><th>Kiểu dữ liệu</th><th>Bắt buộc</th></tr></thead><tbody>{selected.fields.map((field, index) => (
              <tr key={`${field.sourceField}-${index}`}>
                <td><input value={field.sourceField} onChange={(event) => updateSelected((mapping) => ({ ...mapping, fields: mapping.fields.map((item, fieldIndex) => fieldIndex === index ? { ...item, sourceField: event.target.value } : item) }))} /></td>
                <td><select value={field.systemField} onChange={(event) => updateSelected((mapping) => ({ ...mapping, fields: mapping.fields.map((item, fieldIndex) => fieldIndex === index ? { ...item, systemField: event.target.value } : item) }))}>{systemFields.map(([value, label]) => <option key={value} value={value}>{label} ({value})</option>)}</select></td>
                <td><select value={field.dataType} onChange={(event) => updateSelected((mapping) => ({ ...mapping, fields: mapping.fields.map((item, fieldIndex) => fieldIndex === index ? { ...item, dataType: event.target.value as DataMapping["fields"][number]["dataType"] } : item) }))}><option value="text">Văn bản</option><option value="number">Số</option><option value="date">Ngày</option></select></td>
                <td><label className="checkbox-label"><span className="sr-only">Bắt buộc: {field.sourceField}</span><input type="checkbox" checked={field.required} onChange={(event) => updateSelected((mapping) => ({ ...mapping, fields: mapping.fields.map((item, fieldIndex) => fieldIndex === index ? { ...item, required: event.target.checked } : item) }))} /><span aria-hidden="true" /></label></td>
              </tr>
            ))}</tbody></table></div>
          </div>

          <div className="preview-card">
            <div className="card-heading"><div><h3>Preview dữ liệu ẩn danh</h3><p>Chỉ hiển thị tối đa 2 bản ghi mẫu.</p></div><Button size="sm" variant="ghost"><Eye />Xem toàn màn hình</Button></div>
            <div className="table-scroll"><table className="preview-table"><thead><tr>{Object.keys(selected.sampleRows[0] ?? {}).map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{selected.sampleRows.map((row, index) => <tr key={index}>{Object.values(row).map((value, cellIndex) => <td key={cellIndex}>{value}</td>)}</tr>)}</tbody></table></div>
          </div>

          {validation && <div className={`validation-result ${validation.valid ? "valid" : "invalid"}`}>{validation.valid ? <><CheckCircle2 /><span><strong>Dữ liệu sẵn sàng</strong><small>Tất cả nguồn đã vượt qua kiểm tra cấu trúc.</small></span></> : <><AlertTriangle /><span><strong>Cần xử lý {validation.issues.length} cảnh báo</strong>{validation.issues.map((issue) => <small key={issue}>{issue}</small>)}</span></>}</div>}
        </section>}
      </div>
      <SaveBar visible={dirty} saving={saveMutation.isPending} onSave={() => saveMutation.mutate()} onCancel={cancel} />
    </>
  );
}
