import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useCars } from "@/hooks/useCars";
import { useCarFilters } from "@/hooks/useCarFilters";
import SearchBar from "@/components/SearchBar";
import SortControl from "@/components/SortControl";
import AddCarForm from "@/components/AddCarForm";
import CarList from "@/components/CarList";

export default function CarInventoryScreen() {
  const { cars, loading, error, addCar } = useCars();
  const {
    search,
    setSearch,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filteredCars,
  } = useCarFilters(cars);

  return (
    <Stack spacing={3}>
      <AddCarForm onSubmit={addCar} />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Box sx={{ flexGrow: 1 }}>
          <SearchBar value={search} onChange={setSearch} />
        </Box>
        <SortControl
          sortField={sortField}
          sortDirection={sortDirection}
          onSortFieldChange={setSortField}
          onSortDirectionChange={setSortDirection}
        />
      </Stack>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && (
        <Alert severity="error">
          {error.message || "Failed to load cars."}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <Typography variant="body2" color="text.secondary">
            {filteredCars.length} car{filteredCars.length === 1 ? "" : "s"} found
          </Typography>
          <CarList cars={filteredCars} />
        </>
      )}
    </Stack>
  );
}
