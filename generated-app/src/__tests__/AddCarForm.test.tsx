import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AddCarForm from "@/components/AddCarForm";

describe("AddCarForm component", () => {
  it("shows validation errors when fields are empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AddCarForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /add car/i }));

    expect(await screen.findByText("Make is required")).toBeInTheDocument();
    expect(screen.getByText("Model is required")).toBeInTheDocument();
    expect(screen.getByText("Year is required")).toBeInTheDocument();
    expect(screen.getByText("Color is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a validation error when year is invalid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AddCarForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Make"), "Toyota");
    await user.type(screen.getByLabelText("Model"), "Camry");
    await user.type(screen.getByLabelText("Year"), "1899");
    await user.type(screen.getByLabelText("Color"), "Silver");

    await user.click(screen.getByRole("button", { name: /add car/i }));

    expect(
      await screen.findByText("Year must be between 1900 and 2100")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with correct values when the form is valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AddCarForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Make"), "Toyota");
    await user.type(screen.getByLabelText("Model"), "Camry");
    await user.type(screen.getByLabelText("Year"), "2024");
    await user.type(screen.getByLabelText("Color"), "Silver");

    await user.click(screen.getByRole("button", { name: /add car/i }));

    expect(onSubmit).toHaveBeenCalledWith("Toyota", "Camry", 2024, "Silver");

    expect(screen.getByLabelText("Make")).toHaveValue("");
    expect(screen.getByLabelText("Model")).toHaveValue("");
    expect(screen.getByLabelText("Year")).toHaveValue("");
    expect(screen.getByLabelText("Color")).toHaveValue("");
  });
});
