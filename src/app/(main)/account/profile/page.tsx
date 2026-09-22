/* eslint-disable @next/next/no-img-element */
"use client";
import {
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import React, { useEffect, useState } from "react";
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { getFromStorage, setToStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { 
  useGetProfileQuery, 
  useImageUploadMutation, 
  useUpdateProfileMutation,
  useChangePhoneNumberMutation,
  useVerifyChangePhoneNumberMutation,
  useChangeEmailMutation
} from "@/service/auth";
import toast from "react-hot-toast";
import { useAppDispatch } from "@/lib/hook";
import { setToken, setUser } from "@/lib/slices/authSlice";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import OtpVerifyModal from "@/modal/optVerifyModal";
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { API_URL } from "@/constants/url";

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  birthday: string;
  gender: string;
  avatar?: string;
  phone_code?: string;
  phone_country?: string;
}
function ProfilePage() {
  const dispatch = useAppDispatch();
  const isPhoneEditable = true;
  const formatDobErrorMessage = (message: string, fallback: string) => {
    if (!message) return fallback;
    if (message.toLowerCase().includes("dob field must be a date before")) {
      return "Age must be at least 18 years";
    }
    return message;
  };
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);

  const [phoneCode, setPhoneCode] = useState<string>("91");
  const [phoneCountry, setPhoneCountry] = useState<string>("IN");
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [countDown, setCountDown] = useState<number>(60);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string>("");
  /** OTP entered in modal; verify API runs on Save (edit profile), not on modal Submit. */
  const [pendingPhoneOtp, setPendingPhoneOtp] = useState<number | null>(null);
  const [originalPhoneNumber, setOriginalPhoneNumber] = useState<string>("");

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [originalEmail, setOriginalEmail] = useState<string>("");
  const [originalEmailVerified, setOriginalEmailVerified] = useState(false);
  const [verificationType, setVerificationType] = useState<number>(1);
  const hasVerifiedEmail = Boolean(
    originalEmail?.trim() && originalEmailVerified
  );
  // Mobile-login users without a verified email should be able to add and verify it.
  const isEmailEditable = !hasVerifiedEmail;

  const PhoneInputAny: any = PhoneInput;
  const buildFullPhoneNumber = (
    rawPhone: string,
    rawPhoneCode?: string
  ) => {
    if (!rawPhone) return "";
    const phone = rawPhone.toString().replace(/\D/g, "");
    const phoneCode = (rawPhoneCode || "").toString().replace(/\D/g, "");
    if (!phoneCode) return phone;
    return phone.startsWith(phoneCode) ? phone : `${phoneCode}${phone}`;
  };

  const { data: profileResponse, isLoading, refetch } = useGetProfileQuery();
  const [imageUpload, { isLoading: isImageUploading }] = useImageUploadMutation();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [changePhoneNumber, { isLoading: isChangingPhone }] = useChangePhoneNumberMutation();
  const [verifyChangePhoneNumber, { isLoading: isVerifyingPhone }] = useVerifyChangePhoneNumberMutation();
  const [changeEmail, { isLoading: isChangingEmail }] = useChangeEmailMutation();

  /** Real verify-phone OTP API — called from Save only (not from OTP modal Submit). */
  async function verifyPhoneOtpOnSave(otpValue: number): Promise<boolean> {
    const body = { otp: otpValue, type: 1 };
    const applyPhoneVerifyPayload = (responseData: any) => {
      setIsPhoneVerified(true);
      if (responseData?.data) {
        try {
          const updatedData = {
            ...responseData.data,
            phone: pendingPhoneNumber || profile.phone,
            phone_code: phoneCode,
            phone_country: phoneCountry,
          };
          setToStorage(STORAGE_KEYS.credentials, JSON.stringify(updatedData));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("profileUpdated"));
            window.dispatchEvent(new Event("credentialsUpdated"));
          }
          setProfile((prev) => ({
            ...prev,
            phone: pendingPhoneNumber || prev.phone,
            phone_code: phoneCode,
            phone_country: phoneCountry,
          }));
          setOriginalPhoneNumber(pendingPhoneNumber || profile.phone);
        } catch {
          // ignore
        }
      }
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
    };

    try {
      const result = await verifyChangePhoneNumber({ body });
      let responseData: any = null;
      if ("error" in result && result.error) {
        responseData = (result.error as any)?.data;
      } else if ("data" in result && result.data) {
        responseData = result.data;
      }
      if (!responseData && result) {
        responseData = (result as any).data || (result as any).error?.data || result;
      }
      const statusCode = responseData?.statusCode;
      const message = responseData?.message || responseData?.data?.message;
      const messageLower = message?.toLowerCase() || "";
      const isSuccess =
        statusCode === 200 ||
        messageLower.includes("success") ||
        messageLower.includes("verified");
      if (isSuccess) {
        applyPhoneVerifyPayload(responseData);
        return true;
      }
      toast.error(message || "OTP verification failed");
      return false;
    } catch (error: any) {
      const errorData = error?.data;
      const errorStatusCode = errorData?.statusCode;
      const errorMessage =
        errorData?.message || errorData?.data?.message || error?.message;
      if (
        errorStatusCode === 200 ||
        errorMessage?.toLowerCase().includes("success") ||
        errorMessage?.toLowerCase().includes("verified")
      ) {
        applyPhoneVerifyPayload(errorData);
        return true;
      }
      toast.error(errorMessage || "OTP verification failed");
      return false;
    }
  }

  const handleToggle = async () => {
    if (isEditing) {
      await handleSaveProfile();
    } else {
      setOriginalProfile({
        ...profile,
        phone_code: phoneCode,
        phone_country: phoneCountry,
      });
      if (profile.phone === originalPhoneNumber && profile.phone && profile.phone.trim() !== "") {
        setIsPhoneVerified(true);
      } else {
        setIsPhoneVerified(false);
      }
      setPendingPhoneOtp(null);
      if (
        profile.email.trim() === originalEmail.trim() &&
        originalEmailVerified &&
        profile.email.trim() !== ""
      ) {
        setIsEmailVerified(true);
      } else {
        setIsEmailVerified(false);
      }
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (originalProfile) {
      setProfile(originalProfile);
      if (originalProfile.avatar && originalProfile.avatar.startsWith('http')) {
        setProfileImage(originalProfile.avatar);
        setUploadedImageUrl(originalProfile.avatar);
      } else {
        setProfileImage("");
        setUploadedImageUrl("");
      }
      if (originalProfile.phone_code) {
        setPhoneCode(originalProfile.phone_code.toString().replace("+", ""));
      }
      if (originalProfile.phone_country) {
        setPhoneCountry(originalProfile.phone_country);
      }
      if (originalProfile.birthday) {
        const parsedDate = dayjs(originalProfile.birthday, "DD-MM-YYYY");
        setBirthdayDate(parsedDate.isValid() ? parsedDate : null);
      } else {
        setBirthdayDate(null);
      }
    }
    setIsPhoneVerified(false);
    setPendingPhoneNumber("");
    setPendingPhoneOtp(null);
    setIsEmailVerified(false);
    setPendingEmail("");
    setOtpModalOpen(false);
    setOtp("");
    setCountDown(60);
    setSelectedImageFile(null);
    setIsEditing(false);
    setOriginalProfile(null);
  };

  const handleSaveProfile = async () => {
    try {
      if (!profile.fullName || !profile.fullName.trim()) {
        toast.error("Please enter your full name");
        return;
      }
      if (profile.fullName.trim().length < 3) {
        toast.error("Full name must be at least 3 characters");
        return;
      }
      if (!birthdayDate || !birthdayDate.isValid()) {
        toast.error("Please enter your birthday");
        return;
      }
      if (!profile.gender || !profile.gender.trim()) {
        toast.error("Please select your gender");
        return;
      }
      const hasPhone = profile.phone && profile.phone.trim() !== "";
      const phoneChanged = profile.phone !== originalPhoneNumber;

      if (hasPhone && phoneChanged && !isPhoneVerified) {
        toast.error("Please verify your phone number before saving");
        return;
      }
      if (profile.email !== originalEmail && !isEmailVerified) {
        toast.error("Please verify your email address before saving");
        return;
      }

      if (hasPhone && phoneChanged && pendingPhoneOtp !== null) {
        const phoneOtpOk = await verifyPhoneOtpOnSave(pendingPhoneOtp);
        if (!phoneOtpOk) {
          return;
        }
        setPendingPhoneOtp(null);
      }

      let finalAvatarUrl = uploadedImageUrl || profile.avatar || "";
      if (selectedImageFile) {
        const imageFormData = new FormData();
        imageFormData.append("image", selectedImageFile);
        const uploadRes: any = await imageUpload({ body: imageFormData }).unwrap();
        const uploadedUrl =
          uploadRes?.image ||
          uploadRes?.data?.image ||
          "";
        if (!uploadedUrl || !uploadedUrl.startsWith("http")) {
          toast.error("Failed to upload selected image");
          return;
        }
        finalAvatarUrl = uploadedUrl;
      }

      const formData = new FormData();
      formData.append("name", profile.fullName.trim());
      formData.append("gender", profile.gender.trim());
      const formattedDob = birthdayDate ? dayjs(birthdayDate).format("DD-MM-YYYY") : "";
      formData.append("dob", formattedDob);
      formData.append("phone", profile.phone.trim());
      const finalPhoneCode = phoneCode || "91";
      const finalPhoneCountry = phoneCountry || "IN";
      formData.append("phone_code", finalPhoneCode);
      formData.append("phone_country", finalPhoneCountry);
      const avatarValue = finalAvatarUrl;
      formData.append("avatar", avatarValue);

      const result: any = await updateProfile({ body: formData }).unwrap();
      const token =
        (result?.data as any)?.auth_token ||
        (result?.data as any)?.access_token ||
        (result as any)?.token ||
        (result?.data as any)?.token;

      if (token) {
        dispatch(setToken({ token }));
        setToStorage(STORAGE_KEYS.token, token);
      }
      if (result?.data) {
        try {
          const updatedCredentials = {
            ...result.data,
            name: result.data.name || profile.fullName,
            fullName: result.data.name || profile.fullName,
            dob: result.data.dob || profile.birthday,
            birthday: result.data.dob || profile.birthday,
            gender: result.data.gender || profile.gender,
            avatar: result.data.avatar || avatarValue,
            image: result.data.avatar || avatarValue,
          };
          setToStorage(STORAGE_KEYS.credentials, JSON.stringify(updatedCredentials));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("profileUpdated"));
            window.dispatchEvent(new Event("credentialsUpdated"));
          }
          let localResultPhone = result.data.phone || "";
          if (localResultPhone) {
            const phoneCodeFromResult = (result.data.phone_code || phoneCode || "91").toString().replace(/\D/g, "");
            const phoneDigits = localResultPhone.toString().replace(/\D/g, "");
            if (phoneDigits.startsWith(phoneCodeFromResult) && phoneDigits.length > phoneCodeFromResult.length) {
              localResultPhone = phoneDigits.substring(phoneCodeFromResult.length);
            } else {
              localResultPhone = phoneDigits;
            }
          }
          const updatedBirthday = result.data.dob || profile.birthday;
          setProfile((prev) => ({
            ...prev,
            fullName: result.data.name || prev.fullName,
            birthday: updatedBirthday,
            gender: result.data.gender || prev.gender,
            avatar: result.data.avatar || prev.avatar,
            phone: localResultPhone || prev.phone,
            phone_code: result.data.phone_code || prev.phone_code,
            phone_country: result.data.phone_country || prev.phone_country,
          }));
          if (updatedBirthday) {
            const parsedDate = dayjs(updatedBirthday, "DD-MM-YYYY");
            setBirthdayDate(parsedDate.isValid() ? parsedDate : null);
          } else {
            setBirthdayDate(null);
          }
          if (localResultPhone) {
            setOriginalPhoneNumber(localResultPhone);
          }
          if (result.data.email) {
            setOriginalEmail(result.data.email);
          }
          if (result.data.phone === originalPhoneNumber || !pendingPhoneNumber) {
            setIsPhoneVerified(true);
          }
          if (
            result.data.email &&
            result.data.email === originalEmail &&
            originalEmailVerified
          ) {
            setIsEmailVerified(true);
          } else if (!pendingEmail) {
            setIsEmailVerified(false);
          }
          const avatarUrl = result.data.avatar || avatarValue;
          if (avatarUrl && avatarUrl.startsWith('http')) {
            setProfileImage(avatarUrl);
            setUploadedImageUrl(avatarUrl);
            setProfile((prev) => ({ ...prev, avatar: avatarUrl }));
          } else if (avatarValue && avatarValue.startsWith('http')) {
            setProfileImage(avatarValue);
            setUploadedImageUrl(avatarValue);
            setProfile((prev) => ({ ...prev, avatar: avatarValue }));
          }
        } catch (error) {
          // Keep error logging for error conditions if needed
        }
      }
      const refetchResult = await refetch();
      const refreshed = refetchResult.data as { data?: Record<string, unknown> } | undefined;
      if (refreshed?.data) {
        dispatch(setUser({ user: refreshed.data as any }));
      }

      setSelectedImageFile(null);
      setIsEditing(false);
      setOriginalProfile(null);
      setPendingPhoneNumber("");
      setPendingPhoneOtp(null);
      setPendingEmail("");
      toast.success(result?.message || "Profile updated successfully");
    } catch (error: any) {
      const fallbackMessage = "Failed to update profile. Please try again.";
      const errorMessage = 
        error?.data?.message || 
        error?.message || 
        fallbackMessage;
      toast.error(formatDobErrorMessage(errorMessage, fallbackMessage));
    }
  };
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    email: "",
    phone: "",
    birthday: "",
    gender: "",
    avatar: "",
  });

  const [birthdayDate, setBirthdayDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (profileResponse?.data) {
      const data = profileResponse.data;
      const imageUrl = data?.avatar || data?.image || "";

      let localPhone = data?.phone || "";
      if (localPhone) {
        const phoneCodeFromAPI = (data?.phone_code || "91").toString().replace(/\D/g, "");
        const phoneDigits = localPhone.toString().replace(/\D/g, "");
        if (phoneDigits.startsWith(phoneCodeFromAPI) && phoneDigits.length > phoneCodeFromAPI.length) {
          localPhone = phoneDigits.substring(phoneCodeFromAPI.length);
        } else {
          localPhone = phoneDigits;
        }
      }
      const profileData: ProfileData = {
        fullName: data?.name || data?.fullName || "",
        email: data?.email || "",
        phone: localPhone,
        birthday: data?.dob || data?.birthday || "",
        gender: data?.gender || "",
        avatar: imageUrl,
        phone_code: data?.phone_code || "",
        phone_country: data?.phone_country || "",
      };
      setProfile(profileData);
      if (profileData.birthday) {
        const parsedDate = dayjs(profileData.birthday, "DD-MM-YYYY");
        setBirthdayDate(parsedDate.isValid() ? parsedDate : null);
      } else {
        setBirthdayDate(null);
      }
      if (data?.phone_code) {
        setPhoneCode(data.phone_code.toString().replace("+", ""));
      }
      if (data?.phone_country) {
        setPhoneCountry(data.phone_country);
      }
      if (localPhone) {
        setOriginalPhoneNumber(localPhone);
      }
      if (data?.email) {
        setOriginalEmail(data.email);
      }
      if (data?.isPhoneVerify === true && data?.phone && data.phone.trim() !== "") {
        setIsPhoneVerified(true);
      } else {
        setIsPhoneVerified(false);
      }
      if (data?.isEmailVerify === true && Boolean(data?.email?.trim?.())) {
        setIsEmailVerified(true);
        setOriginalEmailVerified(true);
      } else {
        setIsEmailVerified(false);
        setOriginalEmailVerified(false);
      }

      const isHttpUrl = (url: unknown): url is string =>
        typeof url === "string" &&
        (url.startsWith("http://") || url.startsWith("https://"));

      if (isHttpUrl(imageUrl)) {
        setProfileImage(imageUrl);
        setUploadedImageUrl(imageUrl);
      } else if (imageUrl && imageUrl.trim() !== "") {
        // Only allow HTTP(S) image URLs. Anything else is not safe to render.
        setProfileImage("");
      } else {
        const stored = getFromStorage(STORAGE_KEYS.credentials);
        if (stored) {
          try {
            const storedData = JSON.parse(stored);
            const storedImage = storedData?.avatar || storedData?.image || "";
            if (storedImage && isHttpUrl(storedImage)) {
              setProfileImage(storedImage);
              setUploadedImageUrl(storedImage);
              return;
            }
          } catch {
          }
        }
        setProfileImage("");
      }
      try {
        const currentCredentials = getFromStorage(STORAGE_KEYS.credentials);
        const credentials = currentCredentials ? JSON.parse(currentCredentials) : {};
        const updatedCredentials = {
          ...credentials,
          ...profileData,
          name: profileData.fullName,
          dob: profileData.birthday,
          avatar: imageUrl,
          image: imageUrl,
        };
        setToStorage(STORAGE_KEYS.credentials, JSON.stringify(updatedCredentials));
      } catch (error) {
      }
    } else if (!isLoading) {
      const stored = getFromStorage(STORAGE_KEYS.credentials);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const storedImage = data?.avatar || data?.image || "";
          let localStoredPhone = data?.phone || "";
          if (localStoredPhone) {
            const phoneCodeFromStorage = (data?.phone_code || "91").toString().replace(/\D/g, "");
            const phoneDigits = localStoredPhone.toString().replace(/\D/g, "");
            if (phoneDigits.startsWith(phoneCodeFromStorage) && phoneDigits.length > phoneCodeFromStorage.length) {
              localStoredPhone = phoneDigits.substring(phoneCodeFromStorage.length);
            } else {
              localStoredPhone = phoneDigits;
            }
          }
          const storedProfileData = {
            fullName: data?.name || "",
            email: data?.email || "",
            phone: localStoredPhone,
            birthday: data?.dob || "",
            gender: data?.gender || "",
            avatar: storedImage,
            phone_code: data?.phone_code || "",
            phone_country: data?.phone_country || "",
          };
          setProfile(storedProfileData);
          if (storedProfileData.birthday) {
            const parsedDate = dayjs(storedProfileData.birthday, "DD-MM-YYYY");
            setBirthdayDate(parsedDate.isValid() ? parsedDate : null);
          } else {
            setBirthdayDate(null);
          }
          if (data?.phone_code) {
            setPhoneCode(data.phone_code.toString().replace("+", ""));
          }
          if (data?.phone_country) {
            setPhoneCountry(data.phone_country);
          }
          if (localStoredPhone) {
            setOriginalPhoneNumber(localStoredPhone);
          }
          if (data?.email) {
            setOriginalEmail(data.email);
          }
          if (data?.isPhoneVerify === true && data?.phone && data.phone.trim() !== "") {
            setIsPhoneVerified(true);
          } else {
            setIsPhoneVerified(false);
          }
          if (data?.isEmailVerify === true) {
            setIsEmailVerified(true);
          }
          if (storedImage && (storedImage.startsWith('http://') || storedImage.startsWith('https://'))) {
            setProfileImage(storedImage);
            setUploadedImageUrl(storedImage);
          } else {
            setProfileImage("");
          }
        } catch {
        }
      }
    }
  }, [profileResponse, isLoading]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setProfileImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    // Allow choosing the same file again and keep behavior predictable.
    event.target.value = "";
    toast.success("Image selected. Click Save to upload.");
  };

  const updateProfileWithImageUrl = async (imageUrl: string) => {
    try {
      if (!imageUrl || !imageUrl.startsWith('http')) {
        toast.error("Invalid image URL received");
        return;
      }
      try {
        await updateProfileWithImageUrlAsURLEncoded(imageUrl);
      } catch (urlEncodedError) {
        try {
          await updateProfileWithImageUrlAsJSON(imageUrl);
        } catch (jsonError) {
          await updateProfileWithImageUrlAsFormData(imageUrl);
        }
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update profile with image");
    }
  };

  const updateProfileWithImageUrlAsURLEncoded = async (imageUrl: string) => {
    try {
      const token = getFromStorage(STORAGE_KEYS.token);
      const formParams = new URLSearchParams();
      formParams.append("name", profile.fullName || "");
      formParams.append("email", profile.email || "");
      formParams.append("phone", profile.phone || "");
      formParams.append("gender", profile.gender || "");
      formParams.append("dob", profile.birthday || "");
      formParams.append("avatar", imageUrl);

      const response = await fetch(`${API_URL}updateProfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${token}`,
          "x-portal": "USER",
          "deviceType": "web",
        },
        body: formParams.toString(),
      });
      const res = await response.json();
      if (res?.data?.avatar) {
        if (res.data.avatar.startsWith('http')) {
          if (res.data) {
            setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
          }
          refetch();
          toast.success("Profile updated with image successfully");
          return;
        } else {
          throw new Error("Backend still processing as file");
        }
      }
      throw new Error("No avatar in response");
    } catch (error: any) {
      throw error;
    }
  };

  const updateProfileWithImageUrlAsJSON = async (imageUrl: string) => {
    try {
      const token = getFromStorage(STORAGE_KEYS.token);
      const jsonBody = {
        name: profile.fullName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        gender: profile.gender || "",
        dob: profile.birthday || "",
        avatar: imageUrl,
      };
      const response = await fetch(`${API_URL}updateProfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-portal": "USER",
          "deviceType": "web",
        },
        body: JSON.stringify(jsonBody),
      });
      const res = await response.json();
      if (res?.data?.avatar) {
        if (res.data.avatar.startsWith('http')) {
          if (res.data) {
            setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
          }
          refetch();
          toast.success("Profile updated with image successfully");
          return;
        } else {
          throw new Error("Avatar not saved as URL");
        }
      }
      throw new Error("No avatar in response");
    } catch (error: any) {
      throw error;
    }
  };

  const updateProfileWithImageUrlAsFormData = async (imageUrl: string) => {
    try {
      const formData = new FormData();
      formData.append("name", profile.fullName || "");
      formData.append("email", profile.email || "");
      formData.append("phone", profile.phone || "");
      formData.append("gender", profile.gender || "");
      formData.append("dob", profile.birthday || "");
      formData.append("avatar", "");
      formData.append("avatar_url", imageUrl);
      formData.append("image_url", imageUrl);
      const urlBlob = new Blob([imageUrl], { type: 'text/plain' });
      formData.append("avatar_url_blob", urlBlob, "url.txt");
      const res: any = await updateProfile({ body: formData }).unwrap();
      if (res?.data?.avatar) {
        if (res.data.avatar.startsWith('http')) {
        } else {
          await updateProfileWithImageUrlDirect(imageUrl);
          return;
        }
      } else {
        await updateProfileWithImageUrlDirect(imageUrl);
        return;
      }
      const token =
        (res?.data as any)?.auth_token ||
        (res?.data as any)?.access_token ||
        (res as any)?.token ||
        (res?.data as any)?.token;

      if (token) {
        dispatch(setToken({ token }));
        setToStorage(STORAGE_KEYS.token, token);
      }
      if (res?.data) {
        try {
          setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
        } catch {
        }
      }
      refetch();
      toast.success(res?.message || "Profile updated with image successfully");
    } catch (error: any) {
      await updateProfileWithImageUrlDirect(imageUrl);
    }
  };

  const updateProfileWithImageUrlDirect = async (imageUrl: string) => {
    try {
      const formData = new FormData();
      formData.append("name", profile.fullName || "");
      formData.append("email", profile.email || "");
      formData.append("phone", profile.phone || "");
      formData.append("gender", profile.gender || "");
      formData.append("dob", profile.birthday || "");
      formData.append("avatar", imageUrl);
      const res: any = await updateProfile({ body: formData }).unwrap();
      if (res?.data?.avatar) {
        if (res.data.avatar.startsWith('http')) {
          if (res.data) {
            setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
          }
          refetch();
          toast.success("Profile updated with image successfully");
          return;
        } else {
          toast.error("Backend API needs update: Check if avatar is URL string (starts with http) before processing as file");
        }
      }
      if (res?.data) {
        try {
          setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
        } catch {
        }
      }
      refetch();
    } catch (error: any) {
      toast.error("Failed to update profile. Backend API needs to support URL strings in avatar field.");
    }
  };

  const handleVerifyPhone = async () => {
    if (!profile.phone || !profile.phone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    const phoneLengthRules: Record<string, { min: number; max: number }> = {
      "IN": { min: 10, max: 10 }, "US": { min: 10, max: 10 }, "CA": { min: 10, max: 10 }, "GB": { min: 10, max: 11 },
      "AU": { min: 9, max: 10 }, "DE": { min: 10, max: 11 }, "FR": { min: 9, max: 10 }, "IT": { min: 9, max: 10 },
      "ES": { min: 9, max: 9 }, "NL": { min: 9, max: 9 }, "BE": { min: 9, max: 9 }, "CH": { min: 9, max: 9 },
      "AT": { min: 10, max: 13 }, "SE": { min: 9, max: 9 }, "NO": { min: 8, max: 8 }, "DK": { min: 8, max: 8 },
      "FI": { min: 9, max: 10 }, "PL": { min: 9, max: 9 }, "BR": { min: 10, max: 11 }, "MX": { min: 10, max: 10 },
      "JP": { min: 10, max: 11 }, "CN": { min: 11, max: 11 }, "KR": { min: 10, max: 11 }, "SG": { min: 8, max: 8 },
      "AE": { min: 9, max: 9 }, "SA": { min: 9, max: 9 },
    };
    let phoneNumber = profile.phone.trim();
    phoneNumber = phoneNumber.replace(/\D/g, "");
    if (!phoneNumber || phoneNumber.length === 0) {
      toast.error("Please enter a valid phone number");
      return;
    }
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
    if (/^0+$/.test(phoneNumber) || /^(\d)\1+$/.test(phoneNumber)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    try {
      setPendingPhoneNumber(profile.phone);
      const phoneCodeNum = phoneCode ? parseInt(phoneCode.replace("+", ""), 10) : 91;
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
      let responseData: any = null;
      if ('error' in result && result.error) {
        responseData = (result.error as any)?.data;
      } else if ('data' in result && result.data) {
        responseData = result.data;
      }
      if (!responseData && result) {
        responseData = (result as any).data || (result as any).error?.data || result;
      }
      const statusCode = responseData?.statusCode;
      const message = responseData?.message || responseData?.data?.message;
      const messageLower = message?.toLowerCase() || "";
      const isSuccess = statusCode === 200 ||
        message === "OTP send successfully" ||
        messageLower.includes("success");
      if (isSuccess) {
        setVerificationType(1);
        setPendingPhoneOtp(null);
        toast.success(message || "OTP sent to your phone number");
        setOtpModalOpen(true);
        setCountDown(60);
        setOtp("");
      } else {
        toast.error(message || "Failed to send OTP");
      }
    } catch (error: any) {
      const errorData = error?.data;
      const errorStatusCode = errorData?.statusCode;
      const errorMessage = errorData?.message || errorData?.data?.message || error?.message;
      if (errorStatusCode === 200 ||
        errorMessage === "OTP send successfully" ||
        errorMessage?.toLowerCase().includes("success")) {
        setVerificationType(1);
        setPendingPhoneOtp(null);
        toast.success(errorMessage || "OTP sent to your phone number");
        setOtpModalOpen(true);
        setCountDown(60);
        setOtp("");
      } else {
        toast.error(errorMessage || "Failed to send OTP");
      }
    }
  };

  const handleVerifyEmail = async () => {
    const normalizedEmail = profile.email.trimEnd();
    if (!normalizedEmail) {
      toast.error("Please enter an email address");
      return;
    }
    // eslint-disable-next-line sonarjs/no-duplicate-string
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setPendingEmail(normalizedEmail);
      const body = {
        email: normalizedEmail,
      };
      const result = await changeEmail({ body });
      let responseData: any = null;
      if ('error' in result && result.error) {
        responseData = (result.error as any)?.data;
      } else if ('data' in result && result.data) {
        responseData = result.data;
      }
      if (!responseData && result) {
        responseData = (result as any).data || (result as any).error?.data || result;
      }
      const statusCode = responseData?.statusCode;
      const message = responseData?.message || responseData?.data?.message;
      const messageLower = message?.toLowerCase() || "";
      const isSuccess = statusCode === 200 ||
        message === "OTP send successfully" ||
        messageLower.includes("success");
      if (isSuccess) {
        setVerificationType(2);
        toast.success(message || "OTP sent to your email address");
        setOtpModalOpen(true);
        setCountDown(60);
        setOtp("");
      } else {
        toast.error(message || "Failed to send OTP");
      }
    } catch (error: any) {
      const errorData = error?.data;
      const errorStatusCode = errorData?.statusCode;
      const errorMessage = errorData?.message || errorData?.data?.message || error?.message;
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
    const otpNumber = parseInt(otp, 10);
    if (isNaN(otpNumber)) {
      toast.error("Please enter a valid numeric OTP");
      return;
    }

    // Phone (edit profile): verify API runs on Save only — here we only store OTP and show feedback.
    if (verificationType === 1) {
      setPendingPhoneOtp(otpNumber);
      setIsPhoneVerified(true);
      toast.success("OTP verified");
      setOtpModalOpen(false);
      setOtp("");
      return;
    }

    try {
      const body = {
        otp: otpNumber,
        type: verificationType,
      };
      const result = await verifyChangePhoneNumber({ body });
      let responseData: any = null;
      if ("error" in result && result.error) {
        responseData = (result.error as any)?.data;
      } else if ("data" in result && result.data) {
        responseData = result.data;
      }
      if (!responseData && result) {
        responseData = (result as any).data || (result as any).error?.data || result;
      }
      const statusCode = responseData?.statusCode;
      const message = responseData?.message || responseData?.data?.message;
      const messageLower = message?.toLowerCase() || "";
      const isSuccess =
        statusCode === 200 ||
        messageLower.includes("success") ||
        messageLower.includes("verified");
      if (isSuccess) {
        if (verificationType === 2) {
          setIsEmailVerified(true);
          if (responseData?.data) {
            try {
              const updatedData = {
                ...responseData.data,
                email: pendingEmail || profile.email,
              };
              setToStorage(STORAGE_KEYS.credentials, JSON.stringify(updatedData));
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("profileUpdated"));
                window.dispatchEvent(new Event("credentialsUpdated"));
              }
              setProfile((prev) => ({
                ...prev,
                email: pendingEmail || prev.email,
              }));
              setOriginalEmail(pendingEmail || profile.email);
              setOriginalEmailVerified(true);
            } catch {
              // ignore
            }
          }
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
        await refetch();
      } else {
        toast.error(message || "OTP verification failed");
      }
    } catch (error: any) {
      const errorData = error?.data;
      const errorStatusCode = errorData?.statusCode;
      const errorMessage =
        errorData?.message || errorData?.data?.message || error?.message;
      if (
        errorStatusCode === 200 ||
        errorMessage?.toLowerCase().includes("success") ||
        errorMessage?.toLowerCase().includes("verified")
      ) {
        if (verificationType === 2) {
          setIsEmailVerified(true);
          if (errorData?.data) {
            try {
              const updatedData = {
                ...errorData.data,
                email: pendingEmail || profile.email,
              };
              setToStorage(STORAGE_KEYS.credentials, JSON.stringify(updatedData));
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("profileUpdated"));
                window.dispatchEvent(new Event("credentialsUpdated"));
              }
              setProfile((prev) => ({
                ...prev,
                email: pendingEmail || prev.email,
              }));
              setOriginalEmail(pendingEmail || profile.email);
              setOriginalEmailVerified(true);
            } catch {
              // ignore
            }
          }
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
        await refetch();
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

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return;
    const value = e.target.value.replace(/\D/g, "");
    setProfile((prev) => ({ ...prev, phone: value }));
    const normalizedOriginalPhone = (originalPhoneNumber || "").replace(/\D/g, "");
    if (value && value === normalizedOriginalPhone) {
      setIsPhoneVerified(true);
      setPendingPhoneOtp(null);
      return;
    }
    setIsPhoneVerified(false);
    setPendingPhoneOtp(null);
  };

  const handleCountryCodeChange = (
    value: string,
    data: { dialCode?: string; countryCode?: string }
  ) => {
    if (!isEditing) return;
    const dial = data?.dialCode || "";
    if (dial) {
      setPhoneCode(dial.replace(/\+/g, "").replace(/\D/g, ""));
    }
    if (data?.countryCode) {
      setPhoneCountry(data.countryCode.toUpperCase());
    }
    setIsPhoneVerified(false);
    setPendingPhoneOtp(null);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return;
    const newEmail = event.target.value.trimEnd();
    setProfile((prev) => ({ ...prev, email: newEmail }));
    if (newEmail.trim() === originalEmail.trim()) {
      setIsEmailVerified(Boolean(originalEmailVerified && newEmail.trim() !== ""));
      setPendingEmail("");
    } else {
      setIsEmailVerified(false);
    }
  };

  const handleChange =
    (field: keyof ProfileData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isEditing) return;
      setProfile((prev) => ({ ...prev, [field]: event.target.value }));
    };
  if (isLoading) {
    return (
      <>
        <div className="s_head flex hd_6">
          <div className="skeleton_shimmer profile_skeleton_title" />
          <div className="rt">
            <div className="skeleton_shimmer profile_skeleton_button" />
          </div>
        </div>

        <form className="form">
          <div className="profile_page">
            <div className="lt">
              <figure className="upload_image centered">
                <div className="skeleton_shimmer profile_skeleton_avatar" />
              </figure>
            </div>
            <div className="rt gap_p">
              <div className="control_group w_50">
                <div className="skeleton_shimmer profile_skeleton_label" />
                <div className="skeleton_shimmer profile_skeleton_input" />
              </div>
              <div className="control_group w_50">
                <div className="skeleton_shimmer profile_skeleton_label" />
                <div className="skeleton_shimmer profile_skeleton_input" />
              </div>
              <div className="control_group w_50">
                <div className="skeleton_shimmer profile_skeleton_label" />
                <div className="skeleton_shimmer profile_skeleton_input" />
              </div>
              <div className="control_group w_50">
                <div className="skeleton_shimmer profile_skeleton_label" />
                <div className="skeleton_shimmer profile_skeleton_input" />
              </div>
              <div className="control_group w_50">
                <div className="skeleton_shimmer profile_skeleton_label" />
                <div className="skeleton_shimmer profile_skeleton_input" />
              </div>
            </div>
          </div>
        </form>
      </>
    );
  }

  const combinedAvatarSrc =
    profileImage || profile.avatar || uploadedImageUrl || "";
  const safeAvatarSrc =
    typeof combinedAvatarSrc === "string" &&
    (combinedAvatarSrc.startsWith("http://") ||
      combinedAvatarSrc.startsWith("https://") ||
      combinedAvatarSrc.startsWith("data:image/"))
      ? combinedAvatarSrc
      : "";

  return (
    <>
      <div className="s_head flex hd_6 ">
        <h2>   {isEditing && (
          <span className="bk_btn" onClick={handleCancelEdit} style={{ cursor: "pointer" }}>
            <ArrowBackIosIcon />
          </span>)}

          {isEditing ? "Edit Profile" : "My Profile"}</h2>
        <div className="rt">
          <Button 
            className="br_15" 
            size="small" 
            onClick={handleToggle}
            disabled={isUpdatingProfile || isImageUploading}
          >
            {isUpdatingProfile ? "Saving..." : isEditing ? "Save" : "Edit Profile"}
          </Button>
        </div>
      </div>

      <form className="form">
        <div className=" profile_page">
          <div className="lt">
            <figure className="upload_image centered">
              {safeAvatarSrc ? (
                <img
                  key={safeAvatarSrc || "default"}
                  src={safeAvatarSrc}
                  alt="Profile"
                  onError={() => {
                    setProfileImage("");
                  }}
                  onLoad={() => {}}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                <AccountCircleOutlinedIcon
                  aria-hidden
                  sx={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    color: "#000000",
                  }}
                />
              )}
              {isEditing && (
                <IconButton 
                  className="edit_btn" 
                  disabled={isImageUploading || isUpdatingProfile}
                  component="label"
                  sx={{ cursor: (isImageUploading || isUpdatingProfile) ? "wait" : "pointer" }}
                >
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isImageUploading || isUpdatingProfile}
                    style={{ display: "none" }}
                  />
                  <img src="/images/camera_icon.svg" alt="Upload Icon" />
                </IconButton>
              )}

            </figure>
          </div>
          <div className="rt gap_p">
            <div className="control_group w_50">
              <label>Full Name</label>
              <TextField
                fullWidth
                hiddenLabel
                placeholder="Full Name"
                value={profile.fullName}
                onChange={handleChange("fullName")}
                InputProps={{ readOnly: !isEditing }}
              ></TextField>
            </div>
            <div className="control_group w_50">
              <label>Email Address</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    hiddenLabel
                    placeholder="Enter email address"
                    value={profile.email}
                    onChange={handleEmailChange}
                    disabled={!isEditing || !isEmailEditable}
                    slotProps={{
                      input: {
                        endAdornment: (!isEditing || !isEmailEditable) && (isEmailVerified && profile.email === originalEmail && profile.email && profile.email.trim() !== "") ? (
                          <InputAdornment position="end">
                            <img src="/images/verified.svg" alt="Verified" />
                          </InputAdornment>
                        ) : undefined,
                      },
                    }}
                  />
                </div>
                {isEditing && isEmailEditable && (
                  <>
                    {!(isEmailVerified && profile.email === originalEmail) && (
                      <Button
                        variant="outlined"
                        onClick={handleVerifyEmail}
                        disabled={!profile.email || isChangingEmail || isUpdatingProfile}
                        style={{
                          minWidth: "100px",
                          height: "56px",
                          borderRadius: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isChangingEmail ? "Sending..." : "Verify"}
                      </Button>
                    )}
                    {(isEmailVerified && profile.email === originalEmail) && (
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
                  </>
                )}
              </div>
              {isEditing && !(isEmailVerified && profile.email === originalEmail) && profile.email !== originalEmail && (
                <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px', marginLeft: '14px' }}>
                  Please verify your email address to save changes
                </div>
              )}
            </div>
            <div className="control_group w_50">
              <label>Phone</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", gap: "0" }}>
                  <div
                    style={{
                      position: "relative",
                      minWidth: "70px",
                    }}
                  >
                    <PhoneInputAny
                      country={phoneCountry ? phoneCountry.toLowerCase() : "in"}
                      value={`+${phoneCode || "91"}`}
                      disabled={!isEditing}
                      onChange={handleCountryCodeChange}
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
                        backgroundColor: !isEditing ? "#e0e0e0" : "#F9FAFB",
                        padding: "0 12px 0 0",
                        height: "56px",
                        width: "70px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: !isEditing ? "not-allowed" : "pointer",
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
                  <div
                    style={{
                      backgroundColor: !isEditing ? "#f5f5f5" : "#F9FAFB",
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
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      type="tel"
                      value={profile.phone || ""}
                      disabled={!isEditing}
                      onChange={handlePhoneInputChange}
                      placeholder="Enter phone number"
                      style={{
                        width: "100%",
                        height: "56px",
                        borderRadius: "0 12px 12px 0",
                        borderTop: "1px solid #E4E7EC",
                        borderRight: "1px solid #E4E7EC",
                        borderBottom: "1px solid #E4E7EC",
                        borderLeft: "none",
                        fontSize: "14px",
                        backgroundColor: !isEditing ? "#f5f5f5" : "white",
                        paddingLeft: "16px",
                        paddingRight: !isEditing && isPhoneVerified && profile.phone?.trim() ? "45px" : "16px",
                        outline: "none",
                        fontFamily: "inherit",
                        cursor: !isEditing ? "not-allowed" : "text",
                      }}
                      onFocus={(e) => {
                        if (isEditing) {
                          e.target.style.borderColor = "#E4E7EC";
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#E4E7EC";
                      }}
                    />
                    {!isEditing && isPhoneVerified && profile.phone?.trim() && (
                      <div style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        display: "flex",
                        alignItems: "center",
                        pointerEvents: "none"
                      }}>
                        <img src="/images/verified.svg" alt="icon" />
                      </div>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <>
                    {!(isPhoneVerified && profile.phone?.trim()) && (
                      <Button
                        variant="outlined"
                        onClick={handleVerifyPhone}
                        disabled={!profile.phone || profile.phone.trim() === "" || isChangingPhone || isUpdatingProfile}
                        style={{
                          minWidth: "100px",
                          height: "56px",
                          borderRadius: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isChangingPhone ? "Sending..." : "Verify"}
                      </Button>
                    )}
                    {isPhoneVerified && profile.phone?.trim() && (
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
                  </>
                )}
              </div>
              {isEditing &&
                profile.phone !== originalPhoneNumber &&
                Boolean(profile.phone?.trim()) &&
                !isPhoneVerified && (
                <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px', marginLeft: '14px' }}>
                  Please verify your phone number to save changes
                </div>
              )}
            </div>

            <div className="control_group w_50">
              <label>Birthday</label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={birthdayDate}
                  onChange={(newValue) => {
                    if (!isEditing) return;
                    setBirthdayDate(newValue);
                    if (newValue && newValue.isValid()) {
                      setProfile((prev) => ({
                        ...prev,
                        birthday: dayjs(newValue).format("DD-MM-YYYY"),
                      }));
                    } else {
                      setProfile((prev) => ({
                        ...prev,
                        birthday: "",
                      }));
                    }
                  }}
                  format="DD-MM-YYYY"
                  maxDate={dayjs().subtract(18, "year")}
                  disabled={!isEditing}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      hiddenLabel: true,
                      placeholder: "DD-MM-YYYY",
                      error: false,
                      helperText: "",
                      sx: {
                        '& .MuiInputBase-root': {
                          backgroundColor: !isEditing ? '#f5f5f5' : 'white',
                        },
                      },
                    },
                  }}
                  desktopModeMediaQuery="(min-width:0px)"
                />
              </LocalizationProvider>
            </div>

            <div className="control_group w_50">
              <label>Gender</label>
              <Select
                name="gender"
                value={profile.gender || ""}
                onChange={(event) => {
                  if (!isEditing) return;
                  setProfile((prev) => ({
                    ...prev,
                    gender: String(event.target.value || ""),
                  }));
                }}
                fullWidth
                displayEmpty
                disabled={!isEditing}
              >
                <MenuItem disabled value="">
                  Select Gender
                </MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </div>
          </div>
        </div>
      </form>
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
        loading={isVerifyingPhone || isChangingEmail}
        onSubmit={handleOtpSubmit}
        onResend={handleResendOtp}
      />
    </>
  );
}

export default ProfilePage;
