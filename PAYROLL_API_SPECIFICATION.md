# TÀI LIỆU API SPECIFICATION — MODULE BẢNG LƯƠNG (PAYROLL V3)
**Hệ Thống:** Green Speed HRIS  
**Phiên bản:** 3.1.0  
**Tài liệu tham chiếu:** Quy trình tính lương `PKT.QT06.V05`  
**Ngày cập nhật:** 16/09/2026  

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Thông tin kết nối
- **Base URL:** `/api/payroll-v3`
- **Môi trường Development:** `https://localhost:5001/api/payroll-v3` hoặc IIS Express `http://localhost:5000/api/payroll-v3`
- **Định dạng dữ liệu:** `application/json` (Encoding: `UTF-8`)
- **Authentication:** Bearer JWT Token gửi qua Request Header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Context Người dùng:** Thông tin user được trích xuất trực tiếp từ Claims của Token:
  - `CurrentUserId`: Claim `EmployeeId` (Kiểu số nguyên `int`)
  - `CurrentEmployeeCode`: Claim `GID` hoặc `EmployeeCode` (Mã định danh NV)

---

### 1.2. Vòng đời Trạng thái Kỳ lương (State Machine)

Kỳ lương (`payroll.payroll_period.status`) trải qua các trạng thái tuần tự:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                                                        │
                  ▼                                                        │
┌─────────┐   [Tính lương]   ┌────────────┐   [Trình duyệt]   ┌───────────┐│   [Duyệt xong bước 6]   ┌────────┐
│  draft  ├─────────────────►│ calculated ├──────────────────►│ submitted ├┴────────────────────────►│ locked │
└─────────┘                  └────────────┘                   └─────┬─────┘                          └────────┘
                                    ▲                               │
                                    │       [Từ chối / Reject]      │
                                    └───────────────────────────────┘
```

| Trạng thái | Ý nghĩa | Hành vi cho phép |
|---|---|---|
| `draft` | Mới đồng bộ từ Bảng công sang, chưa tính lương | Cho phép đồng bộ lại, cập nhật đầu vào. Chưa được trình duyệt. |
| `calculated` | Đã chạy engine tính toán lương | Cho phép xem bảng lương ma trận, tính lại, xuất Excel, trình duyệt (`submit`). |
| `submitted` | Đang trong luồng phê duyệt (Workflow pending) | Không cho phép chạy tính toán lại. Chỉ các cấp có thẩm quyền thực hiện duyệt (`approve`) hoặc từ chối (`reject`). |
| `locked` | Đã duyệt hoàn tất bước cuối (C&B khóa sổ) | Đóng băng toàn bộ số liệu. Không cho phép tính toán lại hay sửa đổi. |

---

### 1.3. Kiến trúc Workflow Core Engine Dùng Chung (Generic Workflow)

Hệ thống tích hợp với bộ **Workflow Core Engine Dùng Chung** độc lập:
- **Entity Type:** `MONTHLY_PAYROLL`
- **Stored Procedures Core:** `dbo.wf_core_Submit`, `dbo.wf_core_Approve`, `dbo.wf_core_Reject`, `dbo.wf_core_GetTimeline`.
- **C# Service:** `IWorkflowService` / `WorkflowService`.

| Bước (`step_order`) | Tên bước duyệt | Đối tượng duyệt (`actor`) | Deadline | Khi quá hạn | Khi từ chối |
|:---:|---|---|:---:|:---:|:---:|
| **1** | C&B lập & trình duyệt | Role C&B (`ROLE: 19`) | — | — | Hủy quy trình (`CANCEL`) |
| **2** | BCSX / Admin xác nhận | Role BCSX/Admin (`ROLE: 23`) | 24h | `AUTO_REJECT` | Trả về bước 1 (`RESET_TO_STEP_1`) |
| **3** | CDA / GSDA xác nhận | Role CDA/GSDA (`ROLE: 22`) | 24h | `AUTO_REJECT` | Trả về bước 1 (`RESET_TO_STEP_1`) |
| **4** | Người lao động xác nhận | Tập thể NLĐ trong kỳ (`ROLE: 16`) | 24h | `AUTO_APPROVE` | Trả về bước 1 (`RESET_TO_STEP_1`) |
| **5** | Kế toán nhập doanh thu | Role Kế toán (`ROLE: 24`) | 24h | `AUTO_APPROVE` | Trả về bước 1 (`RESET_TO_STEP_1`) |
| **6** | C&B hoàn tất & khóa sổ | Role C&B (`ROLE: 19`) | — | — | Trả về bước 1 (`RESET_TO_STEP_1`) |

> **Quy tắc Nghiệp vụ Đặc thù (Lifecycle Hooks):**
> 1. **Khi Step 3 (CDA/GSDA) duyệt thành công**: Hệ thống tự động kích hoạt phát hành phiếu lương (`status = 'published'`) vào bảng `payroll.payroll_employee_confirmation` cho toàn bộ nhân viên trong kỳ để NLĐ vào xác nhận ở Bước 4.
> 2. **Khi Step 6 (C&B) duyệt hoàn tất**: Quy trình chuyển `status = 'approved'`, hệ thống tự động cập nhật `payroll.payroll_period` sang `status = 'locked'`, gán `locked_at = GETDATE()`, `locked_by = CurrentUserId`.
> 3. **Khi bất kỳ bước nào bị Reject**: Hệ thống tự động chuyển kỳ lương về `status = 'calculated'` để C&B điều chỉnh hoặc tính toán lại.

### 1.4. Phân Quyền Dự Án (Project Authorization)
Khi người dùng truy cập các màn hình quản lý bảng lương:
- **Tài khoản Quản trị / Lãnh đạo** (`UserId IN (1, 389696, 650932)` hoặc có `roleid IN (1, 15, 21, 25, 26, 27)`): Có toàn quyền xem tất cả các dự án trong hệ thống.
- **Tài khoản Quản lý / C&B / Người dùng thường**: Hệ thống tự động kiểm tra bảng `dbo.ProjectUsers` (`pu.UserId = CurrentUserId AND pu.Active = 1`).
  - Dropdown chọn dự án chỉ hiển thị những dự án người dùng được phân quyền.
  - Các API lấy bảng công đã chốt (`/approved-timesheets`) và danh sách bảng lương (`/periods`) tự động áp dụng bộ lọc phân quyền dự án, đảm bảo người dùng không xem được dữ liệu ngoài phạm vi quản lý kể cả khi chọn "Tất cả dự án".

---

## 2. CHI TIẾT CÁC ENDPOINT API

---

### NHÓM 1: QUẢN LÝ BẢNG LƯƠNG & BẢNG CÔNG CHỐT

#### 1.0. Lấy danh sách Dự án theo phân quyền (Dành cho Dropdown Chọn dự án)
- **Method:** `GET`
- **URL:** `/projects`
- **Mô tả:** Lấy danh sách các dự án đang hoạt động (`Active = 1`) mà tài khoản đang đăng nhập được phân quyền quản lý (Admin thấy tất cả dự án, user thường chỉ thấy các dự án được gán trong `dbo.ProjectUsers`).
- **Query Parameters:** Không có.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải danh sách dự án theo phân quyền thành công.",
  "data": [
    {
      "id": 6,
      "projectId": 1115,
      "projectCode": "ABB-MT",
      "projectName": "Khu vực Abbott"
    },
    {
      "id": 11,
      "projectId": 1104,
      "projectCode": "AJN-LT",
      "projectName": "Khu vực Ajinomoto Long Thành"
    }
  ]
}
```

