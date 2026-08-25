import type {
  ActivityLogItem,
  AttendanceConfig,
  DataMapping,
  Dependent,
  Employee,
  EmployeePolicyItem,
  EmployeePolicyRecord,
  ExpressionNode,
  FormulaVariable,
  InsuranceChangeRecord,
  InsuranceRecord,
  LeaveRecord,
  MockDatabase,
  OvertimeType,
  PolicyDefinition,
  Project,
  ProjectCustomVariable,
  ProjectEmployeeGroup,
  ProjectOvertimeConfig,
  ProjectPolicy,
  SalaryFormula,
  StandardWorkdayRecord,
  TargetRole,
  TaxConfigRecord,
  TestEmployee,
  UnionFeeRecord,
} from "@/lib/types";
import { payrollSeed } from "@/lib/payroll-seed";

const projects: Project[] = [
  {
    id: "prj-jss",
    code: "JSS-ST",
    name: "Jabil Smart Solutions",
    client: "Jabil",
    location: "Khu công nghệ cao, TP. Hồ Chí Minh",
    manager: "Trần Minh Anh",
    managerEmail: "minhanh.tran@greenspeed.vn",
    managerPhone: "0912 345 678",
    employeeCount: 79,
    status: "active",
    payrollCycle: "Ngày 01 đến ngày cuối tháng",
    effectiveFrom: "2026-07-01",
    templateName: "Khối sản xuất 26 ngày",
    updatedAt: "2026-08-10T09:30:00.000Z",
    tabStates: { overview: "complete", policies: "complete", attendance: "warning", formulas: "complete" },
  },
  {
    id: "prj-swm",
    code: "SWM-DN",
    name: "SWM Đồng Nai",
    client: "SWM",
    location: "KCN Long Thành, Đồng Nai",
    manager: "Nguyễn Thu Hà",
    managerEmail: "thuha.nguyen@greenspeed.vn",
    managerPhone: "0988 765 432",
    employeeCount: 118,
    status: "active",
    payrollCycle: "Ngày 24 tháng trước đến ngày 23 tháng này",
    effectiveFrom: "2026-07-01",
    templateName: "Khối sản xuất 25 ngày",
    updatedAt: "2026-08-09T08:15:00.000Z",
    tabStates: { overview: "complete", policies: "complete", attendance: "complete", formulas: "complete" },
  },
  {
    id: "prj-logistics",
    code: "LGT-BD",
    name: "Trung tâm Logistics Bình Dương",
    client: "NewPort Logistics",
    location: "Dĩ An, Bình Dương",
    manager: "Phạm Quốc Bảo",
    managerEmail: "quocbao.pham@greenspeed.vn",
    managerPhone: "0903 112 233",
    employeeCount: 246,
    status: "active",
    payrollCycle: "Ngày 26 tháng trước đến ngày 25 tháng này",
    effectiveFrom: "2026-05-01",
    templateName: "Ca xoay logistics",
    updatedAt: "2026-08-08T04:20:00.000Z",
    tabStates: { overview: "complete", policies: "warning", attendance: "complete", formulas: "complete" },
  },
  {
    id: "prj-retail",
    code: "RTL-HCM",
    name: "Chuỗi bán lẻ Hồ Chí Minh",
    client: "Nova Retail",
    location: "TP. Hồ Chí Minh",
    manager: "Lê Hoài Nam",
    managerEmail: "hoainam.le@greenspeed.vn",
    managerPhone: "0934 556 677",
    employeeCount: 164,
    status: "active",
    payrollCycle: "Ngày 01 đến ngày cuối tháng",
    effectiveFrom: "2026-06-01",
    templateName: "Bán lẻ theo ca",
    updatedAt: "2026-08-07T11:45:00.000Z",
    tabStates: { overview: "complete", policies: "complete", attendance: "warning", formulas: "warning" },
  },
  {
    id: "prj-security",
    code: "SEC-VT",
    name: "Dịch vụ an ninh Vũng Tàu",
    client: "Ocean Services",
    location: "Bà Rịa - Vũng Tàu",
    manager: "Vũ Hải Yến",
    managerEmail: "haiyen.vu@greenspeed.vn",
    managerPhone: "0977 889 900",
    employeeCount: 93,
    status: "draft",
    payrollCycle: "Ngày 21 tháng trước đến ngày 20 tháng này",
    effectiveFrom: "2026-09-01",
    templateName: "Ca 12 giờ",
    updatedAt: "2026-08-12T13:10:00.000Z",
    tabStates: { overview: "complete", policies: "warning", attendance: "incomplete", formulas: "incomplete" },
  },
  {
    id: "prj-office",
    code: "OFF-HN",
    name: "Back-office Hà Nội",
    client: "Northstar",
    location: "Cầu Giấy, Hà Nội",
    manager: "Đặng Tú Uyên",
    managerEmail: "tuuyen.dang@greenspeed.vn",
    managerPhone: "0945 667 788",
    employeeCount: 42,
    status: "archived",
    payrollCycle: "Ngày 01 đến ngày cuối tháng",
    effectiveFrom: "2025-01-01",
    effectiveTo: "2026-06-30",
    templateName: "Văn phòng tiêu chuẩn",
    updatedAt: "2026-07-01T02:00:00.000Z",
    tabStates: { overview: "complete", policies: "complete", attendance: "complete", formulas: "complete" },
  },
];

