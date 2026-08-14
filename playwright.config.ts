import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://localhost:3001/projects",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
