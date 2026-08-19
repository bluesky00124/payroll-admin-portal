"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AlertCircle, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox, LoaderCircle, MoreVertical, Save, Search, X } from "lucide-react";
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn, formatMonthYear } from "@/lib/utils";

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
        <Button variant="primary" size="sm" onClick={onSave} disabled={saving} className="shadow-xs gap-1.5">
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
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    function handleScroll(e: Event) {
      const target = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
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
                  item.onClick();
                }}
              >
                {item.icon && <span className="action-item-icon">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
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
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function handleScroll(e: Event) {
      const target = e.target as Node;
      // If user is scrolling inside the popover itself, DO NOT close or reposition!
      if (popoverRef.current && popoverRef.current.contains(target)) {
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
          document.body
        )}
    </div>
  );
}


