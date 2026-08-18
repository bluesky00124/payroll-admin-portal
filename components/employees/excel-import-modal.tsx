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
      <div className="upload-modal-body">
        {/* 1. Guide Banner with Download Sample Button */}
        <div className="upload-guide-box">
          <div className="flex items-center justify-between gap-4">
            <div>
              <strong className="text-sm">Tệp Excel biểu mẫu chuẩn hệ thống:</strong>
              <p className="text-xs text-muted mt-0.5">{sampleTemplateDescription}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download /> Tải tệp mẫu biểu (.xlsx)
            </Button>
          </div>
        </div>

        {/* 2. Hidden File Input & Modern Dropzone */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
        />

        {previewRows.length === 0 ? (
          <div className="modern-dropzone" onClick={handleDropzoneClick}>
            <div className="modern-dropzone-icon">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="modern-dropzone-title">
                Bấm để chọn tệp Excel từ máy tính hoặc kéo thả file vào đây
              </div>
              <div className="modern-dropzone-sub">
                Hệ thống sẽ tự động quét, kiểm tra cú pháp và đối chiếu danh sách nhân sự
              </div>
            </div>
            <div className="modern-dropzone-badges">
              <Badge tone="neutral">.XLSX</Badge>
              <Badge tone="neutral">.XLS</Badge>
              <Badge tone="neutral">.CSV</Badge>
              <span className="text-[11px] text-muted self-center">Dung lượng tối đa 15MB</span>
            </div>
            {isUploading && (
              <div className="flex items-center gap-2 text-xs text-primary font-semibold mt-1">
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
            <div className="max-h-60 overflow-y-auto border border-border rounded-md">
              <table className="upload-preview-table mt-0">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }} className="text-center">STT</th>
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
                      <td className="text-center text-muted text-xs">{rowIdx + 1}</td>
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
