"use client";

import { AlertTriangle, Check, Download, Eye, FileText, FileWarning, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import { Badge, Button, Modal } from "@/components/ui";
import { formatDate, formatMonthYear } from "@/lib/utils";

interface AttachmentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentType?: "cccd_2_sided" | "disability_cert" | "birth_cert";
  employeeName?: string;
  dependentName?: string;
  dob?: string;
  startDate?: string;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  onReject?: () => void;
  onUploadNew?: () => void;
}

export function AttachmentPreviewModal({
  open,
  onOpenChange,
  title,
  attachmentName,
  attachmentUrl,
  attachmentType = "cccd_2_sided",
  employeeName,
  dependentName,
  dob,
  startDate,
  onConfirm,
  confirmLoading,
  onReject,
  onUploadNew,
}: AttachmentPreviewModalProps) {
  const hasAttachment = Boolean(attachmentName && attachmentName.trim() !== "");

  const typeLabel =
    attachmentType === "cccd_2_sided"
      ? "CCCD 2 mặt (Mặt trước & Mặt sau)"
      : attachmentType === "disability_cert"
      ? "Giấy chứng nhận mất khả năng lao động / Giám định y khoa"
      : "Giấy khai sinh / Giấy tờ chứng minh quan hệ";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`Loại chứng từ: ${typeLabel}`}
      size="lg"
      footer={
        <>
          {onUploadNew && (
            <Button
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
                onUploadNew();
              }}
            >
              <UploadCloud /> {hasAttachment ? "Đổi hồ sơ" : "Tải lên tài liệu"}
            </Button>
          )}

          <Button onClick={() => onOpenChange(false)}>Đóng</Button>

          {onReject && (
            <Button
              variant="danger"
              onClick={() => {
                onOpenChange(false);
                onReject();
              }}
            >
              <X /> Từ chối
            </Button>
          )}

          {onConfirm && (
            <Button
              variant="primary"
              loading={confirmLoading}
              onClick={onConfirm}
              disabled={!hasAttachment}
              title={!hasAttachment ? "Cần bổ sung hồ sơ đính kèm trước khi duyệt" : undefined}
            >
              <Check /> Duyệt hồ sơ
            </Button>
          )}
        </>
      }
    >
      <div className="attachment-preview-body space-y-4">
        <div className="attachment-meta-card">
          <div className="meta-row">
            <span>Người lao động:</span>
            <strong>{employeeName || "—"}</strong>
          </div>
          <div className="meta-row">
            <span>Người phụ thuộc:</span>
            <strong>{dependentName || "—"}</strong>
          </div>
          {dob && (
            <div className="meta-row">
              <span>Ngày sinh NPT:</span>
              <strong>{formatDate(dob)}</strong>
            </div>
          )}
          {startDate && (
            <div className="meta-row">
              <span>Hiệu lực từ:</span>
              <strong>{formatMonthYear(startDate)}</strong>
            </div>
          )}
          <div className="meta-row">
            <span>Tên tệp đính kèm:</span>
            {hasAttachment ? (
              <span className="file-badge">
                <FileText /> {attachmentName}
              </span>
            ) : (
              <Badge tone="warning">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Chưa đính kèm tệp
              </Badge>
            )}
          </div>
        </div>

        {/* If no attachment: Render Empty State with upload CTA */}
        {!hasAttachment ? (
          <div className="p-8 text-center bg-secondary/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
              <FileWarning className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md">
              <strong className="text-sm font-bold text-foreground block">
                Chưa có tài liệu chứng minh đính kèm
              </strong>
              <p className="text-xs text-muted">
                Hồ sơ người phụ thuộc này hiện chưa có bản chụp CCCD 2 mặt, Giấy khai sinh hoặc Giấy chứng nhận y tế. Kế toán cần yêu cầu bổ sung hoặc tải lên tệp để hoàn tất việc xét duyệt giảm trừ gia cảnh.
              </p>
            </div>
            {onUploadNew && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onUploadNew();
                }}
                className="mt-1"
              >
                <UploadCloud className="w-4 h-4" /> Tải lên hồ sơ đính kèm ngay
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Visual Mock of CCCD 2-Sided / Certificate */}
            {attachmentType === "cccd_2_sided" ? (
              <div className="cccd-dual-preview">
                <div className="cccd-card">
                  <div className="cccd-header">
                    <ImageIcon />
                    <span>MẶT TRƯỚC CCCD GẮN CHÍP</span>
                  </div>
                  <div className="cccd-mock-img front">
                    <div className="emblem">★</div>
                    <div className="chip"></div>
                    <div className="info-lines">
                      <div className="line bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="line sub">CĂN CƯỚC CÔNG DÂN / CITIZEN IDENTITY CARD</div>
                      <div className="line name">Họ và tên: {dependentName?.toUpperCase() || "NGUYỄN VĂN MẪU"}</div>
                      <div className="line">Quốc tịch: Việt Nam</div>
                      <div className="line">Có giá trị đến: Không thời hạn</div>
                    </div>
                  </div>
                </div>

                <div className="cccd-card">
                  <div className="cccd-header">
                    <ImageIcon />
                    <span>MẶT SAU CCCD GẮN CHÍP</span>
                  </div>
                  <div className="cccd-mock-img back">
                    <div className="mrz-lines">
                      <div className="mrz">I&lt;VNMD1234567890&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
                      <div className="mrz">9001015M3001015VNM&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</div>
                      <div className="mrz">{dependentName?.replace(/\s+/g, "<").toUpperCase() || "NGUYEN<VAN<MAU"}&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
                    </div>
                    <div className="sub-info">
                      <span>Ngày cấp: 15/03/2022</span>
                      <span>Nơi cấp: CỤC CẢNH SÁT QLHC VỀ TTXH</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="cert-preview-card">
                <div className="cert-header">
                  <FileText />
                  <span>{typeLabel.toUpperCase()}</span>
                </div>
                <div className="cert-mock-content">
                  <div className="cert-stamp">ĐÃ CHỨNG THỰC</div>
                  <h4>HỘI ĐỒNG GIÁM ĐỊNH Y KHOA / CƠ QUAN CÓ THẨM QUYỀN</h4>
                  <p>Chứng nhận: <strong>{dependentName || "Người phụ thuộc"}</strong></p>
                  <p>Mục đích: Hồ sơ đăng ký giảm trừ gia cảnh người phụ thuộc cho Người lao động: <strong>{employeeName || "Nhân viên"}</strong> theo Luật thuế TNCN hiện hành.</p>
                  <div className="cert-date">Cấp ngày 10 tháng 01 năm 2024</div>
                </div>
              </div>
            )}

            <div className="preview-tip mt-3">
              <small>✓ Kế toán đối chiếu số CCCD, ngày sinh và quan hệ nhân thân trước khi bấm "Xác nhận hợp lệ".</small>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
