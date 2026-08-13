import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SortControl from "@/components/SortControl";

describe("SortControl component", () => {
  it("calls onSortFieldChange when a new sort field is selected", async () => {
    const user = userEvent.setup();
    const onSortFieldChange = vi.fn();
    const onSortDirectionChange = vi.fn();

    render(
      <SortControl
        sortField="year"
        sortDirection="asc"
        onSortFieldChange={onSortFieldChange}
        onSortDirectionChange={onSortDirectionChange}
      />
    );

    await user.click(screen.getByLabelText("Sort by"));
    await user.click(await screen.findByRole("option", { name: "Make" }));

    expect(onSortFieldChange).toHaveBeenCalledWith("make");
    expect(onSortDirectionChange).not.toHaveBeenCalled();
  });

  it("calls onSortDirectionChange when a new direction is selected", async () => {
    const user = userEvent.setup();
    const onSortFieldChange = vi.fn();
    const onSortDirectionChange = vi.fn();

    render(
      <SortControl
        sortField="year"
        sortDirection="asc"
        onSortFieldChange={onSortFieldChange}
        onSortDirectionChange={onSortDirectionChange}
      />
    );

    await user.click(screen.getByLabelText("Direction"));
    await user.click(await screen.findByRole("option", { name: "Descending" }));

    expect(onSortDirectionChange).toHaveBeenCalledWith("desc");
    expect(onSortFieldChange).not.toHaveBeenCalled();
  });
});
