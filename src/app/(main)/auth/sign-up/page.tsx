/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TextField,
  InputAdornment,
  Button,
  Tab,
  Tabs,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OtpVerifyModal from "@/modal/optVerifyModal";
import ResetPassword from "@/modal/resetPassword";
import {
  useResendOtpMutation,
  useSignUpMutation,
  useVerifyOtpMutation,
  useSocialLoginMutation,
  useGuestLoginMutation,
  useLazyGetProfileQuery,
} from "@/service/auth";
import { useFormik } from "formik";
import * as Yup from "yup";
import { isValidInput } from "@/utils/validations";
import toast from "react-hot-toast";
import { ONBOARDING_TYPE } from "@/constants/constants";
import { useAppDispatch } from "@/lib/hook";
import { setToken, setUser, resetAuth } from "@/lib/slices/authSlice";
import { getFromStorage, setToStorage, removeFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import {
  clearAuthSessionForGuest,
  performGuestLogin,
} from "@/utils/guestLoginSession";
import { API_URL } from "@/constants/url";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, facebookProvider, appleProvider } from "@/lib/firebase";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <>{children}</>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

// Helper to allow use of separateDialCode prop without TypeScript errors
const PhoneInputAny: any = PhoneInput;

const Login = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [countDown, setCountDOwn] = useState<number>(60);
  const [otp, setOtp] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [otpType, setOtpType] = useState<number>(ONBOARDING_TYPE.EMAIL);
  const handleCloseModal = () => {
    setOpen(false);
  };

  const [singnUp] = useSignUpMutation();

  const [verifyOtp, { isLoading: emailOtpLoading }] = useVerifyOtpMutation();
  const [resendOtp] = useResendOtpMutation();
  const [socialLogin, { isLoading: isSocialLoggingIn }] = useSocialLoginMutation();
  const [guestLogin, { isLoading: isGuestLoggingIn }] = useGuestLoginMutation();
  const [getProfile] = useLazyGetProfileQuery();

  const hitThemeSettingApi = React.useCallback(async () => {
    try {
      await fetch(`${API_URL}theme-setting`, {
        method: "GET",
        cache: "no-store",
      });
    } catch {
      // Keep auth actions non-blocking if theme-setting fails.
    }
  }, []);

  const handleSkipAsGuest = React.useCallback(async () => {
    await hitThemeSettingApi();
    clearAuthSessionForGuest();
    dispatch(resetAuth());
    await performGuestLogin(guestLogin);
    router.push("/");
  }, [dispatch, guestLogin, hitThemeSettingApi, router]);

  const completeSocialSignUpSession = React.useCallback(
    (res: any) => {
      const token =
        (res?.data as any)?.auth_token ||
        (res?.data as any)?.token ||
        (res?.data as any)?.access_token ||
        (res as any)?.token;
      const nodeToken = (res?.data as any)?.jwt_token || "";

      if (token) {
        dispatch(setToken({ token }));
        setToStorage(STORAGE_KEYS.token, token);
        setToStorage(STORAGE_KEYS.tokenNode, nodeToken);
      }

      if (res?.data) {
        dispatch(setUser({ user: res.data }));
        try {
          setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("credentialsUpdated"));
          }
        } catch {
          // ignore JSON/stringify issues
        }
      }

      toast.success(res?.message || "Signed up successfully");

      const profileSetup = res?.data?.profile_setup;
      if (profileSetup === 1 || profileSetup === "1") {
        removeFromStorage(STORAGE_KEYS.referralCode);
      }

      const destination =
        profileSetup === 0 || profileSetup === "0"
          ? "/auth/profile-setup"
          : "/";

      router.replace(destination);

      void getProfile()
        .unwrap()
        .then((profileRes) => {
          if (profileRes?.statusCode === 200 && profileRes?.data) {
            dispatch(setUser({ user: profileRes.data }));
            setToStorage(STORAGE_KEYS.credentials, JSON.stringify(profileRes.data));
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("credentialsUpdated"));
            }
          }
        })
        .catch(() => {
          // sign-up response data is already stored
        });
    },
    [dispatch, getProfile, router],
  );

  const [value, setValue] = React.useState(1);
  const [userId, setUserId] = useState<number | null>(null);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const [open1, setOpen1] = useState(false);
  const handleCloseModal1 = () => {
    setOpen1(false);
  };
  const [phone, setPhone] = useState<string>("");
  const [phoneCode, setPhoneCode] = useState<string>("91");
  const [phoneCountry, setPhoneCountry] = useState<string>("IN");
  const [pendingPhone, setPendingPhone] = useState<string>("");
  const [pendingPhoneCode, setPendingPhoneCode] = useState<string>("");
  const [pendingPhoneCountry, setPendingPhoneCountry] = useState<string>("");
  const extractUserId = (res: any) =>
    (res?.data as any)?.user_id ||
    (res?.data as any)?.userId ||
    (res?.data as any)?.id ||
    (res?.data?.user as any)?.id ||
    null;

  React.useEffect(() => {
    const mode = (searchParams.get("mode") || "").toLowerCase();
    if (mode === "email") {
      const email = (searchParams.get("email") || "").trim();
      setValue(0);
      if (email) formik.setFieldValue("email", email.trimEnd(), false);
      return;
    }
    if (mode === "phone") {
      const phoneParam = (searchParams.get("phone") || "").replace(/\D/g, "");
      const phoneCodeParam = (searchParams.get("phone_code") || "91").replace(
        /\D/g,
        ""
      );
      const phoneCountryParam = (searchParams.get("phone_country") || "IN").toUpperCase();
      setValue(1);
      if (phoneParam) setPhone(phoneParam);
      if (phoneCodeParam) setPhoneCode(phoneCodeParam);
      if (phoneCountryParam) setPhoneCountry(phoneCountryParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .transform((value) =>
          typeof value === "string" ? value.trimEnd() : value
        )
        .required("Email is required")
        // eslint-disable-next-line sonarjs/no-duplicate-string
        .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"),
    }),
    onSubmit: async () => {
      const normalizedEmail = formik.values.email.trimEnd();
      const fcmToken = getFromStorage(STORAGE_KEYS.fcmToken) || "web";
      // Get referral code from localStorage if available
      const referralCode = getFromStorage(STORAGE_KEYS.referralCode);
      const body = {
        email: normalizedEmail,
        fcm_token: fcmToken,
        type: ONBOARDING_TYPE.EMAIL,
        ...(referralCode && { referral_code: referralCode }),
      };
      try {
        const res = await singnUp({ body }).unwrap();
        const userIdFromRes = extractUserId(res);
        const shouldOpenEmailOtp =
          Boolean(userIdFromRes) &&
          (
            res?.statusCode === 201 ||
            String(res?.message || "").toLowerCase().includes("otp")
          );
        if (shouldOpenEmailOtp) {
          setUserId(userIdFromRes);
          toast.success("OTP Sent to your email");
          setOtpType(ONBOARDING_TYPE.EMAIL);
          setOpen(true);
        } else {
          toast.error(res?.message || "Unable to send OTP");
        }
      } catch (error: any) {
        toast.error(error?.data?.message || "Something went wrong");
      }
    },
  });

  const handleOtpSubmit = async () => {
    const body = {
      user_id: userId,
      type: otpType,
      otp,
    };
    try {
      const res = await verifyOtp({ body }).unwrap();
      // All console.log statements removed from here
      const token =
        (res?.data as any)?.auth_token || // primary token from current API
        (res?.data as any)?.token ||
        (res?.data as any)?.access_token ||
        (res as any)?.token ||
        (res?.data as any)?.accessToken;

      // Extract Node API token (jwt_token) for Node backend authentication
      const nodeToken = (res?.data as any)?.jwt_token || "";

      if (res?.statusCode === 200) {
        if (token) {
          // Save token in Redux (persisted) and localStorage for future use
          dispatch(setToken({ token }));
          setToStorage(STORAGE_KEYS.token, token);
          // Also save nodeToken for Node API authentication
          setToStorage(STORAGE_KEYS.tokenNode, nodeToken);
        }

        // Store credentials including phone/email data for profile setup
        if (res?.data) {
          try {
            // Include phone data if user signed up with phone
            const credentialsData = { ...res.data };
            if (otpType === ONBOARDING_TYPE.PHONE && phone) {
              credentialsData.phone = phone;
              credentialsData.phone_code = phoneCode || "91";
              credentialsData.phone_country = phoneCountry || "IN";
            }
            setToStorage(STORAGE_KEYS.credentials, JSON.stringify(credentialsData));
          } catch {
            // ignore serialization errors
          }
        }

        setOpen(false);
        toast.success("OTP Verified");

        // Clear referral code once registration (OTP verification) succeeds
        // Sign-up APIs have already received referral_code at this point
        removeFromStorage(STORAGE_KEYS.referralCode);

        router.push("/auth/profile-setup");
      }
    } catch (error: any) {
      // All console.log statements removed from here
      setOtp("");
      toast.error(error?.data?.message || "Something went wrong");
    }
  };

  const onResendOtp = async () => {
    const body = {
      user_id: userId,
      type: otpType,
    };
    try {
      const res = await resendOtp({ body }).unwrap();
      if (res?.statusCode === 200) {
        toast.success(
          otpType === ONBOARDING_TYPE.EMAIL
            ? "OTP Resent to your email"
            : "OTP Resent to your phone"
        );
        setCountDOwn(60);
        setOtp("");
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Something went wrong");
    }
  };
  return (
    <>
      <div className="rt_inner login_inner">
        <div className="auth_head  ">
          <h2>Sign up for your Account</h2>
          <p>
            Already have an account?{" "}
            <a className="text_btn" onClick={() => router.push("/auth/login")}>
              {" "}
              Login
            </a>
          </p>
        </div>
        {/* <form className="form whiteBox p_0"> */}
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
          className="site_tabs1 v2"
        >
          <Tab label="Email" {...a11yProps(0)} />
          <Tab label="Phone" {...a11yProps(1)} />
        </Tabs>

        <CustomTabPanel index={0} value={value}>
          <form className="form  p_0" onSubmit={formik.handleSubmit}>
            <div className="tab_content whiteBox">
              <div className="gap_m">
                <div className="control_group w_100">
                  <TextField
                    fullWidth
                    hiddenLabel
                    placeholder="Enter your email"
                    name="email"
                    value={formik.values.email}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidInput(value)) {
                        formik.setFieldValue("email", value.trimEnd());
                      }
                    }}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="start">
                            <img src="/images/email_icon.svg" alt="icon" />
                          </InputAdornment>
                        ),
                      },
                    }}
                  ></TextField>
                </div>
              </div>
            </div>
            <div className="btn_flex mt_30">
              <Button
                className="w_100 br_15"
                // onClick={() => {
                //   router.push("/auth/profile-setup");
                // }}
                type="submit"
              >
                Sign Up
              </Button>
            </div>
          </form>
        </CustomTabPanel>
        <CustomTabPanel index={1} value={value}>
          <form className="form whiteBox p_0">
            <div className="tab_content">
              <div className="gap_m">
                <div className="control_group w_100">
                  <label>Phone</label>
                  <div style={{ display: "flex", gap: "0", width: "100%" }}>
                    {/* Country Dropdown Button - Flag + Dropdown Icon Only */}
                    <div
                      style={{
                        position: "relative",
                        minWidth: "70px",
                      }}
                    >
                      <PhoneInputAny
                        country={phoneCountry ? phoneCountry.toLowerCase() : "in"}
                        value={`+${phoneCode || "91"}`}
                        onChange={(
                          value: string,
                          data: { dialCode?: string; countryCode?: string }
                        ) => {
                          // Only update country code, don't touch phone number
                          const dial = data?.dialCode || "";
                          if (dial) {
                            setPhoneCode(dial.replace(/\+/g, "").replace(/\D/g, ""));
                          }
                          if (data?.countryCode) {
                            setPhoneCountry(data.countryCode.toUpperCase());
                          }
                        }}
                        disableCountryGuess
                        separateDialCode={false}
                        prefix=""
                        containerStyle={{ width: "100%" }}
                        inputStyle={{
                          display: "none",
                        }}
                        buttonStyle={{
                          borderTopLeftRadius: "12px",
                          borderBottomLeftRadius: "12px",
                          border: "1px solid #E4E7EC",
                          borderRight: "none",
                          backgroundColor: "#F9FAFB",
                          padding: "0 12px 0 0",
                          height: "56px",
                          width: "70px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        dropdownStyle={{
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <style dangerouslySetInnerHTML={{
                        __html: `
                          .react-tel-input .selected-flag {
                            width: 100% !important;
                            padding: 0 !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                          }
                          .react-tel-input .selected-flag .dial-code {
                            display: none !important;
                          }
                        `
                      }} />
                    </div>

                    {/* Country Code Display - Separate Section */}
                    <div
                      style={{
                        backgroundColor: "#F9FAFB",
                        border: "1px solid #E4E7EC",
                        borderLeft: "none",
                        borderRight: "none",
                        height: "56px",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 12px",
                        minWidth: "60px",
                        justifyContent: "center",
                        fontSize: "14px",
                        color: "#1d1d1d",
                        fontWeight: "400",
                      }}
                    >
                      +{phoneCode || "91"}
                    </div>

                    {/* Phone Number Input - Separate Section */}
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setPhone(value);
                      }}
                      placeholder="Enter phone number"
                      style={{
                        flex: 1,
                        height: "56px",
                        borderRadius: "0 12px 12px 0",
                        border: "1px solid #E4E7EC",
                        borderLeft: "none",
                        fontSize: "14px",
                        backgroundColor: "white",
                        paddingLeft: "16px",
                        paddingRight: "16px",
                        outline: "none",
                        fontFamily: "inherit",
                        minWidth: 0,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#E4E7EC";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#E4E7EC";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CustomTabPanel>
        {/* </form> */}

        <CustomTabPanel index={1} value={value}>
          {" "}
          <div className="btn_flex mt_30">
            <Button
              className="w_100 br_15"
              onClick={async () => {
                // Validate phone number before sign-up
                if (!phone || !phone.trim()) {
                  toast.error("Please enter a phone number");
                  return;
                }

                // Country-specific phone number length validation
                const phoneLengthRules: Record<string, { min: number; max: number }> = {
                  "IN": { min: 10, max: 10 }, // India: 10 digits
                  "US": { min: 10, max: 10 }, // USA: 10 digits
                  "CA": { min: 10, max: 10 }, // Canada: 10 digits
                  "GB": { min: 10, max: 11 }, // UK: 10-11 digits
                  "AU": { min: 9, max: 10 },  // Australia: 9-10 digits
                  "DE": { min: 10, max: 11 }, // Germany: 10-11 digits
                  "FR": { min: 9, max: 10 },  // France: 9-10 digits
                  "IT": { min: 9, max: 10 },  // Italy: 9-10 digits
                  "ES": { min: 9, max: 9 },   // Spain: 9 digits
                  "NL": { min: 9, max: 9 },   // Netherlands: 9 digits
                  "BE": { min: 9, max: 9 },   // Belgium: 9 digits
                  "CH": { min: 9, max: 9 },   // Switzerland: 9 digits
                  "AT": { min: 10, max: 13 }, // Austria: 10-13 digits
                  "SE": { min: 9, max: 9 },   // Sweden: 9 digits
                  "NO": { min: 8, max: 8 },   // Norway: 8 digits
                  "DK": { min: 8, max: 8 },   // Denmark: 8 digits
                  "FI": { min: 9, max: 10 },  // Finland: 9-10 digits
                  "PL": { min: 9, max: 9 },   // Poland: 9 digits
                  "BR": { min: 10, max: 11 }, // Brazil: 10-11 digits
                  "MX": { min: 10, max: 10 }, // Mexico: 10 digits
                  "JP": { min: 10, max: 11 }, // Japan: 10-11 digits
                  "CN": { min: 11, max: 11 }, // China: 11 digits
                  "KR": { min: 10, max: 11 }, // South Korea: 10-11 digits
                  "SG": { min: 8, max: 8 },   // Singapore: 8 digits
                  "AE": { min: 9, max: 9 },   // UAE: 9 digits
                  "SA": { min: 9, max: 9 },   // Saudi Arabia: 9 digits
                };

                // Extract local phone number (remove country code if present)
                let phoneNumber = phone.trim();

                // Remove any non-numeric characters
                phoneNumber = phoneNumber.replace(/\D/g, "");

                if (!phoneNumber || phoneNumber.length === 0) {
                  toast.error("Please enter a valid phone number");
                  return;
                }

                // Validate phone number length based on country
                const normalizedPhoneCountry = phoneCountry || "IN";
                const currentCountry = normalizedPhoneCountry.toUpperCase();
                const rules = phoneLengthRules[currentCountry] || { min: 4, max: 15 };

                if (phoneNumber.length < rules.min || phoneNumber.length > rules.max) {
                  if (rules.min === rules.max) {
                    toast.error(`Please enter a valid phone number (${rules.min} digits without country code for ${currentCountry})`);
                  } else {
                    toast.error(`Please enter a valid phone number (${rules.min}-${rules.max} digits without country code for ${currentCountry})`);
                  }
                  return;
                }

                // Check if phone number is all zeros or all same digits
                if (/^0+$/.test(phoneNumber) || /^(\d)\1+$/.test(phoneNumber)) {
                  toast.error("Please enter a valid phone number");
                  return;
                }

                const normalizedPhone = phoneNumber;
                const normalizedPhoneCode = phoneCode || "91";
                const normalizedPhoneCountryFinal = normalizedPhoneCountry;

                if (
                  userId &&
                  otpType === ONBOARDING_TYPE.PHONE &&
                  normalizedPhone &&
                  normalizedPhone === pendingPhone &&
                  normalizedPhoneCode === pendingPhoneCode &&
                  normalizedPhoneCountryFinal === pendingPhoneCountry
                ) {
                  setOtpType(ONBOARDING_TYPE.PHONE);
                  setOpen(true);
                  return;
                }

                const fcmToken =
                  getFromStorage(STORAGE_KEYS.fcmToken) || "web";
                // Get referral code from localStorage if available
                const referralCode = getFromStorage(STORAGE_KEYS.referralCode);
                const body = {
                  fcm_token: fcmToken,
                  phone: normalizedPhone,
                  phone_code: normalizedPhoneCode,
                  phone_country: normalizedPhoneCountryFinal,
                  type: ONBOARDING_TYPE.PHONE,
                  ...(referralCode && { referral_code: referralCode }),
                };
                try {
                  const res = await singnUp({ body }).unwrap();
                  const userIdFromRes = extractUserId(res);
                  const shouldOpenPhoneOtp =
                    Boolean(userIdFromRes) &&
                    (
                      res?.statusCode === 201 ||
                      String(res?.message || "").toLowerCase().includes("otp")
                    );
                  if (shouldOpenPhoneOtp) {
                    setUserId(userIdFromRes);
                    setPendingPhone(normalizedPhone);
                    setPendingPhoneCode(normalizedPhoneCode);
                    setPendingPhoneCountry(normalizedPhoneCountry);
                    toast.success("OTP Sent to your phone");
                    setOtpType(ONBOARDING_TYPE.PHONE);
                    setOpen(true);
                  } else {
                    toast.error(res?.message || "Unable to send OTP");
                  }
                } catch (error: any) {
                  const errorMessage =
                    error?.data?.message || "Something went wrong";
                  if (
                    userId &&
                    errorMessage.toLowerCase().includes("phone number") &&
                    errorMessage.toLowerCase().includes("already")
                  ) {
                    setOtpType(ONBOARDING_TYPE.PHONE);
                    setOpen(true);
                  } else {
                    toast.error(errorMessage);
                  }
                }
              }}
            >
              Sign Up
            </Button>
          </div>
        </CustomTabPanel>
        <div className="or_box text_center">
          <p className="or">Or Sign Up with</p>
          <div className="btn_flex social_login ">
            <Button
              disabled={isSocialLoggingIn}
              onClick={async () => {
                try {
                  // Sign in with Google using Firebase
                  const result = await signInWithPopup(auth, googleProvider);
                  const user = result.user;

                  // Get user information
                  const socialId = user.uid;
                  const email = user.email || "";
                  const name = user.displayName || email.split("@")[0] || "User";
                  const fcmToken = getFromStorage(STORAGE_KEYS.fcmToken) || "web";
                  // Get referral code from localStorage if available
                  const referralCode = getFromStorage(STORAGE_KEYS.referralCode);

                  // Call social login API
                  const res: any = await socialLogin({
                    body: {
                      socialId,
                      socialType: "google",
                      email,
                      name,
                      fcm_token: fcmToken,
                      ...(referralCode && { referral_code: referralCode }),
                    },
                  }).unwrap();

                  completeSocialSignUpSession(res);
                } catch (error: any) {
                  // Handle Firebase errors
                  if (error?.code === "auth/popup-closed-by-user") {
                    toast.error("Sign-in popup was closed");
                  } else if (error?.code === "auth/popup-blocked") {
                    toast.error("Popup was blocked. Please allow popups for this site.");
                  } else if (error?.code?.startsWith("auth/")) {
                    toast.error("Google sign-in failed. Please try again.");
                  } else {
                    // Handle API errors
                    toast.error(error?.data?.message || "Social sign-up failed");
                  }
                }
              }}
            >
              {" "}
              <img src="/images/google_icon.svg" alt="img" />
              {isSocialLoggingIn ? "Please wait..." : "Google"}
            </Button>
            <Button
              disabled={isSocialLoggingIn}
              onClick={async () => {
                try {
                  // Sign in with Facebook using Firebase
                  const result = await signInWithPopup(auth, facebookProvider);
                  const user = result.user;

                  // Get user information
                  const socialId = user.uid;
                  const email = user.email || "";
                  const name = user.displayName || email.split("@")[0] || "User";
                  const fcmToken = getFromStorage(STORAGE_KEYS.fcmToken) || "web";
                  // Get referral code from localStorage if available
                  const referralCode = getFromStorage(STORAGE_KEYS.referralCode);

                  // Call social login API
                  const res: any = await socialLogin({
                    body: {
                      socialId,
                      socialType: "facebook",
                      email,
                      name,
                      fcm_token: fcmToken,
                      ...(referralCode && { referral_code: referralCode }),
                    },
                  }).unwrap();

                  completeSocialSignUpSession(res);
                } catch (error: any) {
                  // Log error for debugging but remove all console.log
                  // Handle Firebase errors
                  if (error?.code === "auth/popup-closed-by-user") {
                    toast.error("Sign-in popup was closed");
                  } else if (error?.code === "auth/popup-blocked") {
                    toast.error("Popup was blocked. Please allow popups for this site.");
                  } else if (error?.code === "auth/account-exists-with-different-credential") {
                    toast.error("An account already exists with the same email address but different sign-in credentials.");
                  } else if (error?.code === "auth/operation-not-allowed") {
                    toast.error("Facebook login is not enabled. Please configure it in Firebase Console.");
                  } else if (error?.code === "auth/configuration-not-found") {
                    toast.error("Facebook configuration not found. Please set up Facebook App in Firebase Console.");
                  } else if (error?.code === "auth/unauthorized-domain") {
                    toast.error("This domain is not authorized for Facebook login. Please add it in Firebase Console.");
                  } else if (error?.code?.startsWith("auth/")) {
                    toast.error(`Facebook sign-in failed: ${error?.message || error?.code || "Please try again."}`);
                  } else {
                    // Handle API errors
                    toast.error(error?.data?.message || error?.message || "Social sign-up failed");
                  }
                }
              }}
            >
              {" "}
              <img src="/images/fb_icon.svg" alt="img" />
              {isSocialLoggingIn ? "Please wait..." : "Facebook"}
            </Button>
            <Button
              disabled={isSocialLoggingIn}
              onClick={async () => {
                try {
                  // Sign in with Apple using Firebase
                  const result = await signInWithPopup(auth, appleProvider);
                  const user = result.user;

                  // Get user information
                  const socialId = user.uid;
                  // Apple may not provide email in some cases, check both user.email and additionalUserInfo
                  const email = user.email || (result as any).additionalUserInfo?.profile?.email || "";
                  // Apple provides name in additionalUserInfo.profile or user.displayName
                  const name =
                    user.displayName ||
                    (result as any).additionalUserInfo?.profile?.name?.firstName ||
                    (result as any).additionalUserInfo?.profile?.name?.fullName ||
                    email.split("@")[0] ||
                    "User";
                  const fcmToken = getFromStorage(STORAGE_KEYS.fcmToken) || "web";
                  // Get referral code from localStorage if available
                  const referralCode = getFromStorage(STORAGE_KEYS.referralCode);

                  // Call social login API
                  const res: any = await socialLogin({
                    body: {
                      socialId,
                      socialType: "apple",
                      email,
                      name,
                      fcm_token: fcmToken,
                      ...(referralCode && { referral_code: referralCode }),
                    },
                  }).unwrap();

                  completeSocialSignUpSession(res);
                } catch (error: any) {
                  // Log error for debugging but remove all console.log
                  // Handle Firebase errors
                  if (error?.code === "auth/popup-closed-by-user") {
                    toast.error("Sign-in popup was closed");
                  } else if (error?.code === "auth/popup-blocked") {
                    toast.error("Popup was blocked. Please allow popups for this site.");
                  } else if (error?.code === "auth/account-exists-with-different-credential") {
                    toast.error("An account already exists with the same email address but different sign-in credentials.");
                  } else if (error?.code === "auth/operation-not-allowed") {
                    toast.error("Apple Sign-In is not enabled. Please enable it in Firebase Console: Authentication → Sign-in method → Apple → Enable", { duration: 6000 });
                    // No console log
                  } else if (error?.code === "auth/configuration-not-found") {
                    toast.error("Apple configuration not found. Please set up Apple Sign In in Firebase Console with your Service ID, Team ID, Key ID, and Private Key.", { duration: 6000 });
                  } else if (error?.code === "auth/unauthorized-domain") {
                    toast.error("This domain is not authorized for Apple login. Please add it in Firebase Console → Authentication → Settings → Authorized domains.", { duration: 6000 });
                  } else if (error?.code?.startsWith("auth/")) {
                    toast.error(`Apple sign-in failed: ${error?.message || error?.code || "Please try again."}`);
                  } else {
                    // Handle API errors
                    toast.error(error?.data?.message || error?.message || "Social sign-up failed");
                  }
                }
              }}
            >
              {" "}
              <img src="/images/apple_icon.svg" alt="img" />
              {isSocialLoggingIn ? "Please wait..." : "Apple"}
            </Button>
          </div>
          {/* <div className="btn_flex mt_20">
            <Button
              className="w_100 br_15"
              variant="outlined"
              disabled={isGuestLoggingIn}
              onClick={() => {
                void handleSkipAsGuest();
              }}
              sx={{
                borderColor: "#E4E7EC",
                color: "#1d1d1d",
                textTransform: "none",
                fontWeight: 500,
                padding: "12px 24px",
                "&:hover": {
                  borderColor: "#E4E7EC",
                  backgroundColor: "#F9FAFB",
                },
              }}
            >
              {isGuestLoggingIn ? "Please wait..." : "Skip"}
            </Button>
          </div> */}
          <p>
            By signing up, you agree to the <a> Terms of Service</a> and{" "}
            <a> Data Processing Agreement</a>
          </p>
        </div>
      </div>
      <ResetPassword
        open={open1}
        onClose={handleCloseModal1}
        setOpen={setOpen1}
      />
      <OtpVerifyModal
        open={open}
        onClose={handleCloseModal}
        setOpen={setOpen}
        title={
          otpType === ONBOARDING_TYPE.EMAIL
            ? "Verify Email Address"
            : "Verify Phone Number"
        }
        description={
          otpType === ONBOARDING_TYPE.EMAIL
            ? "A verification OTP has been sent to your email address. Please check your inbox."
            : "A verification OTP has been sent to your phone. Please check your messages."
        }
        countDown={countDown}
        setCountDown={setCountDOwn}
        otp={otp}
        setOtp={setOtp}
        loading={emailOtpLoading}
        onSubmit={handleOtpSubmit}
        onResend={onResendOtp}
      />
    </>
  );
};

export default Login;
