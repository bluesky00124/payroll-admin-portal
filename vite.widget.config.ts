import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({ NODE_ENV: "production" }),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "next/navigation": path.resolve(__dirname, "./src/widget/navigation-adapter.tsx"),
      "next/link": path.resolve(__dirname, "./src/widget/navigation-adapter.tsx"),
    },
  },
  build: {
    outDir: "dist-widget",
    emptyOutDir: true,
    minify: "esbuild",
    lib: {
      entry: path.resolve(__dirname, "src/widget/index.ts"),
      name: "PayrollWidget",
      fileName: () => "payroll-widget.min.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
