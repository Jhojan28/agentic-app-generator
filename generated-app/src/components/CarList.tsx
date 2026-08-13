import { Grid, Typography, Box } from "@mui/material";
import CarCard from "@/components/CarCard";
import type { Car } from "@/types";

interface CarListProps {
  cars: Car[];
}

export default function CarList({ cars }: CarListProps) {
  if (cars.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography color="text.secondary">
          No cars match your search.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {cars.map((car) => (
        <Grid item xs={12} sm={6} md={4} key={car.id}>
          <CarCard car={car} />
        </Grid>
      ))}
    </Grid>
  );
}
