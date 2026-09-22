/* eslint-disable @typescript-eslint/no-unused-vars */
import { Dispatch, SetStateAction, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Button, CircularProgress, Modal, TextField } from "@mui/material";
import toast from "react-hot-toast";
import OtpVerifyModal from "./optVerifyModal";
import ResetPasswordMain from "./resetPasswordMain";
import { useForgotPasswordMutation, useVerifyOtpMutation, useResendOtpMutation } from "@/service/auth";
import { useAppDispatch } from "@/lib/hook";
import { setToken } from "@/lib/slices/authSlice";
import { setToStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export default function ResetPassword({ open, onClose, setOpen }: ModalProps) {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
  const [otp, setOtp] = useState("");
  const [countDown, setCountDown] = useState(60);
  const [forgotPasswordToken, setForgotPasswordToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | number | null>(null);
  
  const [forgotPassword, { isLoading: isForgotPasswordLoading }] = useForgotPasswordMutation();
  const [verifyOtp, { isLoading: isOtpVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResendingOtp }] = useResendOtpMutation();

  const handleCloseModal2 = () => {
    setOpen2(false);
    setOtp("");
    setCountDown(60);
  };
  
  const handleCloseModal3 = () => {
    setOpen3(false);
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trimEnd();
    if (!normalizedEmail) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    // eslint-disable-next-line sonarjs/no-duplicate-string
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("type", "1");
      formData.append("email", normalizedEmail);

      const res = await forgotPassword({ body: formData }).unwrap();
      
      if (res?.statusCode === 200 || res?.statusCode === 201) {
        // Extract user_id from response if available
        const userIdFromResponse = 
          (res?.data as any)?.user_id ||
          (res?.data as any)?.userId ||
          (res?.data as any)?.id ||
          res?.data?.id;
        
        if (userIdFromResponse) {
          setUserId(userIdFromResponse);
        } else {
          // Fallback to email if user_id is not provided
          setUserId(normalizedEmail);
        }
        
        toast.success("OTP has been sent to your email");
        setOpen2(true);
        setOpen(false);
        setCountDown(60);
      } else {
        toast.error(res?.message || "Failed to send OTP");
      }
    } catch (error: any) {
      console.error("Forgot password error:", error);
      console.error("Error details:", {
        status: error?.status,
        data: error?.data,
        message: error?.data?.message,
        errors: error?.data?.errors,
      });
      const errorMessage = 
        error?.data?.message || 
        error?.data?.errors?.email?.[0] ||
        error?.data?.errors?.type?.[0] ||
        "Failed to send OTP. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp || otp.length !== 4) {
      toast.error("Please enter a valid 4-digit OTP");
      return;
    }

    try {
      const otpNumber = parseInt(otp, 10);
      if (isNaN(otpNumber)) {
        toast.error("Please enter a valid numeric OTP");
        return;
      }

      const body = {
        user_id: userId || email, // Use user_id from forgot password response or fallback to email
        type: 1, // Type 1 for email
        otp: otpNumber,
      };

      const res = await verifyOtp({ body }).unwrap();
      
      if (res?.statusCode === 200 || res?.statusCode === 201) {
        // Extract token from response if available
        const token =
          (res?.data as any)?.auth_token ||
          (res?.data as any)?.token ||
          (res?.data as any)?.access_token ||
          (res as any)?.token ||
          (res?.data as any)?.accessToken;
        
        if (token) {
          // Store token in Redux and localStorage for change password API
          dispatch(setToken({ token }));
          setToStorage(STORAGE_KEYS.token, token);
          setForgotPasswordToken(token);
        }
        
        toast.success("OTP verified successfully");
        setOpen2(false);
        setOpen3(true);
        setOtp("");
      } else {
        toast.error(res?.message || "OTP verification failed");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error(error?.data?.message || "Invalid OTP. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    const normalizedEmail = email.trimEnd();
    if (!normalizedEmail) {
      toast.error("Email is required");
      return;
    }

    try {
      const body = {
        user_id: userId || normalizedEmail, // Use user_id from forgot password response or fallback to email
        type: 1, // Type 1 for email
      };

      const res = await resendOtp({ body }).unwrap();
      
      if (res?.statusCode === 200 || res?.statusCode === 201) {
        toast.success("OTP has been resent to your email");
        setCountDown(60);
        setOtp("");
      } else {
        toast.error(res?.message || "Failed to resend OTP");
      }
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast.error(error?.data?.message || "Failed to resend OTP. Please try again.");
    }
  };

  return (
    <>
      <Modal className="modal otpVerify_modal" open={open} onClose={onClose}>
        <div className="modal-dialog">
          <div className="modal-body">
            <div className="btn-close" onClick={() => setOpen(false)}>
              <CloseIcon />
            </div>
            <div className="modal_title d_block text_center ">
              <h2>Reset Password</h2>
              <p>
                To reset your password, please enter your email address and
                we&apos;ll send you a verification OTP.
              </p>
            </div>
            <form 
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleForgotPassword();
              }}
            >
              <div className="gap_p">
                <div className="control_group w_100">
                  <label>Email Address</label>
                  <TextField
                    fullWidth
                    hiddenLabel
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trimEnd())}
                    disabled={isForgotPasswordLoading}
                    type="email"
                  ></TextField>
                </div>
              </div>
              <div className="btn_flex">
                <Button
                  className="w_100 br_15"
                  disabled={isForgotPasswordLoading}
                  type="submit"
                >
                  {isForgotPasswordLoading ? (
                    <>
                      <CircularProgress size={20} color="inherit" /> Sending...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
      <OtpVerifyModal
        open={open2}
        onClose={handleCloseModal2}
        setOpen={setOpen2}
        title="Verify your Email Id"
        description="A verification code has been sent on your email. Please check your email."
        countDown={countDown}
        setCountDown={setCountDown}
        otp={otp}
        setOtp={setOtp}
        loading={isOtpVerifying || isResendingOtp}
        onSubmit={handleOtpSubmit}
        onResend={handleResendOtp}
      />
      <ResetPasswordMain
        open={open3}
        onClose={handleCloseModal3}
        setOpen={setOpen3}
        token={forgotPasswordToken}
        email={email}
      />
    </>
  );
}
