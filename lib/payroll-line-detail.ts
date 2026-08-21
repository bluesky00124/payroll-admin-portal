import type { PayrollLine, PayrollLineDetail } from "@/lib/types";

type PayrollLineDetailSource = Pick<
  PayrollLine,
  "employeeCode" | "workDays" | "overtimeHours" | "basePay" | "overtimePay" | "allowances" | "deductions" | "netPay"
>;

const roundHalf = (value: number) => Math.round(value * 2) / 2;
const roundMoney = (value: number) => Math.max(0, Math.round(value));

const seedFromCode = (employeeCode: string) =>
  [...employeeCode].reduce((total, character) => total + character.charCodeAt(0), 0);

const allocate = (total: number, ratios: number[]) => {
  let allocated = 0;
  return ratios.map((ratio, index) => {
    if (index === ratios.length - 1) return roundMoney(total - allocated);
    const value = roundMoney(total * ratio);
    allocated += value;
    return value;
  });
};

export function createPayrollLineDetail(line: PayrollLineDetailSource): PayrollLineDetail {
  const seed = seedFromCode(line.employeeCode);
  const annualLeaveDays = seed % 4 === 0 && line.workDays < 26 ? 1 : 0;
  const regimeLeaveDays = seed % 9 === 0 && line.workDays + annualLeaveDays < 26 ? 1 : 0;
  const rosterLeaveDays = Math.max(0, 26 - line.workDays - annualLeaveDays - regimeLeaveDays);
  const approvedLeaveDays = seed % 5 === 0 ? Math.min(1, rosterLeaveDays) : 0;
  const unapprovedLeaveDays = seed % 11 === 0 ? 1 : 0;

  const overtimeHourParts = allocate(line.overtimeHours * 2, [0.54, 0.11, 0.2, 0.05, 0.1]).map((value) => value / 2);
  const overtimePayParts = allocate(line.overtimePay, [0.54, 0.11, 0.2, 0.05, 0.1]);

  let allowanceRemaining = roundMoney(line.allowances);
  const takeAllowance = (target: number) => {
    const value = Math.min(allowanceRemaining, roundMoney(target));
    allowanceRemaining -= value;
    return value;
  };
  const attendanceBonus = line.workDays >= 25 ? takeAllowance(200_000) : 0;
  const performanceBonus = takeAllowance(line.allowances * 0.2);
  const phoneAllowance = takeAllowance(200_000);
  const mealAllowance = takeAllowance(line.workDays * 15_000);
  const productivityBonus = takeAllowance(line.allowances * 0.14);
  const nightAllowance = takeAllowance(line.allowances * 0.08);
  const otherAllowance = allowanceRemaining;

  const contractualSalary = line.workDays > 0
    ? Math.round(((line.basePay * 26) / line.workDays) / 1_000) * 1_000
    : line.basePay;
  let deductionRemaining = roundMoney(line.deductions);
  const takeDeduction = (target: number) => {
    const value = Math.min(deductionRemaining, roundMoney(target));
    deductionRemaining -= value;
    return value;
  };
  const socialInsurance = takeDeduction(contractualSalary * 0.08);
  const healthInsurance = takeDeduction(contractualSalary * 0.015);
  const unemploymentInsurance = takeDeduction(contractualSalary * 0.01);
  const unionFee = takeDeduction(23_400);
  const personalIncomeTax = seed % 3 === 0 ? takeDeduction(deductionRemaining * 0.35) : 0;
  const violation = seed % 3 === 1 ? takeDeduction(Math.min(100_000, deductionRemaining)) : 0;
  const salaryAdvance = deductionRemaining;
  const insuranceTotal = socialInsurance + healthInsurance + unemploymentInsurance;

  const method = seed % 7 === 0 ? "cash" : "transfer";

  return {
    attendance: {
      regularHours: roundHalf(line.workDays * 8),
      nightHours: roundHalf(line.overtimeHours * 0.3),
      overtimeWeekdayHours: overtimeHourParts[0],
      overtimeNightWeekdayHours: overtimeHourParts[1],
      overtimeWeekendHours: overtimeHourParts[2],
      overtimeNightWeekendHours: overtimeHourParts[3],
      overtimeHolidayHours: overtimeHourParts[4],
      totalHours: roundHalf(line.workDays * 8 + line.overtimeHours),
      workDaysForAllowance: line.workDays,
      holidayLeaveDays: 0,
      regimeLeaveDays,
      annualLeaveDays,
      rosterLeaveDays,
      approvedLeaveDays,
      unapprovedLeaveDays,
      totalPaidDays: line.workDays + annualLeaveDays + regimeLeaveDays,
    },
    income: {
      contractualSalary,
      regularPay: line.basePay,
      attendanceBonus,
      performanceBonus,
      phoneAllowance,
      insuranceAllowance: 0,
      otherAllowance,
      mealAllowance,
      annualLeavePay: 0,
      overtimeWeekdayPay: overtimePayParts[0],
      overtimeNightWeekdayPay: overtimePayParts[1],
      overtimeWeekendPay: overtimePayParts[2],
      overtimeNightWeekendPay: overtimePayParts[3],
      overtimeHolidayPay: overtimePayParts[4],
      nightAllowance,
      annualLeaveSettlement: 0,
      productivityBonus,
      salaryAdjustment: 0,
      benefitPay: 0,
      projectBonus: 0,
      projectSupport: 0,
      grossPay: line.basePay + line.overtimePay + line.allowances,
    },
    deductions: {
      socialInsurance,
      healthInsurance,
      unemploymentInsurance,
      insuranceTotal,
      insuranceAdjustment: 0,
      healthCardArrears: 0,
      unionFee,
      personalIncomeTax,
      uniformDepreciation: 0,
      violation,
      retention: 0,
      ekkoAdvance: 0,
      salaryAdvance,
      total: line.deductions,
    },
    payment: {
      method,
      transferAmount: method === "transfer" ? line.netPay : 0,
      cashAmount: method === "cash" ? line.netPay : 0,
    },
  };
}

export function getPayrollLineDetail(line: PayrollLine): PayrollLineDetail {
  return line.detail ?? createPayrollLineDetail(line);
}
