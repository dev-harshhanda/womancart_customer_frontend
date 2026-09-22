/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
import {
  Dispatch,
  SetStateAction,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  Modal,
  TextField,
  CircularProgress,
  IconButton,
  Switch,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { Address, AddressFormData } from "@/types/General";
import {
  useCreateAddressMutation,
  useEditAddressMutation,
  useGetAddressListQuery,
} from "@/service/address";
import toast from "react-hot-toast";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
import LocationSearch from "@/components/LocationSearch";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { getCurrentUser, getToken } from "@/lib/slices/authSlice";
import type { AppDispatch } from "@/lib/store";
import emptySplitApi from "@/lib/rtk";
import {
  notifyDeliverySelectionChanged,
  persistDeliveryAddressIdForMode,
  readSelectedLocation,
  setNormalDeliverHerePinned,
  writeSelectedLocationData,
  writeSelectedLocationFromAddress,
} from "@/utils/deliveryAddressSync";
import {
  buildFullPhone,
  normalizeLocalMobile,
  normalizePhoneCode,
  normalizeAddressFromApi,
  splitPhoneForInput,
  countryIsoFromDialCode,
  resolvePhoneFields,
} from "@/utils/phoneNumber";
import { cacheAddressPhoneMeta, mergeAddressPhoneMeta } from "@/utils/addressPhoneCache";
import { canUseBrowserGeolocation } from "@/utils/browserGeolocation";

function addressIdFromSaveResponse(
  response: unknown,
  editId?: number,
): number | null {
  const r = response as {
    data?: { id?: number; data?: { id?: number } } | number;
  };
  const d = r?.data;
  if (typeof d === "number" && Number.isFinite(d)) return d;
  if (d && typeof d === "object") {
    const obj = d as { id?: number; data?: { id?: number } };
    if (typeof obj.id === "number") return obj.id;
    if (typeof obj.data?.id === "number") return obj.data.id;
  }
  return editId ?? null;
}

function persistAddressPhoneAfterSave(
  addressId: number | null,
  saveAttempt: AddressFormData,
) {
  if (addressId == null) return;
  const phoneCode = normalizePhoneCode(saveAttempt.phone_code) || "91";
  const mobile = normalizeLocalMobile(saveAttempt.mobile);
  cacheAddressPhoneMeta(addressId, {
    phone_code: phoneCode,
    country_code:
      saveAttempt.country_code?.toUpperCase() ||
      countryIsoFromDialCode(phoneCode),
    phone: saveAttempt.phone || buildFullPhone(phoneCode, mobile),
    mobile,
  });
}

function finishAddressSave(
  response: unknown,
  saveAttempt: AddressFormData,
  editId: number | undefined,
  dispatch: AppDispatch,
  syncHeaderLocationOnSave: boolean,
  setOpen: (open: boolean) => void,
  onSuccess?: () => void,
) {
  const addressId = addressIdFromSaveResponse(response, editId);
  persistAddressPhoneAfterSave(addressId, saveAttempt);
  syncHeaderAfterSavingDefault(
    saveAttempt,
    addressId,
    dispatch,
    syncHeaderLocationOnSave,
  );
  setOpen(false);
  onSuccess?.();
}

function syncHeaderAfterSavingDefault(
  saveAttempt: AddressFormData,
  addressId: number | null,
  dispatch: AppDispatch,
  syncHeaderLocationOnSave = false,
) {
  if (syncHeaderLocationOnSave) {
    const nextAddress: Address = {
      id: addressId ?? -1,
      name: saveAttempt.name,
      mobile: saveAttempt.mobile,
      phone: saveAttempt.phone || buildFullPhone(saveAttempt.phone_code, saveAttempt.mobile),
      email: saveAttempt.email,
      address: saveAttempt.address,
      address1: saveAttempt.address1 || "",
      landmark: saveAttempt.landmark || "",
      latitude: saveAttempt.latitude || "0.0",
      longitude: saveAttempt.longitude || "0.0",
      address_type: saveAttempt.address_type || "Home",
      state: saveAttempt.state || "",
      city: saveAttempt.city || "",
      pincode: saveAttempt.pincode || "",
      phone_code: normalizePhoneCode(saveAttempt.phone_code) || "91",
      country_code: saveAttempt.country_code || "IN",
      is_default: saveAttempt.is_default === 1 ? 1 : 0,
    };
    writeSelectedLocationFromAddress(nextAddress);
    const persistedSelection = addressId != null ? String(addressId) : "__current__";
    persistDeliveryAddressIdForMode("normal", persistedSelection);
    persistDeliveryAddressIdForMode("quick_delivery", persistedSelection);
    setNormalDeliverHerePinned(true);
    notifyDeliverySelectionChanged();
  }

  dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  editData?: Address | null;
  onSuccess?: () => void;
  showSeeSavedAddressButton?: boolean;
  onSeeSavedAddressClick?: () => void;
  syncHeaderLocationOnSave?: boolean;
}

const initialFormData: AddressFormData = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  address1: "",
  landmark: "",
  latitude: "0.0",
  longitude: "0.0",
  address_type: "Home",
  state: "",
  city: "",
  pincode: "",
  country_code: "IN",
  phone_code: "91",
  // Default address flag: 0 = false, 1 = true
  is_default: 0,
};


const DEFAULT_MAP_POSITION = {
  lat: 28.6139,
  lng: 77.209,
};

function getValidMapPosition(
  latitude: unknown,
  longitude: unknown,
): { lat: number; lng: number } | null {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  return { lat, lng };
}
type GoogleAddressComponent = {
  long_name?: string;
  types?: string[];
};

