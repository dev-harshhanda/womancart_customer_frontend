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

export default function Unfollow({ open, onClose, setOpen }: ModalProps) {
 

  return (
    <>
      <Modal className="modal unfollow_modal" open={open} onClose={onClose}>
        <div className="modal-dialog">
          <div className="modal-body">
            <div className="btn-close" onClick={() => setOpen(false)}>
              <CloseIcon />
            </div>
            <div className="modal_title d_block">
              <h2>Are you sure you want to unfollow?</h2>
              <p>After unfollowing, you will no longer receive these <br /> notifications:</p>
            </div>
            <ul>
              <li>
                <figure>
                  <img src="/images/promotions.png" alt="imge" />
                  <figcaption>Promotions</figcaption>
                </figure>
              </li>
              <li>
                <figure>
                  <img src="/images/airplane_ticket.png" alt="imge" />
                  <figcaption>New Arrivals</figcaption>
                </figure>
              </li>
            </ul>
            <button className="btnn gradient">Unfollow</button>
            <button className="btnn white" >Think again</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
