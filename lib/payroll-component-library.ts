import type { FormulaVariable } from "@/lib/types";

export interface SalaryComponentDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  outputVariable: string;
  category: "income" | "deduction";
  defaultFormulaText: string;
}

export interface PayrollProjectParameterDefinition {
  code: string;
  name: string;
  unit: string;
  description: string;
  defaultValue: number;
}

/**
 * Salary components standardized from the SWM-DN 2026 payroll policy.
 * Keep policy inputs configurable; formulas should only encode the calculation rule.
 */
export const salaryComponentLibrary: SalaryComponentDefinition[] = [
  {
    id: "regular-pay",
    code: "REGULAR_PAY",
    name: "Lương theo ngày công thực tế",
    description:
      "Lương cơ bản chia ngày công chuẩn của tháng, nhân số ngày làm việc bình thường thực tế.",
    outputVariable: "LUONG_NGAY_CONG",
    category: "income",
    defaultFormulaText: "LUONG_CO_BAN / NGAY_CONG_CHUAN * NGAY_CONG_THUC_TE",
  },
  {
    id: "training-pay",
    code: "TRAINING_PAY",
    name: "Lương hội họp / huấn luyện",
    description: "Tính theo lương 1 giờ nhân số giờ tham gia hội họp hoặc huấn luyện.",
    outputVariable: "LUONG_HUAN_LUYEN",
    category: "income",
    defaultFormulaText: "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * GIO_HUAN_LUYEN",
  },
  {
    id: "ot-weekday-day",
    code: "OT_WEEKDAY_DAY_150",
    name: "Tăng ca ngày thường (150%)",
    description: "Giờ làm thêm trên 8 giờ trong ngày thường, không áp dụng cho ngày nghỉ và ngày lễ.",
    outputVariable: "LUONG_OT_NGAY_THUONG",
    category: "income",
    defaultFormulaText:
      "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * 1.5 * GIO_OT_NGAY_THUONG",
  },
  {
    id: "ot-weekday-night-no-day-ot",
    code: "OT_WEEKDAY_NIGHT_200",
    name: "Tăng ca đêm ngày thường, không OT ban ngày (200%)",
    description: "Ca đêm ngày thường khi người lao động không làm thêm giờ vào ban ngày.",
    outputVariable: "LUONG_OT_DEM_NGAY_THUONG_200",
    category: "income",
    defaultFormulaText:
      "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * 2 * GIO_OT_DEM_NGAY_THUONG_KHONG_OT_NGAY",
  },
  {
    id: "ot-weekday-night-with-day-ot",
    code: "OT_WEEKDAY_NIGHT_210",
    name: "Tăng ca đêm ngày thường, có OT ban ngày (210%)",
    description: "Ca đêm ngày thường khi người lao động có làm thêm giờ vào ban ngày.",
    outputVariable: "LUONG_OT_DEM_NGAY_THUONG_210",
    category: "income",
    defaultFormulaText:
      "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * 2.1 * GIO_OT_DEM_NGAY_THUONG_CO_OT_NGAY",
  },
  {
    id: "ot-rest-day",
    code: "OT_REST_DAY_200",
    name: "Tăng ca ngày nghỉ (200%)",
    description: "Số giờ làm việc vào ngày nghỉ theo quy định của dự án.",
    outputVariable: "LUONG_OT_NGAY_NGHI",
    category: "income",
    defaultFormulaText:
      "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * 2 * GIO_OT_NGAY_NGHI",
  },
  {
    id: "ot-rest-night",
    code: "OT_REST_NIGHT_270",
    name: "Tăng ca đêm ngày nghỉ (270%)",
    description: "Số giờ làm việc ca đêm vào ngày nghỉ theo quy định của dự án.",
    outputVariable: "LUONG_OT_DEM_NGAY_NGHI",
    category: "income",
    defaultFormulaText:
      "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * 2.7 * GIO_OT_DEM_NGAY_NGHI",
  },
  {
    id: "ot-holiday-day",
    code: "OT_HOLIDAY_DAY_300",
    name: "Tăng ca ngày lễ, Tết (300%)",
    description: "Số giờ làm việc ban ngày vào ngày lễ, Tết.",
    outputVariable: "LUONG_OT_NGAY_LE",
    category: "income",
    defaultFormulaText:
      "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * 3 * GIO_OT_NGAY_LE",
  },
  {
    id: "ot-holiday-night",
    code: "OT_HOLIDAY_NIGHT_390",
    name: "Tăng ca đêm ngày lễ, Tết (390%)",
    description: "Số giờ làm việc ca đêm vào ngày lễ, Tết.",
    outputVariable: "LUONG_OT_DEM_NGAY_LE",
    category: "income",
    defaultFormulaText:
      "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * 3.9 * GIO_OT_DEM_NGAY_LE",
  },
  {
    id: "night-allowance",
    code: "NIGHT_ALLOWANCE_30",
    name: "Phụ cấp ca đêm (30%)",
    description: "Áp dụng cho giờ làm việc trong khung 22:00–06:00.",
    outputVariable: "PC_CA_DEM",
    category: "income",
    defaultFormulaText: "MUC_LUONG_TINH_OT / GIO_QUY_DOI_THANG * 0.3 * GIO_LAM_DEM",
  },
  {
    id: "housing-allowance",
    code: "HOUSING_ALLOWANCE",
    name: "Phụ cấp nhà ở",
    description:
      "Hưởng đủ khi đạt ngày công chuẩn; nếu chưa đạt thì phân bổ theo ngày công thực tế.",
    outputVariable: "PC_NHA_O",
    category: "income",
    defaultFormulaText:
      "IF( NGAY_CONG_THUC_TE >= NGAY_CONG_CHUAN, MUC_PC_NHA_O, MUC_PC_NHA_O / NGAY_CONG_CHUAN * NGAY_CONG_THUC_TE )",
  },
  {
    id: "travel-allowance",
    code: "TRAVEL_ALLOWANCE",
    name: "Phụ cấp đi lại",
    description:
      "Hưởng đủ khi đạt ngày công chuẩn; nếu chưa đạt thì phân bổ theo ngày công thực tế.",
    outputVariable: "PC_DI_LAI",
    category: "income",
    defaultFormulaText:
      "IF( NGAY_CONG_THUC_TE >= NGAY_CONG_CHUAN, MUC_PC_DI_LAI, MUC_PC_DI_LAI / NGAY_CONG_CHUAN * NGAY_CONG_THUC_TE )",
  },
  {
    id: "responsibility-allowance",
    code: "RESPONSIBILITY_ALLOWANCE",
    name: "Phụ cấp trách nhiệm",
    description:
      "Áp dụng cho quản lý theo mức dự án; hưởng đủ hoặc phân bổ theo ngày công thực tế.",
    outputVariable: "PC_TRACH_NHIEM",
    category: "income",
    defaultFormulaText:
      "IF( NGAY_CONG_THUC_TE >= NGAY_CONG_CHUAN, MUC_PC_TRACH_NHIEM, MUC_PC_TRACH_NHIEM / NGAY_CONG_CHUAN * NGAY_CONG_THUC_TE )",
  },
  {
    id: "performance-bonus",
    code: "PERFORMANCE_BONUS",
    name: "Thưởng / HTCV",
    description:
      "Mức hưởng theo hợp đồng và đánh giá hàng tháng; phân bổ theo ngày công khi chưa đạt công chuẩn.",
    outputVariable: "THUONG_HTCV",
    category: "income",
    defaultFormulaText:
      "IF( NGAY_CONG_THUC_TE >= NGAY_CONG_CHUAN, MUC_THUONG_HTCV, MUC_THUONG_HTCV / NGAY_CONG_CHUAN * NGAY_CONG_THUC_TE )",
  },
  {
    id: "annual-leave-pay",
    code: "ANNUAL_LEAVE_PAY",
    name: "Lương phép năm",
    description: "Chi trả số ngày phép năm được hưởng hoặc phép còn lại theo kỳ quyết toán.",
    outputVariable: "LUONG_PHEP_NAM",
    category: "income",
    defaultFormulaText:
      "LUONG_CO_BAN / NGAY_CONG_CHUAN * NGAY_PHEP_HUONG_LUONG",
  },
  {
    id: "paid-holiday",
    code: "PAID_HOLIDAY",
    name: "Lương nghỉ lễ hưởng nguyên lương",
    description: "Tính lương cho số ngày nghỉ lễ được hưởng nguyên lương trong kỳ.",
    outputVariable: "LUONG_NGHI_LE",
    category: "income",
    defaultFormulaText:
      "LUONG_CO_BAN / NGAY_CONG_CHUAN * NGAY_LE_HUONG_LUONG",
  },
  {
    id: "tet-bonus",
    code: "TET_BONUS",
    name: "Thưởng Tết theo thời gian làm việc",
    description:
      "Lương cơ bản chia tổng ngày trong năm, nhân số ngày làm việc được tính thưởng trong năm.",
    outputVariable: "THUONG_TET",
    category: "income",
    defaultFormulaText:
      "LUONG_CO_BAN / TONG_NGAY_TRONG_NAM * SO_NGAY_LAM_VIEC_TRONG_NAM",
  },
  {
    id: "mandatory-insurance",
    code: "MANDATORY_INSURANCE",
    name: "Bảo hiểm bắt buộc người lao động",
    description:
      "Không trích khi có từ 14 ngày làm việc không hưởng lương trong tháng; tỷ lệ được cấu hình theo quy định hiện hành.",
    outputVariable: "BAO_HIEM_NLD",
    category: "deduction",
    defaultFormulaText:
      "IF( NGAY_KHONG_LUONG >= 14, 0, LUONG_DONG_BH * TY_LE_BH_NLD / 100 )",
  },
  {
    id: "union-fee",
    code: "UNION_FEE",
    name: "Đoàn phí công đoàn",
    description: "Mức đóng cố định 23.400 đồng/tháng theo quy chế dự án.",
    outputVariable: "DOAN_PHI_CONG_DOAN",
    category: "deduction",
    defaultFormulaText: "MUC_DOAN_PHI",
  },
  {
    id: "ppe-depreciation",
    code: "PPE_DEPRECIATION",
    name: "Khấu trừ BHLĐ chưa hết khấu hao",
    description:
      "Khấu trừ giá trị còn lại khi người lao động nghỉ trước thời hạn khấu hao trang bị.",
    outputVariable: "KHAU_TRU_BHLD",
    category: "deduction",
    defaultFormulaText:
      "IF( THANG_SU_DUNG_BHLD >= THANG_KHAU_HAO_BHLD, 0, GIA_TRI_BHLD - GIA_TRI_BHLD / THANG_KHAU_HAO_BHLD * THANG_SU_DUNG_BHLD )",
  },
];