---

#### 1.1. Lấy danh sách Bảng công đã chốt (Dành cho Popup "Tạo bảng lương mới")
- **Method:** `GET`
- **URL:** `/approved-timesheets`
- **Mô tả:** Lấy danh sách các bảng công của dự án trong tháng/năm đã được phê duyệt chốt (`dbo.project_timesheet.status = 1`), tự động lọc theo phân quyền dự án của user hiện tại. Trả về kèm cờ `isCreatedPayroll` để UI hiển thị badge *"Đã tạo bảng lương"* (disable radio button) hoặc *"Đã chốt"* (cho phép chọn để tạo bảng lương).
- **Query Parameters:**

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|:---:|:---:|---|
| `projectId` | `int` | | `null` | Mã dự án (ID hoặc ProjectId) |
| `month` | `int` | ✅ | — | Tháng cần tra cứu (1 - 12) |
| `year` | `int` | ✅ | — | Năm cần tra cứu (vd: 2026) |

- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải danh sách bảng công đã chốt thành công.",
  "data": [
    {
      "projectTimesheetId": 2556,
      "timesheetCode": "BCC-2556",
      "timesheetName": "Bảng công tháng 7/2026",
      "timesheetType": 0,
      "timesheetTypeName": "Bảng công tháng",
      "startDate": "2026-07-01T00:00:00",
      "endDate": "2026-07-31T00:00:00",
      "totalEmployees": 460,
      "approvedAt": "2026-09-10T15:59:33.88",
      "approvedByName": "LÊ VĂN HIỀN",
      "isCreatedPayroll": true,
      "payrollPeriodId": 1
    },
    {
      "projectTimesheetId": 347,
      "timesheetCode": "BCC-347",
      "timesheetName": "Bảng công tuần (01/07/2026 - 05/07/2026)",
      "timesheetType": 1,
      "timesheetTypeName": "Bảng công tuần",
      "startDate": "2026-07-01T00:00:00",
      "endDate": "2026-07-05T00:00:00",
      "totalEmployees": 120,
      "approvedAt": "2026-07-25T17:30:00",
      "approvedByName": "Quản lý / CDA",
      "isCreatedPayroll": false,
      "payrollPeriodId": null
    }
  ]
}
```

---

#### 1.2. Lấy danh sách bảng lương theo Tháng/Năm (Màn hình "Danh sách Bảng lương")
- **Method:** `GET`
- **URL:** `/periods`
- **Mô tả:** Lấy danh sách toàn bộ các kỳ/bảng lương đã được tạo trong tháng/năm, hỗ trợ lọc theo dự án, trạng thái và tìm kiếm theo từ khóa. Tự động áp dụng phân quyền xem dự án dựa trên tài khoản đang đăng nhập.
- **Query Parameters:**

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|:---:|:---:|---|
| `month` | `int` | ✅ | — | Tháng cần tra cứu (1 - 12) |
| `year` | `int` | ✅ | — | Năm cần tra cứu (vd: 2026) |
| `projectId` | `int` | | `null` | Mã dự án (nếu muốn lọc theo 1 dự án cụ thể) |
| `status` | `string` | | `null` | Lọc theo trạng thái: `draft`, `calculated`, `submitted`, `locked` |
| `search` | `string` | | `null` | Tìm kiếm theo Mã bảng lương, Mã dự án hoặc Tên dự án |
| `page` | `int` | | `1` | Trang hiện tại |
| `pageSize` | `int` | | `20` | Số bản ghi trên một trang |

> [!NOTE]
> **Bảo mật & Phân quyền**: Frontend **không** truyền tham số `userId`. Backend tự động trích xuất `CurrentUserId` từ JWT Bearer Token trong request header để lọc danh sách dự án mà người dùng được phân quyền quản lý.

- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải danh sách bảng lương thành công.",
  "data": {
    "filter": {
      "month": 8,
      "year": 2026,
      "projectId": null,
      "search": null,
      "status": null
    },
    "data": [
      {
        "id": 1,
        "periodCode": "BL-JSS-ST-202608-V1",
        "projectId": 1017,
        "projectCode": "JSS-ST",
        "projectName": "Jabil Smart Solutions",
        "sourceTimesheetCode": "BCC-JSS-082026-02",
        "year": 2026,
        "month": 8,
        "startDate": "2026-08-01T00:00:00",
        "endDate": "2026-08-31T00:00:00",
        "standardWorkdays": 26.0,
        "status": "calculated",
        "wfInstanceId": 12,
        "wfCurrentStepOrder": 2,
        "wfCurrentStepName": "Admin/BCSX kiểm tra",
        "wfStepDeadline": "2026-08-22T17:00:00",
        "totalEmployees": 6,
        "totalNet": 44093000.0,
        "totalDeduction": 5731000.0,
        "disputeCount": 2,
        "createdAt": "2026-08-20T08:30:00",
        "createdByName": "Trần Thu Trang",
        "updatedAt": "2026-08-20T10:15:00",
        "updatedByName": "Trần Thu Trang"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### 1.3. Xem thông tin chi tiết 1 kỳ lương
- **Method:** `GET`
- **URL:** `/periods/{id}`
- **Path Parameter:** `id` (`int`) — ID của kỳ lương (`payroll_period.id`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải thông tin kỳ lương thành công.",
  "data": {
    "id": 1,
    "periodCode": "PJ_KCV_NM_202606",
    "projectId": 1017,
    "projectCode": "KCV-NM",
    "projectName": "Dự án KCV Nhà máy",
    "year": 2026,
    "month": 6,
    "startDate": "2026-06-01T00:00:00",
    "endDate": "2026-06-30T00:00:00",
    "standardWorkdays": 26.0,
    "status": "calculated",
    "wfInstanceId": 12,
    "wfCurrentStepOrder": 1,
    "wfCurrentStepName": "C&B lập & trình duyệt",
    "wfStepDeadline": null,
    "totalEmployees": 4,
    "totalNet": 27687692.0,
    "lockedAt": null,
    "lockedBy": null,
    "createdAt": "2026-06-25T08:00:00",
    "createdByName": "C&B Admin"
  }
}
```

