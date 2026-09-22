import { Dispatch, SetStateAction, useState, MouseEvent } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Modal,
  TextField,
} from "@mui/material";
import { VisibilityOff, Visibility } from "@mui/icons-material";
import toast from "react-hot-toast";
import { useChangePasswordMutation } from "@/service/auth";
import { useRouter } from "next/navigation";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  token?: string | null;
  email?: string;
}

export default function ResetPasswordMain({
  open,
  onClose,
  setOpen,
  token,
  email,
}: ModalProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const handleClickShowPassword = (field: "password" | "confirmPassword") => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleMouseUpPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleChangePassword = async () => {
    if (!password || !password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("password", password.trim());
      formData.append("password_confirmation", confirmPassword.trim());

      const res = await changePassword({ body: formData }).unwrap();
      
      if (res?.statusCode === 200 || res?.statusCode === 201) {
        toast.success("Password changed successfully");
        setOpen(false);
        setPassword("");
        setConfirmPassword("");
        // Redirect to login page
        router.push("/auth/login");
      } else {
        toast.error(res?.message || "Failed to change password");
      }
    } catch (error: any) {
      console.error("Change password error:", error);
      console.error("Error details:", {
        status: error?.status,
        data: error?.data,
        message: error?.data?.message,
        errors: error?.data?.errors,
      });
      const errorMessage = 
        error?.data?.message || 
        error?.data?.errors?.password?.[0] ||
        error?.data?.errors?.password_confirmation?.[0] ||
        "Failed to change password. Please try again.";
      toast.error(errorMessage);
    }
  };

  return (
    <Modal className="modal otpVerify_modal" open={open} onClose={onClose}>
      <div className="modal-dialog">
        <div className="modal-body">
          <div className="btn-close" onClick={() => setOpen(false)}>
            <CloseIcon />
          </div>
          <div className="modal_title d_block text_center ">
            <h2>Reset Password</h2>
            <p>Set up a fresh password.</p>
          </div>
          <form 
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleChangePassword();
            }}
          >
            <div className="gap_p">
              <div className="control_group w_100">
                <label>New Password</label>
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Enter password"
                  type={showPassword.password ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isChangingPassword}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              showPassword.password
                                ? "hide the password"
                                : "display the password"
                            }
                            onClick={() => handleClickShowPassword("password")}
                            onMouseDown={handleMouseDownPassword}
                            onMouseUp={handleMouseUpPassword}
                          >
                            {showPassword.password ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </div>
              <div className="control_group w_100">
                <label>Confirm Password</label>
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Confirm password"
                  type={showPassword.confirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              showPassword.confirmPassword
                                ? "hide the password"
                                : "display the password"
                            }
                            onClick={() => handleClickShowPassword("confirmPassword")}
                            onMouseDown={handleMouseDownPassword}
                            onMouseUp={handleMouseUpPassword}
                          >
                            {showPassword.confirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </div>
            </div>
            <div className="btn_flex">
              <Button
                className="w_100 br_15"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                type="submit"
              >
                {isChangingPassword ? (
                  <>
                    <CircularProgress size={20} color="inherit" /> Changing...
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
  );
}
