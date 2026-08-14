# Payroll Project Admin Portal

Admin portal demo để cấu hình chính sách và công thức tính lương riêng cho từng dự án cung ứng lao động. Giao diện và dữ liệu hoàn toàn bằng tiếng Việt; toàn bộ nhân viên mẫu đều là dữ liệu tổng hợp, không chứa PII từ bảng Excel.

## Chạy local

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Mở [http://localhost:3000/projects](http://localhost:3000/projects). Nếu cổng 3000 đang được dùng, Vinext sẽ hiển thị URL thực tế trong terminal.

## Các màn hình chính

- `/projects`: tìm kiếm, lọc, phân trang, tạo, sao chép và lưu trữ dự án.
- `/projects/[projectId]`: chi tiết dự án dạng một trang cuộn với điều hướng anchor.
- Ba section ưu tiên: Tổng quan & chế độ, Quản lý chi phí tăng ca, Công thức tính lương.
- Ba preset `Corporate Blue`, `Emerald`, `Graphite`; mỗi preset có light/dark mode và được lưu trên trình duyệt.
- Nút `Reset demo` khôi phục toàn bộ mock database về seed ban đầu.

## Kiến trúc demo

- Next.js App Router, TypeScript, Tailwind CSS và component primitives theo phong cách shadcn/ui.
- TanStack Query và TanStack Table cho data fetching/table state.
- React Hook Form và Zod cho form/validation.
- MSW chặn toàn bộ request `/api/*`; UI không đọc mock database trực tiếp.
- LocalStorage lưu database có `schemaVersion` và tự seed lại khi schema thay đổi.
- Rule builder dùng expression tree, kiểm tra biến thiếu, dependency và circular reference.
- Font self-hosted: Inter, Be Vietnam Pro và Roboto; không phụ thuộc font CDN.

Mock backend chỉ chạy trong trình duyệt. Backend thật, xác thực, RBAC, import Excel và payroll engine thật chưa nằm trong phạm vi bản demo.

## Kiểm tra chất lượng

```bash
npm run test        # Vitest: engine, LocalStorage, dynamic fields, API contract
npm run test:e2e    # Playwright: 8 luồng acceptance chính
npm run lint
npm run typecheck
npm run build
```

Playwright cần Chromium. Nếu máy chưa có browser runtime:

```bash
npx playwright install chromium
```

## Cấu trúc thư mục

```text
app/                  Routing, layout và design tokens
components/           Admin shell, project list, 3 section và UI primitives
lib/                  Types, API client, formula engine, seed/mock database
mocks/                MSW browser worker và request handlers
tests/                Unit, component và API contract tests
e2e/                  Playwright acceptance tests
```
