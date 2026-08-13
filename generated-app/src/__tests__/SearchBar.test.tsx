import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SearchBar from "@/components/SearchBar";

describe("SearchBar component", () => {
  it("renders the input with the given value", () => {
    render(<SearchBar value="Camry" onChange={vi.fn()} />);

    const input = screen.getByLabelText("search by model");
    expect(input).toHaveValue("Camry");
  });

  it("calls onChange with the typed text", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    function Wrapper() {
      return <SearchBar value="" onChange={handleChange} />;
    }

    render(<Wrapper />);

    const input = screen.getByLabelText("search by model");
    await user.type(input, "Corolla");

    expect(handleChange).toHaveBeenCalledTimes("Corolla".length);
    expect(handleChange).toHaveBeenLastCalledWith("Corolla");
  });
});
