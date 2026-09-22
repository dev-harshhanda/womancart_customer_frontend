/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Backdrop,
  TextField,
  InputAdornment,
  Button,
  Tab,
  Tabs,
  CircularProgress,
} from "@mui/material";
import OtpVerifyModal from "@/modal/optVerifyModal";
import { useFormik } from "formik";
import * as Yup from "yup";
import { isValidInput } from "@/utils/validations";
import {
  useSignUpMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useSocialLoginMutation,
  useGuestLoginMutation,
  useLazyGetProfileQuery
} from "@/service/auth";
import toast from "react-hot-toast";
import { ONBOARDING_TYPE } from "@/constants/constants";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { setToken, setUser, resetAuth } from "@/lib/slices/authSlice";
import { getFromStorage, setToStorage, removeFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { getSafeInternalReturnPath } from "@/utils/safeReturnPath";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, facebookProvider, appleProvider } from "@/lib/firebase";
import { API_URL } from "@/constants/url";
import {
  clearAuthSessionForGuest,
  performGuestLogin,
} from "@/utils/guestLoginSession";

const LOGIN_WELCOME_TOAST = "Welcome back! You're signed in.";

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
  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const [open2, setOpen2] = useState(false);
  const handleCloseModal2 = () => {
    setOpen2(false);
  };

  const [register, { isLoading }] = useSignUpMutation();
  const [verifyOtp, { isLoading: isOtpVerifying }] = useVerifyOtpMutation();
  const [resendOtp] = useResendOtpMutation();
  const [socialLogin, { isLoading: isSocialLoggingIn }] = useSocialLoginMutation();
  const [guestLogin, { isLoading: isGuestLoggingIn }] = useGuestLoginMutation();
  const [getProfile] = useLazyGetProfileQuery();
  const authToken = useAppSelector((state) => state.auth.token);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [phone, setPhone] = useState<string>("");
  const [phoneCode, setPhoneCode] = useState<string>("91");
  const [phoneCountry, setPhoneCountry] = useState<string>("IN");

  // OTP related state for phone login
  const [otp, setOtp] = useState<string>("");
  const [countDown, setCountDown] = useState<number>(60);
  const [phoneLoginUserId, setPhoneLoginUserId] = useState<number | null>(null);

  // OTP related state for email verification after login
  const [open3, setOpen3] = useState(false);
  const [emailOtp, setEmailOtp] = useState<string>("");
  const [emailCountDown, setEmailCountDown] = useState<number>(60);
  const [emailLoginUserId, setEmailLoginUserId] = useState<number | null>(null);
  const [emailOtpType, setEmailOtpType] = useState<number>(ONBOARDING_TYPE.EMAIL);

  const isBlockingAction =
    isLoading || isOtpVerifying || isSocialLoggingIn || isRedirecting || isGuestLoggingIn;
  const extractUserId = (res: any) =>
    (res?.data as any)?.user_id ||
    (res?.data as any)?.userId ||
    (res?.data as any)?.id ||
    (res?.data?.user as any)?.id ||
    null;

  const redirectFromQuery = getSafeInternalReturnPath(searchParams.get("redirect"));

  const getPendingReturnUrl = () => {
    if (redirectFromQuery) return redirectFromQuery;
    const pendingStr = getFromStorage(STORAGE_KEYS.pendingAddToCart);
    if (!pendingStr) return null;
    try {
      const pending = JSON.parse(pendingStr);
      return pending?.returnUrl || null;
    } catch {
      return null;
    }
  };
  const pendingReturnUrl = getPendingReturnUrl();

  const completeSocialLoginSession = React.useCallback(
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

      toast.success(LOGIN_WELCOME_TOAST);
      setIsRedirecting(true);
      router.replace(pendingReturnUrl || "/");

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
          // social login response data is already stored
        });
    },
    [dispatch, getProfile, pendingReturnUrl, router],
  );

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

  // const handleSkipAsGuest = React.useCallback(async () => {
  //   await hitThemeSettingApi();
  //   clearAuthSessionForGuest();
  //   dispatch(resetAuth());
  //   await performGuestLogin(guestLogin);
  //   router.push("/");
  // }, [dispatch, guestLogin, hitThemeSettingApi, router]);

  const showNotRegisteredToast = React.useCallback(
    (message: string, targetUrl: string) => {
      toast.custom(
        (t) => (
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
              width: 340,
              maxWidth: "92vw",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Account not found
            </div>
            <div style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>
              Please sign up before proceeding.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id);
                  if (targetUrl) router.push(targetUrl);
                }}
                style={{
                  border: "none",
                  background: "var(--commerce-primary)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                OK
              </button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    },
    [router]
  );

  // If user is already logged in, prevent showing login page and go to home instead
  useEffect(() => {
    const existingToken = authToken || getFromStorage(STORAGE_KEYS.token);
    if (existingToken) {
      router.replace(pendingReturnUrl || "/");
    }
  }, [authToken, pendingReturnUrl, router]);

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
    onSubmit: async (values) => {
      const fcmToken = getFromStorage(STORAGE_KEYS.fcmToken) || "web";
      const normalizedEmail =
        typeof values.email === "string" ? values.email.trimEnd() : values.email;
      const body = {
        email: normalizedEmail,
        fcm_token: fcmToken,
        type: ONBOARDING_TYPE.EMAIL,
      };
      try {
        const res: any = await register({ body }).unwrap();
        const userId = extractUserId(res);
        if (userId) {
          setEmailLoginUserId(userId);
          setEmailOtpType(ONBOARDING_TYPE.EMAIL);
          setOpen3(true);
          setEmailCountDown(60);
          setEmailOtp("");
          try {
            // Resend OTP to email
            const resendBody = {
              user_id: userId,
              type: ONBOARDING_TYPE.EMAIL,
            };
            await resendOtp({ body: resendBody }).unwrap();
          } catch {
            // keep modal open even if resend fails
          }
          toast.success(res?.message || "OTP sent to your email address");
          return;
        }
        toast.error(res?.message || "Unable to send OTP. Please try again.");
      } catch (error: any) {
        const statusCode =
          error?.data?.statusCode ?? error?.status ?? error?.originalStatus;
        if (statusCode === 404) {
          showNotRegisteredToast(
            error?.data?.message || "Account not found. Please sign up.",
            `/auth/sign-up?mode=email&email=${encodeURIComponent(normalizedEmail)}`
          );
          return;
        }
        toast.error(error?.data?.message || "Login failed");
      }
    },
  });

  return (
    <>
      <section className="auth_sc ">
        <div className="auth_rt">
          <Backdrop
            open={isBlockingAction}
            sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.modal + 1 }}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
          <div className="rt_inner login_inner">
            <div className="auth_head  ">
              <h2>Let&apos;s Continue Your Journey</h2>
            </div>
            <form className="form whiteBox p_0" onSubmit={formik.handleSubmit}>
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label="basic tabs example"
                className="site_tabs1 v2"
              >
                <Tab label="Phone" {...a11yProps(0)} />
                <Tab label="Email" {...a11yProps(1)} />
              </Tabs>

              <CustomTabPanel index={0} value={value}>
                <div className="tab_content">
                  <div className="gap_m">
                    <div className="control_group w_100">
                      <label>Phone</label>
                      {/* <PhoneInputAny
                    country={"in"}
                    value={phone}
                    onChange={(
                      value: string,
                      data: { dialCode?: string; countryCode?: string }
                    ) => {
                      const dial = data?.dialCode || "";
                      const localNumber = dial
                        ? value.replace(new RegExp(`^\\+?${dial}`), "").trim()
                        : value;
                      setPhone(localNumber);

                      if (dial) {
                        setPhoneCode(dial);
                      }
                      if (data?.countryCode) {
                        setPhoneCountry(data.countryCode.toUpperCase());
                      }
                    }}
                    // show flag + country code in a separate left segment
                    separateDialCode
                    prefix=""
                    containerStyle={{ width: "100%" }}
                    inputStyle={{
                      width: "100%",
                      height: "56px",
                      borderRadius: "12px",
                      border: "1px solid #E4E7EC",
                      paddingLeft: "70px !important",
                      borderLeft: "none",
                      fontSize: "14px",
                    }}
                    buttonStyle={{
                      borderTopLeftRadius: "12px",
                      borderBottomLeftRadius: "12px",
                      border: "1px solid #E4E7EC",
                      backgroundColor: "transparent",
                      borderRight: "none"
                    }}
                  /> */}

                      <div style={{ display: "flex", gap: "0", width: "100%" }}>
                        {/* Country Dropdown Button - Flag + Dropdown Icon Only */}
                        <div
                          style={{
                            position: "relative",
                            minWidth: "50px",
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
                              borderTop: "1px solid #E4E7EC",
                              borderLeft: "1px solid #E4E7EC",
                              borderBottom: "1px solid #E4E7EC",
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
                            borderTop: "1px solid #E4E7EC",
                            borderBottom: "1px solid #E4E7EC",
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
                            borderTop: "1px solid #E4E7EC",
                            borderRight: "1px solid #E4E7EC",
                            borderBottom: "1px solid #E4E7EC",
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
              </CustomTabPanel>
              <CustomTabPanel index={1} value={value}>
                <div className="tab_content">
                  <div className="gap_m">
                    <div className="control_group w_100">
                      <label>Email</label>
                      <div style={{ display: "flex", gap: "0", width: "100%" }}>
                        <div
                          style={{
                            backgroundColor: "#F9FAFB",
                            borderTop: "1px solid #E4E7EC",
                            borderBottom: "1px solid #E4E7EC",
                            borderLeft: "1px solid #E4E7EC",
                            borderRight: "none",
                            height: "56px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 16px",
                            minWidth: "56px",
                            borderTopLeftRadius: "12px",
                            borderBottomLeftRadius: "12px",
                          }}
                        >
                          <img src="/images/email_icon.svg" alt="email icon" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          value={formik.values.email}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (isValidInput(value)) {
                              formik.setFieldValue("email", value.trimEnd());
                            }
                          }}
                          onBlur={formik.handleBlur}
                          placeholder="Enter your email"
                          style={{
                            flex: 1,
                            height: "56px",
                            borderRadius: "0 12px 12px 0",
                            borderTop: "1px solid #E4E7EC",
                            borderRight: "1px solid #E4E7EC",
                            borderBottom: "1px solid #E4E7EC",
                            borderLeft: "none",
                            fontSize: "14px",
                            backgroundColor: "white",
                            paddingLeft: "16px",
                            paddingRight: "16px",
                            outline: "none",
                            fontFamily: "inherit",
                            minWidth: 0,
                          }}
                        />
                      </div>
                      {formik.touched.email && formik.errors.email ? (
                        <p
                          style={{
                            color: "#d32f2f",
                            fontSize: "12px",
                            marginTop: "6px",
                            marginBottom: 0,
                          }}
                        >
                          {String(formik.errors.email)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CustomTabPanel>
            </form>

            <CustomTabPanel index={1} value={value}>
              <div className="btn_flex" style={{ marginTop: "30px" }}>
                <Button
                  type="button"
                  className="w_100 br_15"
                  disabled={isLoading}
                  onClick={() => formik.handleSubmit()}
                >
                  {isLoading ? "Please wait..." : "Continue"}
                </Button>
              </div>
            </CustomTabPanel>
            <CustomTabPanel index={0} value={value}>
              {" "}
              <div className="btn_flex" style={{ marginTop: "30px" }}>
                <Button
                  className="w_100 br_15"
                  disabled={isLoading}
                  onClick={async () => {
                    await hitThemeSettingApi();

                    // Validate phone number before sending login request
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
                    const currentCountry = (phoneCountry || "IN").toUpperCase();
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

                    const fcmToken = getFromStorage(STORAGE_KEYS.fcmToken) || "web";
                    const body = {
                      fcm_token: fcmToken,
                      phone: phoneNumber,
                      phone_code: phoneCode,
                      phone_country: phoneCountry || "IN",
                    };
                    try {
                      const res: any = await register({
                        body: { ...body, type: ONBOARDING_TYPE.PHONE },
                      }).unwrap();

                      const userId = extractUserId(res);
                      if (userId) {
                        setPhoneLoginUserId(userId);
                        toast.success("OTP sent to your phone");
                        setOpen2(true); // Open OTP modal
                        setCountDown(60); // Reset countdown
                        setOtp(""); // Clear OTP input
                        return;
                      }
                      toast.error(res?.message || "Unable to send OTP. Please try again.");
                    } catch (error: any) {
                      const statusCode =
                        error?.data?.statusCode ?? error?.status ?? error?.originalStatus;
                      if (statusCode === 404) {
                        showNotRegisteredToast(
                          error?.data?.message || "Account not found. Please sign up.",
                          `/auth/sign-up?mode=phone&phone=${encodeURIComponent(
                            phoneNumber
                          )}&phone_code=${encodeURIComponent(
                            phoneCode || "91"
                          )}&phone_country=${encodeURIComponent(phoneCountry || "IN")}`
                        );
                        return;
                      }
                      toast.error(error?.data?.message || "Phone login failed");
                    }
                  }}
                >
                  {isLoading ? "Please wait..." : "Continue"}
                </Button>
              </div>
            </CustomTabPanel>
            <div className="or_box text_center">
              <p className="or">Or Continue with</p>
              <div className="btn_flex social_login ">
                <Button
                  disabled={isSocialLoggingIn}
                  sx={{ flex: 1 }}
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

                      // Call social login API
                      const res: any = await socialLogin({
                        body: {
                          socialId,
                          socialType: "google",
                          email,
                          name,
                          fcm_token: fcmToken,
                        },
                      }).unwrap();

                      completeSocialLoginSession(res);
                    } catch (error: any) {
                      setIsRedirecting(false);
                      // Handle Firebase errors
                      if (error?.code === "auth/popup-closed-by-user") {
                        toast.error("Sign-in popup was closed");
                      } else if (error?.code === "auth/popup-blocked") {
                        toast.error("Popup was blocked. Please allow popups for this site.");
                      } else if (error?.code?.startsWith("auth/")) {
                        toast.error("Google sign-in failed. Please try again.");
                      } else {
                        // Handle API errors
                        toast.error(error?.data?.message || "Social login failed");
                      }
                    }
                  }}
                >
                  {" "}
                  <img src="/images/google_icon.svg" alt="img" />
                  {isSocialLoggingIn ? "Please wait..." : "Google"}
                </Button>
                {/* Facebook button commented out - keeping only Google and Apple */}
                {/* <Button
              disabled={isSocialLoggingIn}
              sx={{ flex: 1 }}
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

                  // Call social login API
                  const res: any = await socialLogin({
                    body: {
                      socialId,
                      socialType: "facebook",
                      email,
                      name,
                      deviceToken: fcmToken,
                    },
                  }).unwrap();

                  // Extract token from response
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

                  // Persist full user data
                  if (res?.data) {
                    try {
                      setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
                      // Dispatch custom event to notify Header component
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event("credentialsUpdated"));
                      }
                    } catch {
                      // ignore JSON/stringify issues
                    }
                  }

                  toast.success(LOGIN_WELCOME_TOAST);

                  // Fetch complete profile data to update header (address, wishlist, cart, etc.)
                  try {
                    const profileRes = await getProfile().unwrap();
                    if (profileRes?.statusCode === 200 && profileRes?.data) {
                      dispatch(setUser({ user: profileRes.data }));
                      setToStorage(STORAGE_KEYS.credentials, JSON.stringify(profileRes.data));
                      // Dispatch custom event to notify Header component
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event("credentialsUpdated"));
                      }
                    }
                  } catch (profileError) {
                    // If profile fetch fails, still use the data from social login response
                    console.warn("Failed to fetch profile after social login:", profileError);
                    if (res?.data) {
                      dispatch(setUser({ user: res.data }));
                    }
                  }

                  // Navigate based on profile_setup status
                  const profileSetup = res?.data?.profile_setup;
                  if (profileSetup === 0 || profileSetup === "0") {
                    router.push("/");
                  } else {
                    router.push("/");
                  }
                } catch (error: any) {
                  // Log error for debugging
                  console.error("Facebook login error:", error);
                  console.error("Error code:", error?.code);
                  console.error("Error message:", error?.message);
                  
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
                    toast.error(error?.data?.message || error?.message || "Social login failed");
                  }
                }
              }}
            >
              {" "}
              <img src="/images/fb_icon.svg" alt="img" />
              {isSocialLoggingIn ? "Please wait..." : "Facebook"}
            </Button> */}
                <Button
                  disabled={isSocialLoggingIn}
                  sx={{ flex: 1 }}
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

                      // Call social login API
                      const res: any = await socialLogin({
                        body: {
                          socialId,
                          socialType: "apple",
                          email,
                          name,
                          fcm_token: fcmToken,
                        },
                      }).unwrap();

                      completeSocialLoginSession(res);
                    } catch (error: any) {
                      setIsRedirecting(false);
                      // Log error for debugging
                      console.error("Apple login error:", error);
                      console.error("Error code:", error?.code);
                      console.error("Error message:", error?.message);

                      // Handle Firebase errors
                      if (error?.code === "auth/popup-closed-by-user") {
                        toast.error("Sign-in popup was closed");
                      } else if (error?.code === "auth/popup-blocked") {
                        toast.error("Popup was blocked. Please allow popups for this site.");
                      } else if (error?.code === "auth/account-exists-with-different-credential") {
                        toast.error("An account already exists with the same email address but different sign-in credentials.");
                      } else if (error?.code === "auth/operation-not-allowed") {
                        toast.error("Apple Sign-In is not enabled. Please enable it in Firebase Console: Authentication → Sign-in method → Apple → Enable", { duration: 6000 });
                        console.error("To fix: Go to Firebase Console → Authentication → Sign-in method → Apple → Enable and configure with your Apple Developer credentials");
                      } else if (error?.code === "auth/configuration-not-found") {
                        toast.error("Apple configuration not found. Please set up Apple Sign In in Firebase Console with your Service ID, Team ID, Key ID, and Private Key.", { duration: 6000 });
                      } else if (error?.code === "auth/unauthorized-domain") {
                        toast.error("This domain is not authorized for Apple login. Please add it in Firebase Console → Authentication → Settings → Authorized domains.", { duration: 6000 });
                      } else if (error?.code?.startsWith("auth/")) {
                        toast.error(`Apple sign-in failed: ${error?.message || error?.code || "Please try again."}`);
                      } else {
                        // Handle API errors
                        toast.error(error?.data?.message || error?.message || "Social login failed");
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

          <OtpVerifyModal
            open={open2}
            onClose={handleCloseModal2}
            setOpen={setOpen2}
            title="Verify Phone Number"
            description="A verification OTP has been sent to your phone. Please check your messages."
            countDown={countDown}
            setCountDown={setCountDown}
            otp={otp}
            setOtp={setOtp}
            loading={isOtpVerifying}
            onSubmit={async () => {
              // Handle OTP verification for phone login
              const body = {
                user_id: phoneLoginUserId,
                type: ONBOARDING_TYPE.PHONE,
                otp,
              };
              try {
                const res = await verifyOtp({ body }).unwrap();

                // Extract token from OTP verification response
                const token =
                  (res?.data as any)?.auth_token ||
                  (res?.data as any)?.token ||
                  (res?.data as any)?.access_token ||
                  (res as any)?.token ||
                  (res?.data as any)?.accessToken;

                // Extract Node API token (jwt_token) - same as email login
                const nodeToken = (res?.data as any)?.jwt_token || "";

                if (res?.statusCode === 200) {
                  if (token) {
                    // Save token in Redux (persisted) and localStorage
                    dispatch(setToken({ token }));
                    setToStorage(STORAGE_KEYS.token, token);
                    // Also save nodeToken for Node API authentication
                    setToStorage(STORAGE_KEYS.tokenNode, nodeToken);
                  }

                  // Remember me is not supported for phone login - always clear any phone credentials
                  const rememberedData = getFromStorage(STORAGE_KEYS.rememberedCredentials);
                  if (rememberedData) {
                    try {
                      const parsed = JSON.parse(rememberedData);
                      // Only keep email credentials, remove phone credentials
                      if (parsed.phone) {
                        if (parsed.email) {
                          // Keep only email credentials
                          setToStorage(STORAGE_KEYS.rememberedCredentials, JSON.stringify({
                            email: parsed.email,
                            password: parsed.password || "",
                          }));
                        } else {
                          // No email credentials, remove all
                          removeFromStorage(STORAGE_KEYS.rememberedCredentials);
                        }
                      }
                    } catch (error) {
                      // Ignore parsing errors
                    }
                  }

                  // Store credentials including phone data
                  if (res?.data) {
                    try {
                      const credentialsData = { ...res.data };
                      if (phone) {
                        credentialsData.phone = phone;
                        credentialsData.phone_code = phoneCode;
                        credentialsData.phone_country = phoneCountry;
                      }
                      setToStorage(
                        STORAGE_KEYS.credentials,
                        JSON.stringify(credentialsData)
                      );

                      // Dispatch custom event to notify Header component
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event('credentialsUpdated'));
                      }
                    } catch (error) {
                      // ignore JSON/stringify issues
                    }
                  }

                  setOpen2(false);
                  toast.success(LOGIN_WELCOME_TOAST);

                  // Delay to ensure Redux state is persisted
                  await new Promise(resolve => setTimeout(resolve, 300));

                  // Force router refresh
                  router.refresh();

                  // Navigate based on profile_setup status
                  const profileSetup = res?.data?.profile_setup;
                  if (profileSetup === 0 || profileSetup === "0") {
                    router.replace("/auth/profile-setup");
                  } else {
                    router.replace(pendingReturnUrl || "/");
                  }
                }
              } catch (error: any) {
                toast.error(error?.data?.message || "OTP verification failed");
              }
            }}
            onResend={async () => {
              // Resend OTP for phone login
              const body = {
                user_id: phoneLoginUserId,
                type: ONBOARDING_TYPE.PHONE,
              };
              try {
                const res = await resendOtp({ body }).unwrap();
                if (res?.statusCode === 200) {
                  toast.success("OTP resent to your phone");
                  setCountDown(60);
                  setOtp("");
                }
              } catch (error: any) {
                toast.error(error?.data?.message || "Failed to resend OTP");
              }
            }}
          />
          <OtpVerifyModal
            open={open3}
            onClose={() => {
              setOpen3(false);
              setEmailOtp("");
              setEmailCountDown(60);
            }}
            setOpen={setOpen3}
            title={
              emailOtpType === ONBOARDING_TYPE.EMAIL
                ? "Verify Email Address"
                : "Verify Phone Number"
            }
            description={
              emailOtpType === ONBOARDING_TYPE.EMAIL
                ? "A verification OTP has been sent to your email address. Please check your inbox."
                : "A verification OTP has been sent to your phone. Please check your messages."
            }
            countDown={emailCountDown}
            setCountDown={setEmailCountDown}
            otp={emailOtp}
            setOtp={setEmailOtp}
            loading={isOtpVerifying}
            onSubmit={async () => {
              // Handle OTP verification for email after login
              if (!emailOtp || emailOtp.length !== 4) {
                toast.error("Please enter a valid 4-digit OTP");
                return;
              }

              if (!emailLoginUserId) {
                toast.error("User ID not found. Please login again.");
                return;
              }

              const body = {
                user_id: emailLoginUserId,
                type: emailOtpType,
                otp: emailOtp,
              };

              try {
                const res = await verifyOtp({ body }).unwrap();

                // Extract token from OTP verification response
                const token =
                  (res?.data as any)?.auth_token ||
                  (res?.data as any)?.token ||
                  (res?.data as any)?.access_token ||
                  (res as any)?.token ||
                  (res?.data as any)?.accessToken;

                // Extract Node API token (jwt_token)
                const nodeToken = (res?.data as any)?.jwt_token || "";

                if (res?.statusCode === 200) {
                  if (token) {
                    // Save token in Redux (persisted) and localStorage
                    dispatch(setToken({ token }));
                    setToStorage(STORAGE_KEYS.token, token);
                    // Also save nodeToken for Node API authentication
                    setToStorage(STORAGE_KEYS.tokenNode, nodeToken);
                  }

                  // Store credentials with updated verification status
                  if (res?.data) {
                    try {
                      setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
                      // Dispatch custom event to notify Header component
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event('credentialsUpdated'));
                      }
                    } catch {
                      // ignore JSON/stringify issues
                    }
                  }

                  setOpen3(false);
                  setEmailOtp("");
                  toast.success(LOGIN_WELCOME_TOAST);

                  // Delay to ensure Redux state is persisted
                  await new Promise(resolve => setTimeout(resolve, 300));

                  // Force router refresh
                  router.refresh();

                  // Navigate based on profile_setup status
                  const profileSetup = res?.data?.profile_setup;
                  if (profileSetup === 0 || profileSetup === "0") {
                    router.replace("/auth/profile-setup");
                  } else {
                    router.replace(pendingReturnUrl || "/");
                  }
                }
              } catch (error: any) {
                setEmailOtp("");
                toast.error(error?.data?.message || "OTP verification failed");
              }
            }}
            onResend={async () => {
              if (!emailLoginUserId) {
                toast.error("User ID not found. Please login again.");
                return;
              }

              const body = {
                user_id: emailLoginUserId,
                type: emailOtpType,
              };

              try {
                const res = await resendOtp({ body }).unwrap();
                if (res?.statusCode === 200) {
                  toast.success(
                    emailOtpType === ONBOARDING_TYPE.EMAIL
                      ? "OTP Resent to your email"
                      : "OTP Resent to your phone"
                  );
                  setEmailCountDown(60);
                  setEmailOtp("");
                } else {
                  toast.error(res?.message || "Failed to resend OTP");
                }
              } catch (error: any) {
                toast.error(error?.data?.message || "Failed to resend OTP");
              }
            }}
          />
        </div>
      </section>
    </>
  );
};

export default Login;
