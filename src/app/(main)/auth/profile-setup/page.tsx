/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState } from "react";
import {
  Button,
  InputAdornment,
  IconButton,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { VisibilityOff, Visibility } from "@mui/icons-material";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { isValidInput } from "@/utils/validations";

import { useImageUploadMutation, useUpdateProfileMutation, useVerifyChangePhoneNumberMutation, useChangePhoneNumberMutation, useChangeEmailMutation } from "@/service/auth";
import { toast } from "react-hot-toast";
import { useAppDispatch } from "@/lib/hook";
import { setToken } from "@/lib/slices/authSlice";
import { setToStorage, getFromStorage, removeFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import OtpVerifyModal from "@/modal/optVerifyModal";

const ProfileSetup = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const formatDobErrorMessage = (message: string, fallback: string) => {
    if (!message) return fallback;
    if (message.toLowerCase().includes("dob field must be a date before")) {
      return "Age must be at least 18 years";
    }
    return message;
  };
  const searchParams = useSearchParams();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [imageUpload] = useImageUploadMutation();
  const [verifyChangePhoneNumber, { isLoading: isVerifyingPhone }] = useVerifyChangePhoneNumberMutation();
  const [changePhoneNumber] = useChangePhoneNumberMutation();
  const [changeEmail] = useChangeEmailMutation();
  const [profileImage, setProfileImage] = useState<string>("/images/user_dp.png");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(""); // Store the uploaded image URL
  const [phoneCode, setPhoneCode] = useState<string>("91"); // Default to India code
  const [phoneCountry, setPhoneCountry] = useState<string>("IN"); // Default to India
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [countDown, setCountDown] = useState<number>(60);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerifiedFromAPI, setIsPhoneVerifiedFromAPI] = useState(false);
  const [verificationType, setVerificationType] = useState<number>(1); // 1 = phone, 2 = email
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const PhoneInputAny: any = PhoneInput;
  const isPhoneVerifiedNow = isPhoneVerified || isPhoneVerifiedFromAPI;

  // Get stored credentials to prefill email or phone
  const getStoredCredentials = () => {
    try {
      const credentialsStr = getFromStorage(STORAGE_KEYS.credentials);
      if (credentialsStr) {
        const credentials = JSON.parse(credentialsStr);
        return credentials;
      }
    } catch (error) {
      console.error("Error parsing credentials:", error);
    }
    return null;
  };

  // Initialize form values from stored credentials
  const initialFormValues = React.useMemo(() => {
    const credentials = getStoredCredentials();
    const initialValues: any = {
      fullName: "",
      email: "",
      phone: "",
      gender: "",
      dob: null as Dayjs | null,
      password: "",
      confirmPassword: "",
    };

    if (credentials) {
      // Check if user signed up with phone based on verification status
      // If isPhoneVerify is true or phone exists, user signed up with phone
      const signedUpWithPhone = credentials.isPhoneVerify === true ||
        (credentials.phone && credentials.phone !== null && credentials.phone !== "");

      // Check if user signed up with email
      const signedUpWithEmail = credentials.isEmailVerify === true ||
        (credentials.email && credentials.email !== null && credentials.email !== "");

      // Priority: If user signed up with phone, prefill phone (don't prefill email)
      if (signedUpWithPhone && credentials.phone && credentials.phone !== null && credentials.phone !== "") {
        initialValues.phone = credentials.phone;
      }
      // Only prefill email if user signed up with email AND didn't sign up with phone
      else if (signedUpWithEmail && !signedUpWithPhone && credentials.email && credentials.email !== null && credentials.email !== "") {
        initialValues.email = String(credentials.email).trimEnd();
      }
    }

    return initialValues;
  }, []);
  const isFromPhoneAuthFlow = Boolean(initialFormValues.phone);
  const shouldShowPasswordFields = isFromPhoneAuthFlow;

  // Set phone code, country, and verification status from stored credentials
  React.useEffect(() => {
    const credentials = getStoredCredentials();
    if (credentials) {
      // Set email verification status
      if (credentials.isEmailVerify === true) {
        setIsEmailVerified(true);
      }

      // Set phone verification status
      if (credentials.isPhoneVerify === true) {
        setIsPhoneVerifiedFromAPI(true);
        setIsPhoneVerified(true);
      }

      // Set phone code and country (even if phone is null, code/country might exist)
      if (credentials.phone_code && credentials.phone_code !== "") {
        setPhoneCode(credentials.phone_code);
      }
      if (credentials.phone_country && credentials.phone_country !== "") {
        setPhoneCountry(credentials.phone_country);
      }
    }
  }, []);


  const formik = useFormik({
    initialValues: initialFormValues,
    validationSchema: Yup.object({
      fullName: Yup.string()
        .trim()
        .min(3, "Full name must be at least 3 characters")
        .required("Full name is required"),
      email: Yup.string()
        .transform((value) =>
          typeof value === "string" ? value.trimEnd() : value
        )
        .required("Email is required")
        // eslint-disable-next-line sonarjs/no-duplicate-string
        .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"), 
      phone: Yup.string().required("Phone number is required"),
      gender: Yup.string().required("Gender is required"),
      dob: Yup.mixed().required("Date of birth is required"),
      password: Yup.string().test(
        "password-required-for-phone-signup",
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
        function (value) {
          if (!shouldShowPasswordFields) return true;
          if (!value) {
            return this.createError({ message: "Password is required" });
          }
          if (value.length > 50) {
            return this.createError({ message: "Password must be less than 50 characters" });
          }
          const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
          if (!passwordRegex.test(value)) {
            return this.createError({
              message:
                "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
            });
          }
          return true;
        }
      ),
      confirmPassword: Yup.string().test(
        "confirm-password-required-for-phone-signup",
        "Passwords must match",
        function (value) {
          if (!shouldShowPasswordFields) return true;
          if (!value) {
            return this.createError({ message: "Confirm password is required" });
          }
          if (value.length > 50) {
            return this.createError({ message: "Password must be less than 50 characters" });
          }
          if (value !== this.parent.password) {
            return this.createError({ message: "Passwords must match" });
          }
          return true;
        }
      ),
    }),
    onSubmit: async (values) => {
      try {
        // Format date as d-m-Y (e.g., "20-12-2006")
        const formattedDob = values.dob ? dayjs(values.dob).format("DD-MM-YYYY") : "";

        // Ensure phone code is set (default to India if not set)
        const finalPhoneCode = phoneCode || "91";
        const finalPhoneCountry = phoneCountry || "IN";

        // Ensure phone number is provided
        if (!values.phone || values.phone.trim() === "") {
          toast.error("Phone number is required");
          return;
        }

        // Create FormData for the API request
        const formData = new FormData();
        const normalizedEmail =
          typeof values.email === "string" ? values.email.trimEnd() : values.email;
        formData.append("name", values.fullName.trim());
        formData.append("email", normalizedEmail);
        // Always include phone number and related fields
        formData.append("phone", values.phone.trim());
        formData.append("phone_code", finalPhoneCode);
        formData.append("phone_country", finalPhoneCountry);
        formData.append("gender", values.gender);
        formData.append("dob", formattedDob);
        if (shouldShowPasswordFields) {
          formData.append("password", values.password.trim());
          formData.append("password_confirmation", values.confirmPassword.trim());
        }
        
        // Add referral code from localStorage if available (fallback if not sent during signup)
        const referralCode = getFromStorage(STORAGE_KEYS.referralCode);
        if (referralCode) {
          formData.append("referral_code", referralCode);
        }

        // CRITICAL: Send the uploaded image URL (from imageUpload API) instead of file
        // If we have an uploaded image URL, send that. Otherwise, send the file if available.
        if (uploadedImageUrl && uploadedImageUrl.startsWith('http')) {
          // Send the image URL from imageUpload API
          formData.append("avatar", uploadedImageUrl);
        } else if (avatarFile) {
          // Fallback: Send file if URL is not available
          formData.append("avatar", avatarFile);
        } else {
          // No image uploaded
          formData.append("avatar", "");
        }

        for (const [, value] of formData.entries()) {
        }
        const res: any = await updateProfile({ body: formData }).unwrap();

        // Extract possible token from updateProfile response
        const token =
          (res?.data as any)?.auth_token ||
          (res?.data as any)?.access_token ||
          (res as any)?.token ||
          (res?.data as any)?.token;

        if (token) {
          // Save/refresh token in Redux and localStorage
          dispatch(setToken({ token }));
          setToStorage(STORAGE_KEYS.token, token);
        }

        // Persist updated profile data so account screens get the latest info
        if (res?.data) {
          try {
            setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));

            // Update verification status from API response
            if (res.data.isEmailVerify === true) {
              setIsEmailVerified(true);
            }
            if (res.data.isPhoneVerify === true) {
              setIsPhoneVerifiedFromAPI(true);
              setIsPhoneVerified(true);
            }
          } catch {
            // ignore serialization errors
          }
        }

        toast.success(res?.message || "Profile updated successfully");
        // Set flag to indicate profile setup is complete - home page will call getProfile
        setToStorage(STORAGE_KEYS.profileSetupCompleted, "true");
        // Clear referral code after successful profile setup
        removeFromStorage(STORAGE_KEYS.referralCode);
        // After completing profile, navigate user back (if any) to the page where they started
        // an action (like guest add-to-cart). Otherwise, go to home.
        const pendingStr = getFromStorage(STORAGE_KEYS.pendingAddToCart);
        let pendingReturnUrl = "/";
        if (pendingStr) {
          try {
            const pending = JSON.parse(pendingStr);
            pendingReturnUrl = pending?.returnUrl || "/";
          } catch {
            // ignore parsing errors
          }
        }
        router.push(pendingReturnUrl);
      } catch (error: any) {
        const fallbackMessage = "Something went wrong";
        const errorMessage = error?.data?.message || fallbackMessage;
        toast.error(formatDobErrorMessage(errorMessage, fallbackMessage));
      }
    },
  });

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Store the file for later use in form submission
    setAvatarFile(file);

    // Create a preview URL for the image
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setProfileImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Optionally upload immediately (keeping existing functionality)
    const formData = new FormData();
    formData.append("image", file);

    // Use raw mutation result instead of unwrap so we can handle any shape
    const result: any = await imageUpload({ body: formData });

    if (result?.data) {
      const res = result.data as any;

      // Extract token if API returns it on image upload
      const token =
        (res?.data as any)?.auth_token ||
        (res?.data as any)?.access_token ||
        (res as any)?.token ||
        (res?.data as any)?.token;

      if (token) {
        dispatch(setToken({ token }));
        setToStorage(STORAGE_KEYS.token, token);
      }

      // Extract image URL from imageUpload API response
      // Response structure: {image: "https://womancart1.s3.ap-south-1.amazonaws.com/...", extension: "png", image_size_kb: 216.93}
      const uploadedImageUrlValue =
        res?.image ||           // Direct field from API response
        res?.data?.image ||     // Nested in data
        res?.data?.avatar ||
        res?.data?.url ||
        res?.data?.path ||
        "";

      if (uploadedImageUrlValue) {
        // Store the uploaded image URL - this will be sent to updateProfile API
        setUploadedImageUrl(uploadedImageUrlValue);
        setProfileImage(uploadedImageUrlValue);
      } else {
      }

      toast.success(res?.message || "Image has been uploaded successfully");
    } else if (result?.error) {
      toast.error(
        (result.error as any)?.data?.message || "Image upload failed"
      );
    }
  };

  const handleVerifyPhone = async () => {
    if (!formik.values.phone) {
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

    // Extract local phone number - with separateDialCode, formik.values.phone should be local number
    let phoneNumber = formik.values.phone ? String(formik.values.phone).trim() : "";
    
    // Remove any non-numeric characters (including spaces, hyphens, parentheses, etc.)
    phoneNumber = phoneNumber.replace(/\D/g, "");
    
    // Additional safety check: if phoneNumber starts with country code, remove it
    // This handles edge cases where country code might still be included
    const currentPhoneCode = phoneCode ? String(phoneCode).replace(/\+/g, "").replace(/\D/g, "") : "91";
    if (phoneNumber.startsWith(currentPhoneCode) && phoneNumber.length > currentPhoneCode.length) {
      // Check if removing country code would give us a valid length
      const withoutCountryCode = phoneNumber.substring(currentPhoneCode.length);
      const currentCountry = (phoneCountry || "IN").toUpperCase();
      const rules = phoneLengthRules[currentCountry] || { min: 4, max: 15 };
      // Only remove country code if the remaining number matches expected length
      if (withoutCountryCode.length >= rules.min && withoutCountryCode.length <= rules.max) {
        phoneNumber = withoutCountryCode;
      }
    }
    
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

    try {
      // Call change-phone-number API to send OTP
      // RTK Query will automatically add authentication token if available
      // phone_code should be a number (remove + if present)
      const phoneCodeNum = phoneCode ? parseInt(phoneCode.replace("+", ""), 10) : 91;
      // phone should be a number
      const phoneNum = parseInt(phoneNumber, 10);
      if (isNaN(phoneNum)) {
        toast.error("Please enter a valid phone number");
        return;
      }

      const body = {
        phone_code: phoneCodeNum,
        phone: phoneNum,
        phone_country: phoneCountry || "IN",
      };

      const result = await changePhoneNumber({ body });

      // Extract response data from either error or data property
      let responseData: any = null;

      if ('error' in result && result.error) {
        // Check if it's a 401 error
        const errorStatus = (result.error as any)?.status;
        if (errorStatus === 401) {
          const token = getFromStorage(STORAGE_KEYS.token);
          if (!token) {
            toast.error("Please login first to verify your phone number");
            router.push("/auth/login");
          } else {
            toast.error("Session expired. Please login again");
            removeFromStorage(STORAGE_KEYS.token);
            removeFromStorage(STORAGE_KEYS.tokenNode);
            router.push("/auth/login");
          }
          return;
        }
        // RTK Query might treat it as error even if HTTP 200
        responseData = (result.error as any)?.data;
      } else if ('data' in result && result.data) {
        // Normal success path
        responseData = result.data;
      }

      // If still no data, try direct access
      if (!responseData && result) {
        responseData = (result as any).data || (result as any).error?.data || result;
      }

      // Check all possible message locations
      const statusCode = responseData?.statusCode;
      const message = responseData?.message || responseData?.data?.message;
      const messageLower = message?.toLowerCase() || "";

      // Check if response is successful - statusCode 200 OR message contains "success"
      const isSuccess = statusCode === 200 ||
        message === "OTP send successfully" ||
        messageLower.includes("success");

      if (isSuccess) {
        setVerificationType(1); // Set type to phone (1)
        toast.success(message || "OTP sent to your phone number");
        setOtpModalOpen(true);
        setCountDown(60);
        setOtp("");
      } else {
        // Only show error if we're sure it's not a success
        const errorMsg = message || responseData?.data?.message || "Failed to send OTP";
        toast.error(errorMsg);
      }
    } catch (error: any) {
      // Handle RTK Query errors
      const errorStatus = error?.status || error?.data?.status;
      const errorStatusCode = error?.data?.statusCode;
      const errorMessage = error?.data?.message || error?.data?.data?.message || error?.message || "Failed to send OTP";
      
      // Handle 401 Unauthorized error
      if (errorStatus === 401 || errorStatusCode === 401 || errorMessage?.toLowerCase().includes("unauthorized")) {
        const token = getFromStorage(STORAGE_KEYS.token);
        if (!token) {
          toast.error("Please login first to verify your phone number");
          router.push("/auth/login");
        } else {
          toast.error("Session expired. Please login again");
          removeFromStorage(STORAGE_KEYS.token);
          removeFromStorage(STORAGE_KEYS.tokenNode);
          router.push("/auth/login");
        }
        return;
      }

      // If statusCode is 200 or message contains success, treat as success
      if (errorStatusCode === 200 ||
        errorMessage === "OTP send successfully" ||
        errorMessage?.toLowerCase().includes("success")) {
        setVerificationType(1);
        toast.success(errorMessage || "OTP sent to your phone number");
        setOtpModalOpen(true);
        setCountDown(60);
        setOtp("");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleVerifyEmail = async () => {
    if (!formik.values.email) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      // Call change-email API to send OTP
      const normalizedEmail = formik.values.email.trimEnd();
      const body = {
        email: normalizedEmail,
      };

      const result = await changeEmail({ body });

      // Extract response data from either error or data property
      let responseData: any = null;

      if ('error' in result && result.error) {
        // RTK Query might treat it as error even if HTTP 200
        responseData = (result.error as any)?.data;
      } else if ('data' in result && result.data) {
        // Normal success path
        responseData = result.data;
      }

      // If still no data, try direct access
      if (!responseData && result) {
        responseData = (result as any).data || (result as any).error?.data || result;
      }

      // Check all possible message locations
      const statusCode = responseData?.statusCode;
      const message = responseData?.message || responseData?.data?.message;
      const messageLower = message?.toLowerCase() || "";

      // Check if response is successful - statusCode 200 OR message contains "success"
      const isSuccess = statusCode === 200 ||
        message === "OTP send successfully" ||
        messageLower.includes("success");

      if (isSuccess) {
        setVerificationType(2); // Set type to email (2)
        toast.success(message || "OTP sent to your email address");
        setOtpModalOpen(true);
        setCountDown(60);
        setOtp("");
      } else {
        // Only show error if we're sure it's not a success
        toast.error(message || "Failed to send OTP");
      }
    } catch (error: any) {
      // Check if error actually contains success response
      const errorData = error?.data;
      const errorStatusCode = errorData?.statusCode;
      const errorMessage = errorData?.message || errorData?.data?.message || error?.message;

      // If statusCode is 200 or message contains success, treat as success
      if (errorStatusCode === 200 ||
        errorMessage === "OTP send successfully" ||
        errorMessage?.toLowerCase().includes("success")) {
        setVerificationType(2);
        toast.success(errorMessage || "OTP sent to your email address");
        setOtpModalOpen(true);
        setCountDown(60);
        setOtp("");
      } else {
        toast.error(errorMessage || "Failed to send OTP");
      }
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp || otp.length !== 4) {
      toast.error("Please enter a valid 4-digit OTP");
      return;
    }


    try {
      // Convert OTP to number as per API requirement
      const otpNumber = parseInt(otp, 10);
      if (isNaN(otpNumber)) {
        toast.error("Please enter a valid numeric OTP");
        return;
      }

      // Ensure verificationType is set correctly
      // If not set, default based on which field was verified
      const finalType = verificationType || 1; // Default to phone if not set

      const body: any = {
        otp: otpNumber, // Send as number
        type: finalType, // 1 for phone, 2 for email
      };


      // Ensure API is called
      if (!verifyChangePhoneNumber) {
        toast.error("API service not available");
        return;
      }

      const result = await verifyChangePhoneNumber({ body });

      // Extract response data from either error or data property
      let responseData: any = null;

      if ('error' in result && result.error) {
        // RTK Query might treat it as error even if HTTP 200
        responseData = (result.error as any)?.data;
      } else if ('data' in result && result.data) {
        // Normal success path
        responseData = result.data;
      }

      // If still no data, try direct access
      if (!responseData && result) {
        responseData = (result as any).data || (result as any).error?.data || result;
      }

      // Check all possible message locations
      const statusCode = responseData?.statusCode;
      const message = responseData?.message || responseData?.data?.message;

      // Check if response is successful - statusCode 200 OR message contains "success"
      const isSuccess = statusCode === 200 ||
        message?.toLowerCase().includes("success") ||
        message?.toLowerCase().includes("verified");

      if (isSuccess) {
        if (verificationType === 1) {
          setIsPhoneVerified(true);
          setIsPhoneVerifiedFromAPI(true);
          toast.success(message || "Phone number verified successfully");
        } else if (verificationType === 2) {
          setIsEmailVerified(true);
          toast.success(message || "Email verified successfully");
        }

        setOtpModalOpen(false);

        const token =
          (responseData?.data as any)?.auth_token ||
          (responseData?.data as any)?.access_token ||
          (responseData as any)?.token ||
          (responseData?.data as any)?.token ||
          responseData?.auth_token;

        if (token) {
          dispatch(setToken({ token }));
          setToStorage(STORAGE_KEYS.token, token);
        }

        // Update credentials with verification status
        if (responseData?.data) {
          try {
            setToStorage(STORAGE_KEYS.credentials, JSON.stringify(responseData.data));
          } catch {
            // ignore serialization errors
          }
        }
      } else {
        toast.error(message || "OTP verification failed");
      }
    } catch (error: any) {
      // Check if error actually contains success response
      const errorData = error?.data;
      const errorStatusCode = errorData?.statusCode;
      const errorMessage = errorData?.message || errorData?.data?.message || error?.message;

      // If statusCode is 200 or message contains success, treat as success
      if (errorStatusCode === 200 ||
        errorMessage?.toLowerCase().includes("success") ||
        errorMessage?.toLowerCase().includes("verified")) {
        if (verificationType === 1) {
          setIsPhoneVerified(true);
          setIsPhoneVerifiedFromAPI(true);
          toast.success(errorMessage || "Phone number verified successfully");
        } else if (verificationType === 2) {
          setIsEmailVerified(true);
          toast.success(errorMessage || "Email verified successfully");
        }
        setOtpModalOpen(false);

        const token =
          (errorData?.data as any)?.auth_token ||
          (errorData?.data as any)?.access_token ||
          (errorData as any)?.token ||
          errorData?.auth_token;

        if (token) {
          dispatch(setToken({ token }));
          setToStorage(STORAGE_KEYS.token, token);
        }
      } else {
        toast.error(errorMessage || "OTP verification failed");
      }
    }
  };

  const handleResendOtp = async () => {
    if (verificationType === 1) {
      await handleVerifyPhone();
    } else if (verificationType === 2) {
      await handleVerifyEmail();
    }
  };

  const handleCloseOtpModal = () => {
    setOtpModalOpen(false);
    setOtp("");
    setCountDown(60);
  };

  const phoneFieldBorder =
    formik.touched.phone && formik.errors.phone
      ? "1px solid #d32f2f"
      : "1px solid #E4E7EC";

  return (
    <>
      <div className="rt_inner  profile_setup">
        <div className="auth_head  text_center">
          <h2>Profile Setup</h2>
        </div>
        <form className="form" onSubmit={formik.handleSubmit}>
          <div className="gap_p">
            <div className="control_group">
              <figure className="upload_image centered">
                <img src={profileImage} alt="Image" />
                <IconButton className="edit_btn" component="label">
                  <input type="file" hidden onChange={handleImageChange} />
                  <img src="/images/edit_icon.svg" alt="Icon" />
                </IconButton>
              </figure>
            </div>
            <div className="control_group w_100">
              <label>Full Name</label>
              <TextField
                fullWidth
                hiddenLabel
                placeholder="Full Name"
                value={formik.values.fullName}
                name="fullName"
                onChange={(e) => {
                  if (isValidInput(e.target.value)) {
                    formik.handleChange(e);
                  }
                }}
                error={!!(formik.touched.fullName && formik.errors.fullName)}
                helperText={formik.touched.fullName && formik.errors.fullName as string}
              />
            </div>
            <div className="control_group w_50">
              <label>Email Address</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    hiddenLabel
                    placeholder="Enter email address"
                    value={formik.values.email}
                    name="email"
                    disabled={isEmailVerified}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidInput(value)) {
                        formik.setFieldValue("email", value.trimEnd());
                      }
                    }}
                    error={!!(formik.touched.email && formik.errors.email && !isEmailVerified)}
                    helperText={formik.touched.email && formik.errors.email as string}
                  />
                </div>
                {!isEmailVerified && (
                  <Button
                    variant="outlined"
                    onClick={handleVerifyEmail}
                    disabled={!formik.values.email || isLoading}
                    style={{
                      minWidth: "100px",
                      height: "56px",
                      borderRadius: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Verify
                  </Button>
                )}
                {isEmailVerified && (
                  <Button
                    variant="outlined"
                    disabled
                    style={{
                      minWidth: "100px",
                      height: "56px",
                      borderRadius: "12px",
                      whiteSpace: "nowrap",
                      backgroundColor: "#4caf50",
                      color: "white",
                      borderColor: "#4caf50",
                    }}
                  >
                    Verified
                  </Button>
                )}
              </div>
             
            </div>
            <div className="control_group w_50">
              <label>Phone Number</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", gap: "0" }}>
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
                      disabled={isPhoneVerifiedFromAPI || isPhoneVerified}
                      onChange={(
                        value: string,
                        data: { dialCode?: string; countryCode?: string }
                      ) => {
                        // Don't allow changes if phone is verified
                        if (isPhoneVerifiedFromAPI || isPhoneVerified) {
                          return;
                        }
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
                        borderTop: phoneFieldBorder,
                        borderLeft: phoneFieldBorder,
                        borderBottom: phoneFieldBorder,
                        borderRight: "none",
                        backgroundColor: (isPhoneVerifiedFromAPI || isPhoneVerified) ? "#e0e0e0" : "#F9FAFB",
                        padding: "0 12px 0 0",
                        height: "56px",
                        width: "70px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: (isPhoneVerifiedFromAPI || isPhoneVerified) ? "not-allowed" : "pointer",
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
                      backgroundColor: (isPhoneVerifiedFromAPI || isPhoneVerified) ? "#f5f5f5" : "#F9FAFB",
                      borderTop: phoneFieldBorder,
                      borderBottom: phoneFieldBorder,
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
                    value={formik.values.phone || ""}
                    disabled={isPhoneVerifiedFromAPI || isPhoneVerified}
                    onChange={(e) => {
                      if (isPhoneVerifiedFromAPI || isPhoneVerified) {
                        return;
                      }
                      const value = e.target.value.replace(/\D/g, "");
                      formik.setFieldValue("phone", value);
                      setIsPhoneVerified(false); // Reset verification when phone changes
                    }}
                    placeholder="Enter phone number"
                    style={{
                      flex: 1,
                      height: "56px",
                      borderRadius: "0 12px 12px 0",
                      borderTop: phoneFieldBorder,
                      borderRight: phoneFieldBorder,
                      borderBottom: phoneFieldBorder,
                      borderLeft: "none",
                      fontSize: "14px",
                      backgroundColor: (isPhoneVerifiedFromAPI || isPhoneVerified) ? "#f5f5f5" : "white",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      outline: "none",
                      fontFamily: "inherit",
                      cursor: (isPhoneVerifiedFromAPI || isPhoneVerified) ? "not-allowed" : "text",
                      minWidth: 0,
                    }}
                    onFocus={(e) => {
                      if (!isPhoneVerifiedFromAPI && !isPhoneVerified) {
                        e.target.style.borderColor = formik.touched.phone && formik.errors.phone ? "#d32f2f" : "#E4E7EC";
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = formik.touched.phone && formik.errors.phone ? "#d32f2f" : "#E4E7EC";
                      formik.setFieldTouched("phone", true);
                    }}
                  />
                </div>
                {!(isPhoneVerifiedFromAPI || isPhoneVerified) && (
                  <Button
                    variant="outlined"
                    onClick={handleVerifyPhone}
                    disabled={!formik.values.phone || isLoading}
                    style={{
                      minWidth: "100px",
                      height: "56px",
                      borderRadius: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Verify
                  </Button>
                )}
                {isPhoneVerifiedNow && (
                  <Button
                    variant="outlined"
                    disabled
                    style={{
                      minWidth: "100px",
                      height: "56px",
                      borderRadius: "12px",
                      whiteSpace: "nowrap",
                      backgroundColor: "#4caf50",
                      color: "white",
                      borderColor: "#4caf50",
                    }}
                  >
                    Verified
                  </Button>
                )}
              </div>
              {formik.touched.phone && formik.errors.phone && formik.errors.phone as string && (
                <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px', marginLeft: '14px' }}>
                  {formik.errors.phone as unknown as string}
                </div>
              )}
            
            </div>
            {shouldShowPasswordFields && (
              <>
                <div className="control_group w_50">
                  <label>Password</label>
                  <TextField
                    fullWidth
                    hiddenLabel
                    placeholder="Enter password"
                    type={showPassword ? "text" : "password"}
                    value={formik.values.password}
                    name="password"
                    onChange={(e) => {
                      if (isValidInput(e.target.value)) {
                        formik.handleChange(e);
                      }
                    }}
                    error={!!(formik.touched.password && formik.errors.password)}
                    helperText={formik.touched.password && (formik.errors.password as string)}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={
                                showPassword
                                  ? "hide the password"
                                  : "display the password"
                              }
                              onClick={() => setShowPassword((prev) => !prev)}
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseUp={(e) => e.preventDefault()}
                            >
                              {showPassword ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </div>
                <div className="control_group w_50">
                  <label>Confirm Password</label>
                  <TextField
                    fullWidth
                    hiddenLabel
                    placeholder="Confirm password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formik.values.confirmPassword}
                    name="confirmPassword"
                    onChange={(e) => {
                      if (isValidInput(e.target.value)) {
                        formik.handleChange(e);
                      }
                    }}
                    error={!!(formik.touched.confirmPassword && formik.errors.confirmPassword)}
                    helperText={
                      formik.touched.confirmPassword &&
                      (formik.errors.confirmPassword as string)
                    }
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={
                                showConfirmPassword
                                  ? "hide the password"
                                  : "display the password"
                              }
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseUp={(e) => e.preventDefault()}
                            >
                              {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </div>
              </>
            )}
            <div className="control_group w_50">
              <label>Gender</label>
              <Select
                name="gender"
                value={formik.values.gender}
                onChange={formik.handleChange}
                fullWidth
                displayEmpty
                error={!!(formik.touched.gender && formik.errors.gender)}
              >
                <MenuItem disabled value="">
                  Select Gender
                </MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
              {formik.touched.gender && formik.errors.gender && (
                <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px', marginLeft: '14px' }}>
                  {formik.errors.gender as unknown as string}
                </div>
              )}
            </div>
            <div className="control_group w_50">
              <label>Date of Birth</label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={formik.values.dob}
                  onChange={(newValue) => {
                    formik.setFieldValue("dob", newValue);
                  }}
                  format="DD-MM-YYYY"
                  maxDate={dayjs().subtract(18, "year")}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      hiddenLabel: true,
                      placeholder: "Select Date of Birth",
                      error: !!(formik.touched.dob && formik.errors.dob),
                      helperText: formik.touched.dob && formik.errors.dob ? String(formik.errors.dob as unknown as string) : "",
                    },
                  }}
                  desktopModeMediaQuery="(min-width:0px)"
                />
              </LocalizationProvider>
            </div>
          </div>
          <div className="btn_flex mt_20">
            <Button type="submit" className="br_15 w_100" disabled={isLoading}>
              {isLoading ? "Please wait..." : "Submit"}
            </Button>
          </div>
        </form>
      </div>
      <OtpVerifyModal
        open={otpModalOpen}
        onClose={handleCloseOtpModal}
        setOpen={setOtpModalOpen}
        title={verificationType === 1 ? "Verify Phone Number" : "Verify Email Address"}
        description={
          verificationType === 1
            ? "A verification OTP has been sent to your phone. Please check your messages."
            : "A verification OTP has been sent to your email address. Please check your inbox."
        }
        countDown={countDown}
        setCountDown={setCountDown}
        otp={otp}
        setOtp={setOtp}
        loading={isVerifyingPhone}
        onSubmit={handleOtpSubmit}
        onResend={handleResendOtp}
      />
    </>
  );
};

export default ProfileSetup;
