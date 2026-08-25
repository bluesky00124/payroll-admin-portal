"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Banknote,
  BriefcaseBusiness,
  Calculator,
  ChevronRight,
  Menu,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useResetDemo, useTheme, useToast, useUserRole, type ThemePreset } from "@/components/providers";
import { Button, Modal } from "@/components/ui";

const themeLabels: Record<ThemePreset, string> = {
  corporate: "Corporate Teal",
  emerald: "Emerald",
  graphite: "Graphite",
};

export function GrscLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-grsc-logo ${compact ? "is-compact" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/grsc-logo.png"
        alt="Green Speed GRSC Logo"
        className={compact ? "brand-logo-img compact" : "brand-logo-img"}
      />
    </div>
  );
}

export function AdminShell({
  children,
  detailLabel,
}: {
  children: React.ReactNode;
  detailLabel?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isPayrollMenuOpen, setIsPayrollMenuOpen] = useState(true);
  const { preset, setPreset, mode, toggleMode } = useTheme();
  const { role, setRole, roleLabel, roleSubtitle } = useUserRole();
  const resetDemo = useResetDemo();
  const { notify } = useToast();

  const applyReset = () => {
    setConfirmReset(false);
    notify("Đã khôi phục dữ liệu demo ban đầu");
    resetDemo();
  };

  const isEmployeesPage = pathname.startsWith("/employees");
  const isPayrollPage = pathname.startsWith("/payroll");
  const isProjectsPage = pathname.startsWith("/projects");
  const hasActivePayrollItem = isProjectsPage || isEmployeesPage || isPayrollPage;

  return (
    <div className={`admin-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand-header">
          <Link href="/projects" className="brand-logo-link" title="Green Speed GRSC">
            <GrscLogo compact={collapsed} />
          </Link>
        </div>

        <nav aria-label="Menu chính" className="sidebar-nav-container">
          <ul className="sidebar-nav-list">
            <li className="sidebar-nav-item">
              <button
                type="button"
                className={`sidebar-parent-button ${hasActivePayrollItem ? "has-active-child" : ""}`}
                data-state={isPayrollMenuOpen ? "open" : "closed"}
                onClick={() => setIsPayrollMenuOpen((prev) => !prev)}
                title="Quản lý lương"
              >
                <div className="nav-button-left">
                  <Calculator className="nav-icon" />
                  <span className="nav-label">Quản lý lương</span>
                </div>
                <ChevronRight className="parent-chevron" />
              </button>

              {isPayrollMenuOpen && (
                <ul className="sidebar-submenu-list">
                  <li>
                    <Link
                      className={`sidebar-submenu-button ${isProjectsPage ? "is-active" : ""}`}
                      href="/projects"
                      title="Dự án"
                    >
                      <BriefcaseBusiness className="w-4 h-4 shrink-0" />
                      <span className="nav-label">Dự án</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`sidebar-submenu-button ${isEmployeesPage ? "is-active" : ""}`}
                      href="/employees"
                      title="Người lao động"
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <span className="nav-label">Người lao động</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`sidebar-submenu-button ${isPayrollPage ? "is-active" : ""}`}
                      href="/payroll"
                      title="Bảng lương"
                    >
                      <Banknote className="w-4 h-4 shrink-0" />
                      <span className="nav-label">Bảng lương</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </aside>

      <section className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="collapse-toggle-btn"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="breadcrumbs">
              {isPayrollPage ? (
                <>
                  <Link href="/payroll">Bảng lương</Link>
                  {detailLabel && (
                    <>
                      <ChevronRight />
                      <span>{detailLabel}</span>
                    </>
                  )}
                </>
              ) : isEmployeesPage ? (
                <>
                  <Link href="/employees">Người lao động</Link>
                  {detailLabel && (
                    <>
                      <ChevronRight />
                      <span>{detailLabel}</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link href="/projects">Dự án</Link>
                  {detailLabel && (
                    <>
                      <ChevronRight />
                      <span>{detailLabel}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="topbar-actions">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="ghost">
                  <Palette />
                  <span className="desktop-only">{themeLabels[preset]}</span>
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="dropdown-content" align="end">
                  <DropdownMenu.Label>Giao diện</DropdownMenu.Label>
                  {(Object.keys(themeLabels) as ThemePreset[]).map((theme) => (
                    <DropdownMenu.Item
                      key={theme}
                      className={preset === theme ? "selected" : ""}
                      onSelect={() => setPreset(theme)}
                    >
                      {themeLabels[theme]}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMode}
              aria-label={mode === "light" ? "Bật giao diện tối" : "Bật giao diện sáng"}
            >
              {mode === "light" ? <Moon /> : <Sun />}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw />
              <span className="desktop-only">Đặt lại dữ liệu mẫu</span>
            </Button>

            {/* Account / Role Switcher */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="user-chip-btn"
                  title="Chuyển đổi tài khoản đăng nhập để kiểm tra phân quyền"
                >
                  <div className="user-chip">
                    <span>
                      <strong>{roleLabel}</strong>
                      <small>{roleSubtitle}</small>
                    </span>
                    <i>
                      <UserRound />
                    </i>
                  </div>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="dropdown-content" align="end">
                  <DropdownMenu.Label>Đổi vai trò đăng nhập</DropdownMenu.Label>
                  <DropdownMenu.Item
                    className={role === "accountant" ? "selected" : ""}
                    onSelect={() => {
                      setRole("accountant");
                      notify("Đã đăng nhập: Kế toán (Toàn quyền kiểm tra & duyệt hồ sơ)");
                    }}
                  >
                    <div>
                      <strong>Kế toán C&B</strong>
                      <div className="text-xs text-muted">Import Excel, kiểm tra &amp; Xác nhận hợp lệ</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={role === "project_owner" ? "selected" : ""}
                    onSelect={() => {
                      setRole("project_owner");
                      notify("Đã đăng nhập: Chủ dự án (Phê duyệt bảng lương & phản hồi)");
                    }}
                  >
                    <div>
                      <strong>Chủ dự án (CDA)</strong>
                      <div className="text-xs text-muted">Xác nhận, duyệt phản hồi &amp; giải trình chênh lệch</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={role === "payment_accountant" ? "selected" : ""}
                    onSelect={() => {
                      setRole("payment_accountant");
                      notify("Đã đăng nhập: Kế toán Thanh toán (Cập nhật doanh thu)");
                    }}
                  >
                    <div>
                      <strong>Kế toán Thanh toán</strong>
                      <div className="text-xs text-muted">Cập nhật doanh thu &amp; kiểm tra chênh lệch</div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={role === "bcsx" ? "selected" : ""}
                    onSelect={() => {
                      setRole("bcsx");
                      notify("Đã đăng nhập: Ban Chăm Sóc Sản Xuất (Thu thập & Khai báo)");
                    }}
                  >
                    <div>
                      <strong>Ban Chăm Sóc (BCSX)</strong>
                      <div className="text-xs text-muted">Khai báo hồ sơ NPT kèm CCCD/GCN tại xưởng</div>
                    </div>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <main className="page-container">{children}</main>
      </section>
      <Modal
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Khôi phục dữ liệu demo?"
        description="Tất cả thay đổi cục bộ sẽ bị xóa và thay bằng bộ dữ liệu mẫu ban đầu."
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)}>Hủy</Button>
            <Button variant="danger" onClick={applyReset}>
              Khôi phục
            </Button>
          </>
        }
      >
        <p className="modal-note">
          Theme hiện tại được giữ nguyên. Dự án, chính sách và công thức sẽ được reset.
        </p>
      </Modal>
    </div>
  );
}
