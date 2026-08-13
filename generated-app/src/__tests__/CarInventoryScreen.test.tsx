import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import { describe, it, expect } from "vitest";
import { GET_CARS, ADD_CAR } from "@/graphql/queries";
import CarInventoryScreen from "@/screens/CarInventoryScreen";

const initialCars = [
  {
    id: "1",
    make: "Honda",
    model: "Civic",
    year: 2010,
    color: "Red",
    mobile: "https://placehold.co/640x360",
    tablet: "https://placehold.co/1023x576",
    desktop: "https://placehold.co/1440x810",
  },
  {
    id: "2",
    make: "Toyota",
    model: "Camry",
    year: 2020,
    color: "Blue",
    mobile: "https://placehold.co/640x360",
    tablet: "https://placehold.co/1023x576",
    desktop: "https://placehold.co/1440x810",
  },
];

const initialCarsWithTypename = initialCars.map((car) => ({
  ...car,
  __typename: "Car" as const,
}));

const newCar = {
  id: "3",
  make: "Ford",
  model: "Mustang",
  year: 2023,
  color: "Yellow",
  mobile: "https://placehold.co/640x360",
  tablet: "https://placehold.co/1023x576",
  desktop: "https://placehold.co/1440x810",
};

function buildMocks() {
  return [
    {
      request: { query: GET_CARS },
      result: { data: { cars: initialCarsWithTypename } },
    },
    {
      request: {
        query: ADD_CAR,
        variables: {
          make: newCar.make,
          model: newCar.model,
          year: newCar.year,
          color: newCar.color,
        },
      },
      result: {
        data: {
          addCar: { ...newCar, __typename: "Car" as const },
        },
      },
    },
  ];
}

describe("CarInventoryScreen", () => {
  it("renders cars fetched from the API", async () => {
    render(
      <MockedProvider mocks={buildMocks()}>
        <CarInventoryScreen />
      </MockedProvider>
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    expect(await screen.findByText("2010 Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("2020 Toyota Camry")).toBeInTheDocument();
  });

  it("filters the list by search text", async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={buildMocks()}>
        <CarInventoryScreen />
      </MockedProvider>
    );

    await screen.findByText("2010 Honda Civic");

    const searchInput = screen.getByLabelText(/search/i);
    await user.clear(searchInput);
    await user.type(searchInput, "civic");

    await waitFor(() => {
      expect(screen.getByText("2010 Honda Civic")).toBeInTheDocument();
      expect(screen.queryByText("2020 Toyota Camry")).not.toBeInTheDocument();
    });
  });

  it("reorders the list when sorting changes", async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={buildMocks()}>
        <CarInventoryScreen />
      </MockedProvider>
    );

    await screen.findByText("2010 Honda Civic");

    const sortFieldSelect = screen.getByLabelText(/sort by/i);
    await user.click(sortFieldSelect);
    await user.click(await screen.findByRole("option", { name: /year/i }));

    const sortDirectionSelect = screen.getByLabelText(/direction|order/i);
    await user.click(sortDirectionSelect);
    await user.click(
      await screen.findByRole("option", { name: /descending/i })
    );

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 6 });
      expect(headings[0]).toHaveTextContent("2020 Toyota Camry");
      expect(headings[1]).toHaveTextContent("2010 Honda Civic");
    });
  });

  it("adds a new car through the form and displays it without a reload", async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={buildMocks()}>
        <CarInventoryScreen />
      </MockedProvider>
    );

    await screen.findByText("2010 Honda Civic");

    await user.type(screen.getByLabelText(/^make$/i), newCar.make);
    await user.type(screen.getByLabelText(/^model$/i), newCar.model);
    await user.type(screen.getByLabelText(/^year$/i), String(newCar.year));
    await user.type(screen.getByLabelText(/^color$/i), newCar.color);

    await user.click(screen.getByRole("button", { name: /add car/i }));

    expect(
      await screen.findByText("2023 Ford Mustang")
    ).toBeInTheDocument();
    expect(screen.getByText("2010 Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("2020 Toyota Camry")).toBeInTheDocument();
  });
});
