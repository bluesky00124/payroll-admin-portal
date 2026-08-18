"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  FileSpreadsheet,
  Plus,
  Search,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ExcelImportModal } from "@/components/employees/excel-import-modal";
import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  MonthPicker,
  StatusBadge,
  TablePaginationFooter,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { Employee, UnionFeeRecord } from "@/lib/types";
import { formatCurrency, formatMonthYear } from "@/lib/utils";

export function UnionFeesSubtab({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("2026-08");
  const [statusFilter, setStatusFilter] = useState<"all" | "participating" | "non_participating">("all");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreviewRows, setUploadPreviewRows] = useState<Array<{
    employeeCode: string;
    employeeName: string;
    feeType: string;
    amount: number;
    isParticipating: boolean;
  }>>([]);

  const unionQuery = useQuery({
    queryKey: ["union-fees", projectId, selectedPeriod],
    queryFn: () =>
      api.getUnionFees({
        projectId: projectId === "all" ? undefined : projectId,
        period: selectedPeriod,
      }),
  });

  const unionFees = unionQuery.data ?? [];

  const filteredFees = useMemo(() => {
    return unionFees.filter((fee) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        fee.employeeName.toLowerCase().includes(term) ||
        fee.employeeCode.toLowerCase().includes(term);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "participating" && fee.isParticipating) ||
        (statusFilter === "non_participating" && !fee.isParticipating);

      return matchSearch && matchStatus;
    });
  }, [unionFees, searchTerm, statusFilter]);

  const activeCount = useMemo(() => unionFees.filter((u) => u.isParticipating).length, [unionFees]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedFees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFees.slice(start, start + pageSize);
  }, [filteredFees, page, pageSize]);

  const handleSimulateFileUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      const targetEmps = employees.filter(
        (e) => projectId === "all" || e.projectId === (projectId === "all" ? "prj-jss" : projectId)
      );
      setUploadPreviewRows(
        targetEmps.map((emp) => ({
          employeeCode: emp.code,
          employeeName: emp.name,
          feeType: "percentage",
          amount: 63000,
          isParticipating: true,
        }))
      );
    }, 600);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const targetProj = projectId === "all" ? (employees[0]?.projectId ?? "prj-jss") : projectId;
      const targetEmps = employees.filter((e) => projectId === "all" || e.projectId === targetProj);
      const items: Partial<UnionFeeRecord>[] = targetEmps.map((emp) => ({
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        feeType: "percentage",
        amount: 63000,
        isParticipating: true,
      }));
      return api.importUnionFees({
        projectId: targetProj,
        period: selectedPeriod,
        items,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["union-fees"] });
      setImportModalOpen(false);
      setUploadPreviewRows([]);
      notify(`Đã import thành công ${data.length} bản ghi Công đoàn phí kỳ ${formatMonthYear(selectedPeriod)}!`);
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const previewTotalAmount = useMemo(() => {
    return uploadPreviewRows.reduce((sum, r) => sum + r.amount, 0);
  }, [uploadPreviewRows]);

  if (unionQuery.isLoading) return <LoadingBlock rows={6} />;
  if (unionQuery.isError) {
    return (
      <ErrorState
        message="Không thể tải dữ liệu Công đoàn phí"
        retry={() => unionQuery.refetch()}
      />
    );
  }

  return (
    <div className="union-fees-subtab">
      {/* Integrated Flat Card Table */}
      <div className="integrated-table-card">
        {/* Card Toolbar */}
        <div className="table-card-toolbar">
          <div className="filter-panel-top">
            <div className="filter-panel-inputs">
              <label className="search-field">
                <Search />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên nhân viên, mã NV..."
                />
              </label>

              <MonthPicker
                label="Kỳ trích nộp:"
                value={selectedPeriod}
                onChange={(val) => {
                  setSelectedPeriod(val);
                  setPage(1);
                }}
                variant="filter"
              />
            </div>

            <div className="filter-panel-actions">
              <Button variant="primary" onClick={() => setImportModalOpen(true)}>
                <Upload /> Import danh sách CĐP
              </Button>
            </div>
          </div>

          <div className="filter-panel-bottom">
            <div className="filter-status-pills">
              <button
                type="button"
                className={`pill-btn ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                Tất cả ({unionFees.length})
              </button>
              <button
                type="button"
                className={`pill-btn success ${statusFilter === "participating" ? "active" : ""}`}
                onClick={() => setStatusFilter("participating")}
              >
                Có trích nộp ({activeCount})
              </button>
              <button
                type="button"
                className={`pill-btn neutral ${statusFilter === "non_participating" ? "active" : ""}`}
                onClick={() => setStatusFilter("non_participating")}
              >
                Không tham gia ({unionFees.length - activeCount})
              </button>
            </div>

            {(searchTerm || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                <X /> Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        {/* Content Table */}
        {filteredFees.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bản ghi Công đoàn phí"
            description="Chưa có dữ liệu trích nộp công đoàn phí cho các tiêu chí đã chọn."
            action={
              <Button variant="primary" onClick={() => setImportModalOpen(true)}>
                <Upload /> Import danh sách ngay
              </Button>
            }
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th>Người lao động</th>
                  <th>Kỳ trích nộp</th>
                  <th>Hình thức trích</th>
                  <th className="text-right">Mức trích nộp</th>
                  <th className="text-center">Tham gia CĐ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFees.map((item, idx) => {
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
                        <Badge tone="neutral">{formatMonthYear(item.period)}</Badge>
                      </td>
                      <td>
                        {item.feeType === "percentage" ? "1% Lương đóng bảo hiểm" : "Mức cố định"}
                      </td>
                      <td className="text-right font-mono">
                        <strong className="text-primary">{formatCurrency(item.amount)}</strong>
                      </td>
                      <td className="text-center">
                        {item.isParticipating ? (
                          <StatusBadge tone="success">Có trích nộp</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral" dot={false}>Không tham gia</StatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer */}
            <TablePaginationFooter
              totalItems={filteredFees.length}
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

      {/* Shared Reusable Excel Import Modal */}
      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        title={`Import Danh Sách Công Đoàn Phí - ${formatMonthYear(selectedPeriod)}`}
        description="Tải tệp bảng tổng hợp trích đóng đoàn phí công đoàn (1% lương đóng BHXH hoặc mức cố định) từ tổ chức Công đoàn cơ sở."
        period={selectedPeriod}
        sampleTemplateName="Mau_Danh_Sach_Cong_Doan_Phi.xlsx"
        sampleTemplateDescription="Bảng kê gồm: Mã NV, Họ tên, Hình thức trích (1% Lương BHXH / Mức cố định), Mức trích nộp và Trạng thái tham gia."
        onDownloadSample={() => notify("Đã tải xuống biểu mẫu Mau_Danh_Sach_Cong_Doan_Phi.xlsx")}
        columns={[
          {
            key: "employeeCode",
            label: "Mã NV",
            width: "120px",
            render: (row) => <code>{row.employeeCode}</code>,
          },
          {
            key: "employeeName",
            label: "Họ và tên",
            render: (row) => <strong>{row.employeeName}</strong>,
          },
          {
            key: "feeType",
            label: "Hình thức trích",
            render: (row) => (
              <Badge tone="neutral">
                {row.feeType === "percentage" ? "1% Lương đóng BH" : "Mức cố định"}
              </Badge>
            ),
          },
          {
            key: "amount",
            label: "Mức trích nộp",
            align: "right",
            render: (row) => (
              <strong className="text-primary font-mono">{formatCurrency(row.amount)}</strong>
            ),
          },
          {
            key: "isParticipating",
            label: "Tham gia CĐ",
            align: "center",
            render: (row) =>
              row.isParticipating ? (
                <StatusBadge tone="success">Có trích nộp</StatusBadge>
              ) : (
                <StatusBadge tone="neutral" dot={false}>Không tham gia</StatusBadge>
              ),
          },
        ]}
        previewRows={uploadPreviewRows}
        stats={[
          {
            label: "Tổng số bản ghi",
            value: `${uploadPreviewRows.length} nhân viên`,
            tone: "primary",
          },
          {
            label: "Có tham gia CĐ",
            value: `${uploadPreviewRows.filter((r) => r.isParticipating).length} người`,
            tone: "success",
          },
          {
            label: "Tổng kinh phí trích",
            value: formatCurrency(previewTotalAmount),
            tone: "warning",
          },
          {
            label: "Thẩm định dữ liệu",
            value: "Hợp lệ 100%",
            tone: "success",
          },
        ]}
        onSimulateUpload={handleSimulateFileUpload}
        isUploading={isUploading}
        onConfirmImport={() => importMutation.mutate()}
        confirmLoading={importMutation.isPending}
        onClearPreview={() => setUploadPreviewRows([])}
      />
    </div>
  );
}
