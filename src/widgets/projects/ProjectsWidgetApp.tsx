"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortalContainerContext } from "@/components/ui";
import { WidgetNavigationProvider, usePathname, useParams } from "@/src/widget/navigation-adapter";
import { ProjectsList } from "@/components/projects-list";
import { ProjectDetail } from "@/components/project-detail";
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

export interface ProjectsWidgetConfig {
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

export const ProjectsWidgetContext = createContext<ProjectsWidgetConfig>({});

function ProjectsRouterView() {
  const pathname = usePathname();
  const params = useParams();

  if (
    (pathname.startsWith("/projects/") && pathname !== "/projects" && pathname !== "/projects/") ||
    params.projectId
  ) {
    const prjId = params.projectId || pathname.replace(/^\/projects\//, "").split("?")[0];
    return <ProjectDetail projectId={prjId} embedded={true} />;
  }

  return <ProjectsList />;
}

export function ProjectsWidgetApp({ config }: { config: ProjectsWidgetConfig }) {
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

  const initialUrl = config.projectId ? `/projects/${config.projectId}` : "/projects";

  return (
    <ProjectsWidgetContext.Provider value={config}>
      <PortalContainerContext.Provider value={config.mountElement || null}>
        <UserRoleContext.Provider value={roleValue}>
          <ThemeContext.Provider value={themeValue}>
            <ToastContext.Provider value={{ notify }}>
              <QueryClientProvider client={queryClient}>
                <WidgetNavigationProvider initialUrl={initialUrl}>
                  <div
                    className="payroll-widget-root text-slate-900 antialiased font-sans p-2 sm:p-4"
                    data-theme={preset}
                  >
                    <ProjectsRouterView />

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
    </ProjectsWidgetContext.Provider>
  );
}

export default ProjectsWidgetApp;
