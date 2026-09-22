import { SelectChangeEvent, Select, MenuItem } from "@mui/material";
import React from "react";

export const DEFAULT_SORT_ID = 1;
export const VALID_SORT_IDS = new Set([1, 2, 3, 4, 6, 7]);

export function parseSortIdParam(raw: string | null | undefined): number {
  const parsed = Number(raw);
  return VALID_SORT_IDS.has(parsed) ? parsed : DEFAULT_SORT_ID;
}

type SortByFilterProps = {
  value?: number;
  onChange?: (value: number) => void;
};

function SortByFilter({ value, onChange }: SortByFilterProps) {
  const [selectedSortId, setSelectedSortId] = React.useState<number>(value ?? DEFAULT_SORT_ID);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedSortId(value);
    }
  }, [value]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    const nextValue = Number(event.target.value);
    setSelectedSortId(nextValue);
    onChange?.(nextValue);
  };

  return (
    <>
      <label htmlFor="sort_filter" className="sort_form form">
        Sort: <a className="text_btn"></a>
        <Select
          value={selectedSortId}
          onChange={handleChange}
          displayEmpty
          id="sort_filter"
          inputProps={{ "aria-label": "Without label" }}
          className="sort_menu"
        >
          <MenuItem value={1}>New Arrivals</MenuItem>
          <MenuItem value={2}>Price: High to Low</MenuItem>
          <MenuItem value={3}>Price: Low to High</MenuItem>
          <MenuItem value={4}>Highly Rated</MenuItem>
{/* Add new   */}
          <MenuItem value={6}>Discount</MenuItem>
          <MenuItem value={7}>Best Selling</MenuItem>
        </Select>
      </label>
    </>
  );
}

export default SortByFilter;
