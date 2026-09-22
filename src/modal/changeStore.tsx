/* eslint-disable @typescript-eslint/no-unused-vars */
import { Dispatch, SetStateAction, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Modal, styled } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RadioGroup, { useRadioGroup } from "@mui/material/RadioGroup";
import FormControlLabel, {
  FormControlLabelProps,
} from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

interface StyledFormControlLabelProps extends FormControlLabelProps {
  checked: boolean;
}

function MyFormControlLabel(props: FormControlLabelProps) {
  const radioGroup = useRadioGroup();

  let checked = false;

  if (radioGroup) {
    checked = radioGroup.value === props.value;
  }

  return <StyledFormControlLabel checked={checked} {...props} />;
}

const StyledFormControlLabel = styled((props: StyledFormControlLabelProps) => (
  <FormControlLabel {...props} />
))(({ theme }) => ({
  variants: [
    {
      props: { checked: true },
      style: {
        ".MuiFormControlLabel-label": {
          color: theme.palette.primary.main,
        },
      },
    },
  ],
}));

export default function changeStore({ open, onClose, setOpen }: ModalProps) {
  return (
    <>
      <Modal className="modal chngstore_modal" open={open} onClose={onClose}>
        <div className="modal-dialog">
          <div className="modal-body">
            <div className="btn-close" onClick={() => setOpen(false)}>
              <CloseIcon />
            </div>
            <div className="modal_title d_block">
              <h2>Change Store</h2>
            </div>
            <RadioGroup
              name="change-store"
              defaultValue="first"
              className="shpng_adrs_lst hd_6"
            >
              <MyFormControlLabel
                className="sphng_lst"
                value="first"
                control={<Radio />}
                label={
                  <div className="shpng_adrs_cntnt">
                    <h3>McKinney Safairi Store</h3>
                    <p>633 Tradewind Dr, Fort Worth, TX 76131</p>
                  </div>
                }
              />
              <MyFormControlLabel
                className="sphng_lst"
                value="second"
                control={<Radio />}
                label={
                  <div className="shpng_adrs_cntnt">
                    <h3>Prime Safairi Store</h3>
                    <p>633 Tradewind Dr, Fort Worth, TX 76131</p>
                  </div>
                }
              />
              <MyFormControlLabel
                className="sphng_lst"
                value="third"
                control={<Radio />}
                label={
                  <div className="shpng_adrs_cntnt">
                    <h3>JS Complex Safairi Store</h3>
                    <p>633 Tradewind Dr, Fort Worth, TX 76131</p>
                  </div>
                }
              />
            </RadioGroup>

            <Button className="w_100 br_15">Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