export const payrollProjectParameterDefinitions = [
  {
    code: "MUC_PC_NHA_O",
    name: "Mức phụ cấp nhà ở",
    unit: "VNĐ/tháng",
    description: "Mức phụ cấp nhà ở của dự án; SWM-DN áp dụng 250.000 đồng/tháng.",
    defaultValue: 250_000,
  },
  {
    code: "MUC_PC_DI_LAI",
    name: "Mức phụ cấp đi lại",
    unit: "VNĐ/tháng",
    description: "Mức phụ cấp đi lại của dự án; SWM-DN áp dụng 300.000 đồng/tháng.",
    defaultValue: 300_000,
  },
  {
    code: "MUC_PC_TRACH_NHIEM",
    name: "Mức phụ cấp trách nhiệm",
    unit: "VNĐ/tháng",
    description: "Mức áp dụng cho quản lý; công nhân đặt bằng 0.",
    defaultValue: 1_000_000,
  },
  {
    code: "MUC_THUONG_HTCV",
    name: "Mức thưởng / HTCV",
    unit: "VNĐ/tháng",
    description: "Mức thưởng theo hợp đồng và kết quả đánh giá hàng tháng.",
    defaultValue: 0,
  },
  {
    code: "TY_LE_BH_NLD",
    name: "Tỷ lệ bảo hiểm người lao động",
    unit: "%",
    description: "Tổng tỷ lệ bảo hiểm bắt buộc do người lao động đóng.",
    defaultValue: 10.5,
  },
  {
    code: "MUC_DOAN_PHI",
    name: "Mức đoàn phí công đoàn",
    unit: "VNĐ/tháng",
    description: "Mức đoàn phí cố định theo quy chế SWM-DN.",
    defaultValue: 23_400,
  },
  {
    code: "GIA_TRI_BHLD",
    name: "Giá trị trang bị BHLĐ",
    unit: "VNĐ",
    description: "Tổng giá trị trang bị cần theo dõi khấu hao cho người lao động.",
    defaultValue: 0,
  },
  {
    code: "THANG_KHAU_HAO_BHLD",
    name: "Thời hạn khấu hao BHLĐ",
    unit: "tháng",
    description: "SWM-DN áp dụng khấu hao trang bị trong 6 tháng kể từ ngày cấp phát.",
    defaultValue: 6,
  },
] satisfies PayrollProjectParameterDefinition[];

