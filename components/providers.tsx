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

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside AppProviders");
  return context;
}

type ToastTone = "success" | "warning" | "error";
interface ToastItem { id: number; message: string; tone: ToastTone }
interface ToastContextValue { notify: (message: string, tone?: ToastTone) => void }
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside AppProviders");
  return context;
}

function AppRuntime({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = useState<ThemePreset>("corporate");
  const [mode, setMode] = useState<ColorMode>("light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const savedPreset = window.localStorage.getItem("payroll-theme-preset") as ThemePreset | null;
    const savedMode = window.localStorage.getItem("payroll-color-mode") as ColorMode | null;
    if (savedPreset) setPresetState(savedPreset);
    if (savedMode) setMode(savedMode);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preset;
    document.documentElement.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem("payroll-theme-preset", preset);
    window.localStorage.setItem("payroll-color-mode", mode);
  }, [preset, mode]);

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

  return (
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
