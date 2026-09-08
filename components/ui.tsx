"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox, LoaderCircle, MoreVertical, Save, Search, X } from "lucide-react";
import { createContext, type ButtonHTMLAttributes, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn, formatDate, formatMonthYear } from "@/lib/utils";

export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer() {
  const container = useContext(PortalContainerContext);
  return container || (typeof document !== "undefined" ? document.body : null);
}

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

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  container,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  container?: HTMLElement | null;
}) {
  const contextContainer = usePortalContainer();
  const targetContainer = container !== undefined ? container : contextContainer;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={targetContainer ?? undefined}>
        <Dialog.Overlay
          className="dialog-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              onOpenChange(false);
            }
          }}
        />
        <Dialog.Content
          className={`dialog-content dialog-${size}`}
          onWheelCapture={(e) => e.stopPropagation()}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onFocusOutside={(e) => {
            e.preventDefault();
          }}
        >
          <div className="dialog-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && <Dialog.Description>{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <button type="button" className="dialog-close-btn" aria-label="Đóng">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
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

export function SaveBar({
  visible,
  saving,
  onSave,
  onCancel,
}: {
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="save-bar">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <strong className="text-xs font-bold text-foreground truncate block">
            Có thay đổi chưa lưu
          </strong>
          <span className="text-[11px] text-muted-foreground truncate hidden sm:block">
            Lưu lại để áp dụng các thiết lập mới vào hệ thống
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Hủy bỏ
        </Button>
        <Button variant="primary" size="sm" onClick={onSave} disabled={saving} className="shadow-xs gap-1.5 font-semibold">
          {saving ? <LoaderCircle className="w-3.5 h-3.5 spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
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
      <span className="status-badge-label">{children}</span>
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

  const pageNumbers: (number | "...")[] = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="table-card-footer">
      <div className="table-footer-left">
        <span className="record-counter-text">
          Hiển thị{" "}
          <strong className="record-counter-num">
            {startItem.toLocaleString("vi-VN")}–{endItem.toLocaleString("vi-VN")}
          </strong>{" "}
          trong tổng số{" "}
          <strong className="record-counter-num">
            {totalItems.toLocaleString("vi-VN")}
          </strong>{" "}
          bản ghi
        </span>

        {selectedCount !== undefined && selectedCount > 0 && (
          <span className="selection-counter-tag">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>
              Đã chọn <strong>{selectedCount}</strong>
            </span>
          </span>
        )}
      </div>

      <div className="table-footer-right">
        {onPageSizeChange && (
          <div className="page-size-selector">
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="page-size-select"
              aria-label="Chọn số dòng mỗi trang"
            >
              <option value={10}>10 / trang</option>
              <option value={25}>25 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
            </select>
          </div>
        )}

        {onPageChange && (
          <div className="pagination-nav">
            {/* First Page */}
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(1)}
              title="Trang đầu"
              aria-label="Trang đầu"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              title="Trang trước"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            <div className="pagination-pages-group">
              {pageNumbers.map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`dots-${idx}`} className="pagination-dots">
                      …
                    </span>
                  );
                }
                const isActive = p === currentPage;
                return (
                  <button
                    key={`page-${p}`}
                    type="button"
                    className={`pagination-page-btn ${isActive ? "active" : ""}`}
                    onClick={() => onPageChange(p as number)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              title="Trang sau"
              aria-label="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(totalPages)}
              title="Trang cuối"
              aria-label="Trang cuối"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}



export interface DatePickerProps {
  value: string; // YYYY-MM-DD or DD/MM/YYYY or YYYY-MM
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  title = "Chọn ngày làm việc",
  placeholder = "Chọn ngày...",
  className,
  disabled = false,
}: DatePickerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayDate = useMemo(() => {
    if (!value) return "";
    return formatDate(value);
  }, [value]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "button button-secondary button-sm flex items-center justify-center gap-1.5 min-w-[125px] font-medium text-xs h-8 px-2.5",
          className
        )}
        onClick={() => !disabled && setModalOpen(true)}
        disabled={disabled}
      >
        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>{displayDate || placeholder}</span>
      </button>

      {modalOpen && (
        <DatePickerModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          value={value}
          onChange={onChange}
          title={title}
        />
      )}
    </>
  );
}

