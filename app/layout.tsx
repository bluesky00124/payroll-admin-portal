import type { Metadata } from "next";
import { AppProviders } from "@/components/providers";
import "@fontsource/inter/vietnamese-400.css";
import "@fontsource/inter/vietnamese-600.css";
import "@fontsource/inter/vietnamese-700.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import "@fontsource/roboto/vietnamese-400.css";
import "@fontsource/roboto/vietnamese-600.css";
import "@fontsource/roboto/vietnamese-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Payroll Project Admin",
    template: "%s · Payroll Project Admin",
  },
  description: "Cổng cấu hình chính sách và công thức tính lương theo dự án.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
