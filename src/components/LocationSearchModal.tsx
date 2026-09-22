"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Modal,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocationSearch from "./LocationSearch";
import toast from "react-hot-toast";
import { writeSelectedLocationData } from "@/utils/deliveryAddressSync";
import { canUseBrowserGeolocation } from "@/utils/browserGeolocation";

export type LocationSearchModalLayout = "center" | "drawer";
export type LocationModalVariant = "onboarding" | "change-location";

interface LocationSearchModalProps {
  open: boolean;
  canClose: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    latitude: string;
    longitude: string;
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
    place_id?: string;
    place?: any;
  }) => void;
  apiKey: string;
  /** `drawer`: right sheet + dimmed backdrop (e.g. guest header address). */
  layout?: LocationSearchModalLayout;
  variant?: LocationModalVariant;
  /** Show dashed “Saved addresses” block with login CTA (guest flow). */
  showGuestSavedPrompt?: boolean;
  onGuestLoginClick?: () => void;
  headerDeliverySearch?: boolean;
}

const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  open,
  canClose,
  onClose,
  onLocationSelect,
  apiKey,
  layout = "center",
  variant = "change-location",
  showGuestSavedPrompt = false,
  onGuestLoginClick,
  headerDeliverySearch = false,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const accuracyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup geolocation watch when modal closes
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (accuracyCheckIntervalRef.current) {
        clearInterval(accuracyCheckIntervalRef.current);
        accuracyCheckIntervalRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  const handlePlaceSelect = (place: {
    geometry?: {
      location?: {
        lat(): number;
        lng(): number;
      };
    };
    formatted_address?: string;
    name?: string;
    address_components?: any[];
    place_id?: string;
  } | null) => {
    if (!place || !place.geometry || !place.geometry.location) {
      return;
    }

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
      const addressComponents = place.address_components || [];
      const getComponent = (types: string[]) => {
        const component = addressComponents.find((comp: any) =>
          types.some((type) => comp.types.includes(type)),
        );

        return component ? component.long_name : "";
      };

      const city =
        getComponent(["locality"]) ||
        getComponent(["administrative_area_level_2"]) ||
        "";
      const state = getComponent(["administrative_area_level_1"]) || "";
      const pincode = getComponent(["postal_code"]) || "";

      const locationData = {
        latitude: lat.toString(),
        longitude: lng.toString(),
        address: place.formatted_address || place.name || "",
        city,
        state,
        pincode,
        place_id: place.place_id,
        place: place as any,
      };

      if (
        !locationData.address.trim() ||
        !locationData.city.trim() ||
        !locationData.state.trim() ||
        !locationData.pincode.trim()
      ) {
        const hasAddressDetails =
          Boolean(locationData.address.trim()) &&
          Boolean(locationData.city.trim()) &&
          Boolean(locationData.state.trim());

        toast.error(
          hasAddressDetails && !locationData.pincode.trim()
            ? "Please select a more specific address so we can determine your pincode."
            : "This result does not include all required address details. Please select a more specific street or building address.",
        );
        return;
      }

      writeSelectedLocationData({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        pincode: locationData.pincode,
        place_id: locationData.place_id,
      });

      toast.success(`Location set: ${locationData.address}`);

      onLocationSelect(locationData);
      onClose();
      setSearchValue("");
    }

  };

  // Helper function to fetch address from coordinates
  const fetchAddressFromCoordinates = async (latitude: number, longitude: number) => {
    try {

      const response = await fetch(
        `/api/places/geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
        {
          headers: {
            "x-wc-location-source": "delivery_location_button",
          },
        },
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        // Find the most precise result
        let result = data.results[0];
        const streetAddressResult = data.results.find((r: any) => 
          r.types.includes("street_address") || r.types.includes("premise")
        );
        if (streetAddressResult) {
          result = streetAddressResult;
        }
        
        const address = result.formatted_address || "";
        const addressComponents = result.address_components || [];
        
        const getComponent = (types: string[]) => {
          const component = addressComponents.find((comp: any) =>
            types.some((type) => comp.types.includes(type))
          );
          return component ? component.long_name : "";
        };

        const city =
          getComponent(["locality"]) ||
          getComponent(["administrative_area_level_2"]) ||
          "";
        const state = getComponent(["administrative_area_level_1"]) || "";
        const pincode = getComponent(["postal_code"]) || "";

        const locationData = {
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          address,
          city,
          state,
          pincode,
          place_id: result.place_id,
        };

        if (
          !locationData.address.trim() ||
          !locationData.city.trim() ||
          !locationData.state.trim() ||
          !locationData.pincode.trim()
        ) {
          toast.error("Could not determine a complete delivery address. Please search manually.");
          setIsLocating(false);
          return false;
        }

        writeSelectedLocationData({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address,
          city: locationData.city,
          state: locationData.state,
          pincode: locationData.pincode,
          place_id: locationData.place_id,
        });
        toast.success(`Location set: ${address}`);
        
        // Call onLocationSelect with the location data including address components
        onLocationSelect({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address,
          place: {
            geometry: {
              location: {
                lat: () => latitude,
                lng: () => longitude,
              },
            },
            formatted_address: address,
            address_components: addressComponents,
          },
        });
        
        setIsLocating(false);
        onClose();
        return true;
      } else {
        toast.error("Could not determine address from current location.");
        setIsLocating(false);
        return false;
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      toast.error("Failed to get address from location");
      setIsLocating(false);
      return false;
    }
  };

  // Fallback: Use IP-based geolocation when device geolocation fails
  const useIPBasedLocation = async (
      reason:
        | "insecure_context"
        | "browser_unavailable"
        | "gps_timeout"
        | "gps_unavailable",
    ) => {
    try {
      // First, try to get location from IP using Google's Geolocation API
      try {
        const geoResponse = await fetch(
          "/api/places/geolocate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-wc-location-source": "delivery_location_button",
              "x-wc-location-reason": reason,
            }
          }
        );
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.location && geoData.location.lat && geoData.location.lng) {
            await fetchAddressFromCoordinates(geoData.location.lat, geoData.location.lng);
            return true;
          }
        }
      } catch (googleError) {
      }
      
      // Alternative: Use ipapi.co as fallback
      try {
        const ipResponse = await fetch("https://ipapi.co/json/");
        
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.latitude && ipData.longitude) {
            await fetchAddressFromCoordinates(ipData.latitude, ipData.longitude);
            return true;
          }
        }
      } catch (ipError) {
      }
      
      toast.error("Unable to determine your location. Please enter address manually.");
      setIsLocating(false);
      return false;
    } catch (error) {
      console.error("IP-based geolocation error:", error);
      toast.error("Unable to determine your location. Please enter address manually.");
      setIsLocating(false);
      return false;
    }
  };

  const handleUseCurrentLocation = () => {
    setIsLocating(true);

   if (!canUseBrowserGeolocation()) {
      const reason =
        typeof window !== "undefined" && !window.isSecureContext
          ? "insecure_context"
          : "browser_unavailable";

      void useIPBasedLocation(reason);
      return;
    }

    // High accuracy GPS options
    const gpsOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 60000,
      maximumAge: 0,
    };

    // Target accuracy: accept positions with accuracy < 50 meters
    const TARGET_ACCURACY = 50;
    const MAX_WAIT_TIME = 45000;
    const ACCEPTABLE_ACCURACY = 100;

    let startTime = Date.now();
    let bestPosition: GeolocationPosition | null = null;
    let bestAccuracy = Infinity;

    const stopWatching = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (accuracyCheckIntervalRef.current) {
        clearInterval(accuracyCheckIntervalRef.current);
        accuracyCheckIntervalRef.current = null;
      }
    };

    const handlePositionUpdate = async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      const elapsedTime = Date.now() - startTime;

      // Track best position
      if (accuracy < bestAccuracy) {
        bestPosition = position;
        bestAccuracy = accuracy;
      }

      // If we have excellent accuracy (< 50m), use it immediately
      if (accuracy <= TARGET_ACCURACY) {
        stopWatching();
        await fetchAddressFromCoordinates(latitude, longitude);
        return;
      }

      // If we have good accuracy (< 100m) and waited at least 5 seconds, use it
      if (accuracy <= ACCEPTABLE_ACCURACY && elapsedTime >= 5000) {
        stopWatching();
        await fetchAddressFromCoordinates(latitude, longitude);
        return;
      }

      // If we have any reasonable position (< 500m) after 8 seconds, use it (e.g. desktop WiFi)
      if (accuracy <= 500 && elapsedTime >= 8000) {
        stopWatching();
        await fetchAddressFromCoordinates(latitude, longitude);
        return;
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      stopWatching();

      if (error.code === 1) {
        // PERMISSION_DENIED
        setIsLocating(false);
        toast.error("Location access denied. Please enable location permissions in your browser settings.");
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE - use best position if we have one
        if (bestPosition && bestAccuracy < 500) {
          fetchAddressFromCoordinates(
            bestPosition.coords.latitude,
            bestPosition.coords.longitude
          );
        } else {
          setIsLocating(false);
          void useIPBasedLocation("gps_unavailable");
        }
      } else if (error.code === 3) {
        // TIMEOUT - use best position if we have one
        if (bestPosition && bestAccuracy < 500) {
          fetchAddressFromCoordinates(
            bestPosition.coords.latitude,
            bestPosition.coords.longitude
          );
        } else {
          setIsLocating(false);
          void useIPBasedLocation("gps_timeout");
        }
      } else {
        if (bestPosition && bestAccuracy < 500) {
          fetchAddressFromCoordinates(
            bestPosition.coords.latitude,
            bestPosition.coords.longitude
          );
        } else {
          setIsLocating(false);
          void useIPBasedLocation("gps_unavailable");
        }
      }
    };

    // First try a one-shot getCurrentPosition for a faster result (and to trigger permission prompt)
    const oneShotOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000, // accept cached position up to 1 minute
    };

    //NOSONAR
    navigator?.geolocation?.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await fetchAddressFromCoordinates(latitude, longitude);
      },
      (error) => {
        if (error.code === 1) {
          setIsLocating(false);
          toast.error("Location access denied. Please enable location permissions in your browser settings.");
          return;
        }
        // For timeout or position unavailable, start watchPosition for continuous updates
        startTime = Date.now();
        bestPosition = null;
        bestAccuracy = Infinity;

        accuracyCheckIntervalRef.current = setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime >= MAX_WAIT_TIME) {
            stopWatching();
            if (bestPosition && bestAccuracy < 500) {
              fetchAddressFromCoordinates(
                bestPosition.coords.latitude,
                bestPosition.coords.longitude
              );
            } else {
              setIsLocating(false);
              void useIPBasedLocation("gps_timeout");
            }
          }
        }, 1000);

        //NOSONAR
        watchIdRef.current = navigator.geolocation.watchPosition(
          handlePositionUpdate,
          handleError,
          gpsOptions
        );
      },
      oneShotOptions
    );
  };

  const title = "Welcome to WomanCart";
  const searchPlaceholder = headerDeliverySearch
    ? "Search city, area or address"
    : "Search delivery location";
  const isOnboarding = variant === "onboarding";

    const panelSx: SxProps<Theme> =
      isOnboarding
        ? {
            backgroundColor: "white",
            width: { xs: "100%", md: "min(560px, calc(100vw - 32px))" },
            maxWidth: "100%",
            height: "auto",
            maxHeight: { xs: "75dvh", md: "calc(100dvh - 150px)" },
            overflowX: { xs: "hidden", md: "visible" },
            overflowY: { xs: "auto", md: "visible" },
            display: "flex",
            flexDirection: "column" as const,
            borderRadius: { xs: "18px 18px 0 0", md: "12px" },
            border: "1px solid var(--commerce-border)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
            p: { xs: 2.5, md: 3 },
            pb: { xs: "max(20px, env(safe-area-inset-bottom))", md: 3 },
          }
        : layout === "drawer"
          ? {
              backgroundColor: "white",
              width: { xs: "100%", sm: "min(420px, 100%)" },
              maxWidth: "100%",
              height: "100%",
              overflow: "auto",
              display: "flex",
              flexDirection: "column" as const,
              boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
              p: 2.5,
              pt: 2,
            }
          : {
              backgroundColor: "white",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "95vh",
              minHeight: "500px",
              overflow: "auto",
              p: 4,
            };

           const outerSx: SxProps<Theme> =
  isOnboarding
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: { xs: "flex-end", md: "flex-start" },
        justifyContent: { xs: "center", md: "flex-end" },
        pt: { xs: 0, md: "clamp(64px, 7vh, 128px)" },
        pl: { xs: 0, md: 2 },
        pr: { xs: 0, md: "clamp(32px, 5vw, 80px)" },
        pb: 0,
        boxSizing: "border-box",
      }
    : layout === "drawer"
      ? {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 9999,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "flex-end",
          p: 0,
        }
      : {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        };

  return (
    <Modal
      open={open}
      onClose={canClose ? onClose : undefined}
      aria-labelledby="delivery-location-title"
      aria-describedby="delivery-location-description"
      hideBackdrop
    >
      <Box sx={outerSx} onClick={canClose ? onClose : undefined}>
        <Box
          role="dialog"
          aria-modal="true"
          sx={panelSx}
          onClick={(event) => event.stopPropagation()}
        >
        {layout === "drawer" && (
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: "#E0E0E0",
              alignSelf: "center",
              mb: 1.5,
              flexShrink: 0,
            }}
          />
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: layout === "drawer" ? 2 : 2,
            flexShrink: 0,
          }}
        >
          <Typography
            id="delivery-location-title"
            component="h2"
            sx={{
              m: 0,
              fontSize: layout === "drawer" ? "17px" : "18px",
              fontWeight: 700,
              color: isOnboarding ? "var(--commerce-text)" : "#111",
            }}
          >
            {title}
          </Typography>

          {canClose && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <CloseIcon />
            </button>
          )}

        </Box>


        {isOnboarding ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.25,
              mb: { xs: 2, md: 2.5 },
            }}
          >
            <LocationOnOutlinedIcon
              aria-hidden="true"
              sx={{
                color: "var(--commerce-primary)",
                fontSize: 24,
                flexShrink: 0,
                mt: 0.25,
              }}
            />
            <Typography
              id="delivery-location-description"
              sx={{
                color: "var(--commerce-text)",
                fontSize: { xs: "14px", md: "15px" },
                lineHeight: 1.5,
              }}
            >
              Please provide your delivery location to see products available near you.
            </Typography>
          </Box>
        ) : (
          <Typography
            id="delivery-location-description"
            sx={{
              color: "#555",
              fontSize: "15px",
              lineHeight: 1.5,
              mb: 2.5,
            }}
          >
            Please provide your delivery location to see products available near you.
          </Typography>
        )}

        <Box
          sx={{
            display: isOnboarding ? "flex" : "contents",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            gap: { xs: 0, md: 1.5 },
            width: "100%",
          }}
        >
          <Button
            type="button"
            variant="contained"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            // startIcon={
            //   isLocating ? (
            //     <CircularProgress size={18} color="inherit" />
            //   ) : (
            //     <MyLocationIcon />
            //   )
            // }
            sx={{
              // width: { xs: "100%", md: isOnboarding ? 150 : "100%" },
              flexShrink: isOnboarding ? 0 : undefined,
              minHeight: { xs: 48, md: isOnboarding ? 40 : 48 },
              borderRadius: isOnboarding ? "8px" : "10px",
              fontSize: isOnboarding ? "14px !important" : undefined,
              whiteSpace: isOnboarding ? "nowrap" : undefined,
              textTransform: "none",
              fontWeight: 700,
              backgroundColor: "var(--commerce-primary)",
              color: "#fff",
              border: "1px solid var(--commerce-primary)",
              "&:hover": {
                backgroundColor: "var(--commerce-primary-hover)",
              },
              "&:focus-visible": {
                outline: "3px solid var(--commerce-primary-light)",
                outlineOffset: "2px",
              },
            }}
          >
            {isLocating ? "Detecting location…" : "Use my location"}
          </Button>

          <Typography
            aria-hidden="true"
            sx={{
              my: isOnboarding ? { xs: 1.5, md: 0 } : 2,
              width: isOnboarding ? { xs: "auto", md: 30 } : "auto",
              height: isOnboarding ? { xs: "auto", md: 30 } : "auto",
              flexShrink: isOnboarding ? 0 : undefined,
              display: isOnboarding ? "flex" : "block",
              alignItems: isOnboarding ? "center" : undefined,
              justifyContent: isOnboarding ? "center" : undefined,
              border: isOnboarding
                ? { xs: "none", md: "1px solid var(--commerce-border)" }
                : "none",
              borderRadius: isOnboarding ? "50%" : undefined,
              color: isOnboarding ? "var(--commerce-text)" : "#777",
              fontSize: isOnboarding ? "14px" : "16px",
              fontWeight: 700,
              textAlign: "center"
            }}
          >
            OR
          </Typography>

          <Box
            sx={{
              display: isOnboarding ? "block" : "contents",
              flex: isOnboarding ? 1 : undefined,
              minWidth: 0,
              ...(isOnboarding
                ? {
                    "& .MuiOutlinedInput-root": {
                      minHeight: { xs: 48, md: 40 },
                      height: { xs: 48, md: 40 },
                      padding: { xs: "4px 10px", md: "0 8px" },
                    },
                    "& .MuiOutlinedInput-root input": {
                      padding: { xs: "10px 6px", md: "8px 6px" },
                    },
                  }
                : {}),
            }}
          >
            <LocationSearch
              onPlaceSelect={handlePlaceSelect}
              placeholder={searchPlaceholder}
              apiKey={apiKey}
              value={searchValue}
              onChange={setSearchValue}
              onboardingDropdown={isOnboarding}
              headerDeliverySearch={headerDeliverySearch}
              searchDisabled={headerDeliverySearch && isLocating}
            />
          </Box>
        </Box>

        {layout === "drawer" ? (
          <Box
            component="button"
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            sx={{
              mt: 2,
              display: isOnboarding ? { xs: "flex", md: "none" } : "flex",
              alignItems: "center",
              gap: 1,
              border: "none",
              background: "none",
              padding: 0,
              cursor: isLocating ? "not-allowed" : "pointer",
              color: "var(--commerce-primary)",
              fontSize: "15px",
              fontWeight: 500,
              textAlign: "left",
              opacity: isLocating ? 0.7 : 1,
            }}
          >
            {/* {isLocating ? (
              <CircularProgress size={18} sx={{ color: "var(--commerce-primary)" }} />
            ) : (
              <MyLocationIcon
                sx={{
                  color: "var(--commerce-primary)",
                  fontSize: "20px",
                }}
              />
            )}
            {isLocating ? (
              <span style={{ color: "var(--commerce-primary)" }}>Locating…</span>
            ) : (
              <span style={{ color: "var(--commerce-primary)" }}>Use my current location</span>
            )} */}
          </Box>
        ) : (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "12px 16px",
              border: "1px solid #E4E7EC",
              borderRadius: "8px",
              backgroundColor: "white",
              color: "#333",
              fontSize: "16px",
              fontWeight: 500,
              cursor: isLocating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
              opacity: isLocating ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLocating) {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
                e.currentTarget.style.borderColor = "#E4E7EC";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocating) {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#E4E7EC";
              }
            }}
          >
            {isLocating ? (
              <CircularProgress size={20} sx={{ color: "#333" }} />
            ) : (
              <MyLocationIcon sx={{ color: "#333", fontSize: "20px" }} />
            )}
            {isLocating ? "Locating..." : "Use Current Location"}
          </button>
        )}

        {/* {showGuestSavedPrompt && layout === "drawer" && (
          <Box sx={{ mt: 3, flexShrink: 0 }}>
            <Box
              sx={{
                borderTop: "1px dashed #BDBDBD",
                pt: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#111",
                  mb: 1.5,
                }}
              >
                Saved addresses
              </Typography>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  onGuestLoginClick?.();
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: onGuestLoginClick ? "pointer" : "default",
                  color: "#1976d2",
                  fontSize: "15px",
                  fontWeight: 500,
                }}
              >
                <PersonOutlineIcon sx={{ fontSize: 22, color: "#1976d2" }} />
                Login to see saved addresses
              </Box>
            </Box>
          </Box>
        )} */}
      </Box>
    </Box>
  </Modal>
  );
};

export default LocationSearchModal;
