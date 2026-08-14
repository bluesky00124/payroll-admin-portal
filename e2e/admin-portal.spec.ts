import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Quản lý dự án" })).toBeVisible();
});

test("tìm dự án, mở chi tiết và điều hướng giữa ba section", async ({ page }) => {
  await page.getByRole("textbox", { name: "Tìm dự án" }).fill("Jabil");
  await expect(page.getByText("Jabil Smart Solutions")).toBeVisible();
  await page.getByRole("button", { name: /JSS-ST Jabil Smart Solutions/ }).click();
  await expect(page).toHaveURL(/projects\/prj-jss$/);
  await expect(page.getByRole("heading", { name: "Tổng quan & chế độ", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quản lý chi phí tăng ca", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Công thức tính lương/ }).click();
  await expect(page).toHaveURL(/#salary-formulas/);
  await expect(page.getByRole("heading", { name: "Công thức tính lương" })).toBeVisible();
});

test("chọn chế độ, nhận form động và lưu vào dự án", async ({ page }) => {
  await page.goto("/projects/prj-jss#overview-policies");
  await page.getByRole("button", { name: "Chọn chế độ" }).click();
  await page.getByText("Phụ cấp điện thoại", { exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: /Mức hỗ trợ/ })).toHaveValue("200000");
  await page.getByRole("button", { name: "Thêm 1 chế độ" }).click();
  await expect(page.getByRole("cell", { name: "Phụ cấp điện thoại PHONE_ALLOWANCE", exact: true })).toBeVisible();
});

test("đổi hệ số và lưu cấu hình tăng ca", async ({ page }) => {
  await page.goto("/projects/prj-jss#overtime-costs");
  const overtimeRow = page.getByRole("row").filter({ hasText: "Tăng ca ngày thường" });
  await overtimeRow.getByRole("spinbutton").fill("1.55");
  await page.getByRole("button", { name: "Lưu cấu hình" }).first().click();
  await expect(page.getByText("Đã lưu cấu hình chấm công và tăng ca")).toBeVisible();
});

test("tạo công thức có cấu trúc và validate", async ({ page }) => {
  await page.goto("/projects/prj-jss#salary-formulas");
  await page.getByRole("button", { name: "Thêm công thức" }).click();
  await expect(page.locator(".formula-title-input")).toHaveValue("Công thức mới");
  await page.getByRole("button", { name: "Áp dụng" }).click();
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.getByText("Bộ công thức hợp lệ")).toBeVisible();
});

test("đổi theme và giữ lựa chọn sau reload", async ({ page }) => {
  await page.getByRole("button", { name: /Corporate Blue/ }).click();
  await page.getByRole("menuitem", { name: "Emerald" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "emerald");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "emerald");
});

test("reset toàn bộ dữ liệu demo", async ({ page }) => {
  await page.getByRole("button", { name: /Reset demo/ }).click();
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await expect(page.getByRole("heading", { name: "Quản lý dự án" })).toBeVisible();
  await expect(page.getByText("Jabil Smart Solutions")).toBeVisible();
});
