import { Dispatch, SetStateAction, useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, Modal } from "@mui/material";
import OTPInput from "react-otp-input";
import { useRouter } from "next/navigation";

const OTP_RESEND_WAIT_SECONDS = 60;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  otp: string;
  setOtp: Dispatch<SetStateAction<string>>;
  countDown: number;
  setCountDown: Dispatch<SetStateAction<number>>;
  title?: string;
  description?: string;
  onSubmit?: () => void;
  onResend?: () => void;
  loading?: boolean;
}

export default function OtpVerifyModal({
  open,
  onClose,
  setOpen,
  title = "Verify Email Address",
  description = "A verification OTP has been sent to your email address. Please check your inbox.",
  onSubmit,
  onResend,
  countDown,
  otp,
  setCountDown,
  setOtp,
  loading,
}: ModalProps) {
  const [isResending, setIsResending] = useState(false);
  const countdownLabel = `${Math.floor(countDown / 60)
    .toString()
    .padStart(2, "0")}:${(countDown % 60).toString().padStart(2, "0")}`;
  useEffect(() => {
    if (!open) return;
    if (countDown <= 0) return;

    const interval = setInterval(() => {
      setCountDown((prev) => {
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, countDown]);

  return (
    <Modal className="modal otpVerify_modal" open={open} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-body">
          <div
            className="btn-close"
            onClick={() => {
              setCountDown(OTP_RESEND_WAIT_SECONDS);
              setOpen(false);
            }}
          >
            <CloseIcon />
          </div>
          <div className="modal_title hd_4">
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onSubmit) {
                onSubmit();
              }
            }}
          >
            <div className="gap_p">
              <div className="control_group opt_fields w_100">
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  numInputs={4}
                  renderInput={(props) => <input {...props} />}
                  shouldAutoFocus
                  inputType="tel"
                />
                <Box component="a" className="resend">
                  {countDown === 0 && !loading && !isResending ? (
                    <>
                      <div />
                      <strong
                        onClick={async () => {
                          if (!onResend || isResending) return;
                          setIsResending(true);
                          setCountDown(OTP_RESEND_WAIT_SECONDS);
                          setOtp("");
                          try {
                            await onResend();
                          } finally {
                            setIsResending(false);
                          }
                        }}
                      >
                        Resend
                      </strong>
                    </>
                  ) : (
                    <>
                      {isResending ? "Sending..." : countdownLabel}
                    </>
                  )}{" "}
                </Box>
              </div>
            </div>
            <div className="btn_flex">
              <Button
                color="primary"
                className="w_100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onSubmit) {
                    onSubmit();
                  } else {
                    console.error("onSubmit is not defined!");
                  }
                }}
                disabled={loading}
                type="button"
              >
                Submit
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}
