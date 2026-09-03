"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X, AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { resetMockDatabase } from "@/lib/mock-db";

export type ThemePreset = "corporate" | "emerald" | "graphite";
export type ColorMode = "light" | "dark";

interface ThemeContextValue {
  preset: ThemePreset;
  mode: ColorMode;
  setPreset: (preset: ThemePreset) => void;
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside AppProviders");
  return context;
}

export type ToastTone = "success" | "warning" | "error";
export interface ToastItem { id: number; message: string; tone: ToastTone }
export interface ToastContextValue { notify: (message: string, tone?: ToastTone) => void }
export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside AppProviders");
  return context;
}

export type UserRole = "accountant" | "bcsx" | "project_owner" | "payment_accountant";

export interface UserRoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleLabel: string;
  roleSubtitle: string;
}

export const UserRoleContext = createContext<UserRoleContextValue | null>(null);

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) throw new Error("useUserRole must be used inside AppProviders");
  return context;
}

function AppRuntime({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = useState<ThemePreset>("corporate");
  const [mode, setMode] = useState<ColorMode>("light");
  const [role, setRoleState] = useState<UserRole>("accountant");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const savedPreset = window.localStorage.getItem("payroll-theme-preset") as ThemePreset | null;
    const savedMode = window.localStorage.getItem("payroll-color-mode") as ColorMode | null;
    const savedRole = window.localStorage.getItem("payroll-user-role") as UserRole | null;
    if (savedPreset) setPresetState(savedPreset);
    if (savedMode) setMode(savedMode);
    if (savedRole) setRoleState(savedRole);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preset;
    document.documentElement.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem("payroll-theme-preset", preset);
    window.localStorage.setItem("payroll-color-mode", mode);
    window.localStorage.setItem("payroll-user-role", role);
  }, [preset, mode, role]);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3600);
  }, []);

  const themeValue = useMemo(() => ({
    preset,
    mode,
    setPreset: (value: ThemePreset) => setPresetState(value),
    toggleMode: () => setMode((value) => value === "light" ? "dark" : "light"),
  }), [preset, mode]);

  const roleValue = useMemo(() => {
    const roleMeta: Record<UserRole, { label: string; subtitle: string }> = {
      accountant: { label: "Kế toán (C&B)", subtitle: "Tính lương & điều chỉnh" },
      bcsx: { label: "Báo Cáo Sản Xuất (BCSX)", subtitle: "Kiểm tra dữ liệu dự án" },
      project_owner: { label: "Chủ dự án (CDA)", subtitle: "Phê duyệt & giải trình" },
      payment_accountant: { label: "Kế toán Thanh toán", subtitle: "Doanh thu & đối chiếu" },
    };
    return {
      role,
      setRole: (val: UserRole) => setRoleState(val),
      roleLabel: roleMeta[role].label,
      roleSubtitle: roleMeta[role].subtitle,
    };
  }, [role]);

  return (
    <UserRoleContext.Provider value={roleValue}>
      <ThemeContext.Provider value={themeValue}>
        <ToastContext.Provider value={{ notify }}>
          {children}
          <div className="toast-viewport" aria-live="polite">
            {toasts.map((toast) => (
              <div className={`toast toast-${toast.tone}`} key={toast.id}>
                {toast.tone === "success" ? <CheckCircle2 /> : <AlertTriangle />}
                <span>{toast.message}</span>
                <button type="button" aria-label="Đóng thông báo" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><X /></button>
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </ThemeContext.Provider>
    </UserRoleContext.Provider>
  );
}

function MockApiGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    import("@/mocks/browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass", quiet: true }))
      .then(() => { if (active) setReady(true); })
      .catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  if (!ready) {
    return (
      <div className="app-loading" role="status">
        <div className="loading-brand"><span>GS</span><div><b>Payroll Admin</b><small>Đang chuẩn bị dữ liệu demo…</small></div></div>
        <div className="loading-grid"><i /><i /><i /></div>
      </div>
    );
  }
  return children;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <AppRuntime>
        <MockApiGate>{children}</MockApiGate>
      </AppRuntime>
    </QueryClientProvider>
  );
}

export function useResetDemo() {
  const queryClient = useQueryClient();
  return () => {
    resetMockDatabase();
    queryClient.clear();
    window.location.assign("/projects");
  };
}
