import { Container, Typography } from "@mui/material";
import CarInventoryScreen from "@/screens/CarInventoryScreen";

export default function App() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Car Inventory Manager
      </Typography>
      <CarInventoryScreen />
    </Container>
  );
}
