import { describe, expect, it } from "vitest";
import { api } from "@/lib/api";

describe("Project Custom Formula Variables API", () => {
  it("lấy danh sách biến tham số đầu vào do backend trả về", async () => {
    const customVars = await api.getProjectCustomVariables("prj-jss");
    expect(Array.isArray(customVars)).toBe(true);
    expect(customVars.length).toBeGreaterThanOrEqual(4);

    const donGiaKhoan = customVars.find((v) => v.code === "DON_GIA_KHOAN");
    expect(donGiaKhoan).toBeDefined();
    expect(donGiaKhoan?.name).toBe("Đơn giá khoán sản lượng");
    expect(donGiaKhoan?.unit).toBe("VNĐ/sp");
  });

  it("lưu và cập nhật giá trị biến tham số cho dự án", async () => {
    const payload = [
      { code: "DON_GIA_KHOAN", value: 42000 },
      { code: "HE_SO_HOAN_THANH_MIN", value: 88 },
      { code: "MUC_THUONG_NONG_DU_AN", value: 2000000 },
    ];

    const updated = await api.saveProjectCustomVariables("prj-jss", payload);
    expect(Array.isArray(updated)).toBe(true);

    const savedKhoan = updated.find((v) => v.code === "DON_GIA_KHOAN");
    expect(savedKhoan?.value).toBe(42000);

    const savedKPI = updated.find((v) => v.code === "HE_SO_HOAN_THANH_MIN");
    expect(savedKPI?.value).toBe(88);

    const savedThuong = updated.find((v) => v.code === "MUC_THUONG_NONG_DU_AN");
    expect(savedThuong?.value).toBe(2000000);

    // Verify retrieval after saving
    const refetched = await api.getProjectCustomVariables("prj-jss");
    const refetchedKhoan = refetched.find((v) => v.code === "DON_GIA_KHOAN");
    expect(refetchedKhoan?.value).toBe(42000);
  });
});
