import { FormControlLabel, styled, Switch, SwitchProps } from '@mui/material'
import React, { } from 'react'
interface SwitchToggleProps {
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  label?: React.ReactNode;
  defaultChecked?: boolean;
}

const IOSSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 46,
  height: 24,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    marginRight: "0",
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(22px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: "var(--commerce-primary)",
        opacity: 1,
        border: 0,
        ...theme.applyStyles('dark', {
          backgroundColor: '#2ECA45',
        }),
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 20,
    height: 20,
  },
  '& .MuiSwitch-track': {
    borderRadius: 23 / 2,
    backgroundColor: '#DFDFDF',
    opacity: 1,
  },
}));

const SwitchToggle: React.FC<SwitchToggleProps> = ({ checked, onChange, label = '', defaultChecked }) => {

  return (
    <FormControlLabel
      control={<IOSSwitch checked={checked} onChange={onChange} defaultChecked={defaultChecked} />}
      label={label}
    />
  )
}

export default SwitchToggle