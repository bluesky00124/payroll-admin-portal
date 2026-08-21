import type { UserRole } from "@/components/providers";
import type { PayrollFeedback, PayrollFeedbackStatus, PayrollStatus } from "@/lib/types";

export const statusConfig: Record<PayrollStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info"; short: string }> = {
  admin_review: { label: "Chờ Admin/BCSX kiểm tra", short: "Admin/BCSX kiểm tra", tone: "warning" },
  project_approval: { label: "Chờ CDA/GSDA xác nhận", short: "CDA/GSDA xác nhận", tone: "info" },
  payslip_confirmation: { label: "NLĐ xác nhận phiếu lương", short: "Xác nhận phiếu lương", tone: "warning" },
  revenue_check: { label: "Chờ cập nhật doanh thu", short: "Kiểm tra doanh thu", tone: "info" },
  explanation_required: { label: "Cần giải trình chênh lệch", short: "Cần giải trình", tone: "danger" },
  ready_to_finalize: { label: "Sẵn sàng hoàn tất", short: "Chờ hoàn tất", tone: "success" },
  locked: { label: "Đã hoàn tất & khóa", short: "Đã khóa", tone: "success" },
};

export const feedbackConfig: Record<PayrollFeedbackStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  pending_owner: { label: "Chờ CDA/GSDA duyệt", tone: "warning" },
  pending_accounting: { label: "Chờ C&B xử lý", tone: "info" },
  adjusted: { label: "Đã điều chỉnh", tone: "success" },
  rejected: { label: "Đã từ chối", tone: "danger" },
};

export const feedbackCategoryLabels: Record<PayrollFeedback["category"], string> = {
  attendance: "Ngày công",
  overtime: "Tăng ca",
  allowance: "Phụ cấp",
  deduction: "Khấu trừ",
  personal: "Thông tin cá nhân",
  other: "Nội dung khác",
};

export const roleActors: Record<UserRole, string> = {
  accountant: "Trần Thu Trang (Kế toán C&B)",
  bcsx: "Bùi Minh Hạnh (BCSX)",
  project_owner: "Nguyễn Thu Hà (CDA)",
  payment_accountant: "Lê Thanh Tâm (Kế toán Thanh toán)",
};

export const workflowSteps = [
  { step: 1, title: "Chốt dữ liệu công", owner: "CDA / GSDA / BCSX", time: "03 ngày", description: "Bảng công được phê duyệt cuối cùng và thông tin nhân sự đã cập nhật." },
  { step: 2, title: "Lập bảng lương", owner: "Kế toán C&B", time: "02 ngày", description: "Đối chiếu Master Data, chế độ lương, bảo hiểm và các quyết định đã duyệt." },
  { step: 3, title: "Kiểm tra bảng lương", owner: "Admin dự án / BCSX", time: "01 ngày", description: "Đối chiếu ngày công, hồ sơ, ATM, MST, tạm giữ, vi phạm và ứng lương." },
  { step: 4, title: "Xác nhận bảng lương", owner: "CDA / GSDA", time: "01 ngày", description: "Kiểm tra và xác nhận dữ liệu trước khi phát hành." },
  { step: 5, title: "Phát hành phiếu lương", owner: "CDA / GSDA / C&B", time: "01 ngày", description: "Phân bổ bảng lương thành phiếu lương riêng cho từng NLĐ." },
  { step: 6, title: "Xác nhận phiếu lương", owner: "Người lao động", time: "01 ngày", description: "NLĐ xác nhận hoặc gửi phản hồi điều chỉnh qua ứng dụng." },
  { step: 7, title: "Cập nhật doanh thu", owner: "Kế toán Thanh toán", time: "01 ngày", description: "Kiểm tra chênh lệch tỷ lệ chi phí lương/doanh thu so với tháng trước." },
  { step: 8, title: "Giải trình chênh lệch", owner: "CDA / GSDA / C&B", time: "01 ngày", description: "Thực hiện khi |A| > 1,5% hoặc |B| > 10 triệu đồng." },
  { step: 9, title: "Hoàn tất & khóa", owner: "Kế toán C&B", time: "Ngày chi lương", description: "Lưu dữ liệu hoàn tất làm cơ sở lập danh sách chi lương." },
];

export const stageForStatus: Record<PayrollStatus, number> = {
  admin_review: 3,
  project_approval: 4,
  payslip_confirmation: 6,
  revenue_check: 7,
  explanation_required: 8,
  ready_to_finalize: 9,
  locked: 10,
};

export const sourceLabels = { system: "Hệ thống Công ty", excel: "Excel / Scan ký", customer: "Khách hàng xác nhận" } as const;