const policyDefinitions: PolicyDefinition[] = [
  {
    "id": "pol-base-salary",
    "code": "BASE_SALARY",
    "name": "Lương cơ bản",
    "description": "Chốt công từ 21 đến 20. Áp dụng công chuẩn theo từng tháng. LCB / ngày công chuẩn / 8 * số giờ làm việc.",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Mức lương LCB",
        "type": "money",
        "unit": "VNĐ/tháng",
        "defaultValue": 6300000
      },
      {
        "key": "std_days",
        "label": "Ngày công chuẩn",
        "type": "number",
        "unit": "ngày",
        "defaultValue": 26
      }
    ],
    "formula": "LCB / công chuẩn * số ngày làm việc",
    "targetValues": {
      "shift_leader": {
        "amount": 7000000,
        "std_days": 26
      },
      "chinh_thuc": {
        "amount": 6300000,
        "std_days": 26
      },
      "hoc_viec": {
        "amount": 6300000,
        "std_days": 26
      }
    }
  },
  {
    "id": "pol-insurance-salary",
    "code": "INSURANCE_SALARY",
    "name": "Lương đóng bảo hiểm",
    "description": "Mức lương đóng BHXH theo quy định hiện hành. NLĐ đóng 10.5%, NSDLĐ đóng 21.5%.",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Lương đóng BH",
        "type": "money",
        "unit": "VNĐ/tháng",
        "defaultValue": 6300000
      }
    ],
    "targetValues": {
      "shift_leader": {
        "amount": 8000000
      },
      "chinh_thuc": {
        "amount": 6300000
      },
      "hoc_viec": {
        "amount": 6300000
      }
    }
  },
  {
    "id": "pol-insurance-allowance",
    "code": "INSURANCE_ALLOWANCE",
    "name": "Phụ cấp Bảo hiểm",
    "description": "Phụ cấp bảo hiểm riêng theo dự án.",
    "category": "allowance",
    "fields": [
      {
        "key": "status",
        "label": "Áp dụng",
        "type": "boolean",
        "options": [
          {
            "label": "Không áp dụng",
            "value": "Không áp dụng"
          },
          {
            "label": "Có áp dụng",
            "value": "Có áp dụng"
          }
        ],
        "defaultValue": "Không áp dụng"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "status": "Không áp dụng"
      },
      "chinh_thuc": {
        "status": "Không áp dụng"
      },
      "hoc_viec": {
        "status": "Không áp dụng"
      }
    }
  },
  {
    "id": "pol-hourly-rate",
    "code": "HOURLY_RATE",
    "name": "Lương 1 giờ",
    "description": "Lương 1 giờ = LCB / 208 giờ (cố định không thay đổi khi ngày công tháng thay đổi).",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Đơn giá 1 giờ",
        "type": "money",
        "unit": "VNĐ/giờ",
        "defaultValue": 30288
      }
    ],
    "formula": "LCB / 208",
    "targetValues": {
      "shift_leader": {
        "amount": 38462
      },
      "chinh_thuc": {
        "amount": 30288
      },
      "hoc_viec": {
        "amount": 30288
      }
    }
  },
  {
    "id": "pol-ot-15-day",
    "code": "OT_150",
    "name": "Lương tăng ca ngày",
    "description": "Làm trên 8h tính tăng ca (ngoại trừ Chủ nhật, ngày Lễ). Lương tăng ca = Lương 1h * số giờ * 1.5",
    "category": "allowance",
    "fields": [
      {
        "key": "multiplier",
        "label": "Hệ số tăng ca",
        "type": "number",
        "unit": "",
        "defaultValue": 1.5
      }
    ],
    "formula": "Lương 1h * số giờ OT * 1.5",
    "targetValues": {
      "shift_leader": {
        "multiplier": 1.5
      },
      "chinh_thuc": {
        "multiplier": 1.5
      },
      "hoc_viec": {
        "multiplier": 1.5
      }
    }
  },
  {
    "id": "pol-ot-20-night-regular",
    "code": "OT_NIGHT_200_NO_DAY",
    "name": "Lương tăng ca đêm ngày thường (Không làm ngày)",
    "description": "Giờ tăng ca đêm ngày thường trường hợp không làm thêm giờ vào ban ngày. Hệ số 2.0",
    "category": "allowance",
    "fields": [
      {
        "key": "multiplier",
        "label": "Hệ số tăng ca",
        "type": "number",
        "unit": "",
        "defaultValue": 2.0
      }
    ],
    "formula": "Lương 1h * số giờ * 2.0",
    "targetValues": {
      "shift_leader": {
        "multiplier": 2.0
      },
      "chinh_thuc": {
        "multiplier": 2.0
      },
      "hoc_viec": {
        "multiplier": 2.0
      }
    }
  },
  {
    "id": "pol-ot-21-night-regular",
    "code": "OT_NIGHT_210_WITH_DAY",
    "name": "Lương tăng ca đêm ngày thường (Có làm ngày)",
    "description": "Giờ tăng ca đêm ngày thường trường hợp có làm thêm giờ vào ban ngày. Hệ số 2.1",
    "category": "allowance",
    "fields": [
      {
        "key": "multiplier",
        "label": "Hệ số tăng ca",
        "type": "number",
        "unit": "",
        "defaultValue": 2.1
      }
    ],
    "formula": "Lương 1h * số giờ * 2.1",
    "targetValues": {
      "shift_leader": {
        "multiplier": 2.1
      },
      "chinh_thuc": {
        "multiplier": 2.1
      },
      "hoc_viec": {
        "multiplier": 2.1
      }
    }
  },
  {
    "id": "pol-ot-20-weekend",
    "code": "OT_WEEKEND_200",
    "name": "Lương tăng ca ngày nghỉ",
    "description": "Số giờ làm việc vào ngày nghỉ theo quy định của từng dự án. Hệ số 2.0",
    "category": "allowance",
    "fields": [
      {
        "key": "multiplier",
        "label": "Hệ số tăng ca",
        "type": "number",
        "unit": "",
        "defaultValue": 2.0
      }
    ],
    "formula": "Lương 1h * số giờ * 2.0",
    "targetValues": {
      "shift_leader": {
        "multiplier": 2.0
      },
      "chinh_thuc": {
        "multiplier": 2.0
      },
      "hoc_viec": {
        "multiplier": 2.0
      }
    }
  },
  {
    "id": "pol-ot-27-weekend-night",
    "code": "OT_WEEKEND_NIGHT_270",
    "name": "Lương tăng ca đêm ngày nghỉ",
    "description": "Số giờ làm việc vào ca đêm ngày nghỉ hằng tuần. Hệ số 2.7",
    "category": "allowance",
    "fields": [
      {
        "key": "multiplier",
        "label": "Hệ số tăng ca",
        "type": "number",
        "unit": "",
        "defaultValue": 2.7
      }
    ],
    "formula": "Lương 1h * số giờ * 2.7",
    "targetValues": {
      "shift_leader": {
        "multiplier": 2.7
      },
      "chinh_thuc": {
        "multiplier": 2.7
      },
      "hoc_viec": {
        "multiplier": 2.7
      }
    }
  },
  {
    "id": "pol-ot-30-holiday",
    "code": "OT_HOLIDAY_300",
    "name": "Lương tăng ca ngày Lễ",
    "description": "Đi làm vào ngày Lễ, Tết. Lương tăng ca Lễ = Lương 1h * số giờ * 3.0",
    "category": "allowance",
    "fields": [
      {
        "key": "multiplier",
        "label": "Hệ số tăng ca",
        "type": "number",
        "unit": "",
        "defaultValue": 3.0
      }
    ],
    "formula": "Lương 1h * số giờ * 3.0",
    "targetValues": {
      "shift_leader": {
        "multiplier": 3.0
      },
      "chinh_thuc": {
        "multiplier": 3.0
      },
      "hoc_viec": {
        "multiplier": 3.0
      }
    }
  },
  {
    "id": "pol-ot-39-holiday-night",
    "code": "OT_HOLIDAY_NIGHT_390",
    "name": "Lương tăng ca đêm ngày Lễ",
    "description": "Đi làm ca đêm vào ngày Lễ, Tết. Lương tăng ca đêm Lễ = Lương 1h * số giờ * 3.9",
    "category": "allowance",
    "fields": [
      {
        "key": "multiplier",
        "label": "Hệ số tăng ca",
        "type": "number",
        "unit": "",
        "defaultValue": 3.9
      }
    ],
    "formula": "Lương 1h * số giờ * 3.9",
    "targetValues": {
      "shift_leader": {
        "multiplier": 3.9
      },
      "chinh_thuc": {
        "multiplier": 3.9
      },
      "hoc_viec": {
        "multiplier": 3.9
      }
    }
  },
  {
    "id": "pol-night-allowance-30",
    "code": "NIGHT_ALLOWANCE_30",
    "name": "Phụ cấp ca đêm",
    "description": "Giờ ca đêm từ 22h-6h. PC ca đêm = Lương 1h * số giờ làm đêm * 30%",
    "category": "allowance",
    "fields": [
      {
        "key": "multiplier",
        "label": "Tỷ lệ phụ cấp",
        "type": "percentage",
        "unit": "%",
        "defaultValue": 30
      }
    ],
    "formula": "Lương 1h * số giờ ca đêm * 30%",
    "targetValues": {
      "shift_leader": {
        "multiplier": 30
      },
      "chinh_thuc": {
        "multiplier": 30
      },
      "hoc_viec": {
        "multiplier": 30
      }
    }
  },
  {
    "id": "pol-meal",
    "code": "MEAL_ALLOWANCE",
    "name": "Tiền cơm",
    "description": "Ăn cơm tại nhà máy khách hàng cung cấp (0 VNĐ).",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Số tiền phụ cấp",
        "type": "money",
        "unit": "VNĐ",
        "defaultValue": 0
      }
    ],
    "targetValues": {
      "shift_leader": {
        "amount": 0
      },
      "chinh_thuc": {
        "amount": 0
      },
      "hoc_viec": {
        "amount": 0
      }
    }
  },
  {
    "id": "pol-housing",
    "code": "HOUSING_ALLOWANCE",
    "name": "Nhà ở",
    "description": "Làm >= ngày công chuẩn hưởng trọn 250.000 VNĐ. Còn lại tính = số tiền / ngày công chuẩn * ngày làm việc.",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Mức hỗ trợ",
        "type": "money",
        "unit": "VNĐ/tháng",
        "defaultValue": 250000
      }
    ],
    "formula": "số tiền / công chuẩn * ngày làm việc",
    "targetValues": {
      "shift_leader": {
        "amount": 250000
      },
      "chinh_thuc": {
        "amount": 250000
      },
      "hoc_viec": {
        "amount": 250000
      }
    }
  },
  {
    "id": "pol-travel",
    "code": "TRAVEL_ALLOWANCE",
    "name": "Đi lại",
    "description": "Làm >= ngày công chuẩn hưởng trọn 300.000 VNĐ. Còn lại tính = số tiền / ngày công chuẩn * ngày làm việc.",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Mức hỗ trợ",
        "type": "money",
        "unit": "VNĐ/tháng",
        "defaultValue": 300000
      }
    ],
    "formula": "số tiền / công chuẩn * ngày làm việc",
    "targetValues": {
      "shift_leader": {
        "amount": 300000
      },
      "chinh_thuc": {
        "amount": 300000
      },
      "hoc_viec": {
        "amount": 300000
      }
    }
  },
  {
    "id": "pol-responsibility",
    "code": "RESPONSIBILITY_ALLOWANCE",
    "name": "Trách nhiệm",
    "description": "Dành cho Quản lý / Shift Leader (1.000.000 VNĐ/tháng). Phân bổ theo ngày công chuẩn.",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Mức phụ cấp",
        "type": "money",
        "unit": "VNĐ/tháng",
        "defaultValue": 1000000
      }
    ],
    "formula": "số tiền / công chuẩn * ngày làm việc",
    "targetValues": {
      "shift_leader": {
        "amount": 1000000
      },
      "chinh_thuc": {
        "amount": 0
      },
      "hoc_viec": {
        "amount": 0
      }
    }
  },
  {
    "id": "pol-kpi-bonus",
    "code": "KPI_BONUS",
    "name": "Thưởng/ HTCV",
    "description": "Chỉ áp dụng cho Trưởng ca mức hưởng theo hợp đồng (đánh giá hàng tháng).",
    "category": "bonus",
    "fields": [
      {
        "key": "status",
        "label": "Trạng thái áp dụng",
        "type": "boolean",
        "options": [
          {
            "label": "Có áp dụng",
            "value": "Có"
          },
          {
            "label": "Không áp dụng",
            "value": "Không"
          }
        ],
        "defaultValue": "Có"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "status": "Có"
      },
      "chinh_thuc": {
        "status": "Không"
      },
      "hoc_viec": {
        "status": "Không"
      }
    }
  },
  {
    "id": "pol-annual-leave",
    "code": "ANNUAL_LEAVE_PAY",
    "name": "Phép năm",
    "description": "1 tháng làm việc được 1 ngày phép (nếu làm >= 12 ngày). Chi tiền phép còn lại vào tháng 12 hoặc khi nghỉ việc.",
    "category": "leave",
    "fields": [
      {
        "key": "days",
        "label": "Số ngày phép/tháng",
        "type": "number",
        "unit": "ngày",
        "defaultValue": 1
      }
    ],
    "targetValues": {
      "shift_leader": {
        "days": 0
      },
      "chinh_thuc": {
        "days": 1
      },
      "hoc_viec": {
        "days": 0
      }
    }
  },
  {
    "id": "pol-tet-bonus",
    "code": "TET_BONUS",
    "name": "Thưởng tết",
    "description": "Thưởng Tết = LCB / 365 * số ngày làm việc thực tế trong năm (chốt 31/12).",
    "category": "bonus",
    "fields": [
      {
        "key": "rate",
        "label": "Mức hưởng",
        "type": "select",
        "options": [
          {
            "label": "1 tháng LCB",
            "value": "1 tháng LCB"
          },
          {
            "label": "Theo tỷ lệ ngày làm",
            "value": "Theo tỷ lệ ngày làm"
          }
        ],
        "defaultValue": "1 tháng LCB"
      }
    ],
    "formula": "LCB / 365 * số ngày làm việc trong năm",
    "targetValues": {
      "shift_leader": {
        "rate": "1 tháng LCB"
      },
      "chinh_thuc": {
        "rate": "1 tháng LCB"
      },
      "hoc_viec": {
        "rate": "Theo tỷ lệ ngày làm"
      }
    }
  },
  {
    "id": "pol-pay-day",
    "code": "PAY_DAY",
    "name": "Ngày trả lương",
    "description": "Chuyển khoản ngày cuối tháng (nếu trùng T7/CN thì CK thứ 6).",
    "category": "allowance",
    "fields": [
      {
        "key": "schedule",
        "label": "Lịch chi trả",
        "type": "select",
        "options": [
          {
            "label": "Cuối tháng (Chuyển khoản)",
            "value": "Cuối tháng (Chuyển khoản)"
          }
        ],
        "defaultValue": "Cuối tháng (Chuyển khoản)"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "schedule": "Cuối tháng (Chuyển khoản)"
      },
      "chinh_thuc": {
        "schedule": "Cuối tháng (Chuyển khoản)"
      },
      "hoc_viec": {
        "schedule": "Cuối tháng (Chuyển khoản)"
      }
    }
  },
  {
    "id": "pol-client-payment-terms",
    "code": "CLIENT_PAYMENT_TERMS",
    "name": "Thông tin khách hàng thanh toán",
    "description": "Hạn thanh toán 30 ngày. Không phải chờ khách hàng thanh toán mới trả lương.",
    "category": "allowance",
    "fields": [
      {
        "key": "terms",
        "label": "Hạn thanh toán",
        "type": "select",
        "options": [
          {
            "label": "30 ngày",
            "value": "30 ngày"
          }
        ],
        "defaultValue": "30 ngày"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "terms": "30 ngày"
      },
      "chinh_thuc": {
        "terms": "30 ngày"
      },
      "hoc_viec": {
        "terms": "30 ngày"
      }
    }
  },
  {
    "id": "pol-transfer-policy",
    "code": "TRANSFER_POLICY",
    "name": "Điều chuyển",
    "description": "Nhân viên được thông báo mức lương mới trước khi thực hiện điều chuyển công tác.",
    "category": "allowance",
    "fields": [
      {
        "key": "status",
        "label": "Áp dụng",
        "type": "boolean",
        "options": [
          {
            "label": "Có áp dụng",
            "value": "Có"
          },
          {
            "label": "Không áp dụng",
            "value": "Không"
          }
        ],
        "defaultValue": "Có"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "status": "Có"
      },
      "chinh_thuc": {
        "status": "Có"
      },
      "hoc_viec": {
        "status": "Có"
      }
    }
  },
  {
    "id": "pol-training-allowance",
    "code": "TRAINING_ALLOWANCE",
    "name": "Huấn luyện",
    "description": "Hội họp/Huấn luyện: Được tính phụ cấp bằng Lương 1h * số giờ tham gia.",
    "category": "allowance",
    "fields": [
      {
        "key": "rate",
        "label": "Mức phụ cấp",
        "type": "boolean",
        "options": [
          {
            "label": "Lương 1h * số giờ tham gia",
            "value": "Lương 1h * số giờ tham gia"
          }
        ],
        "defaultValue": "Lương 1h * số giờ tham gia"
      }
    ],
    "formula": "Lương 1h * số giờ tham gia",
    "targetValues": {
      "shift_leader": {
        "rate": "Lương 1h * số giờ tham gia"
      },
      "chinh_thuc": {
        "rate": "Lương 1h * số giờ tham gia"
      },
      "hoc_viec": {
        "rate": "Lương 1h * số giờ tham gia"
      }
    }
  },
  {
    "id": "pol-paid-holiday",
    "code": "PAID_HOLIDAY",
    "name": "Nghỉ Lễ hưởng nguyên lương",
    "description": "Nghỉ lễ theo luật hiện hành (11 ngày). Trường hợp nghỉ phép cả tháng không hưởng.",
    "category": "leave",
    "fields": [
      {
        "key": "days",
        "label": "Số ngày nghỉ/năm",
        "type": "boolean",
        "unit": "ngày",
        "defaultValue": 11
      }
    ],
    "targetValues": {
      "shift_leader": {
        "days": 11
      },
      "chinh_thuc": {
        "days": 11
      },
      "hoc_viec": {
        "days": 11
      }
    }
  },
  {
    "id": "pol-holiday-bonus",
    "code": "HOLIDAY_BONUS",
    "name": "Thưởng Lễ",
    "description": "Không áp dụng thưởng Lễ.",
    "category": "bonus",
    "fields": [
      {
        "key": "status",
        "label": "Áp dụng",
        "type": "boolean",
        "options": [
          {
            "label": "Không áp dụng",
            "value": "Không"
          },
          {
            "label": "Có áp dụng",
            "value": "Có"
          }
        ],
        "defaultValue": "Không"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "status": "Không"
      },
      "chinh_thuc": {
        "status": "Không"
      },
      "hoc_viec": {
        "status": "Không"
      }
    }
  },
  {
    "id": "pol-absence-sanction",
    "code": "ABSENCE_SANCTION",
    "name": "Chế tài nghỉ không phép",
    "description": "Nghỉ không phép không được xét chuyên cần và KPI.",
    "category": "deduction",
    "fields": [
      {
        "key": "sanction",
        "label": "Hình thức chế tài",
        "type": "select",
        "options": [
          {
            "label": "Không được xét chuyên cần và KPI",
            "value": "Không được xét chuyên cần và KPI"
          }
        ],
        "defaultValue": "Không được xét chuyên cần và KPI"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "sanction": "Không được xét chuyên cần và KPI"
      },
      "chinh_thuc": {
        "sanction": "Không được xét chuyên cần và KPI"
      },
      "hoc_viec": {
        "sanction": "Không được xét chuyên cần và KPI"
      }
    }
  },
  {
    "id": "pol-social-insurance",
    "code": "SOCIAL_INSURANCE",
    "name": "Bảo hiểm xã hội",
    "description": "Công ty và NLĐ đóng BHXH theo luật (NLĐ đóng 10.5%, NSDLĐ đóng 21.5%).",
    "category": "deduction",
    "fields": [
      {
        "key": "employee_rate",
        "label": "NLĐ đóng (%)",
        "type": "boolean",
        "defaultValue": 10.5
      },
      {
        "key": "company_rate",
        "label": "NSDLĐ đóng (%)",
        "type": "percentage",
        "defaultValue": 21.5
      }
    ],
    "formula": "Lương đóng BH * 10.5% (NLĐ) / 21.5% (NSDLĐ)",
    "targetValues": {
      "shift_leader": {
        "employee_rate": 10.5,
        "company_rate": 21.5
      },
      "chinh_thuc": {
        "employee_rate": 10.5,
        "company_rate": 21.5
      },
      "hoc_viec": {
        "employee_rate": 10.5,
        "company_rate": 21.5
      }
    }
  },
  {
    "id": "pol-union",
    "code": "UNION_FEE",
    "name": "Tham gia công đoàn",
    "description": "Nhân viên tham gia công đoàn đóng 23.400đ/tháng hưởng phúc lợi Công đoàn.",
    "category": "deduction",
    "fields": [
      {
        "key": "amount",
        "label": "Mức phí",
        "type": "boolean",
        "unit": "VNĐ/tháng",
        "defaultValue": 23400
      }
    ],
    "targetValues": {
      "shift_leader": {
        "amount": 23400
      },
      "chinh_thuc": {
        "amount": 23400
      },
      "hoc_viec": {
        "amount": 23400
      }
    }
  },
  {
    "id": "pol-ppe-depreciation",
    "code": "PPE_DEPRECIATION",
    "name": "Quy chế khấu hao BHLĐ",
    "description": "Trang bị 02 áo. Khấu hao 06 tháng kể từ ngày cấp phát. Nghỉ trước hạn bị khấu trừ.",
    "category": "deduction",
    "fields": [
      {
        "key": "items",
        "label": "Quy định BHLĐ",
        "type": "boolean",
        "options": [
          {
            "label": "02 áo (Khấu hao 6 tháng)",
            "value": "02 áo (Khấu hao 6 tháng)"
          }
        ],
        "defaultValue": "02 áo (Khấu hao 6 tháng)"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "items": "02 áo (Khấu hao 6 tháng)"
      },
      "chinh_thuc": {
        "items": "02 áo (Khấu hao 6 tháng)"
      },
      "hoc_viec": {
        "items": "02 áo (Khấu hao 6 tháng)"
      }
    }
  },
  {
    "id": "pol-marriage-leave",
    "code": "MARRIAGE_LEAVE",
    "name": "Kết hôn",
    "description": "Bản thân kết hôn nghỉ 3 ngày hưởng nguyên lương.",
    "category": "leave",
    "fields": [
      {
        "key": "days",
        "label": "Số ngày nghỉ",
        "type": "boolean",
        "unit": "ngày",
        "defaultValue": 3
      }
    ],
    "targetValues": {
      "shift_leader": {
        "days": 3
      },
      "chinh_thuc": {
        "days": 3
      },
      "hoc_viec": {
        "days": 3
      }
    }
  },
  {
    "id": "pol-funeral-leave",
    "code": "FUNERAL_LEAVE",
    "name": "Ma chay",
    "description": "Tứ thân phụ mẫu, con mất nghỉ 3 ngày hưởng nguyên lương.",
    "category": "leave",
    "fields": [
      {
        "key": "days",
        "label": "Số ngày nghỉ",
        "type": "boolean",
        "unit": "ngày",
        "defaultValue": 3
      }
    ],
    "targetValues": {
      "shift_leader": {
        "days": 3
      },
      "chinh_thuc": {
        "days": 3
      },
      "hoc_viec": {
        "days": 3
      }
    }
  },
  {
    "id": "pol-tourism",
    "code": "TOURISM_POLICY",
    "name": "Du lịch",
    "description": "Không áp dụng chế độ du lịch.",
    "category": "bonus",
    "fields": [
      {
        "key": "status",
        "label": "Áp dụng",
        "type": "boolean",
        "options": [
          {
            "label": "Không áp dụng",
            "value": "Không"
          }
        ],
        "defaultValue": "Không"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "status": "Không"
      },
      "chinh_thuc": {
        "status": "Không"
      },
      "hoc_viec": {
        "status": "Không"
      }
    }
  },
  {
    "id": "pol-year-end-party",
    "code": "YEAR_END_PARTY",
    "name": "Tất niên",
    "description": "Không áp dụng chế độ tất niên.",
    "category": "bonus",
    "fields": [
      {
        "key": "status",
        "label": "Áp dụng",
        "type": "boolean",
        "options": [
          {
            "label": "Không áp dụng",
            "value": "Không"
          }
        ],
        "defaultValue": "Không"
      }
    ],
    "targetValues": {
      "shift_leader": {
        "status": "Không"
      },
      "chinh_thuc": {
        "status": "Không"
      },
      "hoc_viec": {
        "status": "Không"
      }
    }
  },
  {
    "id": "pol-insurance-247",
    "code": "INSURANCE_247",
    "name": "Bảo hiểm 24/24",
    "description": "Có tham gia gói bảo hiểm 24/24 với ngân sách 84.000 VNĐ/năm.",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Ngân sách/năm",
        "type": "boolean",
        "unit": "VNĐ/năm",
        "defaultValue": 84000
      }
    ],
    "targetValues": {
      "shift_leader": {
        "amount": 84000
      },
      "chinh_thuc": {
        "amount": 84000
      },
      "hoc_viec": {
        "amount": 84000
      }
    }
  },
  {
    "id": "pol-health-checkup",
    "code": "HEALTH_CHECKUP",
    "name": "Khám sức khoẻ định kỳ",
    "description": "Có tham gia gói khám sức khỏe định kỳ với ngân sách 400.000 VNĐ/năm theo thông tư 32.",
    "category": "allowance",
    "fields": [
      {
        "key": "amount",
        "label": "Ngân sách/năm",
        "type": "boolean",
        "unit": "VNĐ/năm",
        "defaultValue": 400000
      }
    ],
    "targetValues": {
      "shift_leader": {
        "amount": 400000
      },
      "chinh_thuc": {
        "amount": 400000
      },
      "hoc_viec": {
        "amount": 400000
      }
    }
  },
  {
    "id": "pol-split-shift",
    "code": "SPLIT_SHIFT_ALLOWANCE",
    "name": "Phụ cấp ca gãy",
    "description": "Phụ cấp cho nhân viên làm ca gãy. Tính theo ngày làm việc thực tế.",
    "category": "allowance",
    "fields": [{ "key": "amount", "label": "Mức phụ cấp", "type": "money", "unit": "VNĐ/ngày", "defaultValue": 50000 }],
    "targetValues": { "shift_leader": { "amount": 50000 }, "chinh_thuc": { "amount": 50000 }, "hoc_viec": { "amount": 50000 } }
  },
  {
    "id": "pol-uniform",
    "code": "UNIFORM_ALLOWANCE",
    "name": "Phụ cấp đồng phục",
    "description": "Phụ cấp đồng phục hàng tháng theo công chuẩn.",
    "category": "allowance",
    "fields": [{ "key": "amount", "label": "Mức phụ cấp", "type": "money", "unit": "VNĐ/tháng", "defaultValue": 150000 }],
    "targetValues": { "shift_leader": { "amount": 150000 }, "chinh_thuc": { "amount": 150000 }, "hoc_viec": { "amount": 150000 } }
  },
  {
    "id": "pol-child-care",
    "code": "CHILD_CARE_ALLOWANCE",
    "name": "Phụ cấp nuôi con nhỏ",
    "description": "Hỗ trợ nuôi con nhỏ dưới 6 tuổi cho lao động nữ.",
    "category": "allowance",
    "fields": [{ "key": "amount", "label": "Mức hỗ trợ", "type": "money", "unit": "VNĐ/tháng", "defaultValue": 100000 }],
    "targetValues": { "shift_leader": { "amount": 100000 }, "chinh_thuc": { "amount": 100000 }, "hoc_viec": { "amount": 100000 } }
  },
  {
    "id": "pol-hazardous",
    "code": "HAZARDOUS_ALLOWANCE",
    "name": "Phụ cấp công việc độc hại",
    "description": "Phụ cấp môi trường độc hại, nặng nhọc theo danh sách dự án.",
    "category": "allowance",
    "fields": [{ "key": "amount", "label": "Mức phụ cấp", "type": "money", "unit": "VNĐ/tháng", "defaultValue": 300000 }],
    "targetValues": { "shift_leader": { "amount": 300000 }, "chinh_thuc": { "amount": 300000 }, "hoc_viec": { "amount": 300000 } }
  },
  {
    "id": "pol-parking",
    "code": "PARKING_ALLOWANCE",
    "name": "Tiền gửi xe",
    "description": "Hỗ trợ tiền gửi xe theo số lượt giữ xe thực tế.",
    "category": "allowance",
    "fields": [{ "key": "amount", "label": "Mức hỗ trợ", "type": "money", "unit": "VNĐ/tháng", "defaultValue": 100000 }],
    "targetValues": { "shift_leader": { "amount": 100000 }, "chinh_thuc": { "amount": 100000 }, "hoc_viec": { "amount": 100000 } }
  },
  {
    "id": "pol-per-diem",
    "code": "PER_DIEM_ALLOWANCE",
    "name": "Tiền công tác phí (Miễn thuế TNCN)",
    "description": "Chi phí công tác phí được miễn thuế TNCN.",
    "category": "allowance",
    "fields": [{ "key": "amount", "label": "Mức công tác phí", "type": "money", "unit": "VNĐ/ngày", "defaultValue": 200000 }],
    "targetValues": { "shift_leader": { "amount": 200000 }, "chinh_thuc": { "amount": 200000 }, "hoc_viec": { "amount": 200000 } }
  },
  {
    "id": "pol-incentive",
    "code": "SALES_INCENTIVE",
    "name": "Thưởng Incentive (Doanh số)",
    "description": "Thưởng doanh số theo danh sách khách hàng gửi hàng tháng.",
    "category": "bonus",
    "fields": [{ "key": "amount", "label": "Mức thưởng", "type": "money", "unit": "VNĐ", "defaultValue": 500000 }],
    "targetValues": { "shift_leader": { "amount": 500000 }, "chinh_thuc": { "amount": 500000 }, "hoc_viec": { "amount": 500000 } }
  },
  {
    "id": "pol-seniority-bonus",
    "code": "SENIORITY_BONUS",
    "name": "Thưởng gắn bó / thâm niên",
    "description": "Thưởng thâm niên làm việc >= 1 năm, 2 năm, 3 năm.",
    "category": "bonus",
    "fields": [{ "key": "amount", "label": "Mức thưởng", "type": "money", "unit": "VNĐ/tháng", "defaultValue": 200000 }],
    "targetValues": { "shift_leader": { "amount": 200000 }, "chinh_thuc": { "amount": 200000 }, "hoc_viec": { "amount": 200000 } }
  },
  {
    "id": "pol-recruitment-bonus",
    "code": "RECRUITMENT_BONUS",
    "name": "Thưởng tuyển dụng",
    "description": "Thưởng giới thiệu nhân sự mới theo quy định công ty.",
    "category": "bonus",
    "fields": [{ "key": "amount", "label": "Mức thưởng", "type": "money", "unit": "VNĐ/người", "defaultValue": 500000 }],
    "targetValues": { "shift_leader": { "amount": 500000 }, "chinh_thuc": { "amount": 500000 }, "hoc_viec": { "amount": 500000 } }
  },
  {
    "id": "pol-line-bonus",
    "code": "LINE_BONUS",
    "name": "Thưởng line sản xuất",
    "description": "Thưởng năng suất line sản xuất đạt chỉ tiêu.",
    "category": "bonus",
    "fields": [{ "key": "amount", "label": "Mức thưởng", "type": "money", "unit": "VNĐ/tháng", "defaultValue": 300000 }],
    "targetValues": { "shift_leader": { "amount": 300000 }, "chinh_thuc": { "amount": 300000 }, "hoc_viec": { "amount": 300000 } }
  }
];

