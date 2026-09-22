/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { Dispatch, SetStateAction, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Modal, styled } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import RadioGroup, { useRadioGroup } from "@mui/material/RadioGroup";
import FormControlLabel, {
  FormControlLabelProps,
} from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import React from "react";
import AddAddress from "./addAddress";

import { Address } from "@/types/General";
import { formatAddressPhone } from "@/utils/phoneNumber";
import { buildMyAddressUrlWithReturnTo } from "@/utils/safeReturnPath";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  addresses: Address[];
  selectedAddress: Address | null;
  onSelectAddress: (address: Address) => void;
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

export default function shippingAddress({
  open,
  onClose,
  setOpen,
  addresses,
  selectedAddress,
  onSelectAddress,
}: ModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pageSearchParams = useSearchParams();
  const [open1, setOpen1] = React.useState(false);

  const handleCloseModal1 = () => {
    setOpen1(false);
  };
  return (
    <>
      <Modal className="modal shpngaddrs_modal" open={open} onClose={onClose}>
        <div className="modal-dialog">
          <div className="modal-body">
            <div className="btn-close" onClick={() => setOpen(false)}>
              <CloseIcon />
            </div>
            <div className="modal_title hd_3  d_block">
              <h2>Select Delivery Addresses</h2>
            </div>
            {addresses.length > 0 ? (
              <RadioGroup
                name="shipping-address"
                value={selectedAddress?.id?.toString() || ""}
                onChange={(e) => {
                  const addrId = Number(e.target.value);
                  const addr = addresses.find(a => a.id === addrId);
                  if (addr) onSelectAddress(addr);
                }}
                className="shpng_adrs_lst hd_6"
              >
                {addresses.map((address) => (
                  <MyFormControlLabel
                    key={address.id}
                    className="sphng_lst"
                    value={address.id?.toString()}
                    control={<Radio />}
                    label={
                      <div className="shpng_adrs_inr">
                        <figure>
                          <img
                            src="https://productapptunix.s3.ap-south-1.amazonaws.com/1762238899247_Group 21.png"
                            alt=""
                          />
                        </figure>
                        <div className="shpng_adrs_cntnt">
                          <h3
                            style={{
                              display: "flex",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 8,
                              margin: 0,
                            }}
                          >
                            {address.address_type || "Home"}
                            {Number(address.is_default) === 1 && (
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#fff",
                                  backgroundColor:
                                    "var(--commerce-primary, #d91b76)",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  lineHeight: 1.2,
                                }}
                              >
                                Default
                              </span>
                            )}
                          </h3>
                          <p>
                            {address.address} {address.address1}
                            <span className="d_block">
                              {address.city}, {address.state} {address.pincode}
                            </span>
                            {formatAddressPhone(address.phone, address.phone_code, address.mobile) && (
                              <span className="d_block" style={{ marginTop: "4px", color: "#666" }}>
                                {formatAddressPhone(address.phone, address.phone_code, address.mobile)}
                              </span>
                            )}
                            {address.email && (
                              <span className="d_block" style={{ marginTop: "4px", color: "#666" }}>
                                {address.email}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    }
                  />
                ))}
              </RadioGroup>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                <p>No addresses found. Please add a new address.</p>
              </div>
            )}

            <Button className="w_100 adnw_adrs" onClick={() => { setOpen(false); setOpen1(true) }}><AddIcon />Add New Address</Button>
            <Button
              className="w_100"
              variant="text"
              sx={{ mt: 1, color: "var(--commerce-primary, #d91b76)" }}
              onClick={() => {
                setOpen(false);
                router.push(buildMyAddressUrlWithReturnTo(pathname, pageSearchParams));
              }}
            >
              Manage all addresses
            </Button>
          </div>
        </div>
      </Modal>
      <AddAddress
        open={open1}
        onClose={handleCloseModal1}
        setOpen={setOpen1}
        onSuccess={() => {
          handleCloseModal1();
          // The address list will refresh automatically via RTK Query cache invalidation
          // Reopen the shipping address modal to show updated list
          setTimeout(() => {
            setOpen(true);
          }, 100);
        }}
      />
    </>
  );
}
