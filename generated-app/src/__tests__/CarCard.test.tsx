import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import CarCard from "@/components/CarCard";
import type { Car } from "@/types";

const mockCar: Car = {
  id: "1",
  make: "Toyota",
  model: "Camry",
  year: 2024,
  color: "Silver",
  mobile: "https://placehold.co/640x360",
  tablet: "https://placehold.co/1023x576",
  desktop: "https://placehold.co/1440x810",
};

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  fireEvent(window, new Event("resize"));
}

describe("CarCard component", () => {
  afterEach(() => {
    setWindowWidth(1024);
  });

  it("renders make, model, year and color", () => {
    setWindowWidth(1024);
    render(<CarCard car={mockCar} />);

    expect(screen.getByText("Toyota Camry")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("Silver")).toBeInTheDocument();
  });

  it("renders mobile image when viewport width is 640px or less", () => {
    setWindowWidth(500);
    render(<CarCard car={mockCar} />);

    const image = screen.getByAltText("Toyota Camry");
    expect(image).toHaveAttribute("src", mockCar.mobile);
  });

  it("renders tablet image when viewport width is between 641 and 1023px", () => {
    setWindowWidth(800);
    render(<CarCard car={mockCar} />);

    const image = screen.getByAltText("Toyota Camry");
    expect(image).toHaveAttribute("src", mockCar.tablet);
  });

  it("renders desktop image when viewport width is 1024px or more", () => {
    setWindowWidth(1200);
    render(<CarCard car={mockCar} />);

    const image = screen.getByAltText("Toyota Camry");
    expect(image).toHaveAttribute("src", mockCar.desktop);
  });
});
