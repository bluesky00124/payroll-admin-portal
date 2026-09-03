"use client";

import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";

interface NavigationState {
  pathname: string;
  searchParams: URLSearchParams;
  params: Record<string, string>;
}

interface NavigationContextValue extends NavigationState {
  push: (url: string) => void;
  replace: (url: string) => void;
  back: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function WidgetNavigationProvider({
  initialUrl = "/projects",
  children,
}: {
  initialUrl?: string;
  children: ReactNode;
}) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);

  const parsed = useMemo(() => {
    const [pathPart, queryPart] = currentUrl.split("?");
    const searchParams = new URLSearchParams(queryPart || "");
    const pathname = pathPart || "/projects";

    const params: Record<string, string> = {};
    const payrollMatch = pathname.match(/^\/payroll\/([^/?#]+)/);
    if (payrollMatch) {
      params.payrollId = payrollMatch[1];
    }
    const projectMatch = pathname.match(/^\/projects\/([^/?#]+)/);
    if (projectMatch) {
      params.projectId = projectMatch[1];
    }

    return { pathname, searchParams, params };
  }, [currentUrl]);

  const value: NavigationContextValue = {
    ...parsed,
    push: (url: string) => setCurrentUrl(url),
    replace: (url: string) => setCurrentUrl(url),
    back: () => {
      // Go back to parent section
      if (parsed.pathname.startsWith("/payroll/")) setCurrentUrl("/payroll");
      else if (parsed.pathname.startsWith("/projects/")) setCurrentUrl("/projects");
      else setCurrentUrl("/projects");
    },
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    return {
      push: (url: string) => {
        if (typeof window !== "undefined") window.location.hash = url;
      },
      replace: (url: string) => {
        if (typeof window !== "undefined") window.location.hash = url;
      },
      back: () => {
        if (typeof window !== "undefined") window.history.back();
      },
      forward: () => {
        if (typeof window !== "undefined") window.history.forward();
      },
      refresh: () => {},
      prefetch: () => {},
    };
  }

  return {
    push: (url: string) => ctx.push(url),
    replace: (url: string) => ctx.replace(url),
    back: () => ctx.back(),
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  const ctx = useContext(NavigationContext);
  return ctx ? ctx.pathname : "/projects";
}

export function useSearchParams() {
  const ctx = useContext(NavigationContext);
  return ctx ? ctx.searchParams : new URLSearchParams();
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  const ctx = useContext(NavigationContext);
  return (ctx ? ctx.params : {}) as T;
}

export function Link({
  href,
  children,
  className,
  onClick,
  ...props
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  [key: string]: any;
}) {
  const router = useRouter();

  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick(e);
        router.push(href);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

export default Link;
