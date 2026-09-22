/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, MenuItem, Modal, TextField } from "@mui/material";
import React from "react";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useTopUpWalletMutation, useVerifyTopUpMutation } from "@/service/wallet";
import toast from "react-hot-toast";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { RAZORPAY_KEY_ID } from "@/constants/constants";
import { formatPriceInr } from "@/utils/format";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  onTopUpSuccess?: () => void;
}

const QUICK_AMOUNTS = ["100", "200", "300", "400", "500", "600", "700", "800"];

export default function TopUp({
  open,
  onClose,
  setOpen,
  onTopUpSuccess,
}: ModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const { openPayment } = useRazorpay();
  const [topUpWallet] = useTopUpWalletMutation();
  const [verifyTopUp] = useVerifyTopUpMutation();

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

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setAmount(sanitized);
  };

  const handleTopUp = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await topUpWallet({
        amount: numericAmount,
        payment_method: paymentMethod,
        description: "add with payment gateway",
      }).unwrap();

      const paymentData = response?.data?.payment;
      const orderId =
        paymentData?.razorpay_order_id ||
        response?.data?.transaction?.reference_id;
      const keyId = paymentData?.key_id || RAZORPAY_KEY_ID;
      const amountValue = Number(paymentData?.amount ?? numericAmount);
      const currency = paymentData?.currency || "INR";

      if (!orderId) {
        toast.error("Failed to create payment order. Please try again.");
        return;
      }

      const options = {
        key: keyId,
        amount: Math.round(amountValue * 100),
        currency,
        name: "Womancart",
        description: "Wallet Top Up",
        image: "/images/logo.png",
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const verifyResponse = await verifyTopUp({
              razorpay_order_id: response?.razorpay_order_id,
              razorpay_payment_id: response?.razorpay_payment_id,
              razorpay_signature: response?.razorpay_signature,
            }).unwrap();

            if (verifyResponse?.statusCode === 200) {
              toast.success(
                verifyResponse?.message || "Wallet top up successful"
              );
              onTopUpSuccess?.();
              setOpen(false);
            } else {
              toast.error(
                verifyResponse?.message || "Payment verification failed"
              );
            }
          } catch (error: any) {
            toast.error(
              error?.data?.message ||
                error?.message ||
                "Payment verification failed. Please try again."
            );
          }
        },
        prefill: prefillDetails,
        notes: {
          topUpAmount: amountValue.toString(),
        },
      theme: {
          color:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--commerce-primary")
              .trim() || "#E91E63",
        },
      };

      setOpen(false);
      openPayment(options);
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          error?.message ||
          "Failed to initiate top up. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
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
              <h2>Top Up</h2>
            </div>
            <div className="amount_mn">
              <div className="price">
                <h3>Top Up Amount</h3>
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="₹ 1000"
                  value={amount ? `₹ ${amount}` : ""}
                  onChange={(event) =>
                    handleAmountChange(event.target.value)
                  }
                  sx={{
                    "& .MuiInputBase-input::placeholder": {
                      color: "#ffffff", // white placeholder
                      opacity: 1, // ensure visible
                    },
                    input: {
                      color: "#fff", // normal text color
                    },
                  }}
                />
              </div>

              <ul className="amount gap_m">
                {QUICK_AMOUNTS.map((value) => (
                  <li
                    key={value}
                    className={`w_25 ${amount === value ? "active" : ""}`}
                    onClick={() => setAmount(value)}
                    role="button"
                    aria-label={`Select ₹${formatPriceInr(value)}`}
                  >
                    ₹{formatPriceInr(value)}
                  </li>
                ))}
              </ul>
              
              <Button
                className="w_100"
                onClick={handleTopUp}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Select Payment Method"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
