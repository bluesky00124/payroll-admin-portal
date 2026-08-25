import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-");
    return `${m}/${y}`;
  }
  // YYYY-MM-DD HH:mm or timestamp
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(value)) {
    const [datePart, timePart] = value.split(/\s+/);
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y} ${timePart}`;
  }
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    if (value.includes("T") || value.includes(":")) {
      const hh = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");
      return `${d}/${m}/${y} ${hh}:${mm}`;
    }
    return `${d}/${m}/${y}`;
  } catch {
    return value;
  }
}

export function formatMonthYear(value?: string | null, includePrefix = false): string {
  if (!value || value === "all") return "Tất cả các tháng";
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-");
    return includePrefix ? `Tháng ${m}/${y}` : `${m}/${y}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-");
    return includePrefix ? `Tháng ${m}/${y}` : `${m}/${y}`;
  }
  return value;
}

export function formatFullDateVN(value?: string | null): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `Ngày ${d} tháng ${m} năm ${y}`;
  }
  return formatDate(value);
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
