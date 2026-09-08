"use client";

import {
  Check,
  Download,
  FileCheck,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { useToast } from "@/components/providers";
import { Badge, Button, Modal } from "@/components/ui";
import { formatMonthYear } from "@/lib/utils";

export interface ExcelImportColumn<T = any> {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
}

export interface ExcelImportStat {
  label: string;
  value: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "danger";
}

export interface ExcelImportModalProps<T = any> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  period?: string; // e.g. "2026-08"
  sampleTemplateName?: string;
  sampleTemplateDescription?: string;
  onDownloadSample?: () => void;
  columns: ExcelImportColumn<T>[];
  previewRows: T[];
  stats?: ExcelImportStat[];
  onUploadFile?: (file?: File) => void;
  onSimulateUpload?: () => void;
  isUploading?: boolean;
  onConfirmImport: () => void;
  confirmLoading?: boolean;
  confirmLabel?: string;
  onClearPreview?: () => void;
}

export function ExcelImportModal<T = any>({
  open,
  onOpenChange,
  title,
  description,
  period,
  sampleTemplateName = "Mau_Bieu_Mau_Import.xlsx",
  sampleTemplateDescription = "Bảng kê Excel bao gồm đầy đủ mã nhân viên, họ tên và số liệu trích nộp.",
  onDownloadSample,
  columns,
  previewRows = [],
  stats = [],
  onUploadFile,
  onSimulateUpload,
  isUploading = false,
  onConfirmImport,
  confirmLoading = false,
  confirmLabel,
  onClearPreview,
}: ExcelImportModalProps<T>) {
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<string>("");

  const handleDownloadTemplate = () => {
    if (onDownloadSample) {
      onDownloadSample();
    } else {
      notify(`Đã tải xuống biểu mẫu ${sampleTemplateName}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const sizeKb = Math.round(file.size / 1024);
      setUploadedFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
      if (onUploadFile) {
        onUploadFile(file);
      } else if (onSimulateUpload) {
        onSimulateUpload();
      }
    }
  };

  const handleDropzoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else if (onSimulateUpload) {
      onSimulateUpload();
    }
  };

  const handleClear = () => {
    setUploadedFileName("");
    setUploadedFileSize("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onClearPreview) onClearPreview();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) handleClear();
      }}
      title={title}
      description={description}
      size="lg"
      footer={
        <div className="modal-footer-actions">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>

          {previewRows.length > 0 && (
            <Button
              variant="primary"
              onClick={onConfirmImport}
              loading={confirmLoading}
            >
              <Check />
              {confirmLabel || `Xác nhận nạp ${previewRows.length} bản ghi vào ${period ? formatMonthYear(period) : "kỳ này"}`}
            </Button>
          )}
        </div>
      }
    >
      <div className="upload-modal-body space-y-4 pt-1">
        {/* Bước 1: Tải tệp mẫu */}
        <div className="border-t border-dashed border-border pt-3.5 first:border-t-0 first:pt-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground m-0">Bước 1: Tải tệp mẫu</p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="sb-upload-link"
                >
                  <span className="truncate">Tải xuống tệp mẫu ({sampleTemplateName})</span>
                  <Download className="w-4 h-4 shrink-0" />
                </button>
                {sampleTemplateDescription && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                    {sampleTemplateDescription}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bước 2: Tải lên tệp đã điền */}
        <div className="border-t border-dashed border-border pt-3.5">
          <p className="text-sm font-bold text-foreground mb-2.5">Bước 2: Tải lên tệp đã điền</p>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />

          {previewRows.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-xl min-h-[190px] p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-primary"
              }`}
              onClick={handleDropzoneClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-15 h-15 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-foreground m-0">Kéo và thả tệp vào đây</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-0">
                Hoặc <span className="text-primary font-bold hover:underline">duyệt từ máy tính</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase mt-2.5 mb-0 tracking-wide font-medium">
                ĐỊNH DẠNG HỖ TRỢ: .XLSX, .XLS, .CSV (TỐI ĐA 15MB)
              </p>
              {isUploading && (
                <div className="flex items-center gap-2 text-xs text-primary font-semibold mt-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang thẩm định và đọc cấu trúc tệp...
                </div>
              )}
            </div>
          ) : (
            <div className="attached-file-card mb-3">
              <div className="attached-file-left">
                <div className="attached-file-icon">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="attached-file-info">
                  <span className="attached-file-name">
                    {uploadedFileName || sampleTemplateName}
                  </span>
                  <span className="attached-file-meta">
                    {uploadedFileSize && <span>{uploadedFileSize} • </span>}
                    <span className="text-success font-medium">✓ Đã đọc {previewRows.length} dòng dữ liệu</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDropzoneClick}
                >
                  Chọn tệp khác
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleClear}
                  title="Xóa tệp"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Validation Stats Summary */}
        {previewRows.length > 0 && stats.length > 0 && (
          <div className="upload-stats-summary-grid">
            {stats.map((stat, idx) => (
              <div key={idx} className="upload-stat-card">
                <span className="upload-stat-label">{stat.label}</span>
                <span
                  className={`upload-stat-val ${
                    stat.tone === "success"
                      ? "text-success"
                      : stat.tone === "warning"
                      ? "text-warning"
                      : stat.tone === "danger"
                      ? "text-danger"
                      : "text-primary"
                  }`}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 4. Interactive Data Preview Table */}
        {previewRows.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <strong className="text-xs text-muted-strong uppercase tracking-wide">
                Xem trước dữ liệu ({previewRows.length} bản ghi hợp lệ):
              </strong>
              <Badge tone="success">Thẩm định hoàn tất</Badge>
            </div>
            <div className="max-h-60 overflow-auto border border-border rounded-md">
              <table className="upload-preview-table mt-0 min-w-[650px]">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }} className="text-center">STT</th>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{ width: col.width }}
                        className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="text-center text-muted text-xs font-medium">{String(rowIdx + 1).padStart(2, "0")}</td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={col.align === "right" ? "text-right font-mono" : col.align === "center" ? "text-center" : "text-left"}
                        >
                          {col.render ? col.render(row, rowIdx) : (row as any)[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
