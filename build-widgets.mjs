import { build } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import tailwindPostcss from "@tailwindcss/postcss";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = "C:/Hris/main-timetracking/UI/Contents/js";

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const widgets = [
  {
    name: "payroll-projects",
    entry: path.resolve(__dirname, "src/widgets/projects/index.ts"),
    outFile: "payroll-projects.min.js",
    globalName: "PayrollProjectsWidget",
  },
  {
    name: "payroll-employees",
    entry: path.resolve(__dirname, "src/widgets/employees/index.ts"),
    outFile: "payroll-employees.min.js",
    globalName: "PayrollEmployeesWidget",
  },
  {
    name: "payroll-runs",
    entry: path.resolve(__dirname, "src/widgets/runs/index.ts"),
    outFile: "payroll-runs.min.js",
    globalName: "PayrollRunsWidget",
  },
];

async function buildAll() {
  if (!fs.existsSync(path.resolve(__dirname, "dist-widget"))) {
    fs.mkdirSync(path.resolve(__dirname, "dist-widget"), { recursive: true });
  }

  for (const widget of widgets) {
    console.log(`\n📦 Building widget: ${widget.name}...`);
    await build({
      configFile: false,
      plugins: [react()],
      css: {
        postcss: {
          plugins: [tailwindPostcss()],
        },
      },
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
        emptyOutDir: false,
        minify: "esbuild",
        lib: {
          entry: widget.entry,
          name: widget.globalName,
          fileName: () => widget.outFile,
          formats: ["iife"],
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    });

    const src = path.resolve(__dirname, "dist-widget", widget.outFile);
    const dest = path.resolve(targetDir, widget.outFile);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✅ Deployed ${widget.outFile} -> ${dest}`);
    }
  }
  console.log("\n🎉 All 3 widgets built and deployed successfully!");
}

buildAll().catch((err) => {
  console.error("❌ Build error:", err);
  process.exit(1);
});
