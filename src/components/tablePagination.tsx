import * as React from 'react';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { IconButton, Select, MenuItem, Typography, Box, SelectChangeEvent } from '@mui/material';

const CustomTablePagination = () => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const count = 40;

  const handleChangePage = (newPage: React.SetStateAction<number>) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: SelectChangeEvent
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const totalPages = Math.ceil(count / rowsPerPage);

  return (
    <Box className="table_pagination">
      <label className="showing_field">
        <Typography>Showing</Typography>
        <Select        
          value={rowsPerPage.toString()}
          onChange={handleChangeRowsPerPage}
        >
          {[10, 25, 50, 100].map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </label>

      <Typography>  
        Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, count)} out of {count} records
      </Typography>

      <div className="action_field">
        <IconButton
          onClick={() => handleChangePage(page - 1)}
          disabled={page === 0}
        >
          <KeyboardArrowLeftIcon />
        </IconButton>
        {Array.from({ length: totalPages }, (_, index) => (
          <IconButton
            key={index}
            onClick={() => handleChangePage(index)}
            className={index === page ? "numb_btn active" : "numb_btn"}
          >
            {index + 1}
          </IconButton>
        ))}
        <IconButton
          onClick={() => handleChangePage(page + 1)}
          disabled={page >= totalPages - 1}
        >
          <KeyboardArrowRightIcon />
        </IconButton>
      </div>
    </Box>
  );
};

export default CustomTablePagination;