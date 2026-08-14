import type {
  AttendanceConfig,
  DataMapping,
  ExpressionNode,
  FormulaVariable,
  MockDatabase,
  OvertimeType,
  PolicyDefinition,
  Project,
  ProjectOvertimeConfig,
  ProjectPolicy,
  SalaryFormula,
  TestEmployee,
} from "@/lib/types";

const projects: Project[] = [
  {
    id: "prj-jss",
    code: "JSS-ST",
    name: "Jabil Smart Solutions",
    client: "Jabil",
    location: "Khu công nghệ cao, TP. Hồ Chí Minh",
    manager: "Trần Minh Anh",
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
];

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

export const seedDatabase: MockDatabase = {
  schemaVersion: 6,
  projects,
  policyDefinitions,
  projectPolicies,
  attendanceConfigs,
  overtimeTypes,
  overtimeConfigs,
  formulas: projects.flatMap((project) => formulasForProject(project.id)),
  formulaVariables,
  dataMappings,
  testEmployees,
};
