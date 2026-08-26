import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("Project Custom Formula Variables API", () => {
  it("lấy danh sách biến tham số đầu vào do backend trả về", async () => {
    const customVars = await api.getProjectCustomVariables("prj-swm");
    expect(Array.isArray(customVars)).toBe(true);
    expect(customVars.length).toBe(8);

    const housingAllowance = customVars.find((v) => v.code === "MUC_PC_NHA_O");
    expect(housingAllowance).toBeDefined();
    expect(housingAllowance?.name).toBe("Mức phụ cấp nhà ở");
    expect(housingAllowance?.unit).toBe("VNĐ/tháng");
    expect(housingAllowance?.value).toBe(250_000);

    const unionFee = customVars.find((v) => v.code === "MUC_DOAN_PHI");
    expect(unionFee?.value).toBe(23_400);
  });

  it("lưu và cập nhật giá trị biến tham số cho dự án", async () => {
    const payload = [
      { code: "MUC_PC_NHA_O", value: 280_000 },
      { code: "MUC_PC_DI_LAI", value: 350_000 },
      { code: "TY_LE_BH_NLD", value: 10.5 },
    ];

    const updated = await api.saveProjectCustomVariables("prj-jss", payload);
    expect(Array.isArray(updated)).toBe(true);

    const savedHousing = updated.find((v) => v.code === "MUC_PC_NHA_O");
    expect(savedHousing?.value).toBe(280_000);

    const savedTravel = updated.find((v) => v.code === "MUC_PC_DI_LAI");
    expect(savedTravel?.value).toBe(350_000);

    const savedInsuranceRate = updated.find((v) => v.code === "TY_LE_BH_NLD");
    expect(savedInsuranceRate?.value).toBe(10.5);

    // Verify retrieval after saving
    const refetched = await api.getProjectCustomVariables("prj-jss");
    const refetchedHousing = refetched.find((v) => v.code === "MUC_PC_NHA_O");
    expect(refetchedHousing?.value).toBe(280_000);
  });
});
