import { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { tokens } from "@/theme";

export interface AddCarFormProps {
  onSubmit: (make: string, model: string, year: number, color: string) => void;
}

interface FormErrors {
  make?: string;
  model?: string;
  year?: string;
  color?: string;
}

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export default function AddCarForm({ onSubmit }: AddCarFormProps) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!make.trim()) {
      newErrors.make = "Make is required";
    }
    if (!model.trim()) {
      newErrors.model = "Model is required";
    }
    if (!color.trim()) {
      newErrors.color = "Color is required";
    }

    if (!year.trim()) {
      newErrors.year = "Year is required";
    } else {
      const yearNum = Number(year);
      if (!Number.isInteger(yearNum) || yearNum < MIN_YEAR || yearNum > MAX_YEAR) {
        newErrors.year = `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`;
      }
    }

    return newErrors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    onSubmit(make.trim(), model.trim(), Number(year), color.trim());

    setMake("");
    setModel("");
    setYear("");
    setColor("");
    setErrors({});
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 2,
        borderRadius: `${tokens.radius.lg}px`,
        boxShadow: tokens.shadow.card,
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="subtitle1" component="p" sx={{ mb: 2 }}>
        Add Car
      </Typography>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Make"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            error={Boolean(errors.make)}
            helperText={errors.make}
            fullWidth
          />
          <TextField
            label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            error={Boolean(errors.model)}
            helperText={errors.model}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            error={Boolean(errors.year)}
            helperText={errors.year}
            fullWidth
          />
          <TextField
            label="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            error={Boolean(errors.color)}
            helperText={errors.color}
            fullWidth
          />
        </Stack>
        <Button type="submit" variant="contained" color="primary">
          Add Car
        </Button>
      </Stack>
    </Box>
  );
}