type ResolvedAddressFields = {
  address: string;
  address1: string;
  city: string;
  state: string;
  pincode: string;
};

function mapGoogleAddressComponents(
  addressComponents: GoogleAddressComponent[],
  formattedAddress = "",
): ResolvedAddressFields {
  const getComponent = (type: string) =>
    addressComponents.find((component) =>
      component.types?.includes(type),
    )?.long_name?.trim() || "";

  const getUniqueParts = (values: string[]) =>
    Array.from(
      new Set(values.map((value) => value.trim()).filter(Boolean)),
    );

  const sublocalities = getUniqueParts(
    addressComponents
      .filter((component) =>
        component.types?.some((type) =>
          [
            "sublocality_level_2",
            "sublocality_level_1",
            "sublocality",
          ].includes(type),
        ),
      )
      .map((component) => component.long_name || ""),
  );

  const route = getComponent("route");
  const neighborhood = getComponent("neighborhood");
  const locality = getComponent("locality");
  const administrativeAreaLevel2 = getComponent(
    "administrative_area_level_2",
  );

  const areaParts = getUniqueParts([
    route,
    neighborhood,
    ...sublocalities,
  ]);

  const houseParts = getUniqueParts([
    getComponent("subpremise"),
    getComponent("street_number"),
    getComponent("premise"),
  ]);

  return {
    address:
      areaParts.join(", ") ||
      locality ||
      formattedAddress.trim(),
    address1: houseParts.join(", "),
    city:
      locality ||
      administrativeAreaLevel2 ||
      sublocalities[sublocalities.length - 1] ||
      "",
    state: getComponent("administrative_area_level_1"),
    pincode: getComponent("postal_code"),
  };
}

