/**
 * Tự động nạp Google Fonts (Manrope & Inter) vào <head> của trang chứa Widget
 * Đảm bảo font chữ luôn sắc nét, đồng bộ 100% giống hệt khi chạy localhost:3000
 */
export function ensureWidgetFonts() {
  if (typeof document === "undefined") return;

  if (!document.querySelector("link[data-payroll-fonts='true']")) {
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    preconnect1.setAttribute("data-payroll-fonts", "true");
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    preconnect2.setAttribute("data-payroll-fonts", "true");
    document.head.appendChild(preconnect2);

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap";
    fontLink.setAttribute("data-payroll-fonts", "true");
    document.head.appendChild(fontLink);
  }
}
