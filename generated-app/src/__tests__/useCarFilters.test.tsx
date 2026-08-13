import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCarFilters } from "@/hooks/useCarFilters";
import type { Car } from "@/types";

const carFixtures: Car[] = [
  {
    id: "1",
    make: "Toyota",
    model: "Camry",
    year: 2024,
    color: "Silver",
    mobile: "https://placehold.co/640x360",
    tablet: "https://placehold.co/1023x576",
    desktop: "https://placehold.co/1440x810",
  },
  {
    id: "2",
    make: "Honda",
    model: "Civic",
    year: 2020,
    color: "Blue",
    mobile: "https://placehold.co/640x360",
    tablet: "https://placehold.co/1023x576",
    desktop: "https://placehold.co/1440x810",
  },
  {
    id: "3",
    make: "Ford",
    model: "Mustang",
    year: 2022,
    color: "Red",
    mobile: "https://placehold.co/640x360",
    tablet: "https://placehold.co/1023x576",
    desktop: "https://placehold.co/1440x810",
  },
];

describe("useCarFilters", () => {
  it("returns all cars when search is empty", () => {
    const { result } = renderHook(() => useCarFilters(carFixtures));

    expect(result.current.filteredCars).toHaveLength(3);
  });

  it("filters cars by model case-insensitively", () => {
    const { result } = renderHook(() => useCarFilters(carFixtures));

    act(() => {
      result.current.setSearch("cam");
    });

    expect(result.current.filteredCars).toHaveLength(1);
    expect(result.current.filteredCars[0]?.model).toBe("Camry");

    act(() => {
      result.current.setSearch("MUSTANG");
    });

    expect(result.current.filteredCars).toHaveLength(1);
    expect(result.current.filteredCars[0]?.model).toBe("Mustang");
  });

  it("returns an empty list when no model matches the search", () => {
    const { result } = renderHook(() => useCarFilters(carFixtures));

    act(() => {
      result.current.setSearch("nonexistent");
    });

    expect(result.current.filteredCars).toHaveLength(0);
  });

  it("sorts by year ascending by default", () => {
    const { result } = renderHook(() => useCarFilters(carFixtures));

    const years = result.current.filteredCars.map((car) => car.year);
    expect(years).toEqual([2020, 2022, 2024]);
  });

  it("sorts by year descending", () => {
    const { result } = renderHook(() => useCarFilters(carFixtures));

    act(() => {
      result.current.setSortDirection("desc");
    });

    const years = result.current.filteredCars.map((car) => car.year);
    expect(years).toEqual([2024, 2022, 2020]);
  });

  it("sorts by make ascending", () => {
    const { result } = renderHook(() => useCarFilters(carFixtures));

    act(() => {
      result.current.setSortField("make");
    });

    const makes = result.current.filteredCars.map((car) => car.make);
    expect(makes).toEqual(["Ford", "Honda", "Toyota"]);
  });

  it("sorts by make descending", () => {
    const { result } = renderHook(() => useCarFilters(carFixtures));

    act(() => {
      result.current.setSortField("make");
      result.current.setSortDirection("desc");
    });

    const makes = result.current.filteredCars.map((car) => car.make);
    expect(makes).toEqual(["Toyota", "Honda", "Ford"]);
  });
});
