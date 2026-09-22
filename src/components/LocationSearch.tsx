"use client";
import React, { useState, useEffect, useRef } from "react";
import { TextField, Box, CircularProgress } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import toast from "react-hot-toast";

type SearchAddressComponent = {
  long_name: string;
  short_name?: string;
  types: string[];
};

type SearchPlaceResult = {
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  formatted_address?: string;
  name?: string;
  place_id?: string;
  address_components?: SearchAddressComponent[];
};

function findSearchComponent(
  components: SearchAddressComponent[],
  type: string,
): SearchAddressComponent | undefined {
  return components.find(
    (component) =>
      Array.isArray(component.types) &&
      component.types.includes(type),
  );
}

function searchComponentValue(
  components: SearchAddressComponent[],
  type: string,
): string {
  return String(findSearchComponent(components, type)?.long_name ?? "").trim();
}

function searchCityValue(components: SearchAddressComponent[]): string {
  return (
    searchComponentValue(components, "locality") ||
    searchComponentValue(components, "administrative_area_level_2")
  );
}

function isIndianSearchResult(
  components: SearchAddressComponent[],
): boolean {
  return (
    String(
      findSearchComponent(components, "country")?.short_name ?? "",
    ).toUpperCase() === "IN"
  );
}

function sameSearchComponent(
  selected: SearchAddressComponent[],
  candidate: SearchAddressComponent[],
  type: string,
): boolean {
  const expected = searchComponentValue(selected, type);
  if (!expected) return true;

  const actual = searchComponentValue(candidate, type);
  return Boolean(
    actual &&
      actual.toLocaleLowerCase("en-IN") ===
        expected.toLocaleLowerCase("en-IN"),
  );
}

