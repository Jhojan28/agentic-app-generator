import { FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

export type SortField = "year" | "make";
export type SortDirection = "asc" | "desc";

interface SortControlProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: SortField) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
}

export default function SortControl({
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
}: SortControlProps) {
  const handleFieldChange = (event: SelectChangeEvent) => {
    onSortFieldChange(event.target.value as SortField);
  };

  const handleDirectionChange = (event: SelectChangeEvent) => {
    onSortDirectionChange(event.target.value as SortDirection);
  };

  return (
    <Stack direction="row" spacing={2}>
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="sort-field-label">Sort by</InputLabel>
        <Select
          labelId="sort-field-label"
          id="sort-field"
          value={sortField}
          label="Sort by"
          onChange={handleFieldChange}
          inputProps={{ "aria-label": "Sort by" }}
          SelectDisplayProps={{ "aria-labelledby": "sort-field-label" }}
        >
          <MenuItem value="year">Year</MenuItem>
          <MenuItem value="make">Make</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="sort-direction-label">Direction</InputLabel>
        <Select
          labelId="sort-direction-label"
          id="sort-direction"
          value={sortDirection}
          label="Direction"
          onChange={handleDirectionChange}
          inputProps={{ "aria-label": "Direction" }}
          SelectDisplayProps={{ "aria-labelledby": "sort-direction-label" }}
        >
          <MenuItem value="asc">Ascending</MenuItem>
          <MenuItem value="desc">Descending</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}
