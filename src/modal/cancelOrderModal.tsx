import { Dispatch, SetStateAction, useMemo } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, MenuItem, Modal, Select, SelectChangeEvent } from "@mui/material";
import React from "react";
import toast from "react-hot-toast";
import { useCancelOrderMutation } from "@/service/order";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  orderItemId?: number | string | null;
  orderId?: number | string | null;
  onSuccess?: () => void;
}

const cancelReasons = [
  { value: "product_not_required", label: "Product not required anymore" },
  { value: "ordered_by_mistake", label: "Ordered by mistake" },
  { value: "found_better_price", label: "Found better price elsewhere" },
  { value: "delivery_delay", label: "Delivery is delayed" },
  { value: "other", label: "Other" },
];

export default function CancelOrderModal({ open, onClose, setOpen, orderItemId, orderId, onSuccess }: ModalProps) {

  const [reason, setReason] = React.useState(cancelReasons[0].value);
  const [cancelOrder, { isLoading }] = useCancelOrderMutation();

  const handleChange = (event: SelectChangeEvent) => {
    setReason(event.target.value as string);
  };

  const parsedReason = useMemo(() => reason || "", [reason]);

  const handleSubmit = async () => {
    if (!orderItemId) {
      toast.error("Order item not found. Please try again.");
      return;
    }
    if (!parsedReason) {
      toast.error("Please select a reason to cancel.");
      return;
    }

    try {
      const res = await cancelOrder({
        orderItemId,
        ...(orderId ? { orderId } : {}),
        ...(parsedReason ? { reason: parsedReason } : {}),
      }).unwrap();

      toast.success(res?.message || "Order cancelled successfully");
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      const message = err?.data?.message || err?.message || "Failed to cancel order";
      toast.error(message);
    }
  };

  return (
    <Modal className="modal orderCancel_modal" open={open} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-body">
          <div className="btn-close" onClick={() => setOpen(false)}>
            <CloseIcon />
          </div>
          <div className="modal_title hd_5">
            <h2>Want to Cancel?</h2>
            <p>Please provide the reason for the return of product</p>
          </div>

          <form className="form">
            <div className="gap_p">
              <div className="control_group w_100">
                <label>Select Reason</label>
                <Select
                  value={reason}
                  onChange={handleChange}
                >
                  {cancelReasons.map((r) => (
                    <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                  ))}
                </Select>
              </div>
            </div>
          </form>

          <div className="btn_flex">
            <Button className="w_100 br_15" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Cancelling..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </Modal >
  );
}