export default function AddAddress({
  open,
  onClose,
  setOpen,
  editData,
  onSuccess,
  showSeeSavedAddressButton = false,
  onSeeSavedAddressClick,
  syncHeaderLocationOnSave = false,
}: ModalProps) {
  const addressTypes = ["Home", "Office", "Other"];
  const [activeIndex, setActiveIndex] = useState(0);
  const [formData, setFormData] = useState<AddressFormData>(initialFormData);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AddressFormData, boolean>>
  >({});
  const PhoneInputAny: any = PhoneInput;
  const getErrorSx = (hasError?: boolean) =>
    hasError
      ? {
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "#f44336 !important",
        },
        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "#f44336 !important",
        },
        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "#f44336 !important",
        },
      }
      : undefined;

  const dispatch = useAppDispatch();
  const authToken = useAppSelector(getToken);
  const currentUser = useAppSelector(getCurrentUser);
  const recipientFieldsTouchedRef = useRef({
    name: false,
    mobile: false,
    email: false,
  });
  const [createAddress, { isLoading: isCreating }] = useCreateAddressMutation();
  const [editAddress, { isLoading: isEditing }] = useEditAddressMutation();

  // Fetch existing addresses (e.g. match "Other" label format with API)
  const { data: addressListResponse } = useGetAddressListQuery(undefined, {
    skip: !open, // Only fetch when modal is open
  });
  const existingAddresses = addressListResponse?.data || [];

  const isLoading = isCreating || isEditing;
  const isEditMode = !!editData;
  

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (!open) return;

    recipientFieldsTouchedRef.current = {
      name: false,
      mobile: false,
      email: false,
    };

    if (editData) {
      const normalized = normalizeAddressFromApi(
        mergeAddressPhoneMeta(
          editData as unknown as Record<string, unknown>,
        ),
      ) as unknown as Address;
      const phoneCode = normalizePhoneCode(normalized.phone_code) || "91";
      const parsedPhone = splitPhoneForInput(
        normalized.phone,
        phoneCode,
        normalized.mobile,
      );

      setFormData({
        name: normalized.name || "",
        mobile: parsedPhone.mobile,
        phone:
          normalized.phone ||
          buildFullPhone(phoneCode, parsedPhone.mobile),
        email: normalized.email || "",
        address: normalized.address || "",
        address1: normalized.address1 || "",
        landmark: normalized.landmark || "",
        latitude: normalized.latitude || "0.0",
        longitude: normalized.longitude || "0.0",
        address_type: normalized.address_type || "Home",
        state: normalized.state || "",
        city: normalized.city || "",
        pincode: normalized.pincode || "",
        country_code:
          normalized.country_code?.toUpperCase() ||
          countryIsoFromDialCode(phoneCode),
        phone_code: phoneCode,
        // Default address flag from API if available
        is_default:
          (normalized as any).is_default === 1 ||
          (normalized as any).isDefault === 1 ||
          (normalized as any).is_default === true ||
          (normalized as any).isDefault === true
            ? 1
            : 0,
      });

      const typeIndex = addressTypes.findIndex(
        (type) =>
          type.toLowerCase() ===
          normalized.address_type?.toLowerCase(),
      );

      setSearchQuery(normalized.address || "");
      setIsLocationDerivedLocked(
        getValidMapPosition(
          normalized.latitude,
          normalized.longitude,
        ) !== null,
      );
      setActiveIndex(typeIndex >= 0 ? typeIndex : 0);
      setErrors({});
      return;
    }

    const selectedLocation = readSelectedLocation();
    const selectedPosition = getValidMapPosition(
      selectedLocation?.latitude,
      selectedLocation?.longitude,
    );

    setFormData(
      selectedPosition
        ? {
            ...initialFormData,
            latitude: String(selectedPosition.lat),
            longitude: String(selectedPosition.lng),
            address: selectedLocation?.address || "",
            city: selectedLocation?.city || "",
            state: selectedLocation?.state || "",
            pincode: selectedLocation?.pincode || "",
          }
        : initialFormData,
    );
    setSearchQuery(
      selectedPosition ? selectedLocation?.address || "" : "",
    );
    setIsLocationDerivedLocked(Boolean(selectedPosition));
    setActiveIndex(0);
    setErrors({});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editData]);

    useEffect(() => {
    if (!open || editData || !authToken || !currentUser) return;

    const normalizedCustomer = normalizeAddressFromApi(
      currentUser as unknown as Record<string, unknown>,
    );

    const profileName = String(
      normalizedCustomer.name || normalizedCustomer.fullName || "",
    ).trim();
    const profileEmail = String(normalizedCustomer.email || "").trim();
    const profilePhoneCode =
      normalizePhoneCode(normalizedCustomer.phone_code as string) || "91";
    const parsedProfilePhone = splitPhoneForInput(
      normalizedCustomer.phone as string | number | null | undefined,
      profilePhoneCode,
      normalizedCustomer.mobile as string | number | null | undefined,
    );
    const profileMobile = parsedProfilePhone.mobile;
    const profileCountryCode =
      String(normalizedCustomer.country_code || "").toUpperCase() ||
      countryIsoFromDialCode(profilePhoneCode);

    setFormData((prev) => {
      const shouldPrefillName =
        !recipientFieldsTouchedRef.current.name &&
        !prev.name.trim() &&
        Boolean(profileName);
      const shouldPrefillMobile =
        !recipientFieldsTouchedRef.current.mobile &&
        !prev.mobile.trim() &&
        Boolean(profileMobile);
      const shouldPrefillEmail =
        !recipientFieldsTouchedRef.current.email &&
        !prev.email.trim() &&
        Boolean(profileEmail);

      return {
        ...prev,
        name: shouldPrefillName ? profileName : prev.name,
        mobile: shouldPrefillMobile ? profileMobile : prev.mobile,
        email: shouldPrefillEmail ? profileEmail : prev.email,
        phone_code: shouldPrefillMobile
          ? profilePhoneCode
          : prev.phone_code,
        country_code: shouldPrefillMobile
          ? profileCountryCode
          : prev.country_code,
        phone: shouldPrefillMobile
          ? buildFullPhone(profilePhoneCode, profileMobile)
          : prev.phone,
      };
    });
  }, [open, editData, authToken, currentUser]);


  const handleInputChange = (field: keyof AddressFormData, value: string) => {
    if (field === "name" || field === "email") {
      recipientFieldsTouchedRef.current[field] = true;
    }

    // Restrict pincode to numbers only and max 10 digits
    if (field === "pincode") {
      // Remove any non-numeric characters
      const numericValue = value.replace(/\D/g, "");
      // Limit to 10 digits
      const limitedValue = numericValue.slice(0, 10);
      setFormData((prev) => ({ ...prev, [field]: limitedValue }));
      // Clear error if valid (4-10 digits)
      if (errors[field] && limitedValue.length >= 4 && limitedValue.length <= 10) {
        setErrors((prev) => ({ ...prev, [field]: false }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field] && value.trim()) {
        setErrors((prev) => ({ ...prev, [field]: false }));
      }
    }
  };

  const handleAddressTypeChange = (index: number) => {
    setActiveIndex(index);
    setFormData((prev) => ({ ...prev, address_type: addressTypes[index] }));
  };

  const requiredFields: (keyof AddressFormData)[] = [
    "name",
    "mobile",
    "email",
    "address",
    // landmark is now optional
    "city",
    "state",
    "pincode",
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddressFormData, boolean>> = {};
    requiredFields.forEach((field) => {
      if (!formData[field]?.toString().trim()) {
        newErrors[field] = true;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields");
      return false;
    }

    // Validate phone number format based on country code
    const phoneCodeDigits = normalizePhoneCode(formData.phone_code);
    if (!phoneCodeDigits || !formData.country_code) {
      setErrors((prev) => ({ ...prev, mobile: true }));
      toast.error("Please select a valid country code");
      return false;
    }

    const numericPhone = normalizeLocalMobile(formData.mobile);

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

    // Get validation rules for the selected country, or use default (4-15 digits)
    const countryCode = formData.country_code.toUpperCase();
    const rules = phoneLengthRules[countryCode] || { min: 4, max: 15 };

    // Validate phone number length (only local number, excluding country code)
    if (numericPhone.length < rules.min || numericPhone.length > rules.max) {
      setErrors((prev) => ({ ...prev, mobile: true }));
      if (countryCode === "IN") {
        toast.error("Please enter a valid 10-digit mobile number.");
      } else if (rules.min === rules.max) {
        toast.error(`Please enter a valid phone number (${rules.min} digits without country code for ${countryCode})`);
      } else {
        toast.error(`Please enter a valid phone number (${rules.min}-${rules.max} digits without country code for ${countryCode})`);
      }
      return false;
    }

    // Additional validation: phone number should not be all zeros or all same digits
    if (/^0+$|^(\d)\1+$/.test(numericPhone)) {
      setErrors((prev) => ({ ...prev, mobile: true }));
      toast.error("Please enter a valid phone number");
      return false;
    }
    // Basic email validation
    // eslint-disable-next-line sonarjs/no-duplicate-string
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrors((prev) => ({ ...prev, email: true }));
      toast.error("Please enter a valid email address");
      return false;
    }

    // Validate pincode: must be 4-10 digits, numbers only
    const pincodeRegex = /^[0-9]{4,10}$/;
    if (!pincodeRegex.test(formData.pincode.trim())) {
      setErrors((prev) => ({ ...prev, pincode: true }));
      toast.error("Pincode must be 4-10 digits");
      return false;
    }

    return true;
  };


    const handleMobileInputChange = (
      value: string,
      data: { dialCode?: string; countryCode?: string },
    ) => {
      recipientFieldsTouchedRef.current.mobile = true;

      const phoneCode =
        normalizePhoneCode(data?.dialCode) ||
        normalizePhoneCode(formData.phone_code) ||
        "91";
      const fullDigits = normalizeLocalMobile(value);
      const local = fullDigits.startsWith(phoneCode)
        ? fullDigits.slice(phoneCode.length)
        : fullDigits;
      const countryCode =
        data?.countryCode?.toUpperCase() ||
        formData.country_code ||
        countryIsoFromDialCode(phoneCode);

      setFormData((prev) => ({
        ...prev,
        phone_code: phoneCode,
        country_code: countryCode,
        mobile: local,
        phone: buildFullPhone(phoneCode, local),
      }));

      if (errors.mobile && local) {
        setErrors((prev) => ({ ...prev, mobile: false }));
      }
    };

  const [isLocating, setIsLocating] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationDerivedLocked, setIsLocationDerivedLocked] = useState(false);
  const mapPosition = useMemo(
    () =>
      getValidMapPosition(formData.latitude, formData.longitude) ??
      DEFAULT_MAP_POSITION,
    [formData.latitude, formData.longitude],
  );

  const hasSelectedMapLocation = useMemo(
    () =>
      getValidMapPosition(formData.latitude, formData.longitude) !== null,
    [formData.latitude, formData.longitude],
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    mapPosition
  );


  // Keep map centered on selected coordinates when modal opens or location updates.
  useEffect(() => {
    if (!open) return;
    setMapCenter(mapPosition);
  }, [open, mapPosition]);

  // Helper function to fetch address from coordinates (extracted for reuse)
  type AddAddressGeocodeSource =
    | "add_address_button"
    | "add_address_map_click"
    | "add_address_drag_end";

  type AddAddressGeolocateReason =
    | "browser_unavailable"
    | "gps_timeout"
    | "gps_unavailable";

  const fetchAddressFromCoordinates = async (
    latitude: number,
    longitude: number,
    source: AddAddressGeocodeSource,
  ) => {
    try {
      // Use Google Geocoding API for reverse geocoding with location_type parameter for exact results
      const response = await fetch(
        `/api/places/geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
        {
          headers: {
            "x-wc-location-source": source,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        // Find the most precise result (prefer street_address, then premise, then others)
        let result = data.results[0];
        const streetAddressResult = data.results.find((r: any) =>
          r.types.includes("street_address") || r.types.includes("premise")
        );
        if (streetAddressResult) {
          result = streetAddressResult;
        }

        const formattedAddress = result.formatted_address || "";
        const resolvedAddress = mapGoogleAddressComponents(
          result.address_components || [],
          formattedAddress,
        );

        setFormData((prev) => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          address: resolvedAddress.address,
          address1: prev.address1 || resolvedAddress.address1,
          city: resolvedAddress.city,
          state: resolvedAddress.state,
          pincode: resolvedAddress.pincode,
        }));
        setSearchQuery(formattedAddress || resolvedAddress.address);
        toast.success("Location updated successfully", {
          id: "add-address-location-updated",
        });
        setIsLocating(false);
        return true;
      } else if (data.status === "ZERO_RESULTS") {
        toast.error("No address found for this location. Please enter address manually.");
        setIsLocating(false);
        return false;
      } else if (data.status === "REQUEST_DENIED") {
        console.error("Google Geocoding API error:", data.error_message);
        toast.error("Failed to fetch address details. Please check API key configuration.");
        setIsLocating(false);
        return false;
      } else {
        console.error("Google Geocoding API status:", data.status, data.error_message);
        toast.error("Could not fetch address details. Please try again.");
        setIsLocating(false);
        return false;
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      // toast.error("Failed to fetch address details. Please try again.");
      setIsLocating(false);
      return false;
    }
  };

  const updateSelectedCoordinates = (
    latitude: number,
    longitude: number,
    options?: {
      resolveAddress?: boolean;
      lockLocationFields?: boolean;
      source?: AddAddressGeocodeSource;
    }
  ) => {
    const {
      resolveAddress = true,
      lockLocationFields = true,
      source = "add_address_button",
    } = options || {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (lockLocationFields) setIsLocationDerivedLocked(true);
    setMapCenter({ lat: latitude, lng: longitude });
    setFormData((prev) => ({
      ...prev,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    }));
    if (resolveAddress) {
      setIsLocating(true);
      void fetchAddressFromCoordinates(latitude, longitude, source);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!canUseBrowserGeolocation()) {
      toast(
        typeof window !== "undefined" && !window.isSecureContext
          ? "Current location requires a secure HTTPS connection. Please search for your address."
          : "Browser geolocation is not available. Please search for your address.",
      );
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateSelectedCoordinates(
          position.coords.latitude,
          position.coords.longitude,
          {
            source: "add_address_button",
          },
        );
      },
      (error) => {
        setIsLocating(false);

        let message =
          "Current location could not be detected. Please search for your address.";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location permission was denied. Please allow location access or search for your address.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message =
            "Your current position is unavailable. Please search for your address.";
        } else if (error.code === error.TIMEOUT) {
          message =
            "Location detection timed out. Please try again or search for your address.";
        }

        toast(message);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  };



  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Normalize address type - API might expect lowercase or different format
      let selectedType = formData.address_type;

      // If "Other" is selected, check what format existing "Other" addresses use
      const existingOtherAddress = existingAddresses.find(
        (addr: Address) =>
          (addr.address_type?.toLowerCase() === "other" ||
            addr.address_type?.toLowerCase() === "others") &&
          addr.address_type !== "Home" &&
          addr.address_type !== "Office" &&
          addr.address_type?.toLowerCase() !== "home" &&
          addr.address_type?.toLowerCase() !== "office"
      );

      // If we find an existing "Other" address, use its exact format
      if (selectedType === "Other" && existingOtherAddress) {
        selectedType = existingOtherAddress.address_type;
      } else if (selectedType === "Other") {
        // Try different variations - API might expect lowercase or different format
        // Common variations: "other", "others", "Other"
        // We'll try "other" first (lowercase) as many APIs prefer lowercase
        selectedType = "other";
      }

      // Update formData with normalized type
      const phoneCode = normalizePhoneCode(formData.phone_code) || "91";
      const mobile = normalizeLocalMobile(formData.mobile);
      const countryCode =
        formData.country_code?.toUpperCase() ||
        countryIsoFromDialCode(phoneCode);
      const normalizedFormData = {
        ...formData,
        email: formData.email.trimEnd(),
        address_type: selectedType,
        mobile,
        phone_code: phoneCode,
        phone: buildFullPhone(phoneCode, mobile),
        country_code: countryCode,
      };

      // Multiple addresses per type (Home / Office / Other) are allowed; save directly.

      // Now save the new/edited address with normalized type
      // If "Other" fails, try alternative formats
      // address1 is optional, so we can send empty string or omit it
      let saveAttempt: AddressFormData = {
        ...normalizedFormData,
        address1: normalizedFormData.address1?.trim() || "",
        is_default: normalizedFormData.is_default === 1 ? 1 : 0,
      };

      try {
        if (isEditMode && editData?.id) {
          const response = await editAddress({
            id: editData.id,
            body: saveAttempt,
          }).unwrap();
          if (response?.statusCode === 200 || response?.message) {
            toast.success(response?.message || "Address updated successfully");
            finishAddressSave(
              response,
              saveAttempt,
              editData.id,
              dispatch,
              syncHeaderLocationOnSave,
              setOpen,
              onSuccess,
            );
            return;
          }
        } else {
          const response = await createAddress({ body: saveAttempt }).unwrap();
          if (response?.statusCode === 200 || response?.message) {
            toast.success(response?.message || "Address added successfully");
            finishAddressSave(
              response,
              saveAttempt,
              undefined,
              dispatch,
              syncHeaderLocationOnSave,
              setOpen,
              onSuccess,
            );
            return;
          }
        }
      } catch (firstError: any) {
        // If "Other" failed with 422, try alternative formats
        if (formData.address_type === "Other" && (firstError?.status === 422 || firstError?.data?.message?.toLowerCase().includes("invalid"))) {
          // Try "Others" (plural)
          saveAttempt = {
            ...normalizedFormData,
            address_type: "Others",
            address1: normalizedFormData.address1?.trim() || "",
            is_default: normalizedFormData.is_default === 1 ? 1 : 0,
          };
          try {
            if (isEditMode && editData?.id) {
              const response = await editAddress({
                id: editData.id,
                body: saveAttempt,
              }).unwrap();
              if (response?.statusCode === 200 || response?.message) {
                toast.success(response?.message || "Address updated successfully");
                finishAddressSave(
                  response,
                  saveAttempt,
                  editData.id,
                  dispatch,
                  syncHeaderLocationOnSave,
                  setOpen,
                  onSuccess,
                );
                return;
              }
            } else {
              const response = await createAddress({ body: saveAttempt }).unwrap();
              if (response?.statusCode === 200 || response?.message) {
                toast.success(response?.message || "Address added successfully");
                finishAddressSave(
                  response,
                  saveAttempt,
                  undefined,
                  dispatch,
                  syncHeaderLocationOnSave,
                  setOpen,
                  onSuccess,
                );
                return;
              }
            }
          } catch (secondError: any) {
            // If "Others" also fails, throw the original error
            throw firstError;
          }
        } else {
          // Re-throw if it's not an "Other" type error
          throw firstError;
        }
      }
    } catch (error: any) {

      // Handle specific error for "Other" address type - try alternative formats
      if (formData.address_type === "Other" || formData.address_type === "other") {
        const errorMessage = error?.data?.message || error?.message || "";

        // If API doesn't accept "Other" (422 error), the fallback in try-catch above should have tried "Others"
        // If it still fails, show the API error message
        if (errorMessage.toLowerCase().includes("invalid") || error?.status === 422) {
          toast.error(
            error?.data?.message || error?.message || "Failed to save address. Please try again."
          );
          return;
        }
      }

      toast.error(
        error?.data?.message || error?.message || "Something went wrong"
      );
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setActiveIndex(0);
    setErrors({});
    setIsLocationDerivedLocked(false);
    setOpen(false);
    onClose();
  };

  const handleUseThisLocation = () => {
    const lat = parseFloat(String(formData.latitude || ""));
    const lng = parseFloat(String(formData.longitude || ""));
    const hasCoords =
      Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    const addressText = (formData.address || "").trim();
    if (!hasCoords || !addressText) {
      toast.error("Please search/select a valid location first");
      return;
    }

    writeSelectedLocationData({
      latitude: String(formData.latitude),
      longitude: String(formData.longitude),
      address: addressText,
      city: formData.city || "",
      state: formData.state || "",
      pincode: formData.pincode || "",
    });
    persistDeliveryAddressIdForMode("normal", "__current__");
    persistDeliveryAddressIdForMode("quick_delivery", "__current__");
    setNormalDeliverHerePinned(true);
    notifyDeliverySelectionChanged();
    dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
    toast.success("Location selected successfully");
    handleClose();
  };

  if (!open) {
    return null;
  }

    return (
    <Modal
      className="modal address_modal"
      open={open}
      onClose={handleClose}
      aria-labelledby="add-address-modal-title"
    >
      <div className="modal-dialog address_split_dialog">
        <div className="modal-body">


          <div className="address_split_layout">
            <div className="modal_title hd_5 address_split_title">
              <h2 id="add-address-modal-title">
                {isEditMode ? "Edit address" : "Enter complete address"}
              </h2>

              <IconButton
                className="address_close_button"
                onClick={handleClose}
                aria-label="Close Add Address"
              >
                <CloseIcon />
              </IconButton>
            </div>

            <section
              className="address_location_panel"
              aria-label="Choose delivery location"
            >
              <div className="map_view">
                {/* Location Search Input */}
                <div className="address_map_search">
                  <LocationSearch
                    onPlaceSelect={(place) => {
                      if (place && place.geometry && place.geometry.location) {
                        const location = place.geometry.location;
                        // Handle both Google Maps LatLng object (with methods) and plain object (with properties)
                        let lat: number;
                        let lng: number;



                        if (typeof location.lat === 'function') {
                          lat = location.lat();
                        } else {
                          lat = (location.lat as unknown) as number;
                        }

                        if (typeof location.lng === 'function') {
                          lng = location.lng();
                        } else {
                          lng = (location.lng as unknown) as number;
                        }

                        if (Number.isFinite(lat) && Number.isFinite(lng)) {
                          const formattedAddress =
                            place.formatted_address || place.name || "";
                          const resolvedAddress =
                            mapGoogleAddressComponents(
                              place.address_components || [],
                              formattedAddress,
                            );

                          updateSelectedCoordinates(lat, lng, {
                            resolveAddress: false,
                            lockLocationFields: true,
                          });

                          setFormData((prev) => ({
                            ...prev,
                            address: resolvedAddress.address,
                            address1:
                              prev.address1 || resolvedAddress.address1,
                            city: resolvedAddress.city,
                            state: resolvedAddress.state,
                            pincode: resolvedAddress.pincode,
                          }));

                          setSearchQuery(
                            formattedAddress || resolvedAddress.address,
                          );
                        }
                      }
                    }}
                    placeholder="Search location or move pin on map"
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                </div>
                {/* Map with draggable marker */}
                <div className="address_map_canvas">
                  <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
                    <Map
                      style={{ width: "100%", height: "100%" }}
                      center={mapCenter}
                      defaultZoom={15}
                      mapId="my-map"
                      gestureHandling="greedy"
                      scrollwheel={true}
                      mapTypeControl={false}
                      streetViewControl={false}
                      fullscreenControl={false}
                      onClick={(e: any) => {
                        const latLng = e?.detail?.latLng;
                        if (!latLng) return;
                        const lat =
                          typeof latLng.lat === "function" ? latLng.lat() : Number(latLng.lat);
                        const lng =
                          typeof latLng.lng === "function" ? latLng.lng() : Number(latLng.lng);
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                        updateSelectedCoordinates(lat, lng, {
                          source: "add_address_map_click",
                        });
                      }}
                      onCameraChanged={(e: any) => {
                        const center = e?.detail?.center;
                        if (!center) return;
                        setMapCenter({
                          lat: Number(center.lat),
                          lng: Number(center.lng),
                        });
                      }}
                    >
                      <Marker
                        position={mapPosition}
                        draggable
                        onDragEnd={(e: any) => {
                          const latLng = e?.detail?.latLng || e?.latLng;
                          if (!latLng) return;
                          const lat =
                            typeof latLng.lat === "function" ? latLng.lat() : Number(latLng.lat);
                          const lng =
                            typeof latLng.lng === "function" ? latLng.lng() : Number(latLng.lng);
                          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                          updateSelectedCoordinates(lat, lng, {
                            source: "add_address_drag_end",
                          });
                        }}
                      />
                    </Map>
                  </APIProvider>
                </div>
                  <div className="address_map_overlays">
                  <Button
                    className="address_detect_location"
                    sx={{
                      fontSize: "14px !important",
                      gap: "0 !important"
                    }}
                    variant="outlined"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating || isLoading}
                    startIcon={!isLocating ? <MyLocationIcon /> : undefined}
                  >
                    {isLocating ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : (
                      "Use My Location"
                    )}
                  </Button>

                  <div
                    className="address_delivery_summary"
                    aria-live="polite"
                  >
                    <div className="address_selected_location">
                      <LocationOnOutlinedIcon aria-hidden="true" />
                      <div>
                        <strong>
                          {hasSelectedMapLocation
                            ? formData.city ||
                              formData.address ||
                              "Selected delivery location"
                            : "Select a delivery location"}
                        </strong>

                        <p>
                          {hasSelectedMapLocation && formData.address
                            ? formData.address
                            : "Move the pin or search for a location on the map."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="address_details_panel"
              aria-label="Address details"
            >
              <div className="address_content">
              {/* {formData.address && (
                <div className="address_form_location_summary">
                  <MyLocationIcon aria-hidden="true" />
                  <div>
                    <strong>Selected location</strong>
                    <p>{formData.address}</p>
                  </div>
                </div>
              )} */}
              <div className="hd_6">
                <h3>Save address as</h3>
              </div>

              <ul className="save_address">
                {addressTypes.map((type, index) => (
                  <li
                    key={index}
                    className={activeIndex === index ? "active" : ""}
                    onClick={() => handleAddressTypeChange(index)}
                  >
                    {type}
                  </li>
                ))}
              </ul>

              <div className="address_default_row">
                <span>Set as default address</span>

                <div className="address_default_actions">
                  {!isEditMode && showSeeSavedAddressButton ? (
                    <Button
                      className="address_use_location"
                      variant="text"
                      size="small"
                      onClick={handleUseThisLocation}
                      disabled={isLocating || isLoading}
                    >
                      Use This Location
                    </Button>
                  ) : null}

                  <Switch
                    checked={formData.is_default === 1}
                    onChange={(_, checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_default: checked ? 1 : 0,
                      }))
                    }
                    inputProps={{
                      "aria-label": "Set as default address",
                    }}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "var(--commerce-primary)",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: "var(--commerce-primary)",
                        opacity: 1,
                      },
                    }}
                  />
                </div>
              </div>
              <form className="form" onSubmit={(e) => e.preventDefault()}>
              <div className="address_form_section_title" style={{paddingBottom: "1rem"}}>
                  Recipient details
                </div>

                <div className="gap_p">
                  <div className="control_group w_50">
                    <label>Full Name *</label>
                    <TextField
                      fullWidth
                      hiddenLabel
                      variant="outlined"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      error={!!errors.name}
                      sx={getErrorSx(errors.name)}
                      slotProps={{
                        input: {
                          style: {
                            border: `1px solid ${errors.name ? "#f44336" : "#E4E7EC"}`,
                            borderRadius: "10px",
                          },
                        },
                      }}
                    />
                  </div>

                  <div className="control_group w_50">
                    <label>Phone Number *</label>
                    <PhoneInputAny
                      country={(formData.country_code || "IN").toLowerCase()}
                      value={buildFullPhone(
                        formData.phone_code,
                        formData.mobile,
                      )}
                      onChange={handleMobileInputChange}
                      jumpCursorToEnd={false}
                      disableCountryGuess
                      countryCodeEditable={false}
                      enableSearch
                      searchPlaceholder="Search country"
                      placeholder="Enter phone number"
                      containerClass="add-address-phone-input"
                      inputClass={errors.mobile ? "has-error" : ""}
                      enableLongNumbers
                      inputProps={{
                        name: "mobile",
                        required: true,
                        autoComplete: "tel-national",
                        inputMode: "numeric",
                        value: formData.mobile,
                        maxLength:
                          (formData.country_code || "IN").toUpperCase() === "IN"
                            ? 10
                            : undefined,
                        onChange: (
                          event: React.ChangeEvent<HTMLInputElement>,
                        ) => {
                          const nationalNumber = event.target.value;

                          if (!/^\d*$/.test(nationalNumber)) return;

                          const selectedCode =
                            normalizePhoneCode(formData.phone_code) || "91";

                          handleMobileInputChange(
                            buildFullPhone(selectedCode, nationalNumber),
                            {
                              dialCode: selectedCode,
                              countryCode: formData.country_code || "IN",
                            },
                          );
                        },
                        onPaste: (
                          event: React.ClipboardEvent<HTMLInputElement>,
                        ) => {
                          event.preventDefault();

                          const pasted = event.clipboardData
                            .getData("text")
                            .trim();

                          if (!/^\+?[\d\s().-]+$/.test(pasted)) {
                            toast.error("Please paste a valid phone number.");
                            return;
                          }

                          const selectedCode =
                            normalizePhoneCode(formData.phone_code) || "91";
                          const pastedDigits = normalizeLocalMobile(pasted);

                          const isFullNumber =
                            pasted.startsWith("+") ||
                            (selectedCode === "91" &&
                              pastedDigits.length === 12 &&
                              pastedDigits.startsWith("91"));

                          let nextCode = selectedCode;
                          let nextCountry = formData.country_code || "IN";
                          let nextMobile: string;

                          if (isFullNumber) {
                            const normalized = resolvePhoneFields(
                              pasted.startsWith("+") ? pasted : undefined,
                              selectedCode,
                              pasted.startsWith("+") ? undefined : pasted,
                            );

                            nextCode = normalized.phone_code;
                            nextCountry =
                              nextCode === selectedCode
                                ? nextCountry
                                : countryIsoFromDialCode(nextCode);
                            nextMobile = normalized.mobile;
                          } else {
                            const input = event.currentTarget;
                            const start = input.selectionStart ?? 0;
                            const end = input.selectionEnd ?? start;

                            nextMobile =
                              formData.mobile.slice(0, start) +
                              pastedDigits +
                              formData.mobile.slice(end);
                          }

                          if (
                            nextCountry.toUpperCase() === "IN" &&
                            nextMobile.length > 10
                          ) {
                            toast.error(
                              "Please enter a valid 10-digit mobile number.",
                            );
                            return;
                          }

                          handleMobileInputChange(
                            buildFullPhone(nextCode, nextMobile),
                            {
                              dialCode: nextCode,
                              countryCode: nextCountry,
                            },
                          );
                        },
                      }}
                    />
                  </div>

                  <div className="control_group w_50">
                    <label>Email Address *</label>
                    <TextField
                      fullWidth
                      hiddenLabel
                      variant="outlined"
                      type="email"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value.trimEnd())
                      }
                      error={!!errors.email}
                      sx={getErrorSx(errors.email)}
                      slotProps={{
                        input: {
                          style: {
                            border: `1px solid ${errors.email ? "#f44336" : "#E4E7EC"}`,
                            borderRadius: "10px",
                          },
                        },
                      }}
                    />
                  </div>

                  <div className="address_form_section_title w_100">
                    Address details
                  </div>


                  <div className="control_group w_100">
                    <label>Area / Locality / Complete Address *</label>
                    <TextField
                      fullWidth
                      hiddenLabel
                      variant="outlined"
                      placeholder="Enter address here..."
                      multiline
                      minRows={2}
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      error={!!errors.address}
                      sx={getErrorSx(errors.address)}
                      slotProps={{
                        input: {
                          style: {
                            border: `1px solid ${
                              errors.address ? "#f44336" : "#E4E7EC"
                            }`,
                            borderRadius: "10px",
                          },
                        },
                      }}
                    />
                  </div>

                  <div className="control_group w_50">
                                        <label>Flat / House no. / Building name</label>
                    <TextField
                      fullWidth
                      hiddenLabel
                      variant="outlined"
                      placeholder="Enter flat, house number, or building"
                      value={formData.address1}
                      onChange={(e) =>
                        handleInputChange("address1", e.target.value)
                      }
                      sx={getErrorSx(errors.address1)}
                      slotProps={{
                        input: {
                          style: {
                            border: `1px solid ${errors.address1 ? "#f44336" : "#E4E7EC"}`,
                            borderRadius: "10px",
                          },
                        },
                      }}
                    />
                  </div>

                  <div className="control_group w_50">
                    <label>Nearby Landmark (Optional)</label>
                    <TextField
                      fullWidth
                      hiddenLabel
                      variant="outlined"
                      placeholder="Near landmark"
                      value={formData.landmark}
                      onChange={(e) =>
                        handleInputChange("landmark", e.target.value)
                      }
                      error={!!errors.landmark}
                      sx={getErrorSx(errors.landmark)}
                      slotProps={{
                        input: {
                          style: {
                            border: `1px solid ${errors.landmark ? "#f44336" : "#E4E7EC"}`,
                            borderRadius: "10px",
                          },
                        },
                      }}
                    />
                  </div>

                  <div className="address_city_state_row">
                    <div className="control_group">
                      <label>City *</label>
                      <TextField
                        fullWidth
                        hiddenLabel
                        variant="outlined"
                        placeholder="Enter city"
                        value={formData.city}
                        onChange={(e) =>
                          handleInputChange("city", e.target.value)
                        }
                        error={!!errors.city}
                        sx={getErrorSx(errors.city)}
                        slotProps={{
                          input: {
                            style: {
                              border: `1px solid ${
                                errors.city ? "#f44336" : "#E4E7EC"
                              }`,
                              borderRadius: "10px",
                            },
                          },
                        }}
                      />
                    </div>

                    <div className="control_group">
                      <label>State *</label>
                      <TextField
                        fullWidth
                        hiddenLabel
                        variant="outlined"
                        placeholder="Enter state"
                        value={formData.state}
                        onChange={(e) =>
                          handleInputChange("state", e.target.value)
                        }
                        error={!!errors.state}
                        sx={getErrorSx(errors.state)}
                        slotProps={{
                          input: {
                            style: {
                              border: `1px solid ${
                                errors.state ? "#f44336" : "#E4E7EC"
                              }`,
                              borderRadius: "10px",
                            },
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="control_group w_100">
                    <label>Pincode *</label>
                    <TextField
                      fullWidth
                      hiddenLabel
                      variant="outlined"
                      placeholder="Enter pincode (4-10 digits)"
                      value={formData.pincode}
                      onChange={(e) =>
                        handleInputChange("pincode", e.target.value)
                      }
                      error={!!errors.pincode}
                      sx={getErrorSx(errors.pincode)}
                      inputProps={{
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                        maxLength: 10,
                      }}
                      slotProps={{
                        input: {
                          style: {
                            border: `1px solid ${
                              errors.pincode ? "#f44336" : "#E4E7EC"
                            }`,
                            borderRadius: "10px",
                          },
                        },
                      }}
                      helperText={
                        errors.pincode
                          ? "Pincode must be 4-10 digits"
                          : ""
                      }
                    />
                  </div>
                </div>
              </form>

                          <div className="btn_flex address_save_actions">
                <Button
                  className="w_100 br_15"
                  onClick={handleSubmit}
                  disabled={isLoading || isLocating}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : isEditMode ? (
                    "Update Address"
                  ) : (
                    "Save Address"
                  )}
                </Button>

                {showSeeSavedAddressButton ? (
                  <Button
                    className="w_100 br_15"
                    variant="outlined"
                    onClick={() => {
                      onSeeSavedAddressClick?.();
                    }}
                    disabled={isLoading}
                    style={{
                      backgroundColor: "white",
                      color: "var(--commerce-primary)",
                      border: "1px solid var(--commerce-primary)",
                      textTransform: "none",
                      fontWeight: "600",
                    }}
                  >
                    See my saved address
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        </div>

          {isLocating && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(255,255,255,0.8)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                pointerEvents: "none",
              }}
            >
              <CircularProgress
                size={40}
                sx={{ color: "var(--commerce-primary, #d91b76)", mb: 2 }}
              />
              <p style={{ color: "#555", fontSize: 14, textAlign: "center" }}>
                Fetching current location…
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