const overtimeTypes: OvertimeType[] = [
  { id: "ot-150", code: "OT_150", name: "Tăng ca ngày thường", defaultMultiplier: 1.5, unit: "hour", description: "Làm thêm ban ngày vào ngày làm việc bình thường." },
  { id: "ot-night-200", code: "OT_NIGHT_200", name: "Tăng ca đêm ngày thường", defaultMultiplier: 2.0, unit: "hour", description: "Làm thêm ban đêm vào ngày làm việc bình thường." },
  { id: "ot-night-210", code: "OT_NIGHT_210", name: "Tăng ca đêm ngày thường (Đặc thù)", defaultMultiplier: 2.1, unit: "hour", description: "Làm thêm ca đêm có điều kiện đặc thù 210%." },
  { id: "ot-weekend-200", code: "OT_WEEKEND_200", name: "Tăng ca ngày nghỉ hằng tuần", defaultMultiplier: 2.0, unit: "hour", description: "Làm thêm ban ngày vào ngày nghỉ Chủ nhật/nghỉ tuần." },
  { id: "ot-weekend-night-270", code: "OT_WEEKEND_NIGHT_270", name: "Tăng ca đêm ngày nghỉ", defaultMultiplier: 2.7, unit: "hour", description: "Làm thêm ban đêm vào ngày nghỉ Chủ nhật/nghỉ tuần." },
  { id: "ot-holiday-300", code: "OT_HOLIDAY_300", name: "Tăng ca ngày lễ, Tết", defaultMultiplier: 3.0, unit: "hour", description: "Làm thêm ban ngày vào các ngày lễ Tết." },
  { id: "ot-holiday-night-390", code: "OT_HOLIDAY_NIGHT_390", name: "Tăng ca đêm ngày lễ, Tết", defaultMultiplier: 3.9, unit: "hour", description: "Làm thêm ban đêm vào các ngày lễ Tết." },
  { id: "night-30", code: "NIGHT_ALLOWANCE_30", name: "Phụ cấp ca đêm", defaultMultiplier: 0.3, unit: "hour", description: "Phụ cấp thêm 30% cho giờ làm ca đêm." },
];

const variable = (variableCode: string): ExpressionNode => ({ type: "variable", variableCode });
const constant = (value: number): ExpressionNode => ({ type: "constant", value });
const binary = (operator: "+" | "-" | "*" | "/", left: ExpressionNode, right: ExpressionNode): ExpressionNode => ({ type: "binary", operator, left, right });

function formulasForProject(projectId: string): SalaryFormula[] {
  return [
    { id: `${projectId}-f1`, projectId, code: "REGULAR_PAY", name: "Lương theo giờ công", outputVariable: "LUONG_NGAY_CONG", category: "income", order: 1, expression: binary("*", binary("/", variable("LUONG_CO_BAN"), variable("GIO_CHUAN")), variable("GIO_THUONG")), rounding: { mode: "nearest", precision: 1 }, enabled: true },
    { id: `${projectId}-f2`, projectId, code: "OT_150_PAY", name: "Lương tăng ca 150%", outputVariable: "LUONG_OT_150", category: "income", order: 2, expression: binary("*", binary("*", binary("/", variable("NEN_TINH_OT"), variable("GIO_CHUAN")), constant(1.5)), variable("GIO_OT_150")), rounding: { mode: "nearest", precision: 1 }, enabled: true },
    { id: `${projectId}-f3`, projectId, code: "GROSS_INCOME", name: "Tổng thu nhập", outputVariable: "TONG_THU_NHAP", category: "aggregate", order: 3, expression: binary("+", binary("+", variable("LUONG_NGAY_CONG"), variable("LUONG_OT_150")), variable("TONG_PHU_CAP")), rounding: { mode: "nearest", precision: 1 }, enabled: true },
    { id: `${projectId}-f4`, projectId, code: "TOTAL_DEDUCTION", name: "Tổng khấu trừ", outputVariable: "TONG_KHAU_TRU", category: "deduction", order: 4, expression: binary("+", variable("BAO_HIEM_NV"), variable("KHAU_TRU_KHAC")), rounding: { mode: "nearest", precision: 1 }, enabled: true },
    { id: `${projectId}-f5`, projectId, code: "NET_PAY", name: "Thực lãnh", outputVariable: "THUC_LANH", category: "net", order: 5, expression: binary("-", variable("TONG_THU_NHAP"), variable("TONG_KHAU_TRU")), rounding: { mode: "nearest", precision: 1000 }, enabled: true },
  ];
}