---

### NHÓM 2: ĐẦU VÀO & TÍNH TOÁN LƯƠNG

#### 2.1. Đồng bộ dữ liệu từ Bảng công đã duyệt
- **Method:** `POST`
- **URL:** `/periods/sync-timesheet` *(hoặc alias `/sync-timesheet`)*
- **Mô tả:** Đồng bộ số giờ công, ngày công, tăng ca từ Bảng công đã duyệt hoàn tất (`dbo.project_timesheet.status = 1`) sang `payroll.payroll_input`. Tự động tạo kỳ lương nếu chưa có.
  - Ca làm việc tiêu chuẩn hoặc ngày thường $\ge 4$ giờ $\rightarrow$ tính `1.0` ngày công thực tế.
  - Ca nửa ngày `P/2` (shift_type = 5 hoặc shift_name = 'P/2') làm việc $\ge 4$ giờ $\rightarrow$ tính `0.5` ngày công thực tế.
  - Tách bạch OT đêm ngày thường: nhóm 200% (chỉ có OT đêm) và nhóm 210% (có cả OT ngày và OT đêm).
- **Request Body:**
```json
{
  "projectTimesheetId": 2556,
  "payrollPeriodId": 1,
  "forceResetManual": false
}
```

| Thuộc tính | Kiểu | Bắt buộc | Mô tả |
|---|---|:---:|---|
| `projectTimesheetId` | `int` | ✅ | ID Bảng công đã duyệt (`dbo.project_timesheet.id`) |
| `payrollPeriodId` | `int` | | ID kỳ lương mục tiêu. Nếu `null`, hệ thống tự tìm hoặc tạo kỳ lương theo Dự án + Tháng/Năm |
| `forceResetManual` | `bool` | | `true`: Ghi đè cả các ô số liệu C&B đã chỉnh sửa tay trước đó |

- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Đồng bộ dữ liệu chấm công vào bảng lương thành công.",
  "data": {
    "payrollPeriodId": 1,
    "periodCode": "PJ_KCV_NM_202606",
    "projectTimesheetId": 2556,
    "totalEmployeesSynced": 4,
    "totalAffectedRows": 4,
    "syncedAt": "2026-09-16T08:30:00"
  }
}
```

---

#### 2.2. Chạy tính toán bảng lương (Trigger Calculation)
- **Method:** `POST`
- **URL:** `/periods/{id}/calculate`
- **Mô tả:** Thực thi toàn bộ cây công thức tính lương của dự án qua `PayrollCalculationEngine`.
  - Tự động nạp các khoản Thu nhập khác (`payroll.payroll_other_income`, tiền lương điều chỉnh `adjustment_salary`, lương hỗ trợ dự án khác `support_other_project_salary`) và cộng vào `grossSalary`.
  - Tự động nạp các khoản Khấu trừ khác (`payroll.payroll_other_deduction`, tạm ứng lương, tạm ứng qua ứng dụng Ekko) và trừ vào `totalDeduction` cùng `netSalary`.
  - **Tối ưu hóa Senior BE:** Để tránh response payload phình to hàng chục MB gây nghẽn băng thông và timeout khi dự án có hàng nghìn công nhân, API này **chỉ trả về Báo cáo kết quả thực thi (Execution Summary)**. Sau khi tính xong, Frontend gọi API `2.4 (GET /employees)` hoặc `2.6 (GET /payroll-sheet)` có phân trang để hiển thị bảng dữ liệu.
- **Request Body:**
```json
{
  "employeeCode": null
}
```
*(Nếu `employeeCode` = null: Tính cho toàn bộ nhân viên; nếu có giá trị: Chỉ tính cho nhân viên cụ thể đó).*

- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tính toán bảng lương thành công.",
  "data": {
    "payrollPeriodId": 1,
    "periodCode": "PJ_KCV_NM_202606",
    "totalCalculated": 460,
    "totalGross": 3450000000.0,
    "totalNet": 3019936710.0,
    "totalDeduction": 430063290.0,
    "executionTimeMs": 1450,
    "calculatedAt": "2026-09-17T10:35:00"
  }
}
```

---

#### 2.3. Dashboard KPI tổng quan kỳ lương
- **Method:** `GET`
- **URL:** `/periods/{id}/summary`
- **Mô tả:** Lấy số liệu thống kê tài chính và nhân sự của kỳ lương (Header KPI cards).
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải KPI tổng quan kỳ lương thành công.",
  "data": {
    "payrollPeriodId": 1,
    "periodCode": "PJ_KCV_NM_202606",
    "totalEmployees": 4,
    "totalGross": 30011492.0,
    "totalNet": 27687692.0,
    "totalCompanyCost": 35200000.0,
    "totalTax": 0.0,
    "totalInsuranceEmployee": 2230200.0,
    "totalActualWorkdays": 64.0,
    "totalOvertimeHours": 656.0
  }
}
```

---

#### 2.4. Danh sách nhân viên trong kỳ lương (Paged Result)
- **Method:** `GET`
- **URL:** `/periods/{id}/employees`
- **Mô tả:** Lấy danh sách kết quả tính toán chi tiết của từng nhân viên, hỗ trợ tìm kiếm và phân trang chuẩn Senior BE Envelope.
- **Query Parameters:**
  - `search` (`string`, optional): Tìm theo Mã NV hoặc Họ tên
  - `page` (`int`, optional, default `1`): Trang hiện tại
  - `pageSize` (`int`, optional, default `50`): Số lượng bản ghi trên một trang
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải danh sách nhân viên kỳ lương thành công.",
  "data": {
    "items": [
      {
        "payrollEmployeeId": 902,
        "payrollPeriodId": 1,
        "employeeCode": "T140-00166",
        "fullName": "LÊ HÙNG DŨNG",
        "targetGroupCode": "KCV_OFFICIAL",
        "actualWorkdays": 16.0,
        "totalHours": 164.0,
        "basicSalary": 4800000.0,
        "hourlyNormalRate": 23076.92,
        "hourlyOtRate": 23076.92,
        "normalSalary": 2950000.0,
        "nightShiftAllowance": 428885.0,
        "totalOvertime": 1838077.0,
        "totalAllowance": 563885.0,
        "totalBonus": 721296.0,
        "mealAllowance": 135000.0,
        "attendanceBonus": 531481.0,
        "kpiBonus": 189815.0,
        "totalOtherIncome": 1429615.0,
        "grossSalary": 7502873.0,
        "insuranceEmployee": 557550.0,
        "unionFee": 23400.0,
        "totalOtherDeduction": 0.0,
        "totalDeduction": 580950.0,
        "netSalary": 6921923.0,
        "calculatedAt": "2026-09-16T15:45:00"
      }
    ],
    "page": 1,
    "pageSize": 50,
    "total": 460,
    "totalPages": 10
  }
}
```

---

#### 2.5. Chi tiết Phiếu lương (Payslip) của 1 nhân viên
- **Method:** `GET`
- **URL:** `/periods/{id}/employees/{employeeCode}`
- **Mô tả:** Xem phiếu lương chi tiết từng khoản thu nhập, phụ cấp, thưởng, khấu trừ và **bảng chi tiết chấm công từng ngày (`timesheetDetails`)** của nhân viên.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải phiếu lương chi tiết thành công.",
  "data": {
    "summary": {
      "payrollEmployeeId": 902,
      "payrollPeriodId": 1,
      "employeeCode": "T140-00166",
      "fullName": "LÊ HÙNG DŨNG",
      "actualWorkdays": 16.0,
      "paidWorkdays": 16.0,
      "totalHours": 164.0,
      "grossSalary": 7502873.0,
      "totalDeduction": 580950.0,
      "netSalary": 6921923.0
    },
    "earnings": [
      { "componentCode": "NORMAL_SALARY", "componentName": "Lương thời gian ngày thường", "finalAmount": 2950000.0, "sign": 1 },
      { "componentCode": "NIGHT_SHIFT_ALLOWANCE", "componentName": "Phụ cấp làm việc ca đêm", "finalAmount": 428885.0, "sign": 1 },
      { "componentCode": "OT_NORMAL_SALARY", "componentName": "Lương làm thêm ngày thường", "finalAmount": 1225385.0, "sign": 1 },
      { "componentCode": "OT_WEEKEND_SALARY", "componentName": "Lương làm thêm ngày nghỉ hàng tuần", "finalAmount": 612692.0, "sign": 1 },
      { "componentCode": "MEAL_ALLOWANCE", "componentName": "Hỗ trợ tiền ăn", "finalAmount": 135000.0, "sign": 1 },
      { "componentCode": "ATTENDANCE_BONUS", "componentName": "Thưởng chuyên cần", "finalAmount": 531481.0, "sign": 1 },
      { "componentCode": "KPI_BONUS", "componentName": "Thưởng KPI / hiệu quả công việc", "finalAmount": 189815.0, "sign": 1 },
      { "componentCode": "ANNUAL_LEAVE_PAY_FINAL", "componentName": "Tiền phép năm chi trả khi thôi việc", "finalAmount": 1429615.0, "sign": 1 },
      { "componentCode": "ADJUSTMENT_SALARY", "componentName": "Tiền lương điều chỉnh (+ / -)", "finalAmount": 0.0, "sign": 1 },
      { "componentCode": "SUPPORT_PROJECT_SALARY", "componentName": "Tiền lương hỗ trợ dự án khác", "finalAmount": 0.0, "sign": 1 },
      { "componentCode": "OTHER_ALLOWANCE", "componentName": "Phụ cấp khác", "finalAmount": 0.0, "sign": 1 }
    ],
    "deductions": [
      { "componentCode": "TOTAL_INSURANCE_EMP", "componentName": "Tổng trích nộp BH bắt buộc người LĐ", "finalAmount": 557550.0, "sign": -1 },
      { "componentCode": "UNION_FEE", "componentName": "Đoàn phí Công đoàn", "finalAmount": 23400.0, "sign": -1 },
      { "componentCode": "ADVANCE_SALARY_DEDUCTION", "componentName": "Khấu trừ tạm ứng lương", "finalAmount": 0.0, "sign": -1 },
      { "componentCode": "EKKO_ADVANCE_DEDUCTION", "componentName": "Khấu trừ tạm ứng qua ứng dụng Ekko", "finalAmount": 0.0, "sign": -1 },
      { "componentCode": "OTHER_DEDUCTION", "componentName": "Khấu trừ khác", "finalAmount": 0.0, "sign": -1 }
    ],
    "timesheetDetails": [
      { "workingDate": "2026-06-01T00:00:00", "shiftName": "OFF", "checkIn": "", "checkOut": "", "workHours": 0.0, "dayHours": 0.0, "nightHours": 0.0, "overtimeHours": 0.0, "dayType": 2 },
      { "workingDate": "2026-06-02T00:00:00", "shiftName": "T8", "checkIn": "21:50", "checkOut": "05:51", "workHours": 8.0, "dayHours": 0.0, "nightHours": 8.0, "overtimeHours": 0.0, "dayType": 1 },
      { "workingDate": "2026-06-03T00:00:00", "shiftName": "D12", "checkIn": "17:50", "checkOut": "05:55", "workHours": 12.0, "dayHours": 0.0, "nightHours": 8.0, "overtimeHours": 4.0, "dayType": 1 },
      { "workingDate": "2026-06-04T00:00:00", "shiftName": "T8", "checkIn": "21:51", "checkOut": "05:51", "workHours": 8.0, "dayHours": 0.0, "nightHours": 8.0, "overtimeHours": 0.0, "dayType": 1 },
      { "workingDate": "2026-06-05T00:00:00", "shiftName": "D12", "checkIn": "17:50", "checkOut": "05:51", "workHours": 12.0, "dayHours": 0.0, "nightHours": 8.0, "overtimeHours": 4.0, "dayType": 1 }
    ]
  }
}
```

---

#### 2.6. Bảng lương đầy đủ cột động (Dynamic UI Grid)
- **Method:** `GET`
- **URL:** `/periods/{id}/payroll-sheet`
- **Mô tả:** Trả về ma trận bảng lương hoàn chỉnh phục vụ render Grid trên Web UI.
  - Cấu trúc cột (`columns[]`) được sinh tự động theo thứ tự:
    1. **`INFO` (Thông tin nhân viên):** `employeeCode`, `fullName`, `bankAccountNumber`, `bankName`.
    2. **`DAILY_TIMESHEET` (Chấm công hàng ngày):** Tự động sinh từ ngày `day_01` (01/MM) đến ngày cuối tháng (ví dụ: `day_30` - 30/MM) thể hiện số giờ làm việc thực tế (`work_hour`) của nhân viên trong ngày đó.
    3. **`WORKDAYS` (Tổng hợp ngày công):** `actualWorkdays`, `paidWorkdays`, `totalHours`.
    4. **`EARNINGS` (Thu nhập):** Các khoản thu nhập, phụ cấp, thưởng, làm thêm, lương điều chỉnh, lương hỗ trợ dự án khác, phụ cấp khác.
    5. **`TOTAL` (Tổng thu nhập):** `grossSalary`.
    6. **`DEDUCTIONS` (Khấu trừ):** BHXH, Công đoàn, tạm ứng lương, tạm ứng Ekko, khấu trừ khác.
    7. **`TOTAL` (Thực lĩnh):** `netSalary`.
  - Dữ liệu dòng (`rows[]`): Mỗi phần tử là một Dictionary chứa toàn bộ giá trị tương ứng với từng cột.
- **Query Parameters:** `search`, `page` (default 1), `pageSize` (default 100).
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải bảng lương ma trận thành công.",
  "data": {
    "payrollPeriodId": 1,
    "periodCode": "PJ_KCV_NM_202606",
    "projectName": "Dự án KCV Nhà máy",
    "month": 6,
    "year": 2026,
    "standardWorkdays": 26.0,
    "columns": [
      { "key": "employeeCode", "title": "Mã NV", "group": "INFO", "dataType": "text", "isFixed": true },
      { "key": "fullName", "title": "Họ và tên", "group": "INFO", "dataType": "text", "isFixed": true },
      { "key": "bankAccountNumber", "title": "Số TK", "group": "INFO", "dataType": "text", "isFixed": false },
      { "key": "bankName", "title": "Ngân hàng", "group": "INFO", "dataType": "text", "isFixed": false },
      { "key": "day_01", "title": "01/06", "group": "DAILY_TIMESHEET", "dataType": "number", "isFixed": false },
      { "key": "day_02", "title": "02/06", "group": "DAILY_TIMESHEET", "dataType": "number", "isFixed": false },
      { "key": "day_03", "title": "03/06", "group": "DAILY_TIMESHEET", "dataType": "number", "isFixed": false },
      { "key": "day_04", "title": "04/06", "group": "DAILY_TIMESHEET", "dataType": "number", "isFixed": false },
      { "key": "day_05", "title": "05/06", "group": "DAILY_TIMESHEET", "dataType": "number", "isFixed": false },
      { "key": "actualWorkdays", "title": "Ngày công TT", "group": "WORKDAYS", "dataType": "number", "isFixed": false },
      { "key": "paidWorkdays", "title": "Ngày công hưởng lương", "group": "WORKDAYS", "dataType": "number", "isFixed": false },
      { "key": "totalHours", "title": "Tổng giờ công", "group": "WORKDAYS", "dataType": "number", "isFixed": false },
      { "key": "NORMAL_SALARY", "title": "Lương thời gian ngày thường", "group": "EARNINGS", "dataType": "currency", "isFixed": false },
      { "key": "NIGHT_SHIFT_ALLOWANCE", "title": "Phụ cấp làm việc ca đêm", "group": "EARNINGS", "dataType": "currency", "isFixed": false },
      { "key": "OT_NORMAL_SALARY", "title": "Lương làm thêm ngày thường", "group": "EARNINGS", "dataType": "currency", "isFixed": false },
      { "key": "ADJUSTMENT_SALARY", "title": "Tiền lương điều chỉnh (+ / -)", "group": "EARNINGS", "dataType": "currency", "isFixed": false },
      { "key": "SUPPORT_PROJECT_SALARY", "title": "Tiền lương hỗ trợ dự án khác", "group": "EARNINGS", "dataType": "currency", "isFixed": false },
      { "key": "OTHER_ALLOWANCE", "title": "Phụ cấp khác", "group": "EARNINGS", "dataType": "currency", "isFixed": false },
      { "key": "grossSalary", "title": "Tổng thu nhập (Gross)", "group": "TOTAL", "dataType": "currency", "isFixed": false },
      { "key": "TOTAL_INSURANCE_EMP", "title": "Tổng trích nộp BH bắt buộc người LĐ", "group": "DEDUCTIONS", "dataType": "currency", "isFixed": false },
      { "key": "UNION_FEE", "title": "Đoàn phí Công đoàn", "group": "DEDUCTIONS", "dataType": "currency", "isFixed": false },
      { "key": "ADVANCE_SALARY_DEDUCTION", "title": "Khấu trừ tạm ứng lương", "group": "DEDUCTIONS", "dataType": "currency", "isFixed": false },
      { "key": "EKKO_ADVANCE_DEDUCTION", "title": "Khấu trừ tạm ứng qua ứng dụng Ekko", "group": "DEDUCTIONS", "dataType": "currency", "isFixed": false },
      { "key": "OTHER_DEDUCTION", "title": "Khấu trừ khác", "group": "DEDUCTIONS", "dataType": "currency", "isFixed": false },
      { "key": "netSalary", "title": "Thực lĩnh (Net)", "group": "TOTAL", "dataType": "currency", "isFixed": false }
    ],
    "rows": [
      {
        "payrollEmployeeId": 902,
        "employeeCode": "T140-00166",
        "fullName": "LÊ HÙNG DŨNG",
        "bankAccountNumber": "0042",
        "bankName": "Vietcombank",
        "day_01": 0.0,
        "day_02": 8.0,
        "day_03": 12.0,
        "day_04": 8.0,
        "day_05": 12.0,
        "actualWorkdays": 16.0,
        "paidWorkdays": 16.0,
        "totalHours": 164.0,
        "grossSalary": 7502873.0,
        "personalIncomeTax": 0.0,
        "netSalary": 6921923.0,
        "NORMAL_SALARY": 2950000.0,
        "NIGHT_SHIFT_ALLOWANCE": 428885.0,
        "OT_NORMAL_SALARY": 1225385.0,
        "ADJUSTMENT_SALARY": 0.0,
        "SUPPORT_PROJECT_SALARY": 0.0,
        "OTHER_ALLOWANCE": 0.0,
        "TOTAL_INSURANCE_EMP": 557550.0,
        "UNION_FEE": 23400.0,
        "ADVANCE_SALARY_DEDUCTION": 0.0,
        "EKKO_ADVANCE_DEDUCTION": 0.0,
        "OTHER_DEDUCTION": 0.0
      }
    ],
    "page": 1,
    "pageSize": 100,
    "total": 4,
    "totalPages": 1
  }
}
```

---

#### 2.7. Xuất file Excel Bảng lương chuẩn doanh nghiệp
- **Method:** `GET`
- **URL:** `/periods/{id}/export`
- **Mô tả:** Tạo và tải về file Excel `.xlsx` chuẩn theo đúng biểu mẫu tài chính / C&B doanh nghiệp (`BANG_LUONG_{PROJECT}_{YEAR}{MONTH}.xlsx`).
  - **Khối Thông tin nhân viên (Xanh đậm):** Mã nhân viên, Họ tên, Ngày vào làm, CCCD, Số TK ngân hàng.
  - **Khối Chấm công hàng ngày (Xanh dương nhạt):** Liệt kê các ngày từ `01/MM` đến ngày cuối tháng. Ngày có đi làm hiển thị số giờ làm việc thực tế (`8.0`, `12.0`), ngày nghỉ hiển thị dấu gạch ngang **`-`** (format `#,#0.0;(#,#0.0);"-"`).
  - **Khối Tổng hợp ngày công:** Ngày công tiêu chuẩn, Giờ tiêu chuẩn, Ngày công thực tế, Ngày công hưởng lương, Giờ thường, Giờ đêm, Tăng ca...
  - **Khối Thu nhập (Xanh lá):** Lương thời gian, phụ cấp đêm, tăng ca, tiền ăn, chuyên cần, KPI, Tiền lương điều chỉnh, Lương hỗ trợ dự án khác, Phụ cấp khác...
  - **Cột Tổng thu nhập Gross:** Tự động gắn công thức Excel `=SUM(start:end)`.
  - **Khối Khấu trừ (Cam):** Bảo hiểm, Công đoàn, Tạm ứng lương, Tạm ứng Ekko, Khấu trừ khác...
  - **Cột Tổng khấu trừ:** Tự động gắn công thức Excel `=SUM(start:end)`.
  - **Cột Thực lĩnh Net:** Tự động gắn công thức Excel `=Gross - TotalDeduction`.
