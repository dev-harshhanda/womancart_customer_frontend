import { TextField, InputAdornment } from "@mui/material";
import React from "react";

type SearchBarProps = {
  placeholder?: string;
  adornmentPosition?: "start" | "end";
};

function SearchBar({
  placeholder = "Search",
  adornmentPosition = "end",
}: SearchBarProps) {
  return (
    <div className="control_group form search_group">
      <TextField
        fullWidth
        hiddenLabel
        placeholder={placeholder}
        slotProps={{
          input: {
            [adornmentPosition + "Adornment"]: (
              <InputAdornment position={adornmentPosition}>
                <img src="/images/search_icon.svg" alt="icon" />
              </InputAdornment>
            ),
          },
        }}
      ></TextField>
    </div>
  );
}

export default SearchBar;
