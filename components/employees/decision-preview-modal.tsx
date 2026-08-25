"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Maximize2,
  Printer,
  ShieldAlert,
  User,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";
import { Badge, Button, Modal } from "@/components/ui";
import { formatCurrency, formatDate, formatFullDateVN, formatMonthYear } from "@/lib/utils";

export interface DecisionPreviewData {
  type: "deduction" | "income";
  employeeCode: string;
  employeeName: string;
  position?: string;
  projectCode?: string;
  period: string;
  categoryLabel: string;
  amount: number;
  decisionNo?: string;
  decisionDate?: string;
  reason?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentSize?: string;
  updatedBy?: string;
  updatedAt?: string;
}

interface DecisionPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DecisionPreviewData | null;
}

export function DecisionDocumentPreviewModal({
  open,
  onOpenChange,
  data,
}: DecisionPreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!data) return null;

  const isDeduction = data.type === "deduction";
  const hasAttachment = Boolean(data.attachmentName && data.attachmentName.trim() !== "");

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Simulated download action
    const dummyBlob = new Blob(
      [
        `QUYẾT ĐỊNH BAN HÀNH\nSố: ${data.decisionNo || "QĐ-NB"}\nNgười lao động: ${data.employeeCode} - ${data.employeeName}\nSố tiền: ${data.amount} VNĐ\nLý do: ${data.reason || "Căn cứ hồ sơ"}`
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(dummyBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.attachmentName || `Quyet_Dinh_${data.decisionNo || data.employeeCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Văn bản Quyết định & Tài liệu Căn cứ"
      description={`Chi tiết quyết định ${isDeduction ? "khấu trừ khoản trừ khác" : "chi trả thu nhập khác"} và hồ sơ đính kèm`}
      size="xl"
      footer={
        <>
          {hasAttachment && (
            <Button variant="secondary" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1.5" /> Tải tệp đính kèm ({data.attachmentSize || "PDF"})
            </Button>
          )}
          <Button variant="secondary" onClick={handlePrint} className="hidden sm:inline-flex">
            <Printer className="w-4 h-4 mr-1.5" /> In văn bản
          </Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-1">
        {/* Top Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-secondary/40 border border-border/80 rounded-xl text-xs">
          {/* Employee Info */}
          <div className="space-y-1">
            <span className="text-muted font-medium block">Người lao động:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded text-[11.5px]">
                {data.employeeCode}
              </span>
              <strong className="text-foreground text-sm font-semibold">{data.employeeName}</strong>
            </div>
            {(data.position || data.projectCode) && (
              <span className="text-muted text-[11px] block">
                {data.position} {data.projectCode && `· Dự án: ${data.projectCode}`}
              </span>
            )}
          </div>

          {/* Decision & Period */}
          <div className="space-y-1">
            <span className="text-muted font-medium block">Căn cứ ban hành:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground">
                {data.decisionNo || "Biên bản sự vụ nội bộ"}
              </span>
            </div>
            <div className="text-muted text-[11px] flex items-center gap-1.5">
              <span>Ngày: <strong className="text-foreground font-mono">{formatDate(data.decisionDate) || "—"}</strong></span>
              <span>·</span>
              <span>Kỳ lương: <strong className="text-foreground">{formatMonthYear(data.period)}</strong></span>
            </div>
          </div>

          {/* Amount & Classification */}
          <div className="space-y-1 md:text-right">
            <span className="text-muted font-medium block">Khoản tiền & Phân loại:</span>
            <div className="flex items-center md:justify-end gap-1.5">
              <Badge tone={isDeduction ? "danger" : "success"}>
                {data.categoryLabel}
              </Badge>
              <strong className={`font-mono text-base font-bold ${isDeduction ? "text-danger" : "text-emerald-600 dark:text-emerald-400"}`}>
                {isDeduction ? "-" : "+"}{formatCurrency(data.amount)}
              </strong>
            </div>
            {data.updatedBy && (
              <span className="text-muted text-[11px] block">
                Cập nhật bởi: {data.updatedBy}
              </span>
            )}
          </div>
        </div>

        {/* Document Viewer Container */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-muted/20">
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-secondary/70 border-b border-border/70 text-xs">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">
                {data.attachmentName || `Trích lục quyết định điện tử - Số ${data.decisionNo || "01"}`}
              </span>
              {data.attachmentSize && (
                <span className="text-muted text-[11px]">({data.attachmentSize})</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                className="p-1 rounded hover:bg-secondary text-muted hover:text-foreground transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] text-muted w-10 text-center">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
                className="p-1 rounded hover:bg-secondary text-muted hover:text-foreground transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="p-1 rounded hover:bg-secondary text-muted hover:text-foreground transition-colors ml-1"
                title="Kích thước gốc"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Document Sheet Canvas */}
          <div className="p-4 sm:p-6 overflow-x-auto flex justify-center bg-slate-100 dark:bg-slate-900/60 min-h-[380px]">
            <div
              className="w-full max-w-2xl bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 transition-transform origin-top"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
            >
              {/* Document Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 text-center sm:text-left">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    CÔNG TY CỔ PHẦN TẬP ĐOÀN
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    PHÒNG QUẢN TRỊ NHÂN SỰ & PHÁP CHẾ
                  </p>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                    Số: <strong>{data.decisionNo || "QĐ-NB/2026"}</strong>
                  </p>
                </div>

                <div className="text-center sm:text-right">
                  <h5 className="text-xs font-bold uppercase text-slate-900 dark:text-slate-100">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </h5>
                  <p className="text-[11px] font-serif italic text-slate-600 dark:text-slate-300">
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <p className="text-[10.5px] italic text-slate-500 dark:text-slate-400 mt-1.5">
                    Hà Nội, {formatFullDateVN(data.decisionDate)}
                  </p>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center my-6 space-y-1">
                <h4 className="text-sm sm:text-base font-bold uppercase text-slate-900 dark:text-slate-50 tracking-wide">
                  {isDeduction ? "QUYẾT ĐỊNH KHẤU TRỪ / XỬ PHẠT NỘI QUY" : "QUYẾT ĐỊNH KHEN THƯỞNG & CHI TRẢ THU NHẬP"}
                </h4>
                <p className="text-xs italic text-slate-500 dark:text-slate-400">
                  {isDeduction
                    ? `(V/v thực hiện khấu trừ khoản trừ khác vào bảng lương kỳ ${formatMonthYear(data.period)})`
                    : `(V/v chi trả khoản thu nhập khác vào bảng lương kỳ ${formatMonthYear(data.period)})`}
                </p>
              </div>

              {/* Document Body */}
              <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <p>
                  - Căn cứ Bộ luật Lao động và Quy chế tiền lương của Công ty;
                </p>
                <p>
                  - Căn cứ Biên bản ghi nhận sự việc và đề xuất của Trưởng bộ phận phụ trách;
                </p>
                <p>
                  - Xét duyệt của Giám đốc Khối Nhân sự & Kế toán trưởng;
                </p>

                <div className="my-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11.5px]">
                    QUYẾT ĐỊNH ÁP DỤNG ĐỐI VỚI:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Họ và tên: </span>
                      <strong>{data.employeeName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Mã người lao động: </span>
                      <strong className="font-mono">{data.employeeCode}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Hạng mục: </span>
                      <strong className="text-primary">{data.categoryLabel}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Số tiền áp dụng: </span>
                      <strong className={`font-mono font-bold ${isDeduction ? "text-danger" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {formatCurrency(data.amount)}
                      </strong>
                    </div>
                  </div>
                </div>

                <p>
                  <strong>Lý do căn cứ chi tiết: </strong>
                  <span>{data.reason || "Căn cứ thỏa thuận lao động và quy chế nội bộ của dự án."}</span>
                </p>

                <p>
                  <strong>Điều khoản thi hành: </strong>
                  Quyết định này có hiệu lực thực thi đối với kỳ tính lương <strong>{formatMonthYear(data.period)}</strong>. Phòng Tài chính - Kế toán và C&B có trách nhiệm trích xuất đối soát theo đúng quy định.
                </p>
              </div>

              {/* Signatures & Seal */}
              <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">Nơi nhận:</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">- Như điều khoản;</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">- Lưu hồ sơ nhân sự, Kế toán.</p>
                </div>

                <div className="text-center space-y-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100 uppercase block">
                    TM. BAN GIÁM ĐỐC / TRƯỞNG PHÒNG C&B
                  </span>
                  <span className="text-[11px] italic text-slate-500 dark:text-slate-400 block">
                    (Ký điện tử & chứng thực hệ thống)
                  </span>
                  <div className="pt-2 flex justify-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ĐÃ DUYỆT & BAN HÀNH
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