const formulaVariables: FormulaVariable[] = [
  { code: "LUONG_CO_BAN", name: "Lương cơ bản", group: "employee", sampleValue: 6500000, unit: "VNĐ" },
  { code: "NEN_TINH_OT", name: "Nền tính tăng ca", group: "policy", sampleValue: 6500000, unit: "VNĐ" },
  { code: "GIO_CHUAN", name: "Giờ chuẩn tháng", group: "attendance", sampleValue: 208, unit: "giờ" },
  { code: "GIO_THUONG", name: "Giờ công thường", group: "attendance", sampleValue: 184, unit: "giờ" },
  { code: "GIO_OT_150", name: "Giờ tăng ca 150%", group: "attendance", sampleValue: 12, unit: "giờ" },
  { code: "TONG_PHU_CAP", name: "Tổng phụ cấp", group: "policy", sampleValue: 750000, unit: "VNĐ" },
  { code: "BAO_HIEM_NV", name: "Bảo hiểm nhân viên", group: "policy", sampleValue: 682500, unit: "VNĐ" },
  { code: "KHAU_TRU_KHAC", name: "Khấu trừ khác", group: "policy", sampleValue: 23400, unit: "VNĐ" },
  // Custom Variables (Tham số đầu vào dự án do Backend trả về - Chưa có giá trị cố định)
  {
    code: "DON_GIA_KHOAN",
    name: "Đơn giá khoán sản lượng",
    group: "custom",
    unit: "VNĐ/sp",
    description: "Đơn giá khoán tính trên mỗi đơn vị sản lượng hoàn thành của dự án",
    isCustom: true,
    sampleValue: 35000,
    defaultValue: 35000,
  },
  {
    code: "HE_SO_HOAN_THANH_MIN",
    name: "Hệ số hoàn thành tối thiểu",
    group: "custom",
    unit: "%",
    description: "Tỷ lệ % KPI tối thiểu để được xét nhận thưởng năng suất",
    isCustom: true,
    sampleValue: 80,
    defaultValue: 80,
  },
  {
    code: "MUC_THUONG_NONG_DU_AN",
    name: "Mức thưởng nóng dự án",
    group: "custom",
    unit: "VNĐ",
    description: "Khoản thưởng đột xuất bổ sung trong kỳ của dự án",
    isCustom: true,
    sampleValue: 1500000,
    defaultValue: 1500000,
  },
  {
    code: "DON_GIA_CA_DEM_DAC_BIET",
    name: "Đơn giá ca đêm đặc biệt",
    group: "custom",
    unit: "VNĐ/giờ",
    description: "Đơn giá phụ cấp riêng cho ca làm việc ban đêm trong các đợt cao điểm",
    isCustom: true,
    sampleValue: 45000,
    defaultValue: 45000,
  },
  {
    code: "TY_LE_TRICH_QUY_DU_AN",
    name: "Tỷ lệ trích quỹ dự án",
    group: "custom",
    unit: "%",
    description: "Tỷ lệ trích nộp quỹ hoạt động nội bộ của dự án",
    isCustom: true,
    sampleValue: 1.5,
    defaultValue: 1.5,
  },
];

export const defaultCustomVariablesDefinitions = [
  {
    code: "DON_GIA_KHOAN",
    name: "Đơn giá khoán sản lượng",
    unit: "VNĐ/sp",
    description: "Đơn giá khoán tính trên mỗi đơn vị sản lượng hoàn thành của dự án",
    defaultValue: 35000,
  },
  {
    code: "HE_SO_HOAN_THANH_MIN",
    name: "Hệ số hoàn thành tối thiểu",
    unit: "%",
    description: "Tỷ lệ % KPI tối thiểu để được xét nhận thưởng năng suất",
    defaultValue: 80,
  },
  {
    code: "MUC_THUONG_NONG_DU_AN",
    name: "Mức thưởng nóng dự án",
    unit: "VNĐ",
    description: "Khoản thưởng đột xuất bổ sung trong kỳ của dự án",
    defaultValue: 1500000,
  },
  {
    code: "DON_GIA_CA_DEM_DAC_BIET",
    name: "Đơn giá ca đêm đặc biệt",
    unit: "VNĐ/giờ",
    description: "Đơn giá phụ cấp riêng cho ca làm việc ban đêm trong các đợt cao điểm",
    defaultValue: 45000,
  },
  {
    code: "TY_LE_TRICH_QUY_DU_AN",
    name: "Tỷ lệ trích quỹ dự án",
    unit: "%",
    description: "Tỷ lệ trích nộp quỹ hoạt động nội bộ của dự án",
    defaultValue: 1.5,
  },
];

const projectCustomVariables: ProjectCustomVariable[] = projects.flatMap((project, pIndex) =>
  defaultCustomVariablesDefinitions.map((def, vIndex) => ({
    id: `${project.id}-${def.code}`,
    projectId: project.id,
    code: def.code,
    name: def.name,
    unit: def.unit,
    description: def.description,
    defaultValue: def.defaultValue,
    // Set value for some variables on first project, while leaving others null so user can input and test
    value: pIndex === 0 && vIndex < 3 ? def.defaultValue ?? null : null,
    updatedAt: "2026-08-20T10:00:00Z",
  }))
);

const attendanceConfigs: AttendanceConfig[] = projects.map((project, index) => ({
  projectId: project.id,
  attendanceType: "CONG NHAT",
  standardWorkDaysOption: "26",
  benefitDeduction: "Có trích",
  standardWorkDays: index === 1 ? 25 : 26,
  hoursPerDay: index === 4 ? 12 : 8,
  weeklyDayOff: index === 2 ? "Chủ nhật luân phiên" : "Chủ nhật",
  nightShiftFrom: "22:00",
  nightShiftTo: "06:00",
  holidayCalendar: "Lịch nghỉ lễ Việt Nam 2026",
}));

const overtimeConfigs: ProjectOvertimeConfig[] = projects.flatMap((project, projectIndex) => overtimeTypes.map((type, index) => ({
  id: `${project.id}-${type.id}`,
  projectId: project.id,
  overtimeTypeId: type.id,
  enabled: index < 6 || projectIndex % 2 === 0,
  multiplier: type.defaultMultiplier,
  base: projectIndex === 1 ? "base_plus_responsibility" : "base_salary",
  divisor: projectIndex === 0 ? "fixed_208" : "monthly_hours",
  formulaOption: `Lương 1h * ${type.defaultMultiplier} * số giờ làm`,
  hoursSource: type.code,
  taxable: type.code === "NIGHT_ALLOWANCE_30",
  effectiveFrom: project.effectiveFrom,
})));

const projectPolicies: ProjectPolicy[] = projects.flatMap((project) => {
  return policyDefinitions.slice(0, 19).map((definition) => ({
    id: `${project.id}-${definition.id}`,
    projectId: project.id,
    policyId: definition.id,
    values: Object.fromEntries(definition.fields.map((field) => [field.key, field.defaultValue ?? ""])),
    targetValues: definition.targetValues ? JSON.parse(JSON.stringify(definition.targetValues)) : undefined,
    effectiveFrom: project.effectiveFrom,
    enabled: true,
  } as ProjectPolicy));
});


const sampleRows = [
  { employee_code: "NV-DEMO-001", full_name: "Nhân viên Mẫu A", work_hours: 184, overtime_hours: 12 },
  { employee_code: "NV-DEMO-002", full_name: "Nhân viên Mẫu B", work_hours: 176, overtime_hours: 8 },
];

const dataMappings: DataMapping[] = projects.flatMap((project, projectIndex) => [
  { id: `${project.id}-employee`, projectId: project.id, sourceType: "employee", sourceName: "Danh sách nhân viên", joinKey: "employee_code", status: "valid", fields: [{ sourceField: "Mã NV", systemField: "employee_code", dataType: "text", required: true }, { sourceField: "Họ tên", systemField: "full_name", dataType: "text", required: true }, { sourceField: "Lương cơ bản", systemField: "base_salary", dataType: "number", required: true }], sampleRows },
  { id: `${project.id}-attendance`, projectId: project.id, sourceType: "attendance", sourceName: "Bảng công tháng", joinKey: "employee_code", status: projectIndex === 0 ? "warning" : "valid", fields: [{ sourceField: "Mã NV", systemField: "employee_code", dataType: "text", required: true }, { sourceField: "Giờ thường", systemField: "regular_hours", dataType: "number", required: true }, { sourceField: "Giờ OT", systemField: "overtime_hours", dataType: "number", required: true }], sampleRows },
  { id: `${project.id}-deduction`, projectId: project.id, sourceType: "deduction", sourceName: "Phát sinh khấu trừ", joinKey: "employee_code", status: projectIndex === 4 ? "invalid" : "valid", fields: [{ sourceField: "Mã NV", systemField: "employee_code", dataType: "text", required: true }, { sourceField: "Số tiền", systemField: "deduction_amount", dataType: "number", required: true }], sampleRows },
] as DataMapping[]);

const testEmployees: TestEmployee[] = [
  { id: "emp-demo-1", code: "NV-DEMO-001", name: "Nhân viên Mẫu A", role: "Công nhân", baseSalary: 6500000, workHours: 184, overtimeHours: 12 },
  { id: "emp-demo-2", code: "NV-DEMO-002", name: "Nhân viên Mẫu B", role: "Tổ trưởng", baseSalary: 8000000, workHours: 176, overtimeHours: 8 },
  { id: "emp-demo-3", code: "NV-DEMO-003", name: "Nhân viên Mẫu C", role: "Tạp vụ", baseSalary: 6000000, workHours: 168, overtimeHours: 0 },
  { id: "emp-demo-4", code: "NV-DEMO-004", name: "Nhân viên Mẫu D", role: "Trưởng ca", baseSalary: 9000000, workHours: 192, overtimeHours: 18 },
];