export const payrollFormulaVariables: FormulaVariable[] = [
  {
    code: "LUONG_CO_BAN",
    name: "Lương cơ bản",
    group: "employee",
    sampleValue: 6_300_000,
    unit: "VNĐ/tháng",
    description: "Mức lương cơ bản theo hợp đồng của người lao động.",
  },
  {
    code: "LUONG_DONG_BH",
    name: "Lương đóng bảo hiểm",
    group: "employee",
    sampleValue: 6_300_000,
    unit: "VNĐ/tháng",
    description: "Mức lương làm căn cứ trích bảo hiểm bắt buộc.",
  },
  {
    code: "MUC_LUONG_TINH_OT",
    name: "Mức lương làm căn cứ tính OT",
    group: "employee",
    sampleValue: 6_300_000,
    unit: "VNĐ/tháng",
    description:
      "Căn cứ quy đổi lương 1 giờ; SWM-DN áp dụng lương cơ bản cộng phụ cấp trách nhiệm theo nhóm.",
  },
  {
    code: "NGAY_CONG_CHUAN",
    name: "Ngày công chuẩn trong tháng",
    group: "attendance",
    sampleValue: 26,
    unit: "ngày",
    description: "Tổng ngày trong tháng trừ ngày nghỉ theo quy định của dự án.",
  },
  {
    code: "NGAY_CONG_THUC_TE",
    name: "Ngày công làm việc thực tế",
    group: "attendance",
    sampleValue: 24,
    unit: "ngày",
    description: "Số ngày làm việc bình thường được tính lương trong kỳ.",
  },
  {
    code: "GIO_QUY_DOI_THANG",
    name: "Số giờ quy đổi lương tháng",
    group: "policy",
    sampleValue: 208,
    unit: "giờ",
    description: "Mẫu số cố định 208 giờ để xác định lương 1 giờ theo quy chế.",
  },
  {
    code: "GIO_HUAN_LUYEN",
    name: "Giờ hội họp / huấn luyện",
    group: "attendance",
    sampleValue: 0,
    unit: "giờ",
    description: "Số giờ tham gia hội họp hoặc huấn luyện được tính lương.",
  },
  {
    code: "GIO_OT_NGAY_THUONG",
    name: "Giờ tăng ca ngày thường",
    group: "attendance",
    sampleValue: 12,
    unit: "giờ",
    description: "Giờ làm thêm ban ngày vào ngày làm việc bình thường.",
  },
  {
    code: "GIO_OT_DEM_NGAY_THUONG_KHONG_OT_NGAY",
    name: "Giờ OT đêm ngày thường không OT ban ngày",
    group: "attendance",
    sampleValue: 0,
    unit: "giờ",
    description: "Giờ tăng ca đêm ngày thường khi không có làm thêm giờ ban ngày.",
  },
  {
    code: "GIO_OT_DEM_NGAY_THUONG_CO_OT_NGAY",
    name: "Giờ OT đêm ngày thường có OT ban ngày",
    group: "attendance",
    sampleValue: 0,
    unit: "giờ",
    description: "Giờ tăng ca đêm ngày thường khi có làm thêm giờ ban ngày.",
  },
  {
    code: "GIO_OT_NGAY_NGHI",
    name: "Giờ tăng ca ngày nghỉ",
    group: "attendance",
    sampleValue: 0,
    unit: "giờ",
    description: "Giờ làm thêm ban ngày vào ngày nghỉ của dự án.",
  },
  {
    code: "GIO_OT_DEM_NGAY_NGHI",
    name: "Giờ tăng ca đêm ngày nghỉ",
    group: "attendance",
    sampleValue: 0,
    unit: "giờ",
    description: "Giờ làm thêm ca đêm vào ngày nghỉ của dự án.",
  },
  {
    code: "GIO_OT_NGAY_LE",
    name: "Giờ tăng ca ngày lễ, Tết",
    group: "attendance",
    sampleValue: 0,
    unit: "giờ",
    description: "Giờ làm thêm ban ngày vào ngày lễ hoặc Tết.",
  },
  {
    code: "GIO_OT_DEM_NGAY_LE",
    name: "Giờ tăng ca đêm ngày lễ, Tết",
    group: "attendance",
    sampleValue: 0,
    unit: "giờ",
    description: "Giờ làm thêm ca đêm vào ngày lễ hoặc Tết.",
  },
  {
    code: "GIO_LAM_DEM",
    name: "Giờ làm ca đêm (22:00–06:00)",
    group: "attendance",
    sampleValue: 0,
    unit: "giờ",
    description: "Tổng giờ làm trong khung giờ đêm để tính phụ cấp 30%.",
  },
  {
    code: "NGAY_PHEP_HUONG_LUONG",
    name: "Ngày phép hưởng lương",
    group: "attendance",
    sampleValue: 0,
    unit: "ngày",
    description: "Số ngày phép năm được chi trả trong kỳ.",
  },
  {
    code: "NGAY_LE_HUONG_LUONG",
    name: "Ngày nghỉ lễ hưởng lương",
    group: "attendance",
    sampleValue: 0,
    unit: "ngày",
    description: "Số ngày nghỉ lễ được hưởng nguyên lương trong kỳ.",
  },
  {
    code: "NGAY_KHONG_LUONG",
    name: "Ngày làm việc không hưởng lương",
    group: "attendance",
    sampleValue: 0,
    unit: "ngày",
    description: "Dùng xác định điều kiện báo giảm bảo hiểm khi từ 14 ngày trở lên.",
  },
  {
    code: "THANG_SU_DUNG_BHLD",
    name: "Số tháng đã sử dụng BHLĐ",
    group: "employee",
    sampleValue: 0,
    unit: "tháng",
    description: "Số tháng tính từ ngày cấp phát trang bị đến thời điểm nghỉ việc.",
  },
  {
    code: "TONG_NGAY_TRONG_NAM",
    name: "Tổng số ngày trong năm",
    group: "policy",
    sampleValue: 365,
    unit: "ngày",
    description: "365 hoặc 366 ngày tùy năm tính thưởng.",
  },
  {
    code: "SO_NGAY_LAM_VIEC_TRONG_NAM",
    name: "Số ngày làm việc tính thưởng Tết",
    group: "employee",
    sampleValue: 365,
    unit: "ngày",
    description: "Số ngày làm việc được ghi nhận đến ngày 31/12 để tính thưởng Tết.",
  },
  ...payrollProjectParameterDefinitions.map((parameter) => ({
    ...parameter,
    group: "custom" as const,
    isCustom: true,
    sampleValue: parameter.defaultValue,
  })),
];
