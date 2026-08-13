import { useMemo, useState } from "react";
import type { Car } from "@/types";

export type SortField = "year" | "make";
export type SortDirection = "asc" | "desc";

export function useCarFilters(cars: Car[]) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("year");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredCars = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = normalizedSearch
      ? cars.filter((car) => car.model.toLowerCase().includes(normalizedSearch))
      : [...cars];

    const sorted = filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === "year") {
        comparison = a.year - b.year;
      } else {
        comparison = a.make.localeCompare(b.make);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [cars, search, sortField, sortDirection]);

  return {
    search,
    setSearch,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filteredCars,
  };
}
