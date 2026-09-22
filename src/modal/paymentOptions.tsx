/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { Dispatch, SetStateAction, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Modal, styled } from "@mui/material";
import RadioGroup, { useRadioGroup } from "@mui/material/RadioGroup";
import FormControlLabel, {
  FormControlLabelProps,
} from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import React from "react";

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

export default function PaymentOptions({ open, onClose, setOpen }: ModalProps) {
  const [, setOpen1] = React.useState(false);

  return (
    <>
      <Modal
        className="modal shpngaddrs_modal pymnts_optn"
        open={open}
        onClose={onClose}
      >
        <div className="modal-dialog">
          <div className="modal-body">
            <div className="btn-close" onClick={() => setOpen(false)}>
              <CloseIcon />
            </div>
            <div className="modal_title hd_3  d_block">
              <h2>Payment Options</h2>
            </div>
            <RadioGroup
              name="shipping-address"
              defaultValue="first"
              className="shpng_adrs_lst hd_6 mb_30"
            >
              <MyFormControlLabel
                className="sphng_lst"
                value="first"
                control={<Radio />}
                label={
                  <div className="shpng_adrs_inr">
                    <figure>
                      <img src="/images/upi_img.png" alt="" />
                    </figure>
                    <div className="shpng_adrs_cntnt">
                      <h3>UPI</h3>
                      <p>
                        Pay by any UPI app{" "}
                        <span className="d_block">
                          XYZ Bank is currently facing technical issues.
                        </span>
                      </p>
                    </div>
                  </div>
                }
              />
              <MyFormControlLabel
                className="sphng_lst"
                value="second"
                control={<Radio />}
                label={
                  <div className="shpng_adrs_inr">
                    <figure>
                      <img src="/images/atm-card.png" alt="" />
                    </figure>
                    <div className="shpng_adrs_cntnt">
                      <h3>Credit/Debit/ATM Card</h3>
                      <p>XYZ Bank is currently facing technical issues. </p>
                    </div>
                  </div>
                }
              />
              <MyFormControlLabel
                className="sphng_lst"
                value="third"
                control={<Radio />}
                label={
                  <div className="shpng_adrs_inr">
                    <figure>
                      <img src="/images/banking.png" alt="" />
                    </figure>
                    <div className="shpng_adrs_cntnt">
                      <h3>Net Banking</h3>
                    </div>
                  </div>
                }
              />
              <MyFormControlLabel
                className="sphng_lst"
                value="fourth"
                control={<Radio />}
                label={
                  <div className="shpng_adrs_inr">
                    <figure>
                      <img src="/images/COD.png" alt="" />
                    </figure>
                    <div className="shpng_adrs_cntnt">
                      <h3>Pay on Delivery</h3>
                    </div>
                  </div>
                }
              />
            </RadioGroup>
            <p className="safe_secure">
              <img src="/images/lock_icon.svg" alt="" />
              Safe and Secure Payments
            </p>
            <Button
              className="w_100"
              onClick={() => {
                setOpen(false);
                setOpen1(true);
              }}
            >
              Pay Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
