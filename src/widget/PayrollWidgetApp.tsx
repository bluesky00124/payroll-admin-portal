"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortalContainerContext } from "@/components/ui";
import { WidgetNavigationProvider, usePathname, useParams } from "./navigation-adapter";
import { AdminShell } from "@/components/admin-shell";
import { ProjectsList } from "@/components/projects-list";
import { ProjectDetail } from "@/components/project-detail";
import { EmployeesTab } from "@/components/tabs/employees-tab";
import { PayrollWorkspacePage } from "@/components/payroll/payroll-workspace";
import { PayrollDetailPage } from "@/components/payroll/payroll-detail-page";
import {
  ThemeContext,
  ToastContext,
  UserRoleContext,
  type ThemePreset,
  type ColorMode,
  type UserRole,
  type ToastTone,
  type ToastItem,
} from "@/components/providers";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";

export interface WidgetConfig {
  shadowRoot?: ShadowRoot;
  mountElement?: HTMLElement;
  apiBaseUrl?: string;
  authToken?: string;
  projectId?: string;
  payrollId?: string;
  initialRoute?: string;
  userRole?: UserRole;
  themePreset?: ThemePreset;
  colorMode?: ColorMode;
  onEvent?: (name: string, detail: any) => void;
}

export const WidgetConfigContext = createContext<WidgetConfig>({});

export function useWidgetConfig() {
  return useContext(WidgetConfigContext);
}

const roleMetaMap: Record<UserRole, { label: string; subtitle: string }> = {
  accountant: { label: "Kế toán (C&B)", subtitle: "Tính lương & điều chỉnh" },
  bcsx: { label: "Báo Cáo Sản Xuất (BCSX)", subtitle: "Kiểm tra dữ liệu dự án" },
  project_owner: { label: "Chủ dự án (CDA)", subtitle: "Phê duyệt & giải trình" },
  payment_accountant: { label: "Kế toán Thanh toán", subtitle: "Doanh thu & đối chiếu" },
};

function WidgetRouterView() {
  const pathname = usePathname();
  const params = useParams();

  // 1. Chi tiết bảng lương: /payroll/[payrollId]
  if (
    (pathname.startsWith("/payroll/") && pathname !== "/payroll" && pathname !== "/payroll/") ||
    params.payrollId
  ) {
    const pId = params.payrollId || pathname.replace(/^\/payroll\//, "").split("?")[0];
    return (
      <AdminShell detailLabel="Chi tiết bảng lương">
        <PayrollDetailPage payrollId={pId} />
      </AdminShell>
    );
  }

  // 2. Danh sách bảng lương: /payroll
  if (pathname.startsWith("/payroll")) {
    return (
      <AdminShell detailLabel="Quản lý bảng lương">
        <PayrollWorkspacePage />
      </AdminShell>
    );
  }

  // 3. Quản trị người lao động: /employees
  if (pathname.startsWith("/employees")) {
    return (
      <AdminShell detailLabel="Quản trị người lao động">
        <EmployeesTab />
      </AdminShell>
    );
  }

  // 4. Chi tiết cấu hình dự án: /projects/[projectId]
  if (
    (pathname.startsWith("/projects/") && pathname !== "/projects" && pathname !== "/projects/") ||
    params.projectId
  ) {
    const prjId = params.projectId || pathname.replace(/^\/projects\//, "").split("?")[0];
    return <ProjectDetail projectId={prjId} />;
  }

  // 5. Mặc định: Danh sách dự án /projects hoặc /
  return (
    <AdminShell>
      <ProjectsList />
    </AdminShell>
  );
}

export function PayrollWidgetApp({ config }: { config: WidgetConfig }) {
  const [role, setRoleState] = useState<UserRole>(config.userRole || "accountant");
  const [preset, setPresetState] = useState<ThemePreset>(config.themePreset || "corporate");
  const [mode, setModeState] = useState<ColorMode>(config.colorMode || "light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (config.userRole && config.userRole !== role) {
      setRoleState(config.userRole);
    }
  }, [config.userRole]);

  useEffect(() => {
    if (config.themePreset && config.themePreset !== preset) {
      setPresetState(config.themePreset);
    }
  }, [config.themePreset]);

  const notify = useMemo(
    () => (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4000);
    },
    []
  );

  const roleValue = useMemo(
    () => ({
      role,
      setRole: (r: UserRole) => setRoleState(r),
      roleLabel: roleMetaMap[role]?.label || "Kế toán (C&B)",
      roleSubtitle: roleMetaMap[role]?.subtitle || "Tính lương & điều chỉnh",
    }),
    [role]
  );

  const themeValue = useMemo(
    () => ({
      preset,
      mode,
      setPreset: (p: ThemePreset) => setPresetState(p),
      toggleMode: () => setModeState((m) => (m === "light" ? "dark" : "light")),
    }),
    [preset, mode]
  );

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
    []
  );

  // Xác định route ban đầu: nếu truyền route cụ thể, hoặc projectId, hoặc payrollId
  const initialUrl = useMemo(() => {
    if (config.initialRoute) return config.initialRoute;
    if (config.payrollId) return `/payroll/${config.payrollId}`;
    if (config.projectId) return `/projects/${config.projectId}`;
    return "/projects";
  }, [config.initialRoute, config.payrollId, config.projectId]);

  return (
    <WidgetConfigContext.Provider value={config}>
      <PortalContainerContext.Provider value={config.mountElement || null}>
        <UserRoleContext.Provider value={roleValue}>
          <ThemeContext.Provider value={themeValue}>
            <ToastContext.Provider value={{ notify }}>
              <QueryClientProvider client={queryClient}>
                <WidgetNavigationProvider initialUrl={initialUrl}>
                  <div
                    className="payroll-widget-root text-slate-900 antialiased font-sans"
                    data-theme={preset}
                  >
                    <WidgetRouterView />

                    {/* Toast Container inside Shadow DOM */}
                    <div className="toast-viewport" aria-live="polite">
                      {toasts.map((toast) => (
                        <div key={toast.id} className={`toast toast-${toast.tone}`}>
                          {toast.tone === "success" ? <CheckCircle2 /> : <AlertTriangle />}
                          <span>{toast.message}</span>
                          <button
                            type="button"
                            aria-label="Đóng thông báo"
                            onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}
                          >
                            <X />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </WidgetNavigationProvider>
              </QueryClientProvider>
            </ToastContext.Provider>
          </ThemeContext.Provider>
        </UserRoleContext.Provider>
      </PortalContainerContext.Provider>
    </WidgetConfigContext.Provider>
  );
}

export default PayrollWidgetApp;
