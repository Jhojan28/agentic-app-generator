# Car Inventory Manager — Product Specification

Build a Car Inventory Manager web app on top of the existing boilerplate
(React + TypeScript + Apollo Client + Material UI + MSW mock GraphQL API).

## Required features

1. **Car list** — Display all cars fetched from the mock GraphQL API using the
   existing `GetCars` query. Show a loading indicator while fetching and an
   error message if the query fails.
2. **Search and sorting** — A search bar filters the list by model name
   (case-insensitive, as the user types). A sort control orders the list by
   year or by make, ascending or descending.
3. **Testing** — Unit tests for the data hook and the key components (search,
   sorting, card rendering) using Testing Library and Apollo's MockedProvider.

## Additional features

4. **useCars() hook** — Encapsulate all GraphQL data logic in a custom
   `useCars()` hook; components never call Apollo directly.
5. **Responsive car images** — Each car has mobile/tablet/desktop image URLs.
   Render the right one for the viewport width: up to 640px use mobile,
   641-1023px use tablet, 1024px and up use desktop.
6. **Material UI cards** — Present each car in an MUI Card showing make, model,
   year, color and the image, laid out in a responsive grid.
7. **Add Car form** — A form (make, model, year, color) that submits via the
   existing `AddCar` GraphQL mutation and shows the new car in the list without
   a page reload. Validate that all fields are filled and the year is a
   reasonable number before submitting.
8. **useCarFilters() hook** — Combine the search and sort state into a reusable
   `useCarFilters()` hook so the filtering logic is testable on its own.