const employees: Employee[] = [
  // PRJ-JSS
  {
    id: "emp-jss-001",
    code: "NV-JSS-001",
    name: "Nguyễn Văn An",
    idCard: "079095001234",
    phone: "0908123456",
    email: "an.nguyen@jabil-staff.vn",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    department: "Xưởng Sản Xuất 1",
    position: "Công nhân bậc 2",
    joinDate: "2023-03-15",
    status: "active",
    groupId: "grp-off-prj-jss",
    groupName: "Công nhân chính thức",
  },
  {
    id: "emp-jss-002",
    code: "NV-JSS-002",
    name: "Trần Thị Bình",
    idCard: "079198005678",
    phone: "0912345678",
    email: "binh.tran@jabil-staff.vn",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    department: "Xưởng Sản Xuất 1",
    position: "Tổ trưởng dây chuyền",
    joinDate: "2022-06-01",
    status: "active",
    groupId: "grp-mgmt-prj-jss",
    groupName: "Quản lý / Shift Leader",
  },
  {
    id: "emp-jss-003",
    code: "NV-JSS-003",
    name: "Lê Văn Cường",
    idCard: "080092009876",
    phone: "0987654321",
    email: "cuong.le@jabil-staff.vn",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    department: "Bộ phận Kỹ thuật",
    position: "Kỹ thuật viên bảo trì",
    joinDate: "2024-01-10",
    status: "active",
    groupId: "grp-off-prj-jss",
    groupName: "Công nhân chính thức",
  },
  {
    id: "emp-jss-004",
    code: "NV-JSS-004",
    name: "Phạm Thu Hà",
    idCard: "079196004321",
    phone: "0933445566",
    email: "ha.pham@jabil-staff.vn",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    department: "Phòng Quản lý chất lượng",
    position: "Chuyên viên QA/QC",
    joinDate: "2023-09-20",
    status: "active",
    groupId: "grp-off-prj-jss",
    groupName: "Công nhân chính thức",
  },
  {
    id: "emp-jss-005",
    code: "NV-JSS-005",
    name: "Vũ Hoàng Nam",
    idCard: "079099008899",
    phone: "0911223344",
    email: "nam.vu@jabil-staff.vn",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    department: "Xưởng Sản Xuất 2",
    position: "Công nhân thử việc",
    joinDate: "2026-07-01",
    status: "probation",
    groupId: "grp-prob-prj-jss",
    groupName: "Học việc (29 ngày)",
  },
  {
    id: "emp-jss-006",
    code: "NV-JSS-006",
    name: "Đoàn Thu Trang",
    idCard: "079195007766",
    phone: "0944556677",
    email: "trang.doan@jabil-staff.vn",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    department: "Phòng Quản lý chất lượng",
    position: "Kỹ thuật viên QC",
    joinDate: "2023-02-15",
    status: "resigned",
    groupId: "grp-off-prj-jss",
    groupName: "Công nhân chính thức",
  },

  // PRJ-SWM
  {
    id: "emp-swm-001",
    code: "NV-SWM-001",
    name: "Nguyễn Thành Long",
    idCard: "075092003344",
    phone: "0908556677",
    email: "long.nguyen@swm-vietnam.vn",
    projectId: "prj-swm",
    projectCode: "SWM-DN",
    department: "Xưởng Đúc Nhựa",
    position: "Trưởng ca sản xuất",
    joinDate: "2022-03-01",
    status: "active",
    groupId: "grp-mgmt-prj-swm",
    groupName: "Quản lý / Giám sát",
  },
  {
    id: "emp-swm-002",
    code: "NV-SWM-002",
    name: "Lê Thị Hồng",
    idCard: "075196005588",
    phone: "0918445566",
    email: "hong.le@swm-vietnam.vn",
    projectId: "prj-swm",
    projectCode: "SWM-DN",
    department: "Xưởng Đúc Nhựa",
    position: "Công nhân ép khuôn",
    joinDate: "2023-05-15",
    status: "active",
    groupId: "grp-off-prj-swm",
    groupName: "Công nhân chính thức",
  },
  {
    id: "emp-swm-003",
    code: "NV-SWM-003",
    name: "Phan Văn Đức",
    idCard: "075098007799",
    phone: "0933112233",
    email: "duc.phan@swm-vietnam.vn",
    projectId: "prj-swm",
    projectCode: "SWM-DN",
    department: "Xưởng Lắp Ráp",
    position: "Lao động học việc",
    joinDate: "2026-07-10",
    status: "probation",
    groupId: "grp-prob-prj-swm",
    groupName: "Học việc (29 ngày)",
  },

  // PRJ-LOGISTICS
  {
    id: "emp-lgt-001",
    code: "NV-LGT-001",
    name: "Phạm Quốc Bảo",
    idCard: "074090001122",
    phone: "0909112233",
    email: "bao.pham@newport-logistics.vn",
    projectId: "prj-logistics",
    projectCode: "LGT-BD",
    department: "Kho Tổng Dĩ An",
    position: "Tổng quản lý kho",
    joinDate: "2021-01-15",
    status: "active",
    groupId: "grp-mgmt-prj-lgt",
    groupName: "Quản lý kho",
  },
  {
    id: "emp-lgt-002",
    code: "NV-LGT-002",
    name: "Trương Minh Trí",
    idCard: "074095004455",
    phone: "0919223344",
    email: "tri.truong@newport-logistics.vn",
    projectId: "prj-logistics",
    projectCode: "LGT-BD",
    department: "Kho Tổng Dĩ An",
    position: "Tài xế xe nâng",
    joinDate: "2023-04-01",
    status: "active",
    groupId: "grp-off-prj-lgt",
    groupName: "Nhân viên vận hành kho",
  },
  {
    id: "emp-lgt-003",
    code: "NV-LGT-003",
    name: "Đặng Văn Hùng",
    idCard: "074099008811",
    phone: "0977665544",
    email: "hung.dang@newport-logistics.vn",
    projectId: "prj-logistics",
    projectCode: "LGT-BD",
    department: "Khu Vực Bốc Xếp",
    position: "Công nhân bốc xếp",
    joinDate: "2026-08-01",
    status: "active",
    groupId: "grp-prob-prj-lgt",
    groupName: "Lao động bốc xếp thời vụ",
  },

  // PRJ-RETAIL
  {
    id: "emp-rtl-001",
    code: "NV-RTL-001",
    name: "Lê Hoài Nam",
    idCard: "079088005544",
    phone: "0903887766",
    email: "nam.le@novaretail.vn",
    projectId: "prj-retail",
    projectCode: "RTL-HCM",
    department: "Chi nhánh Quận 1",
    position: "Cửa hàng trưởng",
    joinDate: "2020-11-01",
    status: "active",
    groupId: "grp-mgmt-prj-rtl",
    groupName: "Cửa hàng trưởng / Quản lý",
  },
  {
    id: "emp-rtl-002",
    code: "NV-RTL-002",
    name: "Nguyễn Thị Ngọc",
    idCard: "079197003322",
    phone: "0938112233",
    email: "ngoc.nguyen@novaretail.vn",
    projectId: "prj-retail",
    projectCode: "RTL-HCM",
    department: "Chi nhánh Quận 1",
    position: "Thu ngân chính",
    joinDate: "2023-08-10",
    status: "active",
    groupId: "grp-off-prj-rtl",
    groupName: "Nhân viên bán hàng chính thức",
  },

  // PRJ-SECURITY
  {
    id: "emp-sec-001",
    code: "NV-SEC-001",
    name: "Vũ Hải Yến",
    idCard: "077091002233",
    phone: "0908990011",
    email: "yen.vu@oceanservices.vn",
    projectId: "prj-security",
    projectCode: "SEC-VT",
    department: "Đội Bảo Vệ Vũng Tàu",
    position: "Đội trưởng an ninh",
    joinDate: "2022-09-01",
    status: "active",
    groupId: "grp-mgmt-prj-sec",
    groupName: "Đội trưởng mục tiêu",
  },
  {
    id: "emp-sec-002",
    code: "NV-SEC-002",
    name: "Hoàng Văn Thái",
    idCard: "077096007788",
    phone: "0912778899",
    email: "thai.hoang@oceanservices.vn",
    projectId: "prj-security",
    projectCode: "SEC-VT",
    department: "Mục Tiêu Cảng Biển",
    position: "Nhân viên an ninh",
    joinDate: "2023-10-15",
    status: "active",
    groupId: "grp-off-prj-sec",
    groupName: "Nhân viên bảo vệ chính thức",
  },

  // PRJ-TECHPARK
  {
    id: "emp-tpk-001",
    code: "NV-TPK-001",
    name: "Trịnh Đình Khang",
    idCard: "048093006655",
    phone: "0905112233",
    email: "khang.trinh@techpark-dn.vn",
    projectId: "prj-techpark",
    projectCode: "TPK-DN",
    department: "Bộ Phận R&D",
    position: "Trưởng nhóm kỹ thuật",
    joinDate: "2021-06-15",
    status: "active",
    groupId: "grp-mgmt-prj-tpk",
    groupName: "Trưởng nhóm kỹ thuật",
  },
  {
    id: "emp-tpk-002",
    code: "NV-TPK-002",
    name: "Mai Thị Quỳnh",
    idCard: "048197004433",
    phone: "0935667788",
    email: "quynh.mai@techpark-dn.vn",
    projectId: "prj-techpark",
    projectCode: "TPK-DN",
    department: "Phòng Kiểm Thử",
    position: "Kỹ sư kiểm thử",
    joinDate: "2023-01-10",
    status: "active",
    groupId: "grp-off-prj-tpk",
    groupName: "Kỹ thuật viên chính thức",
  },

  // Others
  {
    id: "emp-vsi-001",
    code: "NV-VSI-001",
    name: "Võ Hoàng Long",
    idCard: "074094002345",
    phone: "0903332211",
    email: "long.vo@vsip-supply.vn",
    projectId: "prj-vsip",
    projectCode: "VSIP-BD",
    department: "Phân xưởng Lắp ráp",
    position: "Công nhân chính thức",
    joinDate: "2023-11-01",
    status: "active",
  },
  {
    id: "emp-sev-001",
    code: "NV-SEV-001",
    name: "Hoàng Minh Tuấn",
    idCard: "019090001122",
    phone: "0918776655",
    email: "tuan.hoang@sevt-support.vn",
    projectId: "prj-sevt",
    projectCode: "SEVT-TN",
    department: "Phòng Sản Xuất Linh Kiện",
    position: "Trưởng ca sản xuất",
    joinDate: "2021-08-01",
    status: "active",
  },
];

const dependents: Dependent[] = [
  {
    id: "dep-1",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    employeeIdCard: "079090001122",
    employeeTaxCode: "8090001122",
    projectId: "prj-jss",
    projectCode: "JSS-HP",
    fullName: "Nguyễn Minh Khôi",
    relationship: "child",
    dob: "2018-05-12",
    idCardOrTaxCode: "079218009123",
    taxCode: "8021800912",
    startDate: "2023-04",
    endDate: undefined,
    attachmentUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    attachmentName: "Giay_Khai_Sinh_NguyenMinhKhoi.pdf",
    attachmentType: "birth_cert",
    creationMode: "accountant_import",
    status: "approved",
    verifiedBy: "Trần Thu Trang (Kế toán tiền lương)",
    verifiedAt: "2023-04-05 09:30",
  },
  {
    id: "dep-2",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    employeeIdCard: "079090001122",
    employeeTaxCode: "8090001122",
    projectId: "prj-jss",
    projectCode: "JSS-HP",
    fullName: "Lê Thị Hoa",
    relationship: "parent",
    dob: "1958-11-20",
    idCardOrTaxCode: "079158004567",
    taxCode: "8015800456",
    startDate: "2024-01",
    endDate: "2028-12",
    attachmentUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
    attachmentName: "Chung_Nhan_Mat_Kha_Nang_Lao_Dong_LeThiHoa.jpg",
    attachmentType: "disability_cert",
    creationMode: "bcsx_declare",
    status: "pending_approval",
  },
  {
    id: "dep-3",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Bình",
    employeeIdCard: "079192003344",
    employeeTaxCode: "8092003344",
    projectId: "prj-jss",
    projectCode: "JSS-HP",
    fullName: "Trần Bảo Ngọc",
    relationship: "child",
    dob: "2020-09-08",
    idCardOrTaxCode: "079220008899",
    taxCode: "8022000889",
    startDate: "2023-01",
    endDate: undefined,
    attachmentUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80",
    attachmentName: "CCCD_2_Mat_TranBaoNgoc.pdf",
    attachmentType: "cccd_2_sided",
    creationMode: "accountant_import",
    status: "approved",
    verifiedBy: "Trần Thu Trang (Kế toán tiền lương)",
    verifiedAt: "2023-01-12 14:15",
  },
  {
    id: "dep-4",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Văn Cường",
    employeeIdCard: "079088005566",
    employeeTaxCode: "8088005566",
    projectId: "prj-jss",
    projectCode: "JSS-HP",
    fullName: "Lê Văn Dũng",
    relationship: "parent",
    dob: "1960-03-14",
    idCardOrTaxCode: "080160007788",
    taxCode: "8016000778",
    startDate: "2024-02",
    endDate: "2026-12",
    attachmentUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    attachmentName: "CCCD_MatSau_LeVanDung.jpg",
    attachmentType: "cccd_2_sided",
    creationMode: "bcsx_declare",
    status: "rejected",
    verifiedBy: "Trần Thu Trang (Kế toán tiền lương)",
    verifiedAt: "2024-02-20 16:45",
    rejectionReason: "Hình chụp CCCD bị mờ góc thông tin và thiếu mặt trước. Yêu cầu BCSX chụp bổ sung 2 mặt rõ nét.",
  },
  {
    id: "dep-5",
    employeeId: "emp-vsi-001",
    employeeCode: "NV-VSI-001",
    employeeName: "Võ Hoàng Long",
    employeeIdCard: "074092007788",
    employeeTaxCode: "8092007788",
    projectId: "prj-vsip",
    projectCode: "VSIP-BD",
    fullName: "Võ Tuấn Kiệt",
    relationship: "child",
    dob: "2019-12-05",
    idCardOrTaxCode: "074219003322",
    taxCode: "8021900332",
    startDate: "2024-01",
    endDate: undefined,
    attachmentUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    attachmentName: "Giay_Khai_Sinh_VoTuanKiet.pdf",
    attachmentType: "birth_cert",
    creationMode: "bcsx_declare",
    status: "pending_approval",
  },
  {
    id: "dep-6",
    employeeId: "emp-sev-001",
    employeeCode: "NV-SEV-001",
    employeeName: "Hoàng Minh Tuấn",
    employeeIdCard: "019090001122",
    employeeTaxCode: "8090001122",
    projectId: "prj-sevt",
    projectCode: "SEVT-TN",
    fullName: "Hoàng Lan Chi",
    relationship: "child",
    dob: "2021-07-19",
    idCardOrTaxCode: "019221004455",
    taxCode: "8022100445",
    startDate: "2023-09",
    endDate: undefined,
    attachmentUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80",
    attachmentName: "CCCD_Dinh_Kem_HoangLanChi.pdf",
    attachmentType: "cccd_2_sided",
    creationMode: "accountant_import",
    status: "approved",
    verifiedBy: "Nguyễn Thu Hà (Kế toán dự án SEVT)",
    verifiedAt: "2023-09-10 11:20",
  },
  {
    id: "dep-7",
    employeeId: "emp-sev-002",
    employeeCode: "NV-SEV-002",
    employeeName: "Đặng Thuỳ Linh",
    employeeIdCard: "019197003344",
    employeeTaxCode: "8097003344",
    projectId: "prj-sevt",
    projectCode: "SEVT-TN",
    fullName: "Đặng Gia Huy",
    relationship: "child",
    dob: "2023-04-10",
    idCardOrTaxCode: "019223006677",
    taxCode: "8022300667",
    startDate: "2026-08",
    endDate: undefined,
    attachmentUrl: "",
    attachmentName: "",
    attachmentType: "birth_cert",
    creationMode: "bcsx_declare",
    status: "pending_approval",
  },
];

const leaveRecords: LeaveRecord[] = [
  {
    id: "leave-1",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2026-01-01",
    accruedDays: 8.0,
    availableDays: 3.5,
    totalEntitled: 12,
    seniorityDays: 1,
    usedDays: 4.5,
    remainingDays: 8.5,
    history: [
      { id: "lh-1", from: "2026-02-10", to: "2026-02-12", days: 2.5, leaveType: "annual", reason: "Nghỉ về quê ăn Tết sớm", approvedBy: "Trần Minh Anh (Quản lý dự án)", approvedAt: "2026-02-05 10:00" },
      { id: "lh-2", from: "2026-05-18", to: "2026-05-19", days: 2.0, leaveType: "annual", reason: "Giải quyết việc gia đình", approvedBy: "Trần Minh Anh (Quản lý dự án)", approvedAt: "2026-05-15 14:30" },
    ],
  },
  {
    id: "leave-2",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Bình",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2025-06-15",
    accruedDays: 8.0,
    availableDays: 5.0,
    totalEntitled: 12,
    seniorityDays: 2,
    usedDays: 3.0,
    remainingDays: 11.0,
    history: [
      { id: "lh-3", from: "2026-04-20", to: "2026-04-22", days: 3.0, leaveType: "annual", reason: "Nghỉ phép cá nhân", approvedBy: "Trần Minh Anh (Quản lý dự án)", approvedAt: "2026-04-16 09:00" },
    ],
  },
  {
    id: "leave-3",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Văn Cường",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2026-03-01",
    accruedDays: 8.0,
    availableDays: 0.0,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 12.0,
    remainingDays: 0.0,
    history: [
      { id: "lh-4", from: "2026-03-01", to: "2026-03-10", days: 8.0, leaveType: "annual", reason: "Nghỉ cưới và du lịch", approvedBy: "Trần Minh Anh (Quản lý dự án)", approvedAt: "2026-02-25 11:20" },
      { id: "lh-5", from: "2026-07-05", to: "2026-07-08", days: 4.0, leaveType: "annual", reason: "Chăm sóc bố phẫu thuật", approvedBy: "Trần Minh Anh (Quản lý dự án)", approvedAt: "2026-07-02 16:00" },
    ],
  },
  {
    id: "leave-4",
    employeeId: "emp-jss-004",
    employeeCode: "NV-JSS-004",
    employeeName: "Phạm Thu Hà",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2026-01-01",
    accruedDays: 8.0,
    availableDays: 6.5,
    totalEntitled: 12,
    seniorityDays: 1,
    usedDays: 1.5,
    remainingDays: 11.5,
    history: [
      { id: "lh-6", from: "2026-06-12", to: "2026-06-13", days: 1.5, leaveType: "annual", reason: "Khám sức khỏe tổng quát", approvedBy: "Trần Minh Anh (Quản lý dự án)", approvedAt: "2026-06-08 13:45" },
    ],
  },
  {
    id: "leave-probation-jss",
    employeeId: "emp-jss-005",
    employeeCode: "NV-JSS-005",
    employeeName: "Vũ Hoàng Nam",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    contractType: "probation",
    employeeStatus: "probation",
    eligibilityStatus: "probation_ineligible",
    entitlementDate: undefined,
    accruedDays: 0,
    availableDays: 0,
    totalEntitled: 0,
    seniorityDays: 0,
    usedDays: 0,
    remainingDays: 0,
    history: [],
  },
  {
    id: "leave-resigned-jss",
    employeeId: "emp-jss-006",
    employeeCode: "NV-JSS-006",
    employeeName: "Đoàn Thu Trang",
    projectId: "prj-jss",
    projectCode: "JSS-ST",
    contractType: "official",
    employeeStatus: "resigned",
    eligibilityStatus: "resigned",
    entitlementDate: "2023-02-15",
    resignationDate: "2026-06-30",
    accruedDays: 6.0,
    availableDays: 2.5,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 3.5,
    remainingDays: 2.5,
    history: [
      { id: "lh-res-1", from: "2026-03-12", to: "2026-03-14", days: 2.5, leaveType: "annual", reason: "Nghỉ việc cá nhân", approvedBy: "Trần Minh Anh (Quản lý dự án)", approvedAt: "2026-03-08 09:00" },
      { id: "lh-res-2", from: "2026-05-20", to: "2026-05-20", days: 1.0, leaveType: "annual", reason: "Giải quyết thủ tục bàn giao", approvedBy: "Trần Minh Anh (Quản lý dự án)", approvedAt: "2026-05-18 14:00" },
    ],
  },
  {
    id: "leave-5",
    employeeId: "emp-vsi-001",
    employeeCode: "NV-VSI-001",
    employeeName: "Võ Hoàng Long",
    projectId: "prj-vsip",
    projectCode: "VSIP-BD",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2026-01-01",
    accruedDays: 8.0,
    availableDays: 3.0,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 5.0,
    remainingDays: 7.0,
    history: [
      { id: "lh-7", from: "2026-01-15", to: "2026-01-20", days: 5.0, leaveType: "annual", reason: "Nghỉ việc gia đình", approvedBy: "Nguyễn Hải Đăng (Quản lý dự án VSIP)", approvedAt: "2026-01-10 15:00" },
    ],
  },
  {
    id: "leave-6",
    employeeId: "emp-vsi-002",
    employeeCode: "NV-VSI-002",
    employeeName: "Đỗ Mỹ Linh",
    projectId: "prj-vsip",
    projectCode: "VSIP-BD",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2025-08-01",
    accruedDays: 8.0,
    availableDays: 6.0,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 2.0,
    remainingDays: 10.0,
    history: [
      { id: "lh-8", from: "2026-04-10", to: "2026-04-11", days: 2.0, leaveType: "annual", reason: "Nghỉ phép thường niên", approvedBy: "Nguyễn Hải Đăng (Quản lý dự án VSIP)", approvedAt: "2026-04-06 09:30" },
    ],
  },
  {
    id: "leave-probation-vsip",
    employeeId: "emp-vsi-003",
    employeeCode: "NV-VSI-003",
    employeeName: "Lý Quốc Thắng",
    projectId: "prj-vsip",
    projectCode: "VSIP-BD",
    contractType: "probation",
    employeeStatus: "probation",
    eligibilityStatus: "probation_ineligible",
    entitlementDate: undefined,
    accruedDays: 0,
    availableDays: 0,
    totalEntitled: 0,
    seniorityDays: 0,
    usedDays: 0,
    remainingDays: 0,
    history: [],
  },
  {
    id: "leave-resigned-vsip",
    employeeId: "emp-vsi-004",
    employeeCode: "NV-VSI-004",
    employeeName: "Ngô Bích Thảo",
    projectId: "prj-vsip",
    projectCode: "VSIP-BD",
    contractType: "official",
    employeeStatus: "resigned",
    eligibilityStatus: "resigned",
    entitlementDate: "2023-04-10",
    resignationDate: "2026-05-31",
    accruedDays: 5.0,
    availableDays: 1.0,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 4.0,
    remainingDays: 1.0,
    history: [
      { id: "lh-res-vsi-1", from: "2026-02-15", to: "2026-02-18", days: 3.0, leaveType: "annual", reason: "Nghỉ việc riêng", approvedBy: "Nguyễn Hải Đăng", approvedAt: "2026-02-10 11:00" },
      { id: "lh-res-vsi-2", from: "2026-04-25", to: "2026-04-25", days: 1.0, leaveType: "annual", reason: "Giải quyết việc cá nhân", approvedBy: "Nguyễn Hải Đăng", approvedAt: "2026-04-20 15:30" },
    ],
  },
  {
    id: "leave-7",
    employeeId: "emp-sev-001",
    employeeCode: "NV-SEV-001",
    employeeName: "Hoàng Minh Tuấn",
    projectId: "prj-sevt",
    projectCode: "SEVT-TN",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2024-03-15",
    accruedDays: 8.0,
    availableDays: 2.0,
    totalEntitled: 12,
    seniorityDays: 3,
    usedDays: 6.0,
    remainingDays: 9.0,
    history: [
      { id: "lh-9", from: "2026-03-20", to: "2026-03-26", days: 6.0, leaveType: "annual", reason: "Nghỉ phép cá nhân", approvedBy: "Lê Quang Hưng (Quản lý SEVT)", approvedAt: "2026-03-15 10:30" },
    ],
  },
  {
    id: "leave-8",
    employeeId: "emp-sev-002",
    employeeCode: "NV-SEV-002",
    employeeName: "Bùi Thị Mai",
    projectId: "prj-sevt",
    projectCode: "SEVT-TN",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2026-01-01",
    accruedDays: 8.0,
    availableDays: 7.0,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 1.0,
    remainingDays: 11.0,
    history: [
      { id: "lh-10", from: "2026-05-02", to: "2026-05-02", days: 1.0, leaveType: "annual", reason: "Nghỉ việc riêng", approvedBy: "Lê Quang Hưng (Quản lý SEVT)", approvedAt: "2026-04-28 08:30" },
    ],
  },
  {
    id: "leave-probation-sevt",
    employeeId: "emp-sev-003",
    employeeCode: "NV-SEV-003",
    employeeName: "Phạm Văn Hải",
    projectId: "prj-sevt",
    projectCode: "SEVT-TN",
    contractType: "probation",
    employeeStatus: "probation",
    eligibilityStatus: "probation_ineligible",
    entitlementDate: undefined,
    accruedDays: 0,
    availableDays: 0,
    totalEntitled: 0,
    seniorityDays: 0,
    usedDays: 0,
    remainingDays: 0,
    history: [],
  },
  {
    id: "leave-resigned-sevt",
    employeeId: "emp-sev-004",
    employeeCode: "NV-SEV-004",
    employeeName: "Đặng Thị Tuyết",
    projectId: "prj-sevt",
    projectCode: "SEVT-TN",
    contractType: "official",
    employeeStatus: "resigned",
    eligibilityStatus: "resigned",
    entitlementDate: "2022-11-20",
    resignationDate: "2026-04-30",
    accruedDays: 4.0,
    availableDays: 1.5,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 2.5,
    remainingDays: 1.5,
    history: [
      { id: "lh-res-sev-1", from: "2026-01-18", to: "2026-01-20", days: 2.5, leaveType: "annual", reason: "Nghỉ việc gia đình", approvedBy: "Lê Quang Hưng", approvedAt: "2026-01-12 09:30" },
    ],
  },
  {
    id: "leave-9",
    employeeId: "emp-fxc-001",
    employeeCode: "NV-FXC-001",
    employeeName: "Phan Quốc Bảo",
    projectId: "prj-foxconn",
    projectCode: "FXC-BN",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2026-01-01",
    accruedDays: 8.0,
    availableDays: 8.0,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 0.0,
    remainingDays: 12.0,
    history: [],
  },
  {
    id: "leave-10",
    employeeId: "emp-fxc-002",
    employeeCode: "NV-FXC-002",
    employeeName: "Trịnh Kim Ngân",
    projectId: "prj-foxconn",
    projectCode: "FXC-BN",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2025-11-01",
    accruedDays: 8.0,
    availableDays: 4.5,
    totalEntitled: 12,
    seniorityDays: 1,
    usedDays: 3.5,
    remainingDays: 9.5,
    history: [
      { id: "lh-11", from: "2026-02-26", to: "2026-02-28", days: 2.5, leaveType: "annual", reason: "Về quê", approvedBy: "Vũ Đình Phong (Quản lý FXC)", approvedAt: "2026-02-20 11:00" },
      { id: "lh-12", from: "2026-06-05", to: "2026-06-05", days: 1.0, leaveType: "annual", reason: "Khám sức khỏe", approvedBy: "Vũ Đình Phong (Quản lý FXC)", approvedAt: "2026-06-01 15:20" },
    ],
  },
  {
    id: "leave-probation-fxc",
    employeeId: "emp-fxc-003",
    employeeCode: "NV-FXC-003",
    employeeName: "Trương Đình Hoàng",
    projectId: "prj-foxconn",
    projectCode: "FXC-BN",
    contractType: "probation",
    employeeStatus: "probation",
    eligibilityStatus: "probation_ineligible",
    entitlementDate: undefined,
    accruedDays: 0,
    availableDays: 0,
    totalEntitled: 0,
    seniorityDays: 0,
    usedDays: 0,
    remainingDays: 0,
    history: [],
  },
  {
    id: "leave-11",
    employeeId: "emp-cpl-001",
    employeeCode: "NV-CPL-001",
    employeeName: "Đặng Đình Trọng",
    projectId: "prj-compal",
    projectCode: "CPL-VP",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2026-01-01",
    accruedDays: 8.0,
    availableDays: 6.0,
    totalEntitled: 12,
    seniorityDays: 0,
    usedDays: 2.0,
    remainingDays: 10.0,
    history: [
      { id: "lh-13", from: "2026-04-15", to: "2026-04-16", days: 2.0, leaveType: "annual", reason: "Nghỉ việc gia đình", approvedBy: "Phạm Quốc Toàn", approvedAt: "2026-04-10 10:15" },
    ],
  },
  {
    id: "leave-12",
    employeeId: "emp-lgh-001",
    employeeCode: "NV-LGH-001",
    employeeName: "Lương Gia Huy",
    projectId: "prj-lg",
    projectCode: "LG-HP",
    contractType: "official",
    employeeStatus: "active",
    eligibilityStatus: "eligible",
    entitlementDate: "2024-09-01",
    accruedDays: 8.0,
    availableDays: 4.0,
    totalEntitled: 12,
    seniorityDays: 2,
    usedDays: 4.0,
    remainingDays: 10.0,
    history: [
      { id: "lh-14", from: "2026-01-20", to: "2026-01-23", days: 4.0, leaveType: "annual", reason: "Nghỉ phép cá nhân", approvedBy: "Hoàng Nhật Linh", approvedAt: "2026-01-15 14:00" },
    ],
  },
];

const unionFees: UnionFeeRecord[] = employees.map((emp, index) => {
  const isPart = index !== 4; // Vũ Hoàng Nam (thử việc) chưa tham gia
  return {
    id: `union-${emp.id}`,
    employeeId: emp.id,
    employeeCode: emp.code,
    employeeName: emp.name,
    projectId: emp.projectId,
    projectCode: emp.projectCode,
    joinDate: emp.joinDate,
    resignationDate: emp.status === "resigned" ? "2026-06-30" : undefined,
    joinedUnionDate: isPart ? emp.joinDate : undefined,
    period: "2026-08",
    feeType: "percentage",
    amount: isPart ? 23400 : 0,
    isParticipating: isPart,
    importedAt: "2026-08-01 08:30",
    importedBy: "Trần Thu Trang (Kế toán)",
    history: [
      {
        id: `ufh-${emp.id}-1`,
        actionDate: emp.joinDate || "2024-01-01",
        actionType: "join",
        actionLabel: isPart ? "Đăng ký tham gia Công đoàn" : "Chưa đăng ký tham gia",
        amount: isPart ? 23400 : 0,
        changedBy: "Trần Thu Trang (Kế toán)",
        note: isPart ? "Gia nhập Công đoàn cơ sở khi ký HĐLĐ" : "Hồ sơ đang chờ phê duyệt",
      },
    ],
  };
});

const standardWorkdays: StandardWorkdayRecord[] = employees.map((emp, index) => {
  const isOverridden = index === 2 || index === 8; // Lê Văn Cường, Phan Quốc Bảo
  return {
    id: `workday-${emp.id}`,
    employeeId: emp.id,
    employeeCode: emp.code,
    employeeName: emp.name,
    projectId: emp.projectId,
    projectStandardDays: 26,
    overrideDays: isOverridden ? 24 : undefined,
    isOverridden,
    reason: isOverridden ? "Chuyển chế độ làm việc ca kíp 24 công/tháng" : undefined,
    updatedAt: "2026-08-01 10:00",
    updatedBy: "Kế toán tiền lương",
  };
});

const insuranceRecords: InsuranceRecord[] = employees.map((emp, index) => {
  const isStopped = index === 11;
  const isSuspended = index === 6;
  const status: "active" | "suspended" | "stopped" = isStopped ? "stopped" : isSuspended ? "suspended" : "active";
  const salary = emp.position.includes("Tổ trưởng") || emp.position.includes("Trưởng ca") ? 8000000 : 6300000;

  return {
    id: `ins-${emp.id}`,
    employeeId: emp.id,
    employeeCode: emp.code,
    employeeName: emp.name,
    projectId: emp.projectId,
    insuranceBookNumber: `79${emp.idCard.slice(-8)}`,
    insuranceSalary: salary,
    employeeRate: 10.5,
    companyRate: 21.5,
    effectiveMonth: "2026-01",
    status,
    hospitalName: "Bệnh viện Đa khoa Khu vực Thủ Đức",
    verifiedBy: "Trần Thu Trang (Kế toán BHXH)",
    verifiedAt: "2026-01-05 09:30",
  };
});

const insuranceChanges: InsuranceChangeRecord[] = [
  {
    id: "ins-chg-1",
    employeeId: "emp-1",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    projectId: "prj-jss",
    period: "2026-08",
    changeType: "salary_adjust",
    oldSalary: 6300000,
    newSalary: 7500000,
    effectiveMonth: "2026-08",
    reason: "Tăng lương thâm niên theo Phụ lục HĐLĐ số 02/2026",
    status: "pending_agency_verification",
    documentName: "PhuLucHDLD_NguyenVanAn.pdf",
    createdAt: "2026-08-01 08:30",
  },
  {
    id: "ins-chg-2",
    employeeId: "emp-4",
    employeeCode: "NV-JSS-004",
    employeeName: "Phạm Thị Dung",
    projectId: "prj-jss",
    period: "2026-08",
    changeType: "increase",
    oldSalary: 0,
    newSalary: 6300000,
    effectiveMonth: "2026-08",
    reason: "Ký Hợp đồng lao động chính thức 12 tháng",
    status: "pending_agency_verification",
    documentName: "HDLD_PhamThiDung.pdf",
    createdAt: "2026-08-02 09:15",
  },
  {
    id: "ins-chg-3",
    employeeId: "emp-7",
    employeeCode: "NV-JSS-007",
    employeeName: "Vũ Thị Giang",
    projectId: "prj-jss",
    period: "2026-08",
    changeType: "suspend",
    oldSalary: 6300000,
    newSalary: 6300000,
    effectiveMonth: "2026-08",
    reason: "Nghỉ hưởng chế độ thai sản 6 tháng (08/2026 - 01/2027)",
    status: "verified",
    agencyReceiptCode: "BHXH-7901-202608-00412",
    verifiedBy: "Trần Thu Trang (Kế toán BHXH)",
    verifiedAt: "2026-08-05 14:20",
    documentName: "GiayChungSinh_VuThiGiang.pdf",
    createdAt: "2026-08-03 10:00",
  },
  {
    id: "ins-chg-4",
    employeeId: "emp-12",
    employeeCode: "NV-JSS-012",
    employeeName: "Đinh Thị Mai",
    projectId: "prj-jss",
    period: "2026-08",
    changeType: "decrease",
    oldSalary: 6300000,
    newSalary: 0,
    effectiveMonth: "2026-08",
    reason: "Chấm dứt HĐLĐ theo nguyện vọng cá nhân",
    status: "verified",
    agencyReceiptCode: "BHXH-7901-202608-00189",
    verifiedBy: "Trần Thu Trang (Kế toán BHXH)",
    verifiedAt: "2026-08-04 16:45",
    documentName: "QuyetDinhThoiViec_DinhThiMai.pdf",
    createdAt: "2026-08-02 11:30",
  },
];

const taxConfigs: TaxConfigRecord[] = employees.map((emp) => {
  const approvedDeps = dependents.filter((d) => d.employeeId === emp.id && d.status === "approved");
  const approvedCount = approvedDeps.length;
  return {
    id: `tax-${emp.id}`,
    employeeId: emp.id,
    employeeCode: emp.code,
    employeeName: emp.name,
    projectId: emp.projectId,
    taxCode: `80${emp.idCard.slice(-8)}`,
    taxType: "progressive",
    hasCommitment08: false,
    approvedDependentsCount: approvedCount,
    personalDeduction: 11000000,
    dependentDeduction: approvedCount * 4400000,
  };
});

const employeePolicies: EmployeePolicyRecord[] = employees.map((emp, index) => {
  const role: TargetRole = index === 0 || emp.id === "emp-1"
    ? "shift_leader"
    : emp.id === "emp-6"
    ? "hoc_viec"
    : "chinh_thuc";

  const roleTitle =
    role === "shift_leader"
      ? "Trưởng ca / Tổ trưởng"
      : role === "hoc_viec"
      ? "Học việc / Thử việc"
      : "Nhân viên chính thức";

  const items: EmployeePolicyItem[] = policyDefinitions.slice(0, 16).map((pDef) => {
    const roleVal = pDef.targetValues?.[role] || {};
    const defaultVal = { ...roleVal };

    let isEnabled = true;
    let isCustom = false;
    let customVal = { ...defaultVal };
    let reason: string | undefined;

    // Special customization logic for realism
    if (pDef.id === "pol-responsibility" || pDef.code === "RESPONSIBILITY_ALLOWANCE") {
      if (role === "shift_leader") {
        isEnabled = true;
        isCustom = true;
        customVal = { amount: 1500000 };
        reason = "Phụ cấp trách nhiệm Trưởng ca sản xuất (QĐ số 42/QĐ-BĐH)";
      } else if (index % 4 === 1) {
        isEnabled = true;
        isCustom = true;
        customVal = { amount: 800000 };
        reason = "Phụ cấp kiêm nhiệm an toàn vệ sinh viên";
      } else {
        isEnabled = false;
      }
    } else if (pDef.id === "pol-travel" || pDef.code === "TRAVEL_ALLOWANCE") {
      if (index % 3 === 0) {
        isCustom = true;
        customVal = { amount: 600000 };
        reason = "Hỗ trợ xăng xe tuyến đường xa > 20km";
      }
    } else if (pDef.id === "pol-housing" || pDef.code === "HOUSING_ALLOWANCE") {
      if (index % 4 === 0) {
        isCustom = true;
        customVal = { amount: 900000 };
        reason = "Hỗ trợ tiền thuê nhà công nhân ngoại tỉnh";
      }
    } else if (pDef.id === "pol-child-care" || pDef.code === "CHILD_CARE_ALLOWANCE") {
      if (index % 2 === 0) {
        isEnabled = true;
        isCustom = true;
        customVal = { amount: 500000 };
        reason = "Hỗ trợ nuôi con nhỏ dưới 6 tuổi";
      } else {
        isEnabled = false;
      }
    } else if (pDef.id === "pol-split-shift" || pDef.code === "SPLIT_SHIFT_ALLOWANCE") {
      isEnabled = role === "shift_leader" || index % 2 === 1;
    }

    return {
      policyId: pDef.id,
      policyCode: pDef.code,
      policyName: pDef.name,
      category: pDef.category,
      isEnabled,
      isCustom,
      defaultValue: defaultVal,
      customValue: customVal,
      effectiveFrom: "2026-01-01",
      reason,
      updatedAt: "2026-08-01 09:00",
      updatedBy: "Kế toán C&B",
    };
  });

  const baseSalItem = items.find((i) => i.policyId === "pol-base-salary");
  const insSalItem = items.find((i) => i.policyId === "pol-insurance-salary");

  const baseSalary = Number(
    (baseSalItem?.isCustom ? baseSalItem.customValue?.amount : baseSalItem?.defaultValue?.amount) ||
      (role === "shift_leader" ? 7000000 : 6300000)
  );

  const insuranceSalary = Number(
    (insSalItem?.isCustom ? insSalItem.customValue?.amount : insSalItem?.defaultValue?.amount) ||
      (role === "shift_leader" ? 8000000 : 6300000)
  );

  // Sum monthly allowances (category === allowance or bonus, excluding baseSalary/insuranceSalary)
  const totalAllowance = items
    .filter(
      (i) =>
        i.isEnabled &&
        i.policyId !== "pol-base-salary" &&
        i.policyId !== "pol-insurance-salary" &&
        i.policyId !== "pol-hourly-rate" &&
        !i.policyId.startsWith("pol-ot")
    )
    .reduce((sum, i) => {
      const val = i.isCustom ? i.customValue?.amount : i.defaultValue?.amount;
      return sum + (typeof val === "number" ? val : 0);
    }, 0);

  const customPolicyCount = items.filter((i) => i.isCustom).length;

  return {
    id: `emp-pol-${emp.id}`,
    employeeId: emp.id,
    employeeCode: emp.code,
    employeeName: emp.name,
    projectId: emp.projectId,
    projectCode: emp.projectCode,
    role,
    roleTitle,
    joinDate: emp.joinDate,
    baseSalary,
    insuranceSalary,
    totalAllowance,
    customPolicyCount,
    policies: items,
    updatedAt: "2026-08-01 09:00",
    updatedBy: "Kế toán C&B",
  };
});

const projectEmployeeGroups: ProjectEmployeeGroup[] = [
  // JSS
  {
    id: "grp-mgmt-prj-jss",
    projectId: "prj-jss",
    code: "shift_leader",
    name: "Quản lý / Shift Leader",
    description: "Nhóm trưởng ca, quản lý chuyền sản xuất",
    colorTone: "info",
    isDefault: false,
    sortOrder: 1,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-off-prj-jss",
    projectId: "prj-jss",
    code: "chinh_thuc",
    name: "Công nhân chính thức",
    description: "Công nhân ký hợp đồng lao động chính thức",
    colorTone: "success",
    isDefault: true,
    sortOrder: 2,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-prob-prj-jss",
    projectId: "prj-jss",
    code: "hoc_viec",
    name: "Học việc (29 ngày)",
    description: "Lao động mới tham gia đào tạo học nghề",
    colorTone: "warning",
    isDefault: false,
    sortOrder: 3,
    createdAt: "2026-07-01",
  },
  // SWM
  {
    id: "grp-mgmt-prj-swm",
    projectId: "prj-swm",
    code: "shift_leader",
    name: "Quản lý / Giám sát",
    description: "Giám sát ca và quản lý khu vực",
    colorTone: "info",
    isDefault: false,
    sortOrder: 1,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-off-prj-swm",
    projectId: "prj-swm",
    code: "chinh_thuc",
    name: "Công nhân chính thức",
    description: "Công nhân sản xuất chính thức",
    colorTone: "success",
    isDefault: true,
    sortOrder: 2,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-prob-prj-swm",
    projectId: "prj-swm",
    code: "hoc_viec",
    name: "Học việc (29 ngày)",
    description: "Lao động học nghề sản xuất",
    colorTone: "warning",
    isDefault: false,
    sortOrder: 3,
    createdAt: "2026-07-01",
  },
  // Logistics
  {
    id: "grp-mgmt-prj-lgt",
    projectId: "prj-logistics",
    code: "shift_leader",
    name: "Quản lý kho",
    description: "Trưởng nhóm điều phối vận hành kho",
    colorTone: "info",
    isDefault: false,
    sortOrder: 1,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-off-prj-lgt",
    projectId: "prj-logistics",
    code: "chinh_thuc",
    name: "Nhân viên vận hành kho",
    description: "Nhân viên bốc xếp và lái xe nâng",
    colorTone: "success",
    isDefault: true,
    sortOrder: 2,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-prob-prj-lgt",
    projectId: "prj-logistics",
    code: "thoi_vu",
    name: "Lao động bốc xếp thời vụ",
    description: "Nhân sự thời vụ tăng cường bốc dỡ hàng hóa",
    colorTone: "warning",
    isDefault: false,
    sortOrder: 3,
    createdAt: "2026-07-01",
  },
  // Retail
  {
    id: "grp-mgmt-prj-rtl",
    projectId: "prj-retail",
    code: "shift_leader",
    name: "Cửa hàng trưởng / Quản lý",
    description: "Quản lý chi nhánh cửa hàng bán lẻ",
    colorTone: "info",
    isDefault: false,
    sortOrder: 1,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-off-prj-rtl",
    projectId: "prj-retail",
    code: "chinh_thuc",
    name: "Nhân viên bán hàng chính thức",
    description: "Nhân viên thu ngân và tư vấn bán hàng",
    colorTone: "success",
    isDefault: true,
    sortOrder: 2,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-prob-prj-rtl",
    projectId: "prj-retail",
    code: "part_time",
    name: "Nhân viên thời vụ part-time",
    description: "Nhân sự làm việc theo ca bán thời gian",
    colorTone: "warning",
    isDefault: false,
    sortOrder: 3,
    createdAt: "2026-07-01",
  },
  // Security
  {
    id: "grp-mgmt-prj-sec",
    projectId: "prj-security",
    code: "shift_leader",
    name: "Đội trưởng mục tiêu",
    description: "Chỉ huy và phân ca trực bảo vệ",
    colorTone: "info",
    isDefault: false,
    sortOrder: 1,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-off-prj-sec",
    projectId: "prj-security",
    code: "chinh_thuc",
    name: "Nhân viên bảo vệ chính thức",
    description: "Bảo vệ mục tiêu cố định",
    colorTone: "success",
    isDefault: true,
    sortOrder: 2,
    createdAt: "2026-07-01",
  },
  // Techpark
  {
    id: "grp-mgmt-prj-tpk",
    projectId: "prj-techpark",
    code: "shift_leader",
    name: "Trưởng nhóm kỹ thuật",
    description: "Lead kỹ thuật và quản lý dự án R&D",
    colorTone: "info",
    isDefault: false,
    sortOrder: 1,
    createdAt: "2026-07-01",
  },
  {
    id: "grp-off-prj-tpk",
    projectId: "prj-techpark",
    code: "chinh_thuc",
    name: "Kỹ thuật viên chính thức",
    description: "Kỹ sư và chuyên viên kỹ thuật cao",
    colorTone: "success",
    isDefault: true,
    sortOrder: 2,
    createdAt: "2026-07-01",
  },
];

