import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DynamicField } from "@/components/tabs/policies-tab";
import type { PolicyFieldDefinition } from "@/lib/types";

describe("dynamic policy field", () => {
  it("render field từ contract backend và phát giá trị mới", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const field: PolicyFieldDefinition = { key: "calculation", label: "Cách tính", type: "select", required: true, options: [{ label: "Theo ngày công", value: "day" }, { label: "Theo ca", value: "shift" }] };
    render(<DynamicField definitionId="meal" field={field} value="day" onChange={onChange} />);
    await user.selectOptions(screen.getByRole("combobox", { name: /Cách tính/ }), "shift");
    expect(onChange).toHaveBeenCalledWith("meal", "calculation", "shift");
  });

  it("render input tiền với đơn vị", () => {
    const field: PolicyFieldDefinition = { key: "amount", label: "Mức hỗ trợ", type: "money", required: true, unit: "VNĐ/ngày" };
    render(<DynamicField definitionId="meal" field={field} value={30_000} onChange={() => undefined} />);
    expect(screen.getByRole("spinbutton", { name: /Mức hỗ trợ/ })).toHaveValue(30_000);
    expect(screen.getByText("VNĐ/ngày")).toBeInTheDocument();
  });
});
