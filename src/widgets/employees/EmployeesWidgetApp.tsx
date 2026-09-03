"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortalContainerContext } from "@/components/ui";
import { WidgetNavigationProvider } from "@/src/widget/navigation-adapter";
import { EmployeesTab } from "@/components/tabs/employees-tab";
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

export interface EmployeesWidgetConfig {
  shadowRoot?: ShadowRoot;
  mountElement?: HTMLElement;
  apiBaseUrl?: string;
  authToken?: string;
  projectId?: string;
  userRole?: UserRole;
  themePreset?: ThemePreset;
  colorMode?: ColorMode;
  onEvent?: (name: string, detail: any) => void;
}

export const EmployeesWidgetContext = createContext<EmployeesWidgetConfig>({});

export function EmployeesWidgetApp({ config }: { config: EmployeesWidgetConfig }) {
  const [role, setRoleState] = useState<UserRole>(config.userRole || "accountant");
  const [preset, setPresetState] = useState<ThemePreset>(config.themePreset || "corporate");
  const [mode, setModeState] = useState<ColorMode>(config.colorMode || "light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (config.userRole && config.userRole !== role) setRoleState(config.userRole);
  }, [config.userRole]);

  useEffect(() => {
    if (config.themePreset && config.themePreset !== preset) setPresetState(config.themePreset);
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
      roleLabel: "Kế toán (C&B)",
      roleSubtitle: "Tính lương & điều chỉnh",
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

  return (
    <EmployeesWidgetContext.Provider value={config}>
      <PortalContainerContext.Provider value={config.mountElement || null}>
        <UserRoleContext.Provider value={roleValue}>
          <ThemeContext.Provider value={themeValue}>
            <ToastContext.Provider value={{ notify }}>
              <QueryClientProvider client={queryClient}>
                <WidgetNavigationProvider initialUrl="/employees">
                  <div
                    className="payroll-widget-root text-slate-900 antialiased font-sans p-2 sm:p-4"
                    data-theme={preset}
                  >
                    {/* Header title */}
                    <div className="mb-4">
                      <div className="text-xs uppercase tracking-wider font-bold text-primary mb-1">Quản trị nhân sự</div>
                      <h1 className="text-xl sm:text-2xl font-bold text-foreground">Người lao động</h1>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Quản trị danh sách người lao động, người phụ thuộc, phép năm, công đoàn phí, công chuẩn, BHXH và thuế TNCN theo dự án.
                      </p>
                    </div>

                    <EmployeesTab />

                    {/* Toast Viewport */}
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
    </EmployeesWidgetContext.Provider>
  );
}

export default EmployeesWidgetApp;
