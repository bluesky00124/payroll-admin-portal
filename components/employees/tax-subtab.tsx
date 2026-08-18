"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  Check,
  CreditCard,
  FileCheck,
  FileText,
  Globe,
  Hash,
  Info,
  Pencil,
  Percent,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, Modal, StatusBadge, TablePaginationFooter, TableRowActions } from "@/components/ui";
import { api } from "@/lib/api";
import type { Employee, TaxConfigRecord } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

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
        taxType: formTaxType as any,
        hasCommitment08: formTaxType === "flat_10" ? formCommitment08 : false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxConfigs"] });
      notify("Đã cập nhật cấu hình thuế TNCN thành công", "success");
      setEditModalOpen(false);
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const openEditModal = (item: TaxConfigRecord) => {
    setEditRecord(item);
    setFormTaxCode(item.taxCode || "");
    setFormTaxType(item.taxType);
    setFormCommitment08(item.hasCommitment08 || false);
    setEditModalOpen(true);
  };

  const taxTypeBadge = (type: string, has08: boolean) => {
    switch (type) {
      case "progressive":
        return <StatusBadge tone="success">Lũy tiến</StatusBadge>;
      case "flat_10":
        return has08 ? (
          <StatusBadge tone="warning">Khấu trừ 10% (Có 08/CK)</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Khấu trừ 10%</StatusBadge>
        );
      case "non_resident_20":
        return <StatusBadge tone="danger">Không cư trú (20%)</StatusBadge>;
      default:
        return <StatusBadge tone="neutral">{type}</StatusBadge>;
    }
  };

  if (taxQuery.isLoading) return <LoadingBlock rows={6} />;
  if (taxQuery.isError) return <ErrorState message="Không thể tải dữ liệu Thuế TNCN" retry={() => taxQuery.refetch()} />;

  return (
    <div className="subtab-content">
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
            <div className="data-table-scroll">
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
                      <td className="font-mono text-sm">{item.taxCode || "—"}</td>
                      <td>{taxTypeBadge(item.taxType, item.hasCommitment08)}</td>
                      <td className="text-center font-semibold">
                        {item.approvedDependentsCount > 0 ? (
                          <button
                            type="button"
                            className="btn-link-npt text-primary hover:underline font-semibold"
                            title="Xem danh sách người phụ thuộc đã duyệt"
                            onClick={onNavigateToDependents}
                          >
                            {item.approvedDependentsCount} NPT
                          </button>
                        ) : (
                          <span className="text-muted font-normal">0</span>
                        )}
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
                        <TableRowActions
                          items={[
                            {
                              key: "edit-tax",
                              label: "Cấu hình thuế & MST",
                              icon: <Pencil />,
                              onClick: () => openEditModal(item),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Attached Table Footer */}
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

      {/* Redesigned Edit Tax Modal */}
      <Modal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Cấu hình diện tính thuế TNCN"
        description="Thiết lập mã số thuế cá nhân và phương pháp khấu trừ thuế thu nhập cá nhân"
        size="lg"
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
        <div className="tax-config-modal-body">
          {/* Employee Summary Card */}
          {editRecord && (() => {
            const emp = employees.find((e) => e.id === editRecord.employeeId);
            return (
              <div className="tax-modal-employee-card">
                <div className="tax-employee-info">
                  <span className="tax-employee-name">{editRecord.employeeName}</span>
                  <div className="tax-employee-meta">
                    <span className="employee-code-badge">{editRecord.employeeCode}</span>
                    {emp?.department && (
                      <>
                        <span>·</span>
                        <span>{emp.department}</span>
                      </>
                    )}
                  </div>
                </div>
                <StatusBadge
                  tone={
                    editRecord.taxType === "progressive"
                      ? "success"
                      : editRecord.hasCommitment08
                      ? "warning"
                      : "neutral"
                  }
                >
                  {editRecord.taxType === "progressive"
                    ? "Biểu lũy tiến"
                    : editRecord.taxType === "flat_10"
                    ? (editRecord.hasCommitment08 ? "Cam kết 08 (0%)" : "Khấu trừ 10%")
                    : "Không cư trú (20%)"}
                </StatusBadge>
              </div>
            );
          })()}

          {/* Section 1: MST Input */}
          <div className="form-field">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                Mã số thuế cá nhân (MST) *
              </span>
              <span className="text-muted text-[11px] font-normal">Cấp bởi Cơ quan Thuế</span>
            </label>
            <input
              type="text"
              value={formTaxCode}
              onChange={(e) => setFormTaxCode(e.target.value)}
              placeholder="VD: 8012345678 (10 hoặc 13 chữ số)"
              required
            />
          </div>

          {/* Section 2: Interactive Tax Method Selection Cards */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-foreground">
              Phương pháp tính thuế áp dụng *
            </label>

            <div className="tax-method-grid">
              {/* Option 1: Progressive */}
              <div
                className={cn("tax-method-card", formTaxType === "progressive" && "selected")}
                onClick={() => setFormTaxType("progressive")}
              >
                <div className="tax-method-icon">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="tax-method-content">
                  <div className="tax-method-header">
                    <span className="tax-method-title">Biểu lũy tiến từng phần (5% – 35%)</span>
                    <span className="tax-method-badge">HĐLĐ ≥ 3 tháng</span>
                  </div>
                  <p className="tax-method-desc">
                    Áp dụng giảm trừ gia cảnh bản thân (11 triệu/tháng) và người phụ thuộc (4.4 triệu/tháng).
                  </p>
                </div>
              </div>

              {/* Option 2: Flat 10% */}
              <div
                className={cn("tax-method-card", formTaxType === "flat_10" && "selected")}
                onClick={() => setFormTaxType("flat_10")}
              >
                <div className="tax-method-icon">
                  <Percent className="w-4 h-4" />
                </div>
                <div className="tax-method-content">
                  <div className="tax-method-header">
                    <span className="tax-method-title">Khấu trừ toàn phần 10% tại nguồn</span>
                    <span className="tax-method-badge">Vãng lai / Dưới 3 tháng</span>
                  </div>
                  <p className="tax-method-desc">
                    Áp dụng cho thu nhập từ 2.000.000đ/lần trở lên. Có thể làm cam kết 08 nếu đủ điều kiện.
                  </p>
                </div>
              </div>

              {/* Option 3: Non-Resident 20% */}
              <div
                className={cn("tax-method-card", formTaxType === "non_resident_20" && "selected")}
                onClick={() => setFormTaxType("non_resident_20")}
              >
                <div className="tax-method-icon">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="tax-method-content">
                  <div className="tax-method-header">
                    <span className="tax-method-title">Cá nhân không cư trú (20%)</span>
                    <span className="tax-method-badge">Không cư trú</span>
                  </div>
                  <p className="tax-method-desc">
                    Khấu trừ cố định 20% trên tổng thu nhập chịu thuế phát sinh tại Việt Nam.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Commitment 08 Toggle (When 10% Flat is chosen) */}
          {formTaxType === "flat_10" && (
            <div
              className={cn("commitment-08-card", formCommitment08 && "checked")}
              onClick={() => setFormCommitment08(!formCommitment08)}
            >
              <input
                type="checkbox"
                checked={formCommitment08}
                onChange={(e) => setFormCommitment08(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />
              <div className="flex flex-col gap-1">
                <strong className="text-xs font-semibold text-foreground">
                  Có cam kết mẫu 08/CK-TNCN (Tạm không khấu trừ 10%)
                </strong>
                <p className="text-xs text-muted leading-relaxed">
                  Áp dụng khi NLĐ chỉ có duy nhất thu nhập tại đơn vị và ước tính tổng mức thu nhập chịu thuế sau khi trừ gia cảnh chưa đến mức phải nộp thuế.
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Auto Synced Family Deductions (When Progressive is chosen) */}
          {formTaxType === "progressive" && editRecord && (
            <div className="tax-deduction-summary-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-primary" />
                  Mức giảm trừ gia cảnh áp dụng
                </span>
                <span className="text-[11px] text-muted">Đồng bộ tự động từ Phân hệ NPT</span>
              </div>

              <div className="deduction-stat-grid">
                <div className="deduction-stat-item">
                  <span className="deduction-stat-label">Giảm trừ bản thân</span>
                  <span className="deduction-stat-val">11.000.000 đ</span>
                </div>
                <div className="deduction-stat-item">
                  <span className="deduction-stat-label">
                    Giảm trừ NPT ({editRecord.approvedDependentsCount} người)
                  </span>
                  <span className="deduction-stat-val text-primary">
                    {formatCurrency(editRecord.approvedDependentsCount * 4400000)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span className="text-muted font-medium">Tổng giảm trừ hàng tháng:</span>
                <strong className="font-mono text-sm text-success">
                  {formatCurrency(11000000 + editRecord.approvedDependentsCount * 4400000)}
                </strong>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
