"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, Inbox, LoaderCircle, X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "secondary", size = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "default" | "sm" | "icon" }) {
  return <button className={cn("button", `button-${variant}`, `button-${size}`, className)} {...props} />;
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
