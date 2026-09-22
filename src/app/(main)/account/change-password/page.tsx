"use client"
import { Button, CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material'

import { VisibilityOff, Visibility } from "@mui/icons-material";
import {useState, } from "react";
import toast from "react-hot-toast";
import { useChangePasswordMutation } from "@/service/auth";

function ChangePassword() {

const [showPassword, setShowPassword] = useState({
  current: false,
  new: false,
  confirm: false,
});

const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

const handleClickShowPassword = (field: keyof typeof showPassword) => {
  setShowPassword((prev) => ({
    ...prev,
    [field]: !prev[field],
  }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate current password
  if (!currentPassword || !currentPassword.trim()) {
    toast.error("Please enter your current password");
    return;
  }

  // Validate new password
  if (!newPassword || !newPassword.trim()) {
    toast.error("Please enter a new password");
    return;
  }

  if (newPassword.length < 8) {
    toast.error("Password must be at least 8 characters long");
    return;
  }

  if (newPassword !== confirmPassword) {
    toast.error("Passwords do not match");
    return;
  }

  // Check if new password is same as current password
  if (currentPassword === newPassword) {
    toast.error("New password must be different from current password");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("current_password", currentPassword.trim());
    formData.append("password", newPassword.trim());
    formData.append("password_confirmation", confirmPassword.trim());

    const res = await changePassword({ body: formData }).unwrap();
    
    if (res?.statusCode === 200 || res?.statusCode === 201) {
      toast.success(res?.message || "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(res?.message || "Failed to change password");
    }
  } catch (error: any) {
    
   
    
    // Check for current password validation errors
    const errorMessage = 
      error?.data?.message || 
      error?.data?.errors?.current_password?.[0] ||
      error?.data?.errors?.old_password?.[0] ||
      error?.data?.errors?.password?.[0] ||
      error?.data?.errors?.password_confirmation?.[0] ||
      "Failed to change password. Please try again.";
    
    // Check if error message indicates wrong current password
    const errorMsgLower = errorMessage.toLowerCase();
    if (errorMsgLower.includes("current password") || 
        errorMsgLower.includes("old password") || 
        errorMsgLower.includes("incorrect password") ||
        errorMsgLower.includes("wrong password") ||
        errorMsgLower.includes("invalid password")) {
      toast.error("Current password is incorrect");
    } else {
      toast.error(errorMessage);
    }
  }
};

  return (
   <>
       <div className="s_head flex hd_6 ">
        <h2>Update Password</h2>
      </div>
   <form className="form v2" onSubmit={handleSubmit}>
            <div className="gap_p">
              <div className="control_group w_100">
                <label>Current Password</label>
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Enter password"
                  type={showPassword.current ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPassword}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              showPassword.current
                                ? "hide the password"
                                : "display the password"
                            }
                            onClick={() => handleClickShowPassword("current")}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseUp={(e) => e.preventDefault()}
                          >
                            {showPassword.current ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </div>
              <div className="control_group w_100">
                <label>New Password</label>
                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Enter password"
                  type={showPassword.new ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              showPassword.new
                                ? "hide the password"
                                : "display the password"
                            }
                            onClick={() => handleClickShowPassword("new")}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseUp={(e) => e.preventDefault()}
                          >
                            {showPassword.new ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </div>
                     <div className="control_group w_100">
                <label> Confirm New Password</label>

                <TextField
                  fullWidth
                  hiddenLabel
                  placeholder="Enter password"
                  type={showPassword.confirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              showPassword.confirm
                                ? "hide the password"
                                : "display the password"
                            }
                            onClick={() => handleClickShowPassword("confirm")}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseUp={(e) => e.preventDefault()}
                          >
                            {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </div>
            </div>
            <div className="btn_group payment_btn mt_20">
              <Button 
                className='br_15' 
                type="submit"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <CircularProgress size={20} color="inherit" style={{ marginRight: 8 }} /> 
                    Changing...
                  </>
                ) : (
                  "SUBMIT"
                )}
              </Button>
            </div>
          </form>

   
   </>
  )
}

export default ChangePassword