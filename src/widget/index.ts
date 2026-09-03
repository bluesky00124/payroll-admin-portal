import React from "react";
import { createRoot, Root } from "react-dom/client";
import { PayrollWidgetApp, WidgetConfig } from "./PayrollWidgetApp";
import { ensureWidgetFonts } from "../widgets/common";
import tailwindStyles from "@/app/globals.css?inline";

class PayrollWidgetElement extends HTMLElement {
  private root: Root | null = null;
  private shadow: ShadowRoot | null = null;
  private mountPoint: HTMLDivElement | null = null;

  static get observedAttributes() {
    return ["api-base-url", "auth-token", "project-id", "payroll-id", "user-role", "theme", "initial-route", "route"];
  }

  connectedCallback() {
    // 0. Tự động nạp Google Fonts Manrope & Inter vào document head
    ensureWidgetFonts();

    // 1. Gắn Shadow Root (cô lập 100% style)
    if (!this.shadow) {
      this.shadow = this.attachShadow({ mode: "open" });
    }

    // 2. Bơm CSS Tailwind và Reset vào Shadow Root
    if (!this.shadow.querySelector("style[data-widget-styles]")) {
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-widget-styles", "true");
      styleEl.textContent = tailwindStyles;
      this.shadow.appendChild(styleEl);
    }

    // 3. Tạo mount container cho React
    if (!this.mountPoint) {
      this.mountPoint = document.createElement("div");
      this.mountPoint.id = "payroll-app-mount";
      this.mountPoint.className = "payroll-app-mount-node";
      this.shadow.appendChild(this.mountPoint);
    }

    // 4. Render React
    this.renderApp();
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue !== newValue && this.root && this.mountPoint) {
      this.renderApp();
    }
  }

  private renderApp() {
    if (!this.shadow || !this.mountPoint) return;

    const config: WidgetConfig = {
      shadowRoot: this.shadow,
      mountElement: this.mountPoint,
      apiBaseUrl: this.getAttribute("api-base-url") || "",
      authToken: this.getAttribute("auth-token") || "",
      projectId: this.getAttribute("project-id") || "",
      payrollId: this.getAttribute("payroll-id") || "",
      initialRoute: this.getAttribute("route") || this.getAttribute("initial-route") || "",
      userRole: (this.getAttribute("user-role") as any) || "accountant",
      themePreset: (this.getAttribute("theme") as any) || "corporate",
      onEvent: (name: string, detail: any) => {
        this.dispatchEvent(
          new CustomEvent(name, {
            bubbles: true,
            composed: true, // Cho phép event vượt qua ranh giới Shadow DOM ra Light DOM
            detail,
          })
        );
      },
    };

    if (!this.root) {
      this.root = createRoot(this.mountPoint);
    }

    this.root.render(React.createElement(PayrollWidgetApp, { config }));
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

// Đăng ký custom tag <payroll-widget>
if (typeof window !== "undefined" && !customElements.get("payroll-widget")) {
  customElements.define("payroll-widget", PayrollWidgetElement);
}

export { PayrollWidgetElement };
