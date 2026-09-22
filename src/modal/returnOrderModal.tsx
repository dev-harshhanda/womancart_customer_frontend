import { Dispatch, SetStateAction, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, FormControlLabel, Modal, Radio, RadioGroup, TextField } from "@mui/material";
import React from "react";
import toast from "react-hot-toast";
import { useReturnOrderMutation } from "@/service/order";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  orderItemId?: number | string | null;
  orderId?: number | string | null;
  productName?: string;
  onSuccess?: () => void;
}

const returnReasons = [
  { value: "changed_mind", label: "I Changed my mind" },
  { value: "dislike_material", label: "I don’t like the material" },
  { value: "quality_poor", label: "Item quality is poor" },
  { value: "wrong_item", label: "I received wrong item" },
  { value: "dislike_color", label: "I don’t like the color" },
  { value: "ordered_more_than_one_size", label: "I ordered more than one size" },
  { value: "other", label: "Other (please specify)" },
];

const refundMethods = [
  { value: "original", label: "Original Payment Method" },
  { value: "wallet", label: "Wallet Credit" },
];

export default function ReturnOrderModal({
  open,
  onClose,
  setOpen,
  orderItemId,
  orderId,
  productName,
  onSuccess,
}: ModalProps) {
  const [selectedReason, setSelectedReason] = useState(returnReasons[0].value);
  const [otherReason, setOtherReason] = useState("");
  const [selectedRefundMethod, setSelectedRefundMethod] = useState(refundMethods[0].value);

  const [returnOrder, { isLoading }] = useReturnOrderMutation();

  const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedReason(event.target.value);
    if (event.target.value !== "other") {
      setOtherReason(""); // Clear other reason if a specific one is selected
    }
  };

  const handleSubmit = async () => {
    if (!orderItemId) {
      toast.error("Order item not found. Please try again.");
      return;
    }

    let returnReason = selectedReason;
    if (selectedReason === "other") {
      if (!otherReason.trim()) {
        toast.error("Please specify the reason for return.");
        return;
      }
      returnReason = otherReason.trim();
    }
    
    if (!returnReason) {
      toast.error("Please select or specify a reason for return.");
      return;
    }

    try {
      const res = await returnOrder({
        orderItemId,
        return_reason: returnReason,
        refund_method: selectedRefundMethod,
      }).unwrap();

      toast.success(res?.message || "Return request submitted successfully");
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      const message = err?.data?.message || err?.message || "Failed to submit return request";
      toast.error(message);
    }
  };

  return (
    <Modal className="modal orderReturn_modal" open={open} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-body">
          <div className="btn-close" onClick={() => setOpen(false)}>
            <CloseIcon />
          </div>

          <form className="form">
            <h2>Select item you want to return</h2>
            <RadioGroup
              aria-labelledby="demo-item-label"
              value={String(orderItemId)}
              name="item"
            >
              <FormControlLabel value={String(orderItemId)} control={<Radio />} label={productName || "Product"} />
            </RadioGroup>

            <h2>Select a reason for return</h2>
            <RadioGroup
              aria-labelledby="demo-reason-label"
              value={selectedReason}
              onChange={handleReasonChange}
              name="reason"
            >
              {returnReasons.map((reasonOption) => (
                <FormControlLabel
                  key={reasonOption.value}
                  value={reasonOption.value}
                  control={<Radio />}
                  label={reasonOption.label}
                />
              ))}
            </RadioGroup>
            {selectedReason === "other" && (
              <TextField
                label="Specify Reason"
                variant="outlined"
                fullWidth
                multiline
                rows={2}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                sx={{ mt: 2 }}
              />
            )}

            <h2>Select Refund Method</h2>
            <RadioGroup
              aria-labelledby="demo-refund-method-label"
              value={selectedRefundMethod}
              onChange={(e) => setSelectedRefundMethod(e.target.value)}
              name="refundMethod"
            >
              {refundMethods.map((method) => (
                <FormControlLabel
                  key={method.value}
                  value={method.value}
                  control={<Radio />}
                  label={method.label}
                />
              ))}
            </RadioGroup>
          </form>

          <div className="btn_flex">
            <Button className="w_100 br_15" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </Modal >
  );
}
