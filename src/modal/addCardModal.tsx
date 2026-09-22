/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Button, InputAdornment, MenuItem, Modal, Select, SelectChangeEvent, TextField } from '@mui/material';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import CloseIcon from "@mui/icons-material/Close";
import React from 'react';
import { useRazorpay } from "@/hooks/useRazorpay";
import { useSaveCardPaymentMutation, useVerifyCardPaymentMutation } from "@/service/payment";
import toast from "react-hot-toast";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { RAZORPAY_KEY_ID } from "@/constants/constants";

// props
interface CardModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  onCardSaveSuccess?: () => void;
}

export default function AddCardModal({
  open,
  onClose,
  setOpen,
  onCardSaveSuccess,
}: CardModalProps) {
  const [country, setCountry] = useState('20');
  const [isProcessing, setIsProcessing] = useState(false);
  const { openPayment } = useRazorpay();
  const [saveCardPayment] = useSaveCardPaymentMutation();
  const [verifyCardPayment] = useVerifyCardPaymentMutation();

  const prefillDetails = useMemo(() => {
    const userDataFromStorage = getFromStorage(STORAGE_KEYS.credentials);
    if (!userDataFromStorage) {
      return { name: "", email: "", contact: "" };
    }
    try {
      const credentials = JSON.parse(userDataFromStorage);
      return {
        name: credentials?.name || credentials?.full_name || "",
        email: credentials?.email || "",
        contact: credentials?.phoneNumber || credentials?.phone || "",
      };
    } catch {
      return { name: "", email: "", contact: "" };
    }
  }, []);

  const handleChange = (event: SelectChangeEvent) => {
    setCountry(event.target.value as string);
  };

  const handleAddCard = async () => {
    setIsProcessing(true);
    try {
      // Step 1: Call save-card-payment to get the order_id
      const response = await saveCardPayment().unwrap();

      const paymentData = response?.data?.payment;
      const orderId =
        paymentData?.razorpay_order_id ||
        response?.data?.transaction?.reference_id;
      const keyId = paymentData?.key_id || RAZORPAY_KEY_ID;
      const amountValue = Number(paymentData?.amount ?? 1); // Default to 1 if not provided
      const currency = paymentData?.currency || "INR";

      if (!orderId) {
        toast.error("Failed to create payment order. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Step 2: Open Razorpay payment gateway
      const options = {
        key: keyId,
        amount: Math.round(amountValue * 100),
        currency,
        name: "Womancart",
        description: "Save Card",
        image: "/images/logo.png",
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Step 3: Verify the card payment
            const verifyResponse = await verifyCardPayment({
              razorpay_order_id: response?.razorpay_order_id || orderId,
              razorpay_payment_id: response?.razorpay_payment_id,
              razorpay_signature: response?.razorpay_signature,
            }).unwrap();

            if (verifyResponse?.success === true || verifyResponse?.statusCode === 200) {
              toast.success(
                verifyResponse?.message || "Card saved successfully"
              );
              onCardSaveSuccess?.();
              setOpen(false);
            } else {
              toast.error(
                verifyResponse?.message || "Card verification failed"
              );
            }
          } catch (error: any) {
            toast.error(
              error?.data?.message ||
                error?.message ||
                "Card verification failed. Please try again."
            );
          }
        },
        prefill: prefillDetails,
        notes: {
          action: "save_card",
        },
        theme: {
          color:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--commerce-primary")
              .trim() || "#E91E63",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      setOpen(false);
      openPayment(options);
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          error?.message ||
          "Failed to initiate card save. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      className="modal addCard_modal"
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      open={open}
      onClose={onClose}
    >
      <div className="modal-dialog">
        <div className="modal-body">
                  <div className="btn-close" onClick={() => setOpen(false)}>
            <CloseIcon />
          </div>
          <div className="modal_title hd_5">
            <h2>   Add Card</h2>
          
          </div>
          <form className="form">
            <div className="gap_m">
              <div className="control_group w_100">
                <label>Card number</label>
                <TextField hiddenLabel placeholder="4416 2451 3474" fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="end" className="card_icon">
                          <img src="/images/visa_icon.png" alt="Icon" />
                        </InputAdornment>
                      ),
                    },
                  }} />
              </div>
              <div className="control_group w_50">
                <label>Exp. date</label>
                <TextField hiddenLabel placeholder="Enter Exp. date" fullWidth />
              </div>
              <div className="control_group w_50">
                <label>CVV</label>
                <TextField hiddenLabel placeholder="Enter CVV" fullWidth />
              </div>
              <div className="control_group w_100">
                <label>Country</label>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={country}
                  onChange={handleChange}
                >
                  <MenuItem value={10}>India</MenuItem>
                  <MenuItem value={20}>Dubai</MenuItem>
                </Select>
              </div>
              <div className="control_group w_100">
                <label>Address</label>
                <TextField hiddenLabel placeholder="Enter address" fullWidth />
              </div>
            </div>
            <div className="btn_flex">
              <Button 
                className="br_15 w_100" 
                onClick={handleAddCard}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "ADD CARD"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
