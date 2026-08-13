import { renderHook, waitFor, act } from "@testing-library/react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { GET_CARS, ADD_CAR } from "@/graphql/queries";
import { useCars } from "@/hooks/useCars";

const mockCars = [
  {
    id: "1",
    make: "Toyota",
    model: "Camry",
    year: 2024,
    color: "Silver",
    mobile: "https://placehold.co/640x360",
    tablet: "https://placehold.co/1023x576",
    desktop: "https://placehold.co/1440x810",
    __typename: "Car" as const,
  },
];

const newCar = {
  id: "2",
  make: "Honda",
  model: "Civic",
  year: 2023,
  color: "Blue",
  mobile: "https://placehold.co/640x360",
  tablet: "https://placehold.co/1023x576",
  desktop: "https://placehold.co/1440x810",
  __typename: "Car" as const,
};

function createWrapper(mocks: ReadonlyArray<MockedResponse>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  };
}

describe("useCars", () => {
  it("shows loading state initially", () => {
    const mocks: ReadonlyArray<MockedResponse> = [
      {
        request: { query: GET_CARS },
        result: { data: { cars: mockCars } },
      },
    ];

    const { result } = renderHook(() => useCars(), {
      wrapper: createWrapper(mocks),
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.cars).toEqual([]);
  });

  it("resolves data successfully", async () => {
    const mocks: ReadonlyArray<MockedResponse> = [
      {
        request: { query: GET_CARS },
        result: { data: { cars: mockCars } },
      },
    ];

    const { result } = renderHook(() => useCars(), {
      wrapper: createWrapper(mocks),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.cars).toHaveLength(1);
    expect(result.current.cars[0]?.make).toBe("Toyota");
  });

  it("handles errors", async () => {
    const mocks: ReadonlyArray<MockedResponse> = [
      {
        request: { query: GET_CARS },
        error: new Error("Network error"),
      },
    ];

    const { result } = renderHook(() => useCars(), {
      wrapper: createWrapper(mocks),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeDefined();
    expect(result.current.cars).toEqual([]);
  });

  it("appends a new car after addCar is called", async () => {
    const mocks: ReadonlyArray<MockedResponse> = [
      {
        request: { query: GET_CARS },
        result: { data: { cars: mockCars } },
      },
      {
        request: {
          query: ADD_CAR,
          variables: {
            make: "Honda",
            model: "Civic",
            year: 2023,
            color: "Blue",
          },
        },
        result: { data: { addCar: newCar } },
      },
    ];

    const { result } = renderHook(() => useCars(), {
      wrapper: createWrapper(mocks),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cars).toHaveLength(1);

    await act(async () => {
      await result.current.addCar("Honda", "Civic", 2023, "Blue");
    });

    await waitFor(() => expect(result.current.cars).toHaveLength(2));
    expect(result.current.cars[1]?.make).toBe("Honda");
  });
});