export function DatePickerModal({
  open,
  onOpenChange,
  value,
  onChange,
  title = "Chọn ngày làm việc",
  container,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  title?: string;
  container?: HTMLElement | null;
}) {
  const contextContainer = usePortalContainer();
  const targetContainer = container !== undefined ? container : contextContainer;

  // Helper to parse input date string into Date object
  const parseDate = (val?: string): Date => {
    if (!val) return new Date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [d, m, y] = val.split("/").map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{4}-\d{2}$/.test(val)) {
      const [y, m] = val.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [draftDate, setDraftDate] = useState<Date>(() => parseDate(value));
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = parseDate(value);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (open) {
      const initial = parseDate(value);
      setDraftDate(initial);
      setViewMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
    }
  }, [open, value]);

  // Format draft for display: DD/MM/YYYY
  const draftFormatted = useMemo(() => {
    const d = String(draftDate.getDate()).padStart(2, "0");
    const m = String(draftDate.getMonth() + 1).padStart(2, "0");
    const y = draftDate.getFullYear();
    return `${d}/${m}/${y}`;
  }, [draftDate]);

  // Calendar calculations
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth(); // 0-indexed
  const monthTitle = `Tháng ${month + 1} Năm ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // In Vietnam: Monday is first day of week (T2=0, T3=1, ..., CN=6)
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const handlePrevMonth = () => {
    setViewMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonth(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const next = new Date(year, month, day);
    setDraftDate(next);
  };

  const handleToday = () => {
    const today = new Date();
    setDraftDate(today);
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleSave = () => {
    const y = draftDate.getFullYear();
    const m = String(draftDate.getMonth() + 1).padStart(2, "0");
    const d = String(draftDate.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    onOpenChange(false);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  if (!open) return null;

  const content = (
    <div
      className="gs-dash-date-modal open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="gs-dash-date-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gs-dash-date-head">
          <h3 className="gs-dash-date-title">{title}</h3>
          <button
            type="button"
            className="gs-dash-date-close"
            onClick={() => onOpenChange(false)}
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        <div className="gs-dash-date-body">
          <div className="gs-dash-date-fields">
            <div className="gs-dash-date-box" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="gsDashDateModalValue">Ngày đã chọn</label>
              <input
                id="gsDashDateModalValue"
                className="gs-dash-date-value"
                type="text"
                readOnly
                value={draftFormatted}
              />
            </div>
          </div>

          <div className="gs-dash-calendars">
            <div className="gs-dash-cal">
              <div className="gs-dash-cal-nav">
                <button
                  type="button"
                  className="gs-dash-cal-arrow"
                  onClick={handlePrevMonth}
                  aria-label="Tháng trước"
                >
                  &lsaquo;
                </button>
                <div className="gs-dash-cal-title">{monthTitle}</div>
                <button
                  type="button"
                  className="gs-dash-cal-arrow"
                  onClick={handleNextMonth}
                  aria-label="Tháng sau"
                >
                  &rsaquo;
                </button>
              </div>

              <div className="gs-dash-week-head">
                {weekdays.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              <div className="gs-dash-days">
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <button
                    key={`blank-${idx}`}
                    type="button"
                    className="gs-dash-day blank"
                    tabIndex={-1}
                    disabled
                  />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const current = new Date(year, month, dayNum);
                  const isSelected = isSameDay(current, draftDate);

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      className={cn(
                        "gs-dash-day",
                        isSelected && "is-start is-end in-range"
                      )}
                      onClick={() => handleSelectDay(dayNum)}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="gs-dash-date-actions">
          <button
            type="button"
            className="gs-dash-date-btn reset"
            onClick={handleToday}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className="gs-dash-date-btn save"
            onClick={handleSave}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined" && targetContainer) {
    return createPortal(content, targetContainer);
  }

  return content;
}

export interface MonthPickerProps {
  value: string; // YYYY-MM (e.g. "2026-08") or "" / "all"
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  variant?: "filter" | "form";
  allowClear?: boolean;
  clearLabel?: string;
}

export function MonthPicker({
  value,
  onChange,
  label,
  placeholder = "Chọn tháng...",
  className,
  disabled = false,
  variant = "filter",
  allowClear = false,
  clearLabel = "Tất cả các tháng",
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

  const handleClear = () => {
    onChange(allowClear ? "all" : "");
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
          {value && value !== "all" ? formatMonthYear(value, variant === "filter") : placeholder || "Tất cả các tháng"}
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
                value !== "all" && Boolean(value) && viewYear === parsedYear && monthNum === parsedMonth;
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

          <div className="month-picker-footer flex items-center justify-between gap-2">
            {allowClear ? (
              <button
                type="button"
                className="month-picker-today-btn text-muted hover:text-foreground font-normal"
                onClick={handleClear}
              >
                {clearLabel}
              </button>
            ) : null}
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

export interface ActionMenuItem {
  key?: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function TableRowActions({
  items,
  triggerAriaLabel = "Thao tác",
}: {
  items: ActionMenuItem[];
  triggerAriaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 185;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 180 && rect.top > 180;

    setCoords({
      top: showAbove ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(10, rect.right - dropdownWidth),
    });
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) {
      calculatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent | TouchEvent) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        (path.includes(dropdownRef.current) || dropdownRef.current.contains(target))
      ) {
        return;
      }
      if (
        triggerRef.current &&
        (path.includes(triggerRef.current) || triggerRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    function handleScroll(e: Event) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        (path.includes(dropdownRef.current) || dropdownRef.current.contains(target))
      ) {
        return;
      }
      calculatePosition();
    }

    function handleResize() {
      calculatePosition();
    }

    // Capture phase listeners ensure priority execution
    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize, true);
    };
  }, [open]);

  const portalContainer = usePortalContainer();

  if (!items || items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn("table-row-action-btn", open && "active")}
        aria-label={triggerAriaLabel}
        title={triggerAriaLabel}
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <MoreVertical />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        portalContainer &&
        createPortal(
          <div
            ref={dropdownRef}
            className="table-action-dropdown-content"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            role="menu"
          >
            {items.map((item, index) => (
              <button
                key={item.key || index}
                type="button"
                className={cn("table-action-dropdown-item", item.danger && "danger")}
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  setTimeout(() => {
                    item.onClick();
                  }, 50);
                }}
              >
                {item.icon && <span className="action-item-icon">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          portalContainer || document.body
        )}
    </>
  );
}

export interface SearchableSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  className,
  disabled,
  icon,
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const lower = query.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(lower))
    );
  }, [options, query]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(rect.width, 240);
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 240 && rect.top > 240;

    setCoords({
      top: showAbove ? rect.top - 6 : rect.bottom + 6,
      left: Math.min(rect.left, Math.max(10, window.innerWidth - dropdownWidth - 16)),
      width: dropdownWidth,
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!open) {
      updatePosition();
      setQuery("");
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent | TouchEvent) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      if (
        popoverRef.current &&
        (path.includes(popoverRef.current) || popoverRef.current.contains(target))
      ) {
        return;
      }
      if (
        triggerRef.current &&
        (path.includes(triggerRef.current) || triggerRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function handleScroll(e: Event) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      // If user is scrolling inside the popover itself, DO NOT close or reposition!
      if (
        popoverRef.current &&
        (path.includes(popoverRef.current) || popoverRef.current.contains(target))
      ) {
        return;
      }
      updatePosition();
    }

    function handleResize() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize, true);
    };
  }, [open]);

  const portalContainer = usePortalContainer();

  return (
    <div className={cn("searchable-select-wrap", className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cn("searchable-select-trigger", open && "open", disabled && "disabled")}
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={open}
      >
        {icon && <span className="searchable-select-icon">{icon}</span>}
        <span className="searchable-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="searchable-select-chevron" />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        portalContainer &&
        createPortal(
          <div
            ref={popoverRef}
            className="searchable-select-popover"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
          >
            <div className="searchable-select-search-box">
              <Search className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="searchable-select-input"
                onClick={(e) => e.stopPropagation()}
              />
              {query && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery("");
                  }}
                >
                  <X />
                </button>
              )}
            </div>

            <div className="searchable-select-options-list">
              {filteredOptions.length === 0 ? (
                <div className="searchable-select-empty">Không tìm thấy kết quả</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        "searchable-select-item",
                        isSelected && "selected",
                        opt.disabled && "disabled"
                      )}
                      disabled={opt.disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(opt.value);
                        setOpen(false);
                      }}
                    >
                      <div className="item-text-group">
                        <span className="item-label">{opt.label}</span>
                        {opt.subLabel && <span className="item-sub">{opt.subLabel}</span>}
                      </div>
                      {isSelected && <Check className="item-check" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          portalContainer || document.body
        )}
    </div>
  );
}

export interface GsProjectOption {
  id: string;
  code?: string;
  name: string;
  client?: string;
  location?: string;
}

export function GsProjectCombobox({
  items,
  value,
  onChange,
  placeholder = "Tất cả dự án",
  allowAll = true,
  disabled = false,
  className,
}: {
  items: GsProjectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = useMemo(() => {
    if (!value || value === "all") return null;
    return items.find((p) => String(p.id) === String(value) || String(p.code) === String(value)) ?? null;
  }, [items, value]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      (p) =>
        (p.code && p.code.toLowerCase().includes(q)) ||
        p.name.toLowerCase().includes(q) ||
        (p.client && p.client.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q))
    );
  }, [items, query]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(rect.width, 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 280 && rect.top > 280;

    // Ưu tiên căn thẳng theo mép phải của nút trigger nếu ở nửa phải màn hình
    const isRightHalf = rect.left + rect.width / 2 > window.innerWidth / 2;
    const targetLeft = isRightHalf ? rect.right - dropdownWidth : rect.left;
    const clampedLeft = Math.max(10, Math.min(targetLeft, window.innerWidth - dropdownWidth - 16));

    setCoords({
      top: showAbove ? rect.top - 6 : rect.bottom + 6,
      left: clampedLeft,
      width: dropdownWidth,
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!open) {
      updatePosition();
      setQuery("");
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange("all");
  };

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent | TouchEvent) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      if (popoverRef.current && (path.includes(popoverRef.current) || popoverRef.current.contains(target))) {
        return;
      }
      if (triggerRef.current && (path.includes(triggerRef.current) || triggerRef.current.contains(target))) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function handleScroll(e: Event) {
      const path = e.composedPath ? e.composedPath() : [];
      const target = e.target as Node;
      if (popoverRef.current && (path.includes(popoverRef.current) || popoverRef.current.contains(target))) {
        return;
      }
      updatePosition();
    }

    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition, true);
    };
  }, [open]);

  const portalContainer = usePortalContainer();

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts: React.ReactNode[] = [];
    const lower = text.toLowerCase();
    const lowerQ = q.toLowerCase().trim();
    let cur = 0;
    let idx = lower.indexOf(lowerQ, cur);

    while (idx !== -1) {
      if (idx > cur) {
        parts.push(text.substring(cur, idx));
      }
      parts.push(
        <mark key={idx} className="gs-combo-hl">
          {text.substring(idx, idx + lowerQ.length)}
        </mark>
      );
      cur = idx + lowerQ.length;
      idx = lower.indexOf(lowerQ, cur);
    }
    if (cur < text.length) {
      parts.push(text.substring(cur));
    }
    return parts;
  };

  return (
    <div className={cn("gs-combo-host", className)}>
      <div className={cn("gs-combo", open && "is-open", disabled && "is-disabled")}>
        <button
          ref={triggerRef}
          type="button"
          className="gs-combo-trigger"
          onClick={handleToggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="gs-combo-trigger-text">
            {selectedItem ? (
              <>
                {selectedItem.code && (
                  <span className="sl-project-option-code">{selectedItem.code}</span>
                )}
                <span className="sl-project-option-name">{selectedItem.name}</span>
              </>
            ) : (
              <span className="gs-combo-placeholder">
                {placeholder} {allowAll && items.length > 0 ? `(${items.length})` : ""}
              </span>
            )}
          </span>

          <span className="gs-combo-actions">
            {allowAll && selectedItem && !disabled && (
              <span
                className="gs-combo-clear"
                role="button"
                title="Xóa chọn (Tất cả dự án)"
                aria-label="Xóa chọn"
                onClick={handleClear}
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <span className="gs-combo-caret" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </span>
        </button>

        {open &&
          coords &&
          typeof document !== "undefined" &&
          portalContainer &&
          createPortal(
            <div
              ref={popoverRef}
              className="gs-combo-panel"
              style={{
                position: "fixed",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 100050,
                display: "flex",
              }}
            >
              <div className="gs-combo-search-wrap">
                <span className="gs-combo-search-icon">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm kiếm mã hoặc tên dự án..."
                  className="gs-combo-search"
                  autoComplete="off"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="gs-combo-options">
                {allowAll && !query.trim() && (
                  <button
                    type="button"
                    className={cn("gs-combo-option", (!value || value === "all") && "is-selected")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange("all");
                      setOpen(false);
                    }}
                  >
                    <div className="gs-combo-option-content">
                      <span className="sl-project-option-code">ALL</span>
                      <span className="sl-project-option-name">Tất cả dự án ({items.length})</span>
                    </div>
                    {(!value || value === "all") && (
                      <span className="gs-combo-check text-primary">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                )}

                {filteredItems.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground italic">
                    Không tìm thấy dự án phù hợp
                  </div>
                ) : (
                  filteredItems.map((p) => {
                    const isSelected = String(value) === String(p.id) || String(value) === String(p.code);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={cn("gs-combo-option", isSelected && "is-selected")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(p.id);
                          setOpen(false);
                        }}
                      >
                        <div className="gs-combo-option-content">
                          {p.code && (
                            <span className="sl-project-option-code">
                              {highlightMatch(p.code, query)}
                            </span>
                          )}
                          <span className="sl-project-option-name">
                            {highlightMatch(p.name, query)}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="gs-combo-check text-primary">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            portalContainer || document.body
          )}
      </div>
    </div>
  );
}


