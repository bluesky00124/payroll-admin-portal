"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  Check,
  FileCheck,
  Pencil,
  Percent,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, Modal, StatusBadge, TablePaginationFooter } from "@/components/ui";
import { api } from "@/lib/api";
import type { Employee, TaxConfigRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function TaxSubtab({
  projectId,
  employees,
  onNavigateToDependents,
}: {
  projectId: string;
  employees: Employee[];
  onNavigateToDependents?: () => void;
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>("all");

  const [editRecord, setEditRecord] = useState<TaxConfigRecord | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formTaxCode, setFormTaxCode] = useState("");
  const [formTaxType, setFormTaxType] = useState<"progressive" | "flat_10" | "non_resident_20" | "commitment_08">("progressive");
  const [formCommitment08, setFormCommitment08] = useState(false);

  const taxQuery = useQuery({
    queryKey: ["tax-configs", projectId],
    queryFn: () => api.getTaxConfigs({ projectId: projectId === "all" ? undefined : projectId }),
  });

  const taxConfigs = taxQuery.data ?? [];

  const filteredList = useMemo(() => {
    return taxConfigs.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.employeeName.toLowerCase().includes(term) ||
        item.employeeCode.toLowerCase().includes(term) ||
        item.taxCode.includes(term);

      let matchType = true;
      if (taxTypeFilter === "progressive") matchType = item.taxType === "progressive";
      else if (taxTypeFilter === "flat_10") matchType = item.taxType === "flat_10";
      else if (taxTypeFilter === "commitment") matchType = item.hasCommitment08;
      else if (taxTypeFilter === "non_resident") matchType = item.taxType === "non_resident_20";

      return matchSearch && matchType;
    });
  }, [taxConfigs, searchTerm, taxTypeFilter]);

  const progressiveCount = useMemo(() => taxConfigs.filter((t) => t.taxType === "progressive").length, [taxConfigs]);
  const flat10Count = useMemo(() => taxConfigs.filter((t) => t.taxType === "flat_10").length, [taxConfigs]);
  const commitmentCount = useMemo(() => taxConfigs.filter((t) => t.hasCommitment08).length, [taxConfigs]);
  const totalApprovedNpt = useMemo(() => taxConfigs.reduce((sum, t) => sum + t.approvedDependentsCount, 0), [taxConfigs]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  // Save mutation
  const saveTaxMutation = useMutation({
    mutationFn: async () => {
      if (!editRecord) return;
      return api.saveTaxConfig(editRecord.id, {
        taxCode: formTaxCode,
        taxType: formTaxType,
        hasCommitment08: formCommitment08,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-configs"] });
      setEditModalOpen(false);
      setEditRecord(null);
      notify("Đã cập nhật cấu hình Thuế TNCN cho Người lao động!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const openEditModal = (rec: TaxConfigRecord) => {
    setEditRecord(rec);
    setFormTaxCode(rec.taxCode);
    setFormTaxType(rec.taxType);
    setFormCommitment08(rec.hasCommitment08);
    setEditModalOpen(true);
  };

  const taxTypeBadge = (type: string, hasCommitment: boolean) => {
    if (hasCommitment) {
      return <StatusBadge tone="warning">Cam kết 08 (Tạm miễn 10%)</StatusBadge>;
    }
    switch (type) {
      case "progressive":
        return <StatusBadge tone="success">Lũy tiến (&ge; 3 tháng)</StatusBadge>;
      case "flat_10":
        return <StatusBadge tone="warning">Khấu trừ toàn phần 10%</StatusBadge>;
      case "non_resident_20":
        return <StatusBadge tone="danger">Không cư trú 20%</StatusBadge>;
      default:
        return <StatusBadge tone="neutral" dot={false}>{type}</StatusBadge>;
    }
  };

  if (taxQuery.isLoading) return <LoadingBlock rows={6} />;
  if (taxQuery.isError) return <ErrorState message="Không thể tải dữ liệu Thuế TNCN" retry={() => taxQuery.refetch()} />;

  return (
    <div className="tax-subtab">
      {/* Integrated Single Card: Toolbar + Filters + Data Table */}
      <div className="integrated-table-card">
        {/* Table Card Toolbar */}
        <div className="table-card-toolbar">
          <div className="filter-panel-top">
            <div className="filter-panel-inputs">
              <label className="search-field">
                <Search />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên NV, mã NV, MST..."
                />
              </label>
            </div>

            <div className="filter-panel-actions">
              <Badge tone="info">Tự động liên kết {totalApprovedNpt} NPT đã duyệt</Badge>
            </div>
          </div>

          <div className="filter-panel-bottom">
            <div className="filter-status-pills">
              <button
                type="button"
                className={`pill-btn ${taxTypeFilter === "all" ? "active" : ""}`}
                onClick={() => setTaxTypeFilter("all")}
              >
                Tất cả ({taxConfigs.length})
              </button>
              <button
                type="button"
                className={`pill-btn success ${taxTypeFilter === "progressive" ? "active" : ""}`}
                onClick={() => setTaxTypeFilter("progressive")}
              >
                Lũy tiến ({progressiveCount})
              </button>
              <button
                type="button"
                className={`pill-btn warning ${taxTypeFilter === "flat_10" ? "active" : ""}`}
                onClick={() => setTaxTypeFilter("flat_10")}
              >
                Khấu trừ 10% ({flat10Count})
              </button>
              <button
                type="button"
                className={`pill-btn warning ${taxTypeFilter === "commitment" ? "active" : ""}`}
                onClick={() => setTaxTypeFilter("commitment")}
              >
                Cam kết 08 ({commitmentCount})
              </button>
            </div>

            <div className="filter-panel-meta">
              {(searchTerm || taxTypeFilter !== "all") && (
                <button
                  type="button"
                  className="btn-clear-filters"
                  onClick={() => {
                    setSearchTerm("");
                    setTaxTypeFilter("all");
                  }}
                >
                  <X /> Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredList.length === 0 ? (
          <EmptyState
            title="Không tìm thấy cấu hình thuế"
            description="Không có bản ghi phù hợp với từ khóa tìm kiếm."
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th>Người lao động</th>
                  <th>Mã số thuế (MST)</th>
                  <th>Phương pháp tính thuế</th>
                  <th className="text-center" style={{ width: "140px" }}>Số NPT liên kết</th>
                  <th className="text-right">Giảm trừ bản thân</th>
                  <th className="text-right">Giảm trừ NPT</th>
                  <th className="text-right">Tổng mức giảm trừ</th>
                  <th style={{ width: "100px" }} className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((item, idx) => {
                  const totalDeduction = item.personalDeduction + item.dependentDeduction;
                  const stt = (page - 1) * pageSize + idx + 1;

                  return (
                    <tr key={item.id}>
                      <td className="text-center text-muted font-medium">{stt}</td>
                      <td>
                        <div className="employee-cell-info">
                          <span className="employee-cell-name">{item.employeeName}</span>
                          <span className="employee-cell-sub">
                            <span className="employee-code-badge">{item.employeeCode}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <code className="code-badge">{item.taxCode || "Chưa có MST"}</code>
                      </td>
                      <td>{taxTypeBadge(item.taxType, item.hasCommitment08)}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn-link-npt"
                          title="Xem danh sách người phụ thuộc đã duyệt"
                          onClick={onNavigateToDependents}
                        >
                          <Badge tone={item.approvedDependentsCount > 0 ? "info" : "neutral"}>
                            {item.approvedDependentsCount} NPT
                          </Badge>
                        </button>
                      </td>
                      <td className="text-right font-mono text-muted">
                        {formatCurrency(item.personalDeduction)}
                      </td>
                      <td className="text-right font-mono text-primary">
                        {item.dependentDeduction > 0 ? formatCurrency(item.dependentDeduction) : "—"}
                      </td>
                      <td className="text-right font-mono">
                        <strong className="text-success">{formatCurrency(totalDeduction)}</strong>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          title="Chỉnh sửa diện tính thuế & MST"
                        >
                          <Pencil /> Sửa
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer */}
            <TablePaginationFooter
              totalItems={filteredList.length}
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

      {/* Edit Tax Modal */}
      <Modal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title={`Cấu hình Thuế TNCN: ${editRecord?.employeeName}`}
        description={`Mã NV: ${editRecord?.employeeCode} · Số NPT hợp lệ đã duyệt: ${editRecord?.approvedDependentsCount}`}
        size="md"
        footer={
          <>
            <Button onClick={() => setEditModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              loading={saveTaxMutation.isPending}
              onClick={() => saveTaxMutation.mutate()}
            >
              <Check /> Lưu cấu hình thuế
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <label className="form-field full-width">
            <span>Mã số thuế cá nhân (MST) *</span>
            <input
              type="text"
              value={formTaxCode}
              onChange={(e) => setFormTaxCode(e.target.value)}
              placeholder="VD: 8012345678"
              required
            />
          </label>

          <label className="form-field full-width">
            <span>Phương pháp tính thuế áp dụng *</span>
            <select
              value={formTaxType}
              onChange={(e) => setFormTaxType(e.target.value as any)}
            >
              <option value="progressive">Biểu lũy tiến từng phần (HĐLĐ từ 3 tháng trở lên)</option>
              <option value="flat_10">Khấu trừ toàn phần 10% (Vãng lai / Thử việc / Dưới 3 tháng)</option>
              <option value="non_resident_20">Cá nhân không cư trú (20%)</option>
            </select>
          </label>

          <label className="checkbox-field full-width mt-2">
            <input
              type="checkbox"
              checked={formCommitment08}
              onChange={(e) => setFormCommitment08(e.target.checked)}
            />
            <div>
              <strong>Có cam kết mẫu 08/CK-TNCN (Tạm không khấu trừ 10%)</strong>
              <p>Áp dụng khi NLĐ chỉ có thu nhập duy nhất tại đơn vị và ước tính tổng thu nhập chịu thuế sau khi trừ gia cảnh chưa đến mức phải nộp thuế.</p>
            </div>
          </label>

          <div className="auto-synced-npt-card full-width mt-2">
            <div className="npt-sync-header">
              <FileCheck />
              <span>Số lượng Người Phụ Thuộc hợp lệ: <strong>{editRecord?.approvedDependentsCount} người</strong></span>
            </div>
            <p className="text-xs text-muted">
              ✓ Dữ liệu được đồng bộ tự động từ Phân hệ Người phụ thuộc sau khi Kế toán kiểm tra và Xác nhận hợp lệ.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
