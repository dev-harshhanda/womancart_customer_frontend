/* eslint-disable @next/next/no-img-element */
"use client";
import React from 'react'
import { Button, Drawer, IconButton, Slider } from "@mui/material";
// import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
}

function valuetext(value: number) {
  return `$${value}`;
}

export default function FilterDrawer({ open, onClose }: DrawerProps) {

  const [valueSlider, setValueSlider] = React.useState<number[]>([18, 40]);
  const handleChangeSlider = (event: Event, newValue: number[]) => {
    setValueSlider(newValue);
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} className="filter_drawer">
        {/* <IconButton onClick={onClose} className="drawer_close"><ArrowForwardIosIcon /></IconButton> */}
        <div className="drawer_head hd_5">
          <h2>Filter</h2>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </div>
        <div className="drawer_body">
          <div className="form">
            <div className="control_group">
              <label>Date</label>
              <div className="gap_p">
                <div className="w_50">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      className="form_control dateTime_picker"
                      enableAccessibleFieldDOMStructure={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          placeholder: "From",
                          hiddenLabel: true,
                        },
                      }}
                      desktopModeMediaQuery="(min-width:0px)"
                    />
                  </LocalizationProvider>
                  <img src="/images/calender2.svg" alt="img" />
                </div>
                <div className="w_50">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      className="form_control dateTime_picker"
                      enableAccessibleFieldDOMStructure={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          placeholder: "To",
                          hiddenLabel: true,
                        },
                      }}
                      desktopModeMediaQuery="(min-width:0px)"
                    />
                  </LocalizationProvider>
                  <img src="/images/calender2.svg" alt="img" />
                </div>
              </div>
            </div>
            <div className="control_group">
              <label>Booking Count</label>
              <Slider
                className="range_slider"
                getAriaLabel={() => 'Price Range'}
                value={valueSlider}
                onChange={handleChangeSlider}
                valueLabelDisplay="auto"
                getAriaValueText={valuetext}
              />
            </div>
            <div className="btn_flex">
              <Button variant="outlined">Reset</Button>
              <Button>Apply</Button>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  )
}