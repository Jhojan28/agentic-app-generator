import { useEffect, useState } from "react";
import { TextField } from "@mui/material";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <TextField
      label="Search by model"
      placeholder="e.g. Corolla"
      value={localValue}
      onChange={(e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
      }}
      fullWidth
      inputProps={{ "aria-label": "search by model" }}
    />
  );
}