export const activityLogs: ActivityLogItem[] = [
  // ================= POLICIES SUBTAB LOGS =================
  {
    id: "act-pol-1",
    projectId: "prj-jss",
    module: "policies",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    actionType: "update",
    actionLabel: "Tăng phụ cấp xăng xe",
    details: "Phụ cấp xăng xe & đi lại: 400.000đ → 650.000đ/tháng",
    oldValue: 400000,
    newValue: 650000,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T16:45:00Z",
  },
  {
    id: "act-pol-2",
    projectId: "prj-jss",
    module: "policies",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Mai",
    actionType: "override",
    actionLabel: "Tùy chỉnh phụ cấp",
    details: "Phụ cấp trách nhiệm: 500.000đ → 1.200.000đ (Bổ nhiệm Ca trưởng ca 2)",
    oldValue: 500000,
    newValue: 1200000,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-20T14:10:00Z",
  },
  {
    id: "act-pol-3",
    projectId: "prj-jss",
    module: "policies",
    employeeId: "emp-jss-004",
    employeeCode: "NV-JSS-004",
    employeeName: "Phạm Thị Dung",
    actionType: "restore",
    actionLabel: "Khôi phục chuẩn dự án",
    details: "Phụ cấp độc hại: khôi phục về định mức dự án (300.000đ)",
    oldValue: 500000,
    newValue: 300000,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T10:30:00Z",
  },
  {
    id: "act-pol-4",
    projectId: "prj-jss",
    module: "policies",
    employeeId: "emp-jss-005",
    employeeCode: "NV-JSS-005",
    employeeName: "Vũ Hoàng Nam",
    actionType: "import",
    actionLabel: "Import phụ cấp Excel",
    details: "Import phụ cấp điện thoại 300.000đ từ tệp Phu_Cap_T8.xlsx",
    newValue: 300000,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-20T08:15:00Z",
  },
  {
    id: "act-pol-5",
    projectId: "prj-jss",
    module: "policies",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Hoàng Nam",
    actionType: "update",
    actionLabel: "Điều chỉnh lương cơ bản",
    details: "Lương cơ bản: 7.000.000đ → 7.800.000đ (Tăng lương định kỳ)",
    oldValue: 7000000,
    newValue: 7800000,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-19T17:00:00Z",
  },
  {
    id: "act-pol-6",
    projectId: "prj-jss",
    module: "policies",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    actionType: "override",
    actionLabel: "Tùy chỉnh phụ cấp",
    details: "Phụ cấp ăn trưa: 730.000đ → 900.000đ/tháng",
    oldValue: 730000,
    newValue: 900000,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-19T11:20:00Z",
  },
  {
    id: "act-pol-7",
    projectId: "prj-jss",
    module: "policies",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Mai",
    actionType: "import",
    actionLabel: "Import phụ cấp Excel",
    details: "Cập nhật phụ cấp độc hại 400.000đ từ tệp Phu_cap_T08.xlsx",
    newValue: 400000,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-18T09:00:00Z",
  },

  // ================= WORKDAYS SUBTAB LOGS =================
  {
    id: "act-wd-1",
    projectId: "prj-jss",
    module: "workdays",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    actionType: "override",
    actionLabel: "Ghi đè ngày công",
    details: "Ngày công chuẩn riêng: 26 ngày → 24 ngày (Thỏa thuận chế độ đặc thù)",
    oldValue: 26,
    newValue: 24,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T15:20:00Z",
  },
  {
    id: "act-wd-2",
    projectId: "prj-jss",
    module: "workdays",
    employeeId: "emp-jss-005",
    employeeCode: "NV-JSS-005",
    employeeName: "Vũ Hoàng Nam",
    actionType: "override",
    actionLabel: "Ghi đè ngày công",
    details: "Ngày công chuẩn riêng: 26 ngày → 22 ngày (HĐ thử việc tháng đầu)",
    oldValue: 26,
    newValue: 22,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T11:45:00Z",
  },
  {
    id: "act-wd-3",
    projectId: "prj-jss",
    module: "workdays",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Mai",
    actionType: "restore",
    actionLabel: "Khôi phục chuẩn dự án",
    details: "Khôi phục về ngày công chuẩn dự án (26 ngày)",
    oldValue: 24,
    newValue: 26,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-20T09:10:00Z",
  },
  {
    id: "act-wd-4",
    projectId: "prj-jss",
    module: "workdays",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Hoàng Nam",
    actionType: "import",
    actionLabel: "Import ngày công Excel",
    details: "Đồng bộ ngày công từ tệp Bang_Cong_Chuan_T08.xlsx (26 ngày)",
    oldValue: 24,
    newValue: 26,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T08:00:00Z",
  },
  {
    id: "act-wd-5",
    projectId: "prj-jss",
    module: "workdays",
    employeeId: "emp-jss-004",
    employeeCode: "NV-JSS-004",
    employeeName: "Phạm Thị Dung",
    actionType: "override",
    actionLabel: "Ghi đè ngày công",
    details: "Ngày công chuẩn riêng: 26 ngày → 20 ngày (Hợp đồng cộng tác viên)",
    oldValue: 26,
    newValue: 20,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-19T16:30:00Z",
  },
  {
    id: "act-wd-6",
    projectId: "prj-jss",
    module: "workdays",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    actionType: "restore",
    actionLabel: "Khôi phục chuẩn dự án",
    details: "Khôi phục về ngày công chuẩn dự án (26 ngày)",
    oldValue: 22,
    newValue: 26,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-19T10:15:00Z",
  },

  // ================= UNION FEES SUBTAB LOGS =================
  {
    id: "act-un-1",
    projectId: "prj-jss",
    module: "union",
    employeeId: "emp-jss-005",
    employeeCode: "NV-JSS-005",
    employeeName: "Vũ Hoàng Nam",
    actionType: "join",
    actionLabel: "Đăng ký tham gia",
    details: "Gia nhập Công đoàn cơ sở, mức trích nộp 23.400đ/tháng",
    newValue: 23400,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-20T16:00:00Z",
  },
  {
    id: "act-un-2",
    projectId: "prj-jss",
    module: "union",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    actionType: "update",
    actionLabel: "Cập nhật mức đóng",
    details: "Mức trích nộp: 20.000đ → 23.400đ/tháng (1% lương tối thiểu vùng)",
    oldValue: 20000,
    newValue: 23400,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T14:30:00Z",
  },
  {
    id: "act-un-3",
    projectId: "prj-jss",
    module: "union",
    employeeId: "emp-jss-004",
    employeeCode: "NV-JSS-004",
    employeeName: "Phạm Thị Dung",
    actionType: "leave",
    actionLabel: "Ngừng tham gia",
    details: "Tạm ngưng trích nộp công đoàn phí (Nghỉ chế độ thai sản)",
    oldValue: 23400,
    newValue: 0,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T10:00:00Z",
  },
  {
    id: "act-un-4",
    projectId: "prj-jss",
    module: "union",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Mai",
    actionType: "import",
    actionLabel: "Import đoàn phí Excel",
    details: "Import danh sách trích nộp Công đoàn tháng 08/2026",
    newValue: 23400,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-20T08:30:00Z",
  },
  {
    id: "act-un-5",
    projectId: "prj-jss",
    module: "union",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Hoàng Nam",
    actionType: "join",
    actionLabel: "Đăng ký tham gia",
    details: "Gia nhập Công đoàn cơ sở, mức đóng 23.400đ/tháng",
    newValue: 23400,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-19T15:00:00Z",
  },

  // ================= INSURANCE SUBTAB LOGS =================
  {
    id: "act-ins-1",
    projectId: "prj-jss",
    module: "insurance",
    employeeId: "emp-jss-005",
    employeeCode: "NV-JSS-005",
    employeeName: "Vũ Hoàng Nam",
    actionType: "approve",
    actionLabel: "Kế toán xác nhận D02-LT",
    details: "Xác nhận hồ sơ báo tăng mới tham gia BHXH (Mức lương đóng: 6.300.000đ)",
    newValue: 6300000,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T16:30:00Z",
  },
  {
    id: "act-ins-2",
    projectId: "prj-jss",
    module: "insurance",
    employeeId: "emp-jss-005",
    employeeCode: "NV-JSS-005",
    employeeName: "Vũ Hoàng Nam",
    actionType: "create",
    actionLabel: "Khai báo tăng mới (D02-LT)",
    details: "Lập tờ khai D02-LT báo tăng mới người lao động sau thử việc",
    newValue: 6300000,
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-20T14:00:00Z",
  },
  {
    id: "act-ins-3",
    projectId: "prj-jss",
    module: "insurance",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    actionType: "approve",
    actionLabel: "Kế toán xác nhận D02-LT",
    details: "Xác nhận điều chỉnh lương đóng BHXH: 6.300.000đ → 7.000.000đ",
    oldValue: 6300000,
    newValue: 7000000,
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T10:45:00Z",
  },
  {
    id: "act-ins-4",
    projectId: "prj-jss",
    module: "insurance",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Hoàng Nam",
    actionType: "create",
    actionLabel: "Báo giảm lao động",
    details: "Báo giảm hẳn tham gia BHXH do chấm dứt hợp đồng lao động",
    changedBy: "Lê Minh Tuấn (C&B)",
    createdAt: "2026-08-20T09:15:00Z",
  },
  {
    id: "act-ins-5",
    projectId: "prj-jss",
    module: "insurance",
    employeeId: "emp-jss-004",
    employeeCode: "NV-JSS-004",
    employeeName: "Phạm Thị Dung",
    actionType: "reject",
    actionLabel: "Từ chối hồ sơ BHXH",
    details: "Từ chối hồ sơ điều chỉnh chức danh công việc do thiếu quyết định bổ nhiệm",
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T08:00:00Z",
  },
  {
    id: "act-ins-6",
    projectId: "prj-jss",
    module: "insurance",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Mai",
    actionType: "approve",
    actionLabel: "Kế toán duyệt đợt 1",
    details: "Duyệt danh sách đối soát đóng BHXH tháng 08/2026",
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-19T16:15:00Z",
  },

  // ================= DEPENDENTS SUBTAB LOGS =================
  {
    id: "act-dep-1",
    projectId: "prj-jss",
    module: "dependents",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    actionType: "approve",
    actionLabel: "Kế toán xét duyệt NPT",
    details: "Duyệt hồ sơ NPT Nguyễn Gia Hân hợp lệ (Mức giảm trừ gia cảnh 4.400.000đ/tháng)",
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T17:00:00Z",
  },
  {
    id: "act-dep-2",
    projectId: "prj-jss",
    module: "dependents",
    employeeId: "emp-jss-001",
    employeeCode: "NV-JSS-001",
    employeeName: "Nguyễn Văn An",
    actionType: "create",
    actionLabel: "BCSX khai báo mới NPT",
    details: "Khai báo NPT Nguyễn Minh Quân (Quan hệ: Con ruột / Con nuôi)",
    changedBy: "Nguyễn Văn Hùng (BCSX)",
    createdAt: "2026-08-20T14:20:00Z",
  },
  {
    id: "act-dep-3",
    projectId: "prj-jss",
    module: "dependents",
    employeeId: "emp-jss-004",
    employeeCode: "NV-JSS-004",
    employeeName: "Phạm Thị Dung",
    actionType: "reject",
    actionLabel: "Từ chối hồ sơ NPT",
    details: "Từ chối hồ sơ NPT do ảnh chụp CCCD 2 mặt bị mờ, không rõ số định danh",
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T11:15:00Z",
  },
  {
    id: "act-dep-4",
    projectId: "prj-jss",
    module: "dependents",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Mai",
    actionType: "create",
    actionLabel: "BCSX khai báo mới NPT",
    details: "Khai báo NPT Trần Văn Hùng (Quan hệ: Cha / Mẹ ruột)",
    changedBy: "Nguyễn Văn Hùng (BCSX)",
    createdAt: "2026-08-20T09:30:00Z",
  },
  {
    id: "act-dep-5",
    projectId: "prj-jss",
    module: "dependents",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Hoàng Nam",
    actionType: "import",
    actionLabel: "Import NPT Excel",
    details: "Import danh sách người phụ thuộc quý 3 từ file Danh_sach_NPT_Q3.xlsx",
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-20T08:10:00Z",
  },
  {
    id: "act-dep-6",
    projectId: "prj-jss",
    module: "dependents",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Hoàng Nam",
    actionType: "approve",
    actionLabel: "Kế toán xét duyệt NPT",
    details: "Duyệt hồ sơ NPT Lê Minh Khôi hợp lệ (Mức giảm trừ 4.400.000đ/tháng)",
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-19T16:30:00Z",
  },
  {
    id: "act-dep-7",
    projectId: "prj-jss",
    module: "dependents",
    employeeId: "emp-jss-003",
    employeeCode: "NV-JSS-003",
    employeeName: "Lê Hoàng Nam",
    actionType: "create",
    actionLabel: "BCSX khai báo mới NPT",
    details: "Khai báo NPT Lê Minh Khôi (Quan hệ: Con ruột / Con nuôi)",
    changedBy: "Nguyễn Văn Hùng (BCSX)",
    createdAt: "2026-08-19T10:00:00Z",
  },
  {
    id: "act-dep-8",
    projectId: "prj-jss",
    module: "dependents",
    employeeId: "emp-jss-002",
    employeeCode: "NV-JSS-002",
    employeeName: "Trần Thị Mai",
    actionType: "import",
    actionLabel: "Import NPT Excel",
    details: "Import thành công hồ sơ NPT Trần Gia Bảo từ file Excel",
    changedBy: "Trần Thu Trang (Kế toán)",
    createdAt: "2026-08-18T11:20:00Z",
  },
];

export const seedDatabase: MockDatabase = {
  schemaVersion: 17,
  projects,
  policyDefinitions,
  projectPolicies,
  attendanceConfigs,
  overtimeTypes,
  overtimeConfigs,
  formulas: projects.flatMap((project) => formulasForProject(project.id)),
  formulaVariables,
  projectCustomVariables,
  dataMappings,
  testEmployees,
  employees,
  dependents,
  leaveRecords,
  unionFees,
  standardWorkdays,
  insuranceRecords,
  insuranceChanges,
  taxConfigs,
  employeePolicies,
  projectEmployeeGroups,
  activityLogs,
  ...payrollSeed,
};
