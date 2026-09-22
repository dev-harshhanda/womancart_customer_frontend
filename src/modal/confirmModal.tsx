import { Dispatch, SetStateAction } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, CircularProgress, Modal } from "@mui/material";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
}

export default function ConfirmModal({
  open,
  onClose,
  setOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isLoading = false,
  confirmButtonClass,
  cancelButtonClass,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleClose = () => {
    if (!isLoading) {
      setOpen(false);
      onClose();
    }
  };

  return (
    <Modal
      className="modal confirm_modal"
      open={open}
      onClose={handleClose}
    >
      <div className="modal-dialog">
        <div className="modal-body">
          <div className="btn-close" onClick={handleClose}>
            <CloseIcon />
          </div>
          <div className="modal_title d_block">
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <div
            className="btn_flex"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <Button
              className={confirmButtonClass || "br_15"}
              color="primary"
              variant="contained"
              onClick={handleConfirm}
              disabled={isLoading}
              sx={{
                backgroundColor: "var(--commerce-primary)",
                color: "#fff",
                minWidth: "120px",
                "&:hover": {
                  backgroundColor: "var(--commerce-primary-hover)",
                },
                "&.Mui-disabled": {
                  backgroundColor: "#D9D9D9",
                  color: "#737373",
                  WebkitTextFillColor: "#737373",
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                confirmText
              )}
            </Button>
            <Button
              className={cancelButtonClass || "br_15"}
              color="primary"
              variant="contained"
              onClick={handleClose}
              disabled={isLoading}
              sx={{
                backgroundColor: "var(--commerce-primary)",
                color: "#fff",
                minWidth: "120px",
                "&:hover": {
                  backgroundColor: "var(--commerce-primary-hover)",
                },
                "&.Mui-disabled": {
                  backgroundColor: "#D9D9D9",
                  color: "#737373",
                  WebkitTextFillColor: "#737373",
                },
              }}
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