async function normalizeHeaderSearchPlace(
  place: SearchPlaceResult,
  signal: AbortSignal,
): Promise<SearchPlaceResult> {
  const latitude = place.geometry?.location?.lat;
  const longitude = place.geometry?.location?.lng;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      "This location has no usable map coordinates. Please try another nearby result.",
    );
  }

  const selected = Array.isArray(place.address_components)
    ? place.address_components
    : [];

  if (!isIndianSearchResult(selected)) {
    throw new Error("Please select a location in India.");
  }

  const selectedPincode = searchComponentValue(selected, "postal_code");
  const selectedCity = searchCityValue(selected);
  const selectedState = searchComponentValue(
    selected,
    "administrative_area_level_1",
  );

  if (selectedPincode && selectedCity && selectedState) {
    return place;
  }

  const response = await fetch(
    `/api/places/geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
    {
      signal,
      headers: {
        "x-wc-location-source": "header_search_selection",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      "We couldn't resolve this browsing location right now. Your previous location has not changed. Please try again or choose another nearby result.",
    );
  }

  const data = await response.json();
  const results: SearchPlaceResult[] =
    data.status === "OK" && Array.isArray(data.results)
      ? data.results
      : [];

  const matchingResult = results.find((result) => {
    const components = Array.isArray(result.address_components)
      ? result.address_components
      : [];

    const pincode = searchComponentValue(components, "postal_code");
    const city = searchCityValue(components);
    const state = searchComponentValue(
      components,
      "administrative_area_level_1",
    );

    if (!isIndianSearchResult(components) || !pincode || !city || !state) {
      return false;
    }

    if (
      !sameSearchComponent(
        selected,
        components,
        "administrative_area_level_1",
      )
    ) {
      return false;
    }

    const cityContextType = searchComponentValue(selected, "locality")
      ? "locality"
      : "administrative_area_level_2";

    if (!sameSearchComponent(selected, components, cityContextType)) {
      return false;
    }

    return !selectedPincode || selectedPincode === pincode;
  });

  if (!matchingResult) {
    throw new Error(
      "We couldn't resolve a compatible postcode for this browsing location. Your previous location has not changed. Try another nearby area or Use My Location.",
    );
  }

  const resolved = matchingResult.address_components ?? [];
  const merged = [...selected];

  for (const type of [
    "postal_code",
    "locality",
    "administrative_area_level_2",
    "administrative_area_level_1",
  ]) {
    if (searchComponentValue(merged, type)) continue;

    const component = findSearchComponent(resolved, type);
    if (component) merged.push(component);
  }

  return {
    ...place,
    address_components: merged,
  };
}


const HEADER_DELIVERY_CANDIDATE_TYPES = new Set([
  "street_address",
  "premise",
  "subpremise",
  "route",
  "sublocality",
  "neighborhood",
  "postal_code",
  "establishment",
  "locality",
  "postal_town",
  "administrative_area_level_2",
]);

function isHeaderDeliveryPrediction(prediction: unknown): boolean {
  if (!prediction || typeof prediction !== "object") {
    return false;
  }

  const candidate = prediction as {
    place_id?: unknown;
    description?: unknown;
    types?: unknown;
  };

  if (
    typeof candidate.place_id !== "string" ||
    !candidate.place_id.trim() ||
    typeof candidate.description !== "string" ||
    !candidate.description.trim() ||
    !Array.isArray(candidate.types)
  ) {
    return false;
  }

  const types = candidate.types.filter(
    (type): type is string => typeof type === "string",
  );

  const isBroadResult = types.some(
    (type) =>
      type === "country" ||
      type === "continent" ||
      /^administrative_area_level_[134567]$/.test(type),
  );

  if (isBroadResult) {
    return false;
  }

  return types.some(
    (type) =>
      HEADER_DELIVERY_CANDIDATE_TYPES.has(type) ||
      /^sublocality_level_[1-5]$/.test(type),
  );
}



interface LocationSearchProps {
  onPlaceSelect: (place: {
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
  } | null) => void;
  placeholder?: string;
  apiKey: string;
  value?: string;
  onChange?: (value: string) => void;
  onboardingDropdown?: boolean;
  headerDeliverySearch?: boolean;
  searchDisabled?: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  onPlaceSelect,
  placeholder = "Search for location...",
  apiKey,
  value,
  onChange,
  onboardingDropdown = false,
  headerDeliverySearch = false,
  searchDisabled = false,
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const requestControllerRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef("");
  const lastRequestedQueryRef = useRef("");
    const selectionInFlightRef = useRef(false);

  const getSessionToken = () => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return sessionTokenRef.current;
  };

  const resultsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
    if (!headerDeliverySearch || !searchDisabled) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    requestControllerRef.current?.abort();
    lastRequestedQueryRef.current = "";
    setPredictions([]);
    setShowResults(false);
  }, [headerDeliverySearch, searchDisabled]);

  // Update input value when prop changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      requestControllerRef.current?.abort();
    };
  }, []);


  const fetchPredictions = async (query: string) => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 3) {
      requestControllerRef.current?.abort();
      lastRequestedQueryRef.current = "";
      setPredictions([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      
      const biasQuery = "";

        if (normalizedQuery === lastRequestedQueryRef.current) {
          return;
        }

        lastRequestedQueryRef.current = normalizedQuery;
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;
        const sessionToken = getSessionToken();

      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(
          normalizedQuery,
        )}&sessionToken=${encodeURIComponent(sessionToken)}${biasQuery}${
          headerDeliverySearch ? "&scope=header-delivery" : ""
        }`,
        { signal: controller.signal },
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        const receivedPredictions = Array.isArray(data.predictions)
          ? data.predictions
          : [];

        setPredictions(
          headerDeliverySearch
            ? receivedPredictions.filter(isHeaderDeliveryPrediction)
            : receivedPredictions,
        );
        setShowResults(true);
      } else {
        console.error("Places API error:", data.status, data.error_message);
        setPredictions([]);
        setShowResults(false);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Error fetching predictions:", error);
      setPredictions([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);

    if (headerDeliverySearch) {
      requestControllerRef.current?.abort();
      lastRequestedQueryRef.current = "";
      setPredictions([]);
      setShowResults(false);
    }

    // Debounce API calls
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 350);
  };

  const handleSelectPlace = async (prediction: any) => {
    if (
      headerDeliverySearch &&
      (searchDisabled ||
        selectionInFlightRef.current ||
        !isHeaderDeliveryPrediction(prediction))
    ) {
      return;
    }

    if (headerDeliverySearch) {
      selectionInFlightRef.current = true;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    }

    setInputValue(prediction.description);
    setShowResults(false);
    onChange?.(prediction.description);

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const sessionToken = getSessionToken();
      const detailsResponse = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(
          prediction.place_id,
        )}&sessionToken=${encodeURIComponent(sessionToken)}`,
        { signal: controller.signal },
      );

      if (!detailsResponse.ok) {
        throw new Error("We couldn't load this location. Please try again.");
      }

      const data = await detailsResponse.json();

      if (controller.signal.aborted) return;

      if (data.status !== "OK" || !data.result) {
        if (headerDeliverySearch) {
          throw new Error(
            "We couldn't load this location. Please choose another result.",
          );
        }

        onPlaceSelect(null);
        return;
      }

      const result = headerDeliverySearch
        ? await normalizeHeaderSearchPlace(data.result, controller.signal)
        : data.result;

      if (
        controller.signal.aborted ||
        requestControllerRef.current !== controller
      ) {
        return;
      }

      onPlaceSelect({
        geometry: result.geometry,
        formatted_address: result.formatted_address,
        name: result.name,
        address_components: result.address_components,
        place_id: result.place_id,
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestControllerRef.current !== controller
      ) {
        return;
      }

      if (headerDeliverySearch) {
        toast(
          error instanceof Error && error.message !== "Failed to fetch"
            ? error.message
            : "We couldn't resolve this location right now. Your previous location has not changed. Please try again.",
          { id: "header-search-resolution" },
        );
      } else {
        console.error("Place details error:", error);
        onPlaceSelect(null);
      }
    } finally {
      if (headerDeliverySearch) {
        selectionInFlightRef.current = false;
      }

      if (requestControllerRef.current === controller) {
        sessionTokenRef.current = "";
        lastRequestedQueryRef.current = "";
        setPredictions([]);
      }
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        fullWidth
        placeholder={placeholder}
        disabled={headerDeliverySearch && searchDisabled}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (predictions.length > 0) {
            setShowResults(true);
          }
        }}
        InputProps={{
          startAdornment: <SearchIcon sx={{ color: "#666 !important", mr: 1, ml: 1.5 }} />,
          endAdornment: isSearching ? (
            <CircularProgress size={20} sx={{ mr: 1 }} />
          ) : null,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            minHeight: "56px",
            fontSize: "16px",
            padding: "8px 14px",
            "& input": {
              padding: "12px 8px",
              fontSize: "16px",
            },
            "& fieldset": {
              borderColor: "#E4E7EC !important",
            },
            "&:hover fieldset": {
              borderColor: "#E4E7EC !important",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#E4E7EC !important",
              borderWidth: "1px !important",
            },
            "&.Mui-focused": {
              borderColor: "#E4E7EC !important",
            },
          },
        }}
      />
            {showResults &&
        (predictions.length > 0 ||
          (headerDeliverySearch && !isSearching)) && (
        <Box
          ref={resultsRef}
          sx={{
            position: onboardingDropdown
              ? { xs: "static", md: "absolute" }
              : "absolute",
            top: onboardingDropdown
              ? { xs: "auto", md: "100%" }
              : "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #E4E7EC",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            maxHeight: onboardingDropdown
              ? { xs: "min(240px, 35dvh)", md: "280px" }
              : "400px",
            minHeight:
              onboardingDropdown ||
              (headerDeliverySearch && predictions.length === 0)
                ? 0
                : "200px",
            overflowY: "auto",
            zIndex: 1001,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            mt: 0.5,
          }}
        >
          {headerDeliverySearch &&
            !isSearching &&
            predictions.length === 0 && (
              <Box
                role="status"
                sx={{
                  p: 2,
                  color: "#666",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                No supported locations found. Search for a city, area,
                street or building in India.
              </Box>
            )}

          {predictions.slice(0, 10).map((prediction) => (
            <Box
              key={prediction.place_id}
              onClick={() => handleSelectPlace(prediction)}
              sx={{
                p: 2.5,
                cursor: "pointer",
                borderBottom: "1px solid #f0f0f0",
                minHeight: "60px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                "&:last-child": {
                  borderBottom: "none",
                },
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
            >
              <Box sx={{ fontWeight: 500, fontSize: "15px", color: "#333", lineHeight: 1.4 }}>
                {prediction.structured_formatting?.main_text || prediction.description}
              </Box>
              {prediction.structured_formatting?.secondary_text && (
                <Box sx={{ fontSize: "13px", color: "#666", mt: 0.5, lineHeight: 1.4 }}>
                  {prediction.structured_formatting.secondary_text}
                </Box>
              )}
            </Box>
          ))}

        </Box>
      )}
    </Box>
  );
};

export default LocationSearch;