- **Response:** `200 OK` (File binary: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

---

### NHÓM 3: QUY TRÌNH PHÊ DUYỆT (WORKFLOW)

#### 3.1. Trình duyệt Bảng lương (Submit)
- **Method:** `POST`
- **URL:** `/periods/{id}/workflow/submit`
- **Mô tả:** C&B gửi trình duyệt bảng lương. Khởi tạo một `wf_instance` mới cho entity `MONTHLY_PAYROLL`, chuyển kỳ lương sang `status = 'submitted'` và kích hoạt Bước 1.
- **Request Body:**
```json
{
  "note": "Kính trình Ban Giám đốc và CDA phê duyệt bảng lương tháng 06/2026 dự án KCV Nhà máy."
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Trình duyệt bảng lương thành công.",
  "data": {
    "instanceId": 12
  }
}
```

---

#### 3.2. Phê duyệt bước hiện tại (Approve)
- **Method:** `POST`
- **URL:** `/periods/{id}/workflow/approve`
- **Mô tả:** Người có thẩm quyền phê duyệt bước hiện tại trong quy trình.
  - Tại **Bước 5 (Kế toán)**: Có thể truyền dữ liệu doanh thu qua object `stepData`.
  - Nếu có chênh lệch cần giải trình: Điền vào `justification`.
  - Khi duyệt xong Bước 3: Tự động publish phiếu lương cho toàn bộ NLĐ.
  - Khi duyệt xong Bước 6: Tự động khóa kỳ lương (`status = 'locked'`).
- **Request Body:**
```json
{
  "note": "Đã đối chiếu số liệu ngày công và KPI, đồng ý duyệt.",
  "stepData": null,
  "justification": null
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Phê duyệt bước hiện tại thành công.",
  "data": {
    "id": 12,
    "status": "in_progress",
    "currentStepOrder": 4,
    "currentStepName": "Người lao động xác nhận"
  }
}
```

---

#### 3.3. Từ chối / Trả về (Reject)
- **Method:** `POST`
- **URL:** `/periods/{id}/workflow/reject`
- **Mô tả:** Người duyệt từ chối bước hiện tại. Kỳ lương được hoàn trả về Bước 1, trạng thái kỳ lương chuyển lại về `status = 'calculated'` để C&B tính lại hoặc điều chỉnh.
- **Request Body:**
```json
{
  "reason": "Số giờ tăng ca ngày 14/06 của ca đêm chưa khớp biên bản sản xuất, đề nghị tính lại."
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Từ chối / trả về bảng lương thành công.",
  "data": {
    "id": 12,
    "status": "in_progress",
    "currentStepOrder": 1,
    "currentStepName": "C&B lập & trình duyệt"
  }
}
```

---

#### 3.4. Lấy lịch sử & Tiến trình duyệt (Timeline)
- **Method:** `GET`
- **URL:** `/periods/{id}/workflow`
- **Mô tả:** Trả về toàn bộ danh sách 6 bước duyệt, trạng thái từng bước (`pending`, `in_progress`, `approved`, `rejected`), deadline, thông tin người duyệt và lịch sử thao tác (`action_logs`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải tiến trình phê duyệt thành công.",
  "data": {
    "instance": {
      "id": 12,
      "entityType": "MONTHLY_PAYROLL",
      "entityId": 1,
      "status": "in_progress",
      "currentStepOrder": 3,
      "currentStepName": "CDA/GSDA xác nhận",
      "stepDeadline": "2026-06-28T17:00:00"
    },
    "steps": [
      { "stepOrder": 1, "stepName": "C&B lập & trình duyệt", "status": "approved", "completedAt": "2026-06-25T09:15:00" },
      { "stepOrder": 2, "stepName": "BCSX / Admin xác nhận", "status": "approved", "completedAt": "2026-06-26T14:30:00" },
      { "stepOrder": 3, "stepName": "CDA / GSDA xác nhận", "status": "in_progress", "completedAt": null },
      { "stepOrder": 4, "stepName": "Người lao động xác nhận", "status": "pending", "completedAt": null },
      { "stepOrder": 5, "stepName": "Kế toán nhập doanh thu", "status": "pending", "completedAt": null },
      { "stepOrder": 6, "stepName": "C&B hoàn tất & khóa sổ", "status": "pending", "completedAt": null }
    ],
    "history": [
      {
        "action": "APPROVE",
        "actorName": "Trần Văn B (BCSX)",
        "comment": "Đã kiểm tra số liệu ca sản xuất đầy đủ.",
        "createdAt": "2026-06-26T14:30:00"
      }
    ]
  }
}
```

---

### NHÓM 4: CỔNG NHÂN VIÊN (EMPLOYEE PORTAL)

#### 4.1. Người lao động tự xem phiếu lương của mình
- **Method:** `GET`
- **URL (Khuyến nghị RESTful):** `/me/payslips/{periodId}` hoặc `/me/payslip` (Query params `month`, `year`)
- **Mô tả:** Nhân viên tra cứu phiếu lương cá nhân của chính mình. Hệ thống tự động trích xuất `employeeCode` từ JWT Claims của User đang đăng nhập và tự động ghi nhận trạng thái đã xem (`status = 'viewed'`).
- **Query Parameters (nếu dùng `/me/payslip`):**
  - `month` (`int`): Tháng cần xem (1 - 12)
  - `year` (`int`): Năm cần xem (vd: 2026)
  - Hoặc gọi trực tiếp `/me/payslips/{periodId}` theo ID kỳ lương.
- **Response `200 OK`:** Cấu trúc tương tự API `2.5`, chứa `summary`, `earnings`, `deductions`, và `timesheetDetails`.

---

#### 4.2. Người lao động bấm "Xác nhận đúng"
- **Method:** `POST`
- **URL (Khuyến nghị RESTful):** `/me/payslips/{periodId}/confirm` (hoặc alias `/me/payslip/confirm` có body `payrollPeriodId`)
- **Mô tả:** Người lao động đồng ý với số liệu lương, chuyển trạng thái xác nhận sang `confirmed`.
- **Response `200 OK` (Semantic Entity Result - Loại bỏ Anti-pattern bọc success):**
```json
{
  "success": true,
  "message": "Xác nhận phiếu lương thành công.",
  "data": {
    "payrollPeriodId": 1,
    "employeeCode": "T140-00166",
    "status": "confirmed",
    "confirmedAt": "2026-06-27T08:00:00"
  }
}
```

---

#### 4.3. Người lao động khiếu nại sai lệch
- **Method:** `POST`
- **URL (Khuyến nghị RESTful):** `/me/payslips/{periodId}/dispute` (hoặc alias `/me/payslip/dispute` có body `payrollPeriodId`)
- **Mô tả:** Người lao động gửi khiếu nại nếu phát hiện sai sót về ngày công, giờ tăng ca, phụ cấp hoặc khấu trừ. Trạng thái xác nhận chuyển sang `disputed`.
- **Request Body:**
```json
{
  "disputedSection": "OVERTIME",
  "reason": "Ngày 03/06 tôi có tăng ca 4 tiếng ca đêm nhưng trên phiếu lương chưa thấy cộng đủ tiền làm thêm."
}
```
- **Response `200 OK` (Semantic Entity Result):**
```json
{
  "success": true,
  "message": "Gửi khiếu nại phiếu lương thành công.",
  "data": {
    "payrollPeriodId": 1,
    "employeeCode": "T140-00166",
    "status": "disputed",
    "disputedAt": "2026-06-27T08:15:00",
    "disputeReason": "Ngày 03/06 tôi có tăng ca 4 tiếng ca đêm nhưng trên phiếu lương chưa thấy cộng đủ tiền làm thêm."
  }
}
```

---

### NHÓM 5: QUẢN LÝ XÁC NHẬN & KHIẾU NẠI (C&B / HR)

#### 5.1. Thống kê xác nhận và danh sách khiếu nại (Paged Result)
- **Method:** `GET`
- **URL:** `/periods/{id}/confirmations`
- **Mô tả:** C&B/HR theo dõi tiến độ phản hồi của NLĐ trong Bước 4 (tổng số nhân viên, số người đã xem, số người xác nhận, số người khiếu nại) kèm phân trang danh sách khiếu nại.
- **Query Parameters:**
  - `status`: Lọc theo `published`, `viewed`, `confirmed`, `disputed`.
  - `search`: Tìm theo mã hoặc tên nhân viên.
  - `page`: Mặc định `1`.
  - `pageSize`: Mặc định `50`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tải thống kê xác nhận thành công.",
  "data": {
    "total": 4,
    "published": 0,
    "viewed": 1,
    "confirmed": 2,
    "disputed": 1,
    "disputes": [
      {
        "confirmationId": 801,
        "employeeCode": "T140-00166",
        "fullName": "LÊ HÙNG DŨNG",
        "status": "disputed",
        "disputeReason": "Ngày 03/06 tôi có tăng ca 4 tiếng ca đêm nhưng chưa thấy cộng đủ tiền.",
        "disputedAt": "2026-06-27T08:15:00"
      }
    ],
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  }
}
```

---

#### 5.2. C&B phản hồi và đóng khiếu nại
- **Method:** `POST`
- **URL:** `/periods/{id}/confirmations/{confirmationId}/resolve`
- **Mô tả:** C&B/HR nhập giải trình hoặc hướng xử lý khiếu nại của nhân viên và chuyển trạng thái khiếu nại sang đã giải quyết (`resolved`).
- **Request Body:**
```json
{
  "resolutionNote": "Đã đối chiếu bảng quẹt thẻ ca D12 ngày 03/06. Tiền làm thêm 4h đã được cộng chính xác trong mục OT_NORMAL_SALARY (1.225.385 đ)."
}
```
- **Response `200 OK` (Semantic Entity Result):**
```json
{
  "success": true,
  "message": "Xử lý khiếu nại thành công.",
  "data": {
    "confirmationId": 801,
    "status": "resolved",
    "resolutionNote": "Đã đối chiếu bảng quẹt thẻ ca D12 ngày 03/06. Tiền làm thêm 4h đã được cộng chính xác trong mục OT_NORMAL_SALARY (1.225.385 đ).",
    "resolvedAt": "2026-06-28T09:00:00"
  }
}
```

---

## 3. DANH MỤC MÃ LỖI VÀ HTTP STATUS CODES

| HTTP Status | Error Code | Ý nghĩa | Cách khắc phục |
|:---:|---|---|---|
| `200` | — | Thành công (`success: true`) | Dữ liệu trả về nằm trong `data` |
| `400` | `BAD_REQUEST` | Dữ liệu đầu vào sai định dạng hoặc vi phạm điều kiện logic | Kiểm tra message lỗi chi tiết và dữ liệu gửi lên |
| `401` | `UNAUTHORIZED` | Token JWT thiếu, không hợp lệ hoặc đã hết hạn | Đăng nhập lại để cấp token mới |
| `403` | `FORBIDDEN` | Không có quyền thực hiện thao tác (sai Role / Actor) | Kiểm tra quyền của tài khoản đối với bước duyệt |
| `404` | `NOT_FOUND` | Không tìm thấy Kỳ lương, Nhân viên hoặc Bản ghi yêu cầu | Kiểm tra ID hoặc mã đối tượng truyền trên URL |
| `409` | `CONFLICT` | Trạng thái kỳ lương không hợp lệ (ví dụ tính toán khi kỳ đang `submitted`/`locked`) | Kiểm tra lại State Machine của kỳ lương |
| `500` | `INTERNAL_SERVER_ERROR` | Lỗi máy chủ hoặc ngoại lệ cơ sở dữ liệu | Kiểm tra log hệ thống hoặc liên hệ quản trị viên |
