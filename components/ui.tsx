"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, Inbox, LoaderCircle, X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "secondary",
  size = "default",
  loading,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "default" | "sm" | "icon";
  loading?: boolean;
}) {
  const effectiveVariant = variant === "outline" ? "secondary" : variant;
  return (
    <button
      className={cn("button", `button-${effectiveVariant}`, `button-${size}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="spin" />}
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Modal({ open, onOpenChange, title, description, children, footer, size = "md" }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content dialog-${size}`}>
          <div className="dialog-header">
            <div><Dialog.Title>{title}</Dialog.Title>{description && <Dialog.Description>{description}</Dialog.Description>}</div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Đóng"><X /></Button></Dialog.Close>
          </div>
          <div className="dialog-body">{children}</div>
          {footer && <div className="dialog-footer">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <div className="loading-block" role="status" aria-label="Đang tải">{Array.from({ length: rows }).map((_, index) => <span key={index} />)}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-panel"><Inbox /><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-panel"><AlertCircle /><div><strong>Không thể tải dữ liệu</strong><p>{message}</p></div>{retry && <Button onClick={retry}>Thử lại</Button>}</div>;
}

export function SaveBar({ visible, saving, onSave, onCancel }: { visible: boolean; saving?: boolean; onSave: () => void; onCancel: () => void }) {
  if (!visible) return null;
  return <div className="save-bar"><span>Có thay đổi chưa lưu</span><div><Button onClick={onCancel}>Hủy thay đổi</Button><Button variant="primary" onClick={onSave} disabled={saving}>{saving && <LoaderCircle className="spin" />}Lưu cấu hình</Button></div></div>;
}

const AVATAR_PALETTES = [
  { bg: "#e0f2fe", text: "#0369a1" }, // sky
  { bg: "#ede9fe", text: "#6d28d9" }, // violet
  { bg: "#dcfce7", text: "#15803d" }, // emerald
  { bg: "#fef3c7", text: "#b45309" }, // amber
  { bg: "#ffe4e6", text: "#be123c" }, // rose
  { bg: "#f3e8ff", text: "#7e22ce" }, // purple
  { bg: "#e2e8f0", text: "#334155" }, // slate
];

function getAvatarColors(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

function getInitials(name: string) {
  if (!name) return "NV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { bg, text } = getAvatarColors(name);
  const initials = getInitials(name);

  return (
    <div
      className={cn("user-avatar", `user-avatar-${size}`, className)}
      style={{ backgroundColor: bg, color: text }}
      title={name}
      aria-label={name}
    >
      <span>{initials}</span>
    </div>
  );
}

export function StatusBadge({
  tone = "neutral",
  dot = true,
  children,
  className,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "purple";
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("status-badge", `status-badge-${tone}`, className)}>
      {dot && <span className="status-badge-dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

export function TablePaginationFooter({
  totalItems,
  selectedCount,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}: {
  totalItems: number;
  selectedCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="table-card-footer">
      <div className="table-footer-left">
        {selectedCount !== undefined && selectedCount > 0 ? (
          <span className="selection-counter-tag">
            Đã chọn <strong>{selectedCount}</strong> trên tổng số {totalItems} bản ghi
          </span>
        ) : (
          <span className="record-counter-text">
            Hiển thị <strong>{startItem} - {endItem}</strong> trong tổng số <strong>{totalItems}</strong> bản ghi
          </span>
        )}
      </div>

      <div className="table-footer-right">
        {onPageSizeChange && (
          <div className="page-size-selector">
            <span>Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="page-size-select"
              aria-label="Chọn số dòng mỗi trang"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}

        {onPageChange && (
          <div className="pagination-nav">
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              title="Trang trước"
            >
              ‹
            </button>
            <span className="pagination-page-indicator">
              Trang <strong>{currentPage}</strong> / {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              title="Trang sau"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMonthYear } from "@/lib/utils";

export interface MonthPickerProps {
  value: string; // YYYY-MM (e.g. "2026-08")
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  variant?: "filter" | "form";
}

export function MonthPicker({
  value,
  onChange,
  label,
  placeholder = "Chọn tháng...",
  className,
  disabled = false,
  variant = "filter",
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM
  const [parsedYear, parsedMonth] = useMemo(() => {
    if (value && /^\d{4}-\d{2}/.test(value)) {
      const parts = value.split("-");
      return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
    }
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1];
  }, [value]);

  const [viewYear, setViewYear] = useState(parsedYear);

  useEffect(() => {
    setViewYear(parsedYear);
  }, [parsedYear]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMonth = (monthIndex: number) => {
    const formattedMonth = String(monthIndex).padStart(2, "0");
    onChange(`${viewYear}-${formattedMonth}`);
    setIsOpen(false);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, "0");
    setViewYear(curYear);
    onChange(`${curYear}-${curMonth}`);
    setIsOpen(false);
  };

  const months = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  return (
    <div
      ref={containerRef}
      className={cn(
        "month-picker-container",
        `month-picker-${variant}`,
        disabled && "disabled",
        className
      )}
    >
      {label && <span className="month-picker-label">{label}</span>}

      <button
        type="button"
        className={cn("month-picker-trigger", isOpen && "open")}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Calendar className="month-picker-icon" />
        <span className="month-picker-display">
          {value ? formatMonthYear(value) : placeholder}
        </span>
        <ChevronDown className="month-picker-chevron" />
      </button>

      {isOpen && (
        <div className="month-picker-popover">
          <div className="month-picker-header">
            <button
              type="button"
              className="month-picker-nav-btn"
              onClick={() => setViewYear(viewYear - 1)}
              title="Năm trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="month-picker-year-title">Năm {viewYear}</span>
            <button
              type="button"
              className="month-picker-nav-btn"
              onClick={() => setViewYear(viewYear + 1)}
              title="Năm sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="month-picker-grid">
            {months.map((mName, idx) => {
              const monthNum = idx + 1;
              const isSelected =
                viewYear === parsedYear && monthNum === parsedMonth;
              return (
                <button
                  key={monthNum}
                  type="button"
                  className={cn(
                    "month-picker-month-btn",
                    isSelected && "selected"
                  )}
                  onClick={() => handleSelectMonth(monthNum)}
                >
                  {mName}
                </button>
              );
            })}
          </div>

          <div className="month-picker-footer">
            <button
              type="button"
              className="month-picker-today-btn"
              onClick={handleCurrentMonth}
            >
              Tháng hiện tại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

