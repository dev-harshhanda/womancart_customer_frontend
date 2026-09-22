/* eslint-disable @next/next/no-img-element */
"use client";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Backdrop,
  Badge,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useSearchAllQuery } from "@/service/search"; // Add this line
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MenuIcon from "@mui/icons-material/Menu";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import IconButton from "@mui/material/IconButton";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { getFromStorage, setToStorage, removeFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { useLazyGetProfileQuery, useLazyGetBrandsQuery } from "@/service/auth";
import { setUser, getToken, getCurrentUser } from "@/lib/slices/authSlice";
import { useViewAllCategoryQuery } from "@/service/home";
import { useGetThemeSettingQuery } from "@/service/theme";
import { useGetCartQuery } from "@/service/cart";
import { sumCartLineQuantities } from "@/utils/cartQuantity";
import { useGetAddressListQuery } from "@/service/address";
import { Address } from "@/types/General";
import { useLazyGetWishlistQuery } from "@/service/wishlist";
import PushNotificationInit from "@/components/PushNotificationInit";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  setWishlistProductIds,
  getWishlistProductIds,
} from "@/lib/slices/wishlistSlice";
import { useNavigateWithDeliveryMode } from "@/hooks/useNavigateWithDeliveryMode";
import {
  getDeliveryMode,
  getDeliveryChannel,
  setDeliveryModePersisted,
} from "@/utils/deliveryMode";
import {
  DELIVERY_SELECTION_CHANGED,
  getDeliveryDisplayLabel,
  notifyDeliverySelectionChanged,
  isNormalDeliverHerePinned,
  persistDeliveryAddressIdForMode,
  readPersistedDeliveryAddressId,
  setNormalDeliverHerePinned,
  readSelectedLocation,
  resolveAddressForOrder,
  resolveDeliveryAddressId,
  clearSelectedLocationStorage,
  resetDeliverySelectionAfterLogin,
  hasGuestCommittedSearchLocationForLogin,
  hasPersistedDeliverySelection,
  hasUsableDeliveryLocation,
  restoreCommittedDeliverySelection,
  writeSelectedLocationData,
  hasQuickDeliveryGpsCoords,
  writeSelectedLocationFromAddress,
} from "@/utils/deliveryAddressSync";

import emptySplitApi from "@/lib/rtk";
import { formatPriceInr } from "@/utils/format";
import { buildMyAddressUrlWithReturnTo } from "@/utils/safeReturnPath";
import { buildCategoryUrl, buildBrandUrl, getProductSlugFromPath } from "@/utils/urlBuilder";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { useGetReferralStatsQuery } from "@/lib/rtk";
import toast from "react-hot-toast";
import SearchIcon from "@mui/icons-material/Search";
import BrandsListing from "@/components/brands/BrandsListing";
import LocationSearchModal from "@/components/LocationSearchModal";
import QuickDeliveryInfoTooltip from "@/components/QuickDeliveryInfoTooltip";
import AddAddress from "@/modal/addAddress";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** One successful GPS fill per tab session avoids repeat prompts; cleared when switching back to normal. */
const WC_QUICK_GPS_FILLED_SESSION = "wcQuickGpsFilledSession";
const WC_LOCATION_PROMPT_DISMISSED_SESSION = "wcLocationPromptDismissedSession";
const WC_QUICK_DELIVERY_INFO_SHOWN_SESSION = "WC_QUICK_DELIVERY_INFO_SHOWN_SESSION";

/** Max rows per group in the header search typeahead (products / brands / categories). */
const SEARCH_DROPDOWN_SECTION_LIMIT = 5;

const menuCategories = [
  {
    title: "Face",
    image: "/images/main_menu_01.png",
    items: [
      "Foundation",
      "Loose Powder",
      "Serum & Essence",
      "Face Primer",
      "Concealer",
      "Compact",
      "Base Makeup",
      "Setting Powder",
      "Hydrating Serum",
      "Makeup Primer",
      "Spot Concealer",
      "Pressed Powder",
      "Foundation",
      "Loose Powder",
      "Serum & Essence",
      "Face Primer",
      "Concealer",
    ],
  },
  {
    title: "Eyes",
    image: "/images/main_menu_02.png",
    items: [
      "Eye Liner",
      "Kajal",
      "Eye Shadow",
      "Mascara",
      "Eyebrow Enhancer",
      "False Eyelashes",
      "Eye Primer",
    ],
  },
  {
    title: "Lips",
    image: "/images/main_menu_03.png",
    items: [
      "Eye Liner",
      "Kajal",
      "Eye Shadow",
      "Mascara",
      "Eyebrow Enhancer",
      "False Eyelashes",
      "Eye Primer",
      "Eye Liner",
      "Kajal",
      "Eye Shadow",
      "Mascara",
      "Eyebrow Enhancer",
      "False Eyelashes",
      "Eye Primer",
      "Eye Liner",
    ],
  },
  {
    title: "Nails",
    image: "/images/main_menu_04.png",
    items: [
      "Eye Liner",
      "Kajal",
      "Eye Shadow",
      "Mascara",
      "Eyebrow Enhancer",
      "False Eyelashes",
      "Eye Primer",
      "Eye Liner",
      "Kajal",
      "Eye Shadow",
      "Mascara",
      "Eyebrow Enhancer",
      "False Eyelashes",
      "Eye Primer",
      "Eye Liner",
    ],
  },
  {
    title: "Tools & Brushes",
    image: "/images/main_menu_05.png",
    items: [
      "Eye Liner",
      "Kajal",
      "Eye Shadow",
      "Mascara",
      "Eyebrow Enhancer",
      "False Eyelashes",
      "Eye Primer",
    ],
  },
  {
    title: "Makeup Kits & Combos",
    image: "/images/main_menu_06.png",
    items: [
      "Eye Liner",
      "Kajal",
      "Eye Shadow",
      "Mascara",
      "Eyebrow Enhancer",
      "False Eyelashes",
      "Eye Primer",
    ],
  },
];

function formatHeaderAddressTypeLabel(addressType?: string | null): string {
  const t = addressType?.trim();
  if (!t) return "Delivery";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Tinted chip background by saved address type; stable hues for common types, hashed for others. */
function deliveryTriggerPalette(addressType?: string | null): {
  bg: string;
  hoverBg: string;
  border: string;
} {
  const key = addressType?.toLowerCase().trim() || "";
  if (key === "home") {
    return {
      bg: "rgba(251, 72, 152, 0.12)",
      hoverBg: "rgba(251, 72, 152, 0.2)",
      border: "rgba(251, 72, 152, 0.38)",
    };
  }
  if (key === "office" || key === "work") {
    return {
      bg: "rgba(99, 102, 241, 0.14)",
      hoverBg: "rgba(99, 102, 241, 0.24)",
      border: "rgba(99, 102, 241, 0.36)",
    };
  }
  if (!key) {
    return {
      bg: "rgba(255, 255, 255, 0.95)",
      hoverBg: "rgba(250, 250, 250, 1)",
      border: "#E4E7EC",
    };
  }
  let hue = 200;
  for (let i = 0; i < key.length; i += 1) {
    hue = (hue + key.charCodeAt(i) * 17) % 360;
  }
  return {
    bg: `hsla(${hue}, 42%, 94%, 0.98)`,
    hoverBg: `hsla(${hue}, 48%, 90%, 1)`,
    border: `hsla(${hue}, 38%, 78%, 0.95)`,
  };
}

function Header() {
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery("(max-width:991px)"); // Tablet and Mobile

  const [getProfile] = useLazyGetProfileQuery();
  const [getWishlist] = useLazyGetWishlistQuery();
  const authToken = useAppSelector(getToken);
  const profileUser = useAppSelector(getCurrentUser); // Get user from Redux (from getProfile API)

  // Get pathname to check if we're on auth pages
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth/") || false;

  const dashboardLocationArgs = useDashboardHomeQueryArgs();

  // Fetch location-aware categories; do not fallback to static category list when API returns empty.
  const {
    data: categoriesData,
    refetch: refetchCategories,
    isLoading: isCategoriesLoading,
    isFetching: isCategoriesFetching,
  } =
    useViewAllCategoryQuery({
      latitude: dashboardLocationArgs.latitude,
      longitude: dashboardLocationArgs.longitude,
      type: dashboardLocationArgs.type,
    }, {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    });

  const apiCategories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

  // Persistent fallback so categories appear instantly on every navigation
  // (e.g. auth/login Skip → home) without waiting for the API round-trip.
  const [cachedCategories, setCachedCategories] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = getFromStorage(STORAGE_KEYS.cachedHeaderCategories);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const next = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
    if (next.length > 0) {
      setCachedCategories(next);
      try {
        setToStorage(
          STORAGE_KEYS.cachedHeaderCategories,
          JSON.stringify(next),
        );
      } catch {
        /* ignore quota / serialization errors */
      }
    }
  }, [categoriesData]);

  // Prefer fresh data when available; fall back to last cached snapshot so the
  // megamenu never flashes "Loading categories..." once we've fetched once.
  const categories = apiCategories.length > 0 ? apiCategories : cachedCategories;

  // Location/delivery arg changes are handled by RTK Query automatically.
  const prevAuthTokenRef = React.useRef(authToken);
  useEffect(() => {
    if (prevAuthTokenRef.current !== authToken) {
      prevAuthTokenRef.current = authToken;
      refetchCategories();
    }
  }, [authToken, refetchCategories]);

  // Subscribed query so ADDRESS tag invalidations (save / default / delete) refresh the header chip
  const {
    data: addressResponse,
    refetch: refetchAddressList,
    isLoading: addressListLoading,
    isFetching: addressListFetching,
    isUninitialized: addressListUninitialized,
  } = useGetAddressListQuery(undefined, {
    skip:
      isAuthPage ||
      !(
        authToken ||
        (typeof window !== "undefined" && getFromStorage(STORAGE_KEYS.token))
      ),
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const addresses = addressResponse?.data || [];

  // Fetch referral stats
  const { data: referralStatsData } = useGetReferralStatsQuery(undefined, {
    skip: isAuthPage || !authToken,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const referralStats = referralStatsData?.data?.stats;

  const hasCachedThemeSetting = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = getFromStorage(STORAGE_KEYS.themeSetting);
      return Boolean(raw && JSON.parse(raw)?.data?.length);
    } catch {
      return false;
    }
  }, []);

  // Fetch theme setting and store in localStorage.
  // Skip when cached (SSR already applied CSS vars) or on auth pages.
  const { data: themeSettingData } = useGetThemeSettingQuery(undefined, {
    skip: isAuthPage || hasCachedThemeSetting,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  useEffect(() => {
    if (themeSettingData) {
      setToStorage(STORAGE_KEYS.themeSetting, JSON.stringify(themeSettingData));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("themeSettingUpdated"));
      }
    }
  }, [themeSettingData]);

  // Fetch brands from API — load on demand when the brands menu opens (not on every page load).
  const [getBrands] = useLazyGetBrandsQuery();
  const [allBrands, setAllBrands] = React.useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = getFromStorage(STORAGE_KEYS.cachedBrands);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const brandsFetchInFlightRef = React.useRef(false);

  const router = useRouter();
  const { navigate } = useNavigateWithDeliveryMode();
  const [scrollClass, setScrollClass] = useState("");

  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  /** Suggestions only while input is focused (results pages stay quiet like Flipkart). */
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const searchBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [mobileCategoryListOpen, setMobileCategoryListOpen] = useState(false);
  const [mobileMenuTab, setMobileMenuTab] = useState<"categories" | "brands">("categories");
  const [expansionStack, setExpansionStack] = useState<number[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const trimmedSearchTerm = debouncedSearchTerm.trim();
  const showSearchSuggestions =
    searchInputFocused && trimmedSearchTerm.length > 0;

  const handleSearchFocus = useCallback(() => {
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
    setSearchInputFocused(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    searchBlurTimeoutRef.current = setTimeout(() => {
      setSearchInputFocused(false);
      searchBlurTimeoutRef.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
      }
    };
  }, []);

  const toggleSearch = () => {
    setSearchOpen((prev) => !prev);
  };

  /** Close suggestions + mobile tray after picking a result or navigating; keeps the query text. */
  const dismissSearchDropdown = useCallback(() => {
    setSearchOpen(false);
    setSearchInputFocused(false);
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
    searchInputRef.current?.blur();
  }, []);

  /** Clear input (X button, route change, Categories / Brands). */
  const clearSearchInput = useCallback(() => {
    setSearchOpen(false);
    setSearchInputFocused(false);
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
    searchInputRef.current?.blur();
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, []);

  const toggleCategoryAccordion = (catId: number, level: number) => {
    setExpansionStack(prev => {
      // If expanding a new item at this level or deeper
      if (prev.includes(catId)) {
        // Collapsing - remove this and all deeper
        const idx = prev.indexOf(catId);
        return prev.slice(0, idx);
      } else {
        // Expanding - remove any siblings at the same level or deeper, then add this
        return [...prev.slice(0, level), catId];
      }
    });
  };

  const handleMobileBack = () => {
    setExpansionStack(prev => {
      if (prev.length > 0) {
        return prev.slice(0, prev.length - 1);
      }
      return prev;
    });
  };

  const MobileCategoryItem = ({ cat, level = 0 }: { cat: any; level: number }) => {
    const catId = cat.id || cat.category_id;
    const isExpanded = expansionStack.includes(catId);
    const hasChildren = cat.children && cat.children.length > 0;

    return (
      <Box sx={{ borderBottom: level === 0 ? "1px solid #f0f0f0" : "none" }}>
        <Box
          onClick={() => {
            if (hasChildren) {
              toggleCategoryAccordion(catId, level);
            } else {
              navigate(`/product/product-category/?categoryIds=${catId}`);
              handleCloseCategory();
            }
          }}
          sx={{
            px: 2,
            pl: level > 0 ? 2 + level * 2 : 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor:
              level === 0 && isExpanded
                ? "var(--commerce-primary)"
                : "#fff",
            color: (level === 0 && isExpanded) ? "#fff" : "#333",
            transition: "all 0.3s ease",
            cursor: "pointer",
            borderBottom: level > 0 && !isExpanded ? "1px solid #f9f9f9" : "none"
          }}
        >
          <Typography sx={{
            fontWeight: level === 0 ? 600 : 400,
            fontSize: level === 0 ? "15px" : "14px",
            color: "inherit"
          }}>
            {cat.name || cat.category_name}
          </Typography>
          {hasChildren && (
            <IconButton size="small" sx={{ color: "inherit", p: 0 }}>
              {isExpanded ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>
        {isExpanded && hasChildren && (
          <Box sx={{ bgcolor: "#fff" }}>
            {level === 0 && (
              <Box
                onClick={() => {
                  navigate(`/product/product-category/?categoryIds=${catId}`);
                  handleCloseCategory();
                }}
                sx={{
                  px: 2,
                  pl: 4,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: "#fff",
                  color: "#333",
                  cursor: "pointer",
                  borderBottom: "1px solid #f9f9f9"
                }}
              >
                <Typography sx={{ fontSize: "14px", fontWeight: 400 }}>
                  View All
                </Typography>
              </Box>
            )}
            {cat.children.map((child: any, idx: number) => (
              <MobileCategoryItem key={`mobile-cat-${child.id || idx}`} cat={child} level={level + 1} />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const searchLocationArgs = useDashboardHomeQueryArgs();
  const {
    data: searchResults,
    isLoading,
    isFetching,
    error,
  } = useSearchAllQuery(
    {
      search: trimmedSearchTerm,
      latitude: searchLocationArgs.latitude,
      longitude: searchLocationArgs.longitude,
      type: searchLocationArgs.type,
    },
    {
      // Only skip when there's no input; allow single-character search
      skip: trimmedSearchTerm.length === 0,
    },
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") return;
    const q = searchTerm.trim();
    if (!q) return;
    event.preventDefault();
    const sp = new URLSearchParams();
    sp.set("search", q);
    navigate(`/search?${sp.toString()}`);
    dismissSearchDropdown();
  };

  const handleSendInvite = () => {
    if (!referralStats?.referral_code) {
      toast.error("Referral code not available");
      return;
    }
    const referralLink = `${window.location.origin}/referral/${referralStats.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  // Get current delivery mode (normal or quick)
  const deliveryMode = getDeliveryMode(searchParams);
  const wishlistType = getDeliveryChannel(searchParams);
  const wishlistProductIds = useAppSelector((state) =>
    getWishlistProductIds(state, wishlistType),
  );

  // Get token from Redux
  const token = useAppSelector((state) => state.auth.token);

  // Also check token from localStorage as fallback (for immediate updates)
  const [localToken, setLocalToken] = useState<string | null>(null);
  const [authStorageChecked, setAuthStorageChecked] = useState(false);
  const [guestTokenTick, setGuestTokenTick] = useState(0);

  // Get user credentials from storage
  const [userData, setUserData] = useState<any>(null);

  // Check token from localStorage on mount and when it changes
  useEffect(() => {
    const storedToken = getFromStorage(STORAGE_KEYS.token);
    setLocalToken(storedToken);
    setAuthStorageChecked(true);
  }, [token]);

  // Fetch wishlist when user is logged in - skip on auth pages (type = current delivery: quick or normal)
  useEffect(() => {
    const fetchWishlist = async () => {
      const currentToken = token || localToken || authToken;
      if (currentToken && !isAuthPage) {
        try {
          const response = await getWishlist({ type: wishlistType }).unwrap();
          const rawData = response?.data;
          const list = Array.isArray(rawData) ? rawData : (rawData as any)?.data;
          const productIds = Array.isArray(list)
            ? list.map((item: any) => item.product?.product_id || item.product_id)
            : [];
          dispatch(setWishlistProductIds({ type: wishlistType, productIds }));
        } catch (error) {

        }
      }
    };

    fetchWishlist();
  }, [token, localToken, authToken, isAuthPage, getWishlist, dispatch, wishlistType]);

  useEffect(() => {
    // Get user data from storage
    const loadUserData = () => {
      const credentialsStr = getFromStorage(STORAGE_KEYS.credentials);
      if (credentialsStr) {
        try {
          const credentials = JSON.parse(credentialsStr);
          setUserData(credentials);
        } catch (error) {
          console.error("Error parsing credentials:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
    };

    // Load user data on mount and when token changes
    loadUserData();

    // Also listen for custom storage events (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadUserData();
      // Also refresh token from localStorage
      const storedToken = getFromStorage(STORAGE_KEYS.token);
      setLocalToken(storedToken);
      // Refetch profile data and other data to get latest user info (address, wishlist, etc.)
      if (storedToken && !isAuthPage) {
        fetchProfile();
        // Refetch address list
        void refetchAddressList();
        // Refetch wishlist with current delivery type
        getWishlist({ type: wishlistType })
          .then((response) => {
            const rawData = response?.data;
            const list = Array.isArray(rawData) ? rawData : (rawData as any)?.data?.data ?? (rawData as any)?.data;
            const productIds = Array.isArray(list)
              ? list.map(
                (item: any) => item.product?.product_id || item.product_id,
              )
              : [];
            dispatch(setWishlistProductIds({ type: wishlistType, productIds }));
          })
          .catch(() => {
            // Silently handle errors
          });
      }
    };

    // Listen for storage changes (when user logs in/out or updates profile)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.credentials) {
        loadUserData();
      }
      if (e.key === STORAGE_KEYS.token) {
        setLocalToken(e.newValue);
      }
    };

    // Listen for custom events (for same-tab updates)
    window.addEventListener("credentialsUpdated", handleCustomStorageChange);
    window.addEventListener("profileUpdated", handleCustomStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "credentialsUpdated",
        handleCustomStorageChange,
      );
      window.removeEventListener("profileUpdated", handleCustomStorageChange);
    };
  }, [token, isAuthPage, wishlistType, getWishlist, dispatch]); // Reload when token changes

  // Separate effect to check for credentials when token exists but userData doesn't
  useEffect(() => {
    const currentToken = token || localToken;
    if (currentToken && !userData) {
      const checkInterval = setInterval(() => {
        const credentialsStr = getFromStorage(STORAGE_KEYS.credentials);
        if (credentialsStr) {
          try {
            const credentials = JSON.parse(credentialsStr);
            setUserData(credentials);
            clearInterval(checkInterval);
          } catch (error) {
            console.error("Error parsing credentials:", error);
          }
        }
      }, 100);

      // Clear interval after 2 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkInterval), 2000);

      return () => clearInterval(checkInterval);
    }
  }, [token, localToken, userData]);

  // Check if user is logged in (has token from Redux or localStorage)
  const isLoggedIn = !!(token || localToken);
  const guestNodeToken = getFromStorage(STORAGE_KEYS.guestJwtToken);
  const hasGuestCartSession = !!guestNodeToken;
  /** Logged-in user or guest session (node JWT) — cart APIs use AuthorizationNode for guests. */
  const canAccessCart = isLoggedIn || hasGuestCartSession;

  useEffect(() => {
    const onGuestTokenUpdated = () => setGuestTokenTick((n) => n + 1);
    window.addEventListener("guestTokenUpdated", onGuestTokenUpdated);
    return () => {
      window.removeEventListener("guestTokenUpdated", onGuestTokenUpdated);
    };
  }, []);

  const handleClick = () => { };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setScrollClass("scrolled");
      } else {
        setScrollClass("");
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const [selectedAddressId, setSelectedAddressId] = React.useState<string>("");
  /** Bumps when SELECTED_LOCATION changes so __current__ label re-reads storage (React may skip setState if id unchanged). */
  const [locationLabelTick, setLocationLabelTick] = React.useState(0);

  const applyResolvedHeaderAddress = React.useCallback(() => {
    if (!addresses.length) {
      if (deliveryMode === "quick_delivery") {
        setSelectedAddressId("__current__");
        return;
      }
      const loc = readSelectedLocation();
      const lat = loc ? parseFloat(String(loc.latitude)) : NaN;
      const lng = loc ? parseFloat(String(loc.longitude)) : NaN;
      const hasCoords =
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        !(lat === 0 && lng === 0);
      setSelectedAddressId(hasCoords ? "__current__" : "");
      return;
    }
    const id = resolveDeliveryAddressId(addresses, deliveryMode);
    setSelectedAddressId(id);
  }, [addresses, deliveryMode]);

  // Use layout effects so we react to initial session GPS priming ASAP
  // (otherwise a very fast prime can happen before effects subscribe).
  useLayoutEffect(() => {
    applyResolvedHeaderAddress();
  }, [applyResolvedHeaderAddress]);

  useLayoutEffect(() => {
    const handler = () => {
      applyResolvedHeaderAddress();
      setLocationLabelTick((n) => n + 1);
    };
    window.addEventListener(DELIVERY_SELECTION_CHANGED, handler);
    return () => window.removeEventListener(DELIVERY_SELECTION_CHANGED, handler);
  }, [applyResolvedHeaderAddress]);

  const headerDeliveryLabel = useMemo(
    () => getDeliveryDisplayLabel(selectedAddressId, addresses),
    [selectedAddressId, addresses, locationLabelTick],
  );

  const headerPrimaryAddress = useMemo(
    (): Address | null => resolveAddressForOrder(selectedAddressId, addresses),
    [selectedAddressId, addresses],
  );

  const headerAddressTypeLabel = useMemo(
    () => formatHeaderAddressTypeLabel(headerPrimaryAddress?.address_type),
    [headerPrimaryAddress],
  );

  const deliveryTriggerColors = useMemo(
    () => deliveryTriggerPalette(headerPrimaryAddress?.address_type),
    [headerPrimaryAddress],
  );

  /** Sync stored coordinates when a saved address id is active (dashboard + header). */
  React.useEffect(() => {
    if (
      getDeliveryMode(searchParams) === "quick_delivery" &&
      readPersistedDeliveryAddressId("quick_delivery") === "__current__"
    ) {
      return;
    }
    if (!selectedAddressId || selectedAddressId === "__current__") return;
    const addr = addresses.find((a) => a.id.toString() === selectedAddressId);
    if (!addr) return;
    const loc = readSelectedLocation();
    const nextLat = String(addr.latitude ?? "0");
    const nextLng = String(addr.longitude ?? "0");
    if (
      loc?.latitude === nextLat &&
      loc?.longitude === nextLng &&
      loc?.pincode === addr.pincode &&
      loc?.city === addr.city
    ) {
      return;
    }
    writeSelectedLocationFromAddress(addr);
    notifyDeliverySelectionChanged();
  }, [selectedAddressId, addresses, searchParams]);

  const handleGuestDeliveryLocationSelect = useCallback(() => {
    const mode =
      getDeliveryMode(searchParams) === "quick_delivery"
        ? "quick_delivery"
        : "normal";

    // Guest explicit choice (map/search) should stay active across both modes
    // until the user changes it again, so persist "__current__" for normal
    // and quick_delivery together.
    persistDeliveryAddressIdForMode("normal", "__current__");
    persistDeliveryAddressIdForMode("quick_delivery", "__current__");

    if (mode === "normal") {
      setNormalDeliverHerePinned(true);
    }

    notifyDeliverySelectionChanged();
    dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
  }, [dispatch, searchParams]);

  const handleDeliveryAddressClick = () => {
    setGuestDeliveryDrawerOpen(true);
  };

  const [quickLocationLoading, setQuickLocationLoading] = useState(false);
  const [guestDeliveryDrawerOpen, setGuestDeliveryDrawerOpen] = useState(false);
  const [headerAddressMapModalOpen, setHeaderAddressMapModalOpen] = useState(false);
  const [quickDeliveryInfoOpen, setQuickDeliveryInfoOpen] = useState(false);

  const mobileQuickDeliveryButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopQuickDeliveryButtonRef = useRef<HTMLButtonElement | null>(null);
  const [quickDeliveryAnchorEl, setQuickDeliveryAnchorEl] =
    useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    const updateQuickDeliveryAnchor = () => {
      const mobileButton = mobileQuickDeliveryButtonRef.current;
      const desktopButton = desktopQuickDeliveryButtonRef.current;

      const visibleButton =
        mobileButton?.getClientRects().length
          ? mobileButton
          : desktopButton?.getClientRects().length
            ? desktopButton
            : null;

      setQuickDeliveryAnchorEl(visibleButton);
    };

    updateQuickDeliveryAnchor();
    window.addEventListener("resize", updateQuickDeliveryAnchor);
    return () => {
      window.removeEventListener("resize", updateQuickDeliveryAnchor);
    };
  }, []);



  const handleLocationPromptClose = useCallback(() => {
    const mode =
      getDeliveryMode(searchParams) === "quick_delivery"
        ? "quick_delivery"
        : "normal";

    const hasUsableLocation = hasUsableDeliveryLocation(addresses, mode);

    if (!hasUsableLocation) {
      try {
        sessionStorage.setItem(
          WC_LOCATION_PROMPT_DISMISSED_SESSION,
          "1",
        );
      } catch {
        /* ignore */
      }
    }

    setGuestDeliveryDrawerOpen(false);

    if (mode === "quick_delivery" && !hasUsableLocation) {
      setDeliveryModePersisted("normal");

      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("mode");

      const query = params.toString();
      router.replace(
        query ? `${pathname || "/"}?${query}` : pathname || "/",
      );
    }
  }, [addresses, pathname, router, searchParams]);
  /** Full-screen overlay while explicitly toggling WomenCart ↔ Quick Delivery (not background GPS refresh). */
  const [deliveryModeSwitchPending, setDeliveryModeSwitchPending] =
    useState(false);
  const quickGeoInFlightRef = useRef(false);
  const prevIsLoggedInForDeliveryRef = useRef<boolean | null>(null);
  const postLoginDeliveryApplyPendingRef = useRef(false);

  /** Address chip + quick tab: loading only while GPS/reverse-geocode is actually in progress (avoids infinite "Getting location…"). */
  const showDeliveryHeaderLocationLoader = false;

  const applyNormalDeliveryLocationFromSaved = useCallback(() => {
    if (
      isLoggedIn &&
      addresses.length === 0 &&
      (addressListLoading || addressListFetching)
    ) {
      return;
    }
    const persisted = readPersistedDeliveryAddressId("normal");
    if (persisted && persisted !== "__current__") {
      const addr = addresses.find((a) => a.id.toString() === persisted);
      if (addr) {
        // Pin must stay set so resolveDeliveryAddressId(normal) uses this id, not only the API default.
        setNormalDeliverHerePinned(true);
        writeSelectedLocationFromAddress(addr);
        notifyDeliverySelectionChanged();
        dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
        return;
      }
    }

    // Explicit current-pin selection should survive quick<->normal toggles.
    if (persisted === "__current__" && hasQuickDeliveryGpsCoords()) {
      setNormalDeliverHerePinned(true);
      notifyDeliverySelectionChanged();
      dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
      return;
    }

    setNormalDeliverHerePinned(false);
    // If we already have a live pin (current location / search), keep it.
    // Just having addresses in the list should not override the header until user explicitly chooses one.
    if (hasQuickDeliveryGpsCoords()) {
      notifyDeliverySelectionChanged();
      dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
      return;
    }
    const defaultAddr =
      addresses.find((a) => Number(a.is_default) === 1) ?? addresses[0];
    if (defaultAddr) {
      writeSelectedLocationFromAddress(defaultAddr);
      persistDeliveryAddressIdForMode("normal", String(defaultAddr.id));
    } else if (!addresses.length) {
      // No saved addresses: keep the session GPS pin so header + catalog can still be location-aware.
      // (Clearing here caused "Select deliver" after toggling back from Quick.)
      persistDeliveryAddressIdForMode("normal", "");
    }
    notifyDeliverySelectionChanged();
    dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
  }, [
    addressListFetching,
    addressListLoading,
    addresses,
    dispatch,
    isLoggedIn,
  ]);

  useEffect(() => {
    if (prevIsLoggedInForDeliveryRef.current === null) {
      prevIsLoggedInForDeliveryRef.current = isLoggedIn;
      return;
    }
    const wasLoggedIn = prevIsLoggedInForDeliveryRef.current;
    prevIsLoggedInForDeliveryRef.current = isLoggedIn;
    if (wasLoggedIn || !isLoggedIn) return;

    // Restore last committed delivery (cart/header/search) across login.
    restoreCommittedDeliverySelection();

    // Only reset ephemeral guest GPS when there is no committed delivery choice.
    if (
      !hasGuestCommittedSearchLocationForLogin() &&
      !hasPersistedDeliverySelection()
    ) {
      resetDeliverySelectionAfterLogin();
    }
    setGuestDeliveryDrawerOpen(false);
    notifyDeliverySelectionChanged();
    dispatch(
      emptySplitApi.util.invalidateTags(["DASHBOARD", "CART", "ADDRESS"]),
    );
    postLoginDeliveryApplyPendingRef.current = true;
    applyNormalDeliveryLocationFromSaved();
  }, [isLoggedIn, dispatch, applyNormalDeliveryLocationFromSaved]);

  useEffect(() => {
    if (!postLoginDeliveryApplyPendingRef.current || !isLoggedIn) return;
    if (
      addresses.length === 0 &&
      (addressListLoading || addressListFetching)
    ) {
      return;
    }
    postLoginDeliveryApplyPendingRef.current = false;
    applyNormalDeliveryLocationFromSaved();
  }, [
    isLoggedIn,
    addresses,
    addressListLoading,
    addressListFetching,
    applyNormalDeliveryLocationFromSaved,
  ]);


  const handleQuickDeliveryInfoClose = useCallback(() => {
      try {
        sessionStorage.setItem(
          WC_QUICK_DELIVERY_INFO_SHOWN_SESSION,
          "1",
        );
      } catch {
        /* Session storage unavailable; still close the dialog. */
      }
      setQuickDeliveryInfoOpen(false);
    }, []);

    useEffect(() => {
      if (
        !authStorageChecked ||
        isAuthPage ||
        guestDeliveryDrawerOpen ||
        headerAddressMapModalOpen ||
        deliveryModeSwitchPending ||
        quickDeliveryInfoOpen ||
        !quickDeliveryAnchorEl
      ) {
        return;
      }

      if (
        isLoggedIn &&
        (
          addressListUninitialized ||
          addressListLoading ||
          addressListFetching ||
          postLoginDeliveryApplyPendingRef.current
        )
      ) {
        return;
      }

      try {
        if (
          sessionStorage.getItem(
            WC_QUICK_DELIVERY_INFO_SHOWN_SESSION,
          ) === "1"
        ) {
          return;
        }
      } catch {
        // Cannot guarantee once-per-session behavior without sessionStorage.
        return;
      }

      if (!hasUsableDeliveryLocation(addresses, deliveryMode)) return;

      setQuickDeliveryInfoOpen(true);
    }, [
      addressListFetching,
      addressListLoading,
      addressListUninitialized,
      addresses,
      authStorageChecked,
      deliveryMode,
      deliveryModeSwitchPending,
      guestDeliveryDrawerOpen,
      headerAddressMapModalOpen,
      isAuthPage,
      isLoggedIn,
      locationLabelTick,
      quickDeliveryInfoOpen,
      quickDeliveryAnchorEl,
    ]);

    

    const handleWomenCartDeliveryClick = useCallback(
    (_e: React.MouseEvent) => {
      if (deliveryModeSwitchPending) return;

      const leavingQuick =
        getDeliveryMode(searchParams) === "quick_delivery";
      if (!leavingQuick) return;

      setDeliveryModeSwitchPending(true);
      setAlignment("left");

      try {
        sessionStorage.removeItem(WC_QUICK_GPS_FILLED_SESSION);
      } catch {
        /* ignore */
      }

      setDeliveryModePersisted("normal");
      applyNormalDeliveryLocationFromSaved();

      const url = new URL(window.location.href);
      url.searchParams.set("mode", "normal");
      const isProductDetail =
        /^\/product\/detail\/?$/.test(url.pathname) ||
        Boolean(getProductSlugFromPath(url.pathname));
      if (isProductDetail && url.searchParams.get("type") === "quick") {
        url.searchParams.delete("type");
      }
      window.location.replace(url.href);
    },
    [
      applyNormalDeliveryLocationFromSaved,
      deliveryModeSwitchPending,
      searchParams,
    ],
  );

  const handleQuickDeliveryClick = useCallback(
  (_e: React.MouseEvent) => {
      if (deliveryModeSwitchPending || quickLocationLoading) return;
      if (quickDeliveryInfoOpen) handleQuickDeliveryInfoClose();
      // Explicit toggle must win over a stale ref from the background quick-GPS effect.
      quickGeoInFlightRef.current = false;
      quickGeoInFlightRef.current = true;
      setDeliveryModeSwitchPending(true);
      setAlignment("center");

      setDeliveryModePersisted("quick_delivery");
      const persistedQuickId = readPersistedDeliveryAddressId("quick_delivery");
      const hasExplicitQuickAddress =
        !!persistedQuickId && persistedQuickId !== "__current__";
      const hasPinnedCurrentSelection =
        isNormalDeliverHerePinned() && hasQuickDeliveryGpsCoords();
      // Map/search pin (__current__ + coords), including after login from guest search — do not wipe
      // or the quick tab refetches GPS and overwrites Bihar with "current location".
      const reuseSessionMapPinForQuick =
        (!hasExplicitQuickAddress || hasPinnedCurrentSelection) &&
        hasQuickDeliveryGpsCoords() &&
        (persistedQuickId === "__current__" || !persistedQuickId);

      if (!hasExplicitQuickAddress) {
        persistDeliveryAddressIdForMode("quick_delivery", "__current__");
      }
      try {
        sessionStorage.removeItem(WC_QUICK_GPS_FILLED_SESSION);
      } catch {
        /* ignore */
      }
      if (
        !hasExplicitQuickAddress &&
        !hasPinnedCurrentSelection &&
        !reuseSessionMapPinForQuick
      ) {
        writeSelectedLocationData({
          latitude: "",
          longitude: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
        });
        notifyDeliverySelectionChanged();
      }

      if (
        hasExplicitQuickAddress ||
        hasPinnedCurrentSelection ||
        reuseSessionMapPinForQuick
      ) {
        notifyDeliverySelectionChanged();
        dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
      }

      // Full-page navigation: client `router.replace("/?…")` could leave deep routes like
      // `/product/...` with only `?mode=quick_delivery` merged onto the PDP URL (Next 15).
      if (typeof window !== "undefined") {
        window.location.assign(
          new URL("/?mode=quick_delivery", window.location.origin).href,
        );
      } else {
        router.replace("/?mode=quick_delivery");
      }
    },
    [
      deliveryModeSwitchPending,
      dispatch,
      handleQuickDeliveryInfoClose,
      quickDeliveryInfoOpen,
      quickLocationLoading,
      router,
    ],
  );

  // Quick mode: replace stale normal-address text in SELECTED_LOCATION with a real GPS read once per session.
  useEffect(() => {
    if (isAuthPage || !authStorageChecked) return;

    if (
      isLoggedIn &&
      (addressListLoading || addressListFetching)
    ) {
      return;
    }

    const mode =
      getDeliveryMode(searchParams) === "quick_delivery"
        ? "quick_delivery"
        : "normal";

    if (hasUsableDeliveryLocation(addresses, mode)) {
      // setGuestDeliveryDrawerOpen(false);

      try {
        sessionStorage.removeItem(
          WC_LOCATION_PROMPT_DISMISSED_SESSION,
        );
      } catch {
        /* ignore */
      }

      return;
    }

    if (mode === "normal") {
      try {
        if (
          sessionStorage.getItem(
            WC_LOCATION_PROMPT_DISMISSED_SESSION,
          ) === "1"
        ) {
          return;
        }
      } catch {
        /* continue and show prompt */
      }
    }

    setQuickLocationLoading(false);
    setGuestDeliveryDrawerOpen(true);
  }, [
    addressListFetching,
    addressListLoading,
    addresses,
    authStorageChecked,
    isAuthPage,
    isLoggedIn,
    locationLabelTick,
    searchParams,
  ]);

  const showScrolledHeader = pathname !== "/";
  const headerClass = `site_header ${scrollClass} ${showScrolledHeader ? "scrolled_header" : ""
    }`;

  const [value, setValue] = useState(0);

  const [alignment, setAlignment] = React.useState<string | null>("left");

  // Toggle UI from URL + storage. Do NOT write deliveryMode to storage here — that ran on every
  // render with stale `searchParams` and overwrote "normal" right after WomenCart click (before
  // navigation dropped `mode=quick_delivery`). Persistence is only updated in the toggle handlers.
  useEffect(() => {
    if (deliveryModeSwitchPending) return;
    const mode = getDeliveryMode(searchParams);
    setAlignment(mode === "quick_delivery" ? "center" : "left");
  }, [searchParams, deliveryModeSwitchPending]);

  const handleAlignment = (
    _event: React.MouseEvent<HTMLElement>,
    newAlignment: string | null,
  ) => {
    if (newAlignment !== null) {
      setAlignment(newAlignment);
    }
  };

  const [anchorElCategory, setAnchorElCategory] =
    React.useState<null | HTMLElement>(null);
  const openCategory = Boolean(anchorElCategory);
  const [selectedParentCategory, setSelectedParentCategory] =
    React.useState<any>(null);

  const handleClickCategory = (event: React.MouseEvent<HTMLElement>) => {
    clearSearchInput();
    if (isMobile) {
      setMobileMenuTab("categories");
      setExpansionStack([]);
      setAnchorElCategory(event.currentTarget);
    } else {
      setAnchorElCategory(event.currentTarget);
    }
    // Set first category as default selected when menu opens
    if (categories.length > 0) {
      setSelectedParentCategory(categories[0]);
    }
  };
  const handleCloseCategory = () => {
    setAnchorElCategory(null);
    setSelectedParentCategory(null);
    if (isMobile) {
      setExpansionStack([]);
    }
  };

  const handleParentCategoryHover = (category: any) => {
    setSelectedParentCategory(category);
  };

  const [anchorElBrands, setAnchorElBrands] =
    React.useState<null | HTMLElement>(null);
  const openBrands = Boolean(anchorElBrands);
  const handleClickBrands = (event: React.MouseEvent<HTMLElement>) => {
    clearSearchInput();
    if (isMobile) {
      setMobileMenuTab("brands");
      setExpansionStack([]);
      setAnchorElCategory(event.currentTarget); // Open category menu but show brands view
    } else {
      setAnchorElBrands(event.currentTarget);
    }
  };
  const handleCloseBrands = () => {
    setAnchorElBrands(null);
  };

  const brandsMenuVisible =
    openBrands || (openCategory && mobileMenuTab === "brands");

  React.useEffect(() => {
    if (!brandsMenuVisible || brandsFetchInFlightRef.current || allBrands.length > 0) {
      return;
    }

    const fetchAllBrands = async () => {
      brandsFetchInFlightRef.current = true;
      try {
        const byId = new Map<string | number, any>();
        let page = 1;
        let totalPages = 1;
        do {
          const result = await getBrands({
            page,
            limit: 500,
          }).unwrap();
          const raw = result?.data?.data ?? result?.data;
          const list = Array.isArray(raw) ? raw : [];
          for (const b of list) {
            if (b?.id != null) byId.set(b.id, b);
          }
          totalPages = Math.max(Number(result?.data?.total_pages) || 1, 1);
          page += 1;
        } while (page <= totalPages);

        const next = [...byId.values()];
        setAllBrands(next);
        try {
          setToStorage(STORAGE_KEYS.cachedBrands, JSON.stringify(next));
        } catch {
          /* ignore quota / serialization errors */
        }
      } catch (error: any) {
        if (
          process.env.NODE_ENV === "development" &&
          error?.status !== 404 &&
          error?.status !== 500
        ) {
          // eslint-disable-next-line no-console
          console.warn(
            "Brands fetch skipped:",
            error?.data?.message || error?.message || error,
          );
        }
      } finally {
        brandsFetchInFlightRef.current = false;
      }
    };

    void fetchAllBrands();
  }, [brandsMenuVisible, getBrands, allBrands.length]);

  const [anchorElMenu, setAnchorElMenu] = React.useState<null | HTMLElement>(
    null,
  );
  const openMenu = Boolean(anchorElMenu);
  const [selectedNavCategory, setSelectedNavCategory] =
    React.useState<any>(null);
  const [anchorElCategorySearch, setAnchorElCategorySearch] =
    React.useState<null | HTMLElement>(null);
  const openCategorySearch = Boolean(anchorElCategorySearch);
  const [categorySearchTerm, setCategorySearchTerm] = React.useState<string>("");
  const closeMenuTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleClickMenu = (
    event: React.MouseEvent<HTMLElement>,
    category: any,
  ) => {
    // Clear any pending close timeout
    if (closeMenuTimeoutRef.current) {
      clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }

    // Immediately update both anchor and category
    // The key prop on Menu will force re-render when category changes
    setAnchorElMenu(event.currentTarget);
    setSelectedNavCategory(category);
  };
  const handleCloseMenu = () => {
    // Clear any pending timeout
    if (closeMenuTimeoutRef.current) {
      clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }
    setAnchorElMenu(null);
    setSelectedNavCategory(null);
    setCategorySearchTerm("");
  };

  const handleOpenCategorySearch = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElCategorySearch(event.currentTarget);
  };

  const handleCloseCategorySearch = () => {
    setAnchorElCategorySearch(null);
    setCategorySearchTerm("");
  };

  const normalizedCategories = React.useMemo(() => {
    return (categories || []).map((cat: any) => ({
      ...cat,
      children: cat.children || [],
    }));
  }, [categories]);

  const categorySearchResults = React.useMemo(() => {
    const term = categorySearchTerm.trim().toLowerCase();
    if (!term) return [];

    const results: {
      id: number | string;
      name: string;
      breadcrumb: string;
    }[] = [];
    const seen = new Set<string>();

    normalizedCategories.forEach((parent: any) => {
      const parentId = parent.id || parent.category_id;
      const parentName = (parent.name || parent.category_name || "").trim();
      if (!parentId || !parentName) return;

      const parentNameLower = parentName.toLowerCase();

      const addResult = (
        id: number | string | undefined,
        name: string | undefined,
        breadcrumbParts: string[],
      ) => {
        if (!id || !name) return;
        const key = String(id);
        if (seen.has(key)) return;
        seen.add(key);
        results.push({
          id,
          name,
          breadcrumb: breadcrumbParts.filter(Boolean).join(" / "),
        });
      };

      if (parentNameLower.includes(term)) {
        addResult(parentId, parentName, [parentName]);
      }

      (parent.children || []).forEach((sub: any) => {
        const subId = sub.id || sub.category_id;
        const subName = (sub.name || sub.category_name || "").trim();
        const subNameLower = subName.toLowerCase();

        if (subNameLower.includes(term)) {
          addResult(subId, subName, [parentName, subName]);
        }

        (sub.children || []).forEach((child: any) => {
          const childId = child.id || child.category_id;
          const childName = (child.name || child.category_name || "").trim();
          const childNameLower = childName.toLowerCase();

          if (childNameLower.includes(term)) {
            addResult(childId, childName, [parentName, subName, childName]);
          }
        });
      });
    });

    return results;
  }, [categorySearchTerm, normalizedCategories]);

  const fetchProfile = async () => {
    try {
      const res = await getProfile().unwrap();
      if (res?.statusCode == 200 && res?.data) {
        dispatch(setUser({ user: res.data }));
        // Also update storage to keep it in sync
        setToStorage(STORAGE_KEYS.credentials, JSON.stringify(res.data));
      }
    } catch (err: any) { }
  };

  useEffect(() => {
    if (token && !isAuthPage) {
      void fetchProfile();
    }
    // Profile is user-scoped; do not refetch when delivery mode toggles.
  }, [token, isAuthPage]);

  // Fetch cart data - skip on auth pages to avoid 401 errors
  const cartListArgs = dashboardLocationArgs;
  const { data: cartData } = useGetCartQuery(
    cartListArgs,
    {
      // Original code kept intentionally — do not delete
      // skip: isAuthPage || (!(token || localToken) && !hasGuestCartSession),
      skip: isAuthPage || !(token || localToken),
      refetchOnReconnect: false,
    },
  );

  // Badge = total quantity (sum of line qty), same as cart page "X Items in cart". Hidden when 0.
  const cartBadgeCount = sumCartLineQuantities(cartData?.data?.items);
  const cartTotalAmount = Number(cartData?.data?.sub_total || 0);

  const [hamburgerOpen, setHamburgerOpen] = useState(false);

  const toggleHamburger = () => {
    setHamburgerOpen((prev) => !prev);
  };
  useEffect(() => {
    const handleOutsideClick = () => setHamburgerOpen(false);

    if (hamburgerOpen) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [hamburgerOpen]);

  // Same path + different query (e.g. new category tab) does not change pathname — use full URL signature
  const routeSignature = `${pathname ?? ""}?${searchParams.toString()}`;
  useEffect(() => {
    setSearchOpen(false);
    setSearchInputFocused(false);
    const q = searchParams.get("search")?.trim() ?? "";
    if (q) {
      setSearchTerm(q);
      setDebouncedSearchTerm(q);
    } else {
      setSearchTerm("");
      setDebouncedSearchTerm("");
    }
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
  }, [routeSignature, searchParams]);

  const [routeActive, setRouteActive] = useState("home");
  const [tempActive, setTempActive] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/") setRouteActive("home");
    else if (pathname.includes("/cart")) setRouteActive("cart");
    else if (pathname.includes("/account")) setRouteActive("account");
  }, [pathname]);

  const getActive = (menu: string) => {
    return tempActive ? tempActive === menu : routeActive === menu;
  };
  const handleRouteClick = (menu: string, path: string) => {
    setTempActive(null); // reset temp
    navigate(path);
  };
  const handleDropdownClick = (menu: string) => {
    setTempActive(menu);
  };

  const headerAvatarUrl = useMemo(() => {
    const pu = profileUser as Record<string, unknown> | null;
    const fromApi =
      typeof pu?.avatar === "string" && pu.avatar.trim()
        ? pu.avatar.trim()
        : typeof pu?.image === "string" && (pu.image as string).trim()
          ? (pu.image as string).trim()
          : "";
    const fromStorage =
      typeof userData?.avatar === "string" && userData.avatar.trim()
        ? userData.avatar.trim()
        : typeof userData?.image === "string" && userData.image.trim()
          ? userData.image.trim()
          : "";
    return fromApi || fromStorage;
  }, [profileUser, userData]);

  const showModeSwitchScreenLoader = deliveryModeSwitchPending;

  return (
    <>
      <PushNotificationInit />
      <Backdrop
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
          bgcolor: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(4px)",
        }}
        open={showModeSwitchScreenLoader}
        aria-busy={showModeSwitchScreenLoader}
      >
        <CircularProgress
          size={48}
          thickness={4}
          sx={{ color: "var(--commerce-primary, #d91b76)" }}
        />
        <Box
          component="span"
          sx={{
            typography: "body2",
            color: "text.secondary",
            fontWeight: 500,
          }}
        >
          Loading...
        </Box>
      </Backdrop>
      <header className={headerClass}>
        <div className="top_header">
          <div className="container">
            {/* <div className="res_mob_logo">
              <Box
                component="a"

                onClick={() => navigate("/")}
              >
                <figure>
                  <img src="/images/womanCart_logo.png" alt="Logo" />
                </figure>
              </Box>
            </div> */}
            <nav>
              <Box
                component="a"
                className="site_logo"
                onClick={() => navigate("/")}
              >
                <figure>
                  <img src="/images/womanCart_logo.png" alt="Logo" />
                </figure>
              </Box>

              <div className="res_toggle_group">
                <ToggleButtonGroup
                  value={alignment}
                  exclusive
                  onChange={handleAlignment}
                  aria-label="text alignment"
                >
                  <ToggleButton
                    value="left"
                    aria-label="left aligned"
                    disabled={deliveryModeSwitchPending}
                    onClick={handleWomenCartDeliveryClick}
                  >
                    <img src="/images/womencart_icon.png" alt="icon" /> WomanCart
                  </ToggleButton>
                  <ToggleButton
                    ref={mobileQuickDeliveryButtonRef}
                    value="center"
                    aria-label="centered"
                    aria-describedby={
                      quickDeliveryInfoOpen
                        ? "quick-delivery-info-tooltip"
                        : undefined
                    }
                    disabled={deliveryModeSwitchPending || quickLocationLoading}
                    onClick={handleQuickDeliveryClick}
                  >
                    {quickLocationLoading && !deliveryModeSwitchPending ? (
                      <CircularProgress size={18} sx={{ mr: 0.5 }} color="inherit" />
                    ) : (
                      <img src="/images/quickDelivery_icon.svg" alt="icon" />
                    )}{" "}
                    2-Hr Delivery
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>

              <ul className="action_menu">
                <li className="form">
                  <div className="control_group pick_location">
                    <Box
                      className="delivery_header_address_trigger"
                      onClick={handleDeliveryAddressClick}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        minHeight: {
                          xs: 40,
                          sm: "var(--field_height, 42px)",
                        },
                        minWidth: showDeliveryHeaderLocationLoader
                          ? { xs: 120, sm: 148 }
                          : undefined,
                        border: `1px solid ${deliveryTriggerColors.border}`,
                        borderRadius: "8px",
                        pl: 1,
                        pr: 1,
                        gap: 0.75,
                        cursor: "pointer",
                        bgcolor: deliveryTriggerColors.bg,
                        transition: "background-color 0.15s ease, border-color 0.15s ease",
                        "&:hover": { bgcolor: deliveryTriggerColors.hoverBg },
                      }}
                    >

                      <Box
                        component="img"
                        src="/images/location_icon1.svg"
                        alt=""
                        sx={{ width: 20, height: 20, flexShrink: 0, objectFit: "contain" }}
                      />
                      <div>
                        <label>{headerAddressTypeLabel}</label>
                        <Box
                          sx={{
                            ...(showDeliveryHeaderLocationLoader
                              ? {
                                flex: "0 1 auto",
                                overflow: "visible",
                                minWidth: 0,
                                maxWidth: { xs: 220, sm: 170 },
                              }
                              : {
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                minWidth: 0,
                                maxWidth: {
                                  xs: "220px",
                                  sm: "100px",
                                },
                              }),
                            fontSize: 14,
                            lineHeight: 1.3,
                            py: 0.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          {showDeliveryHeaderLocationLoader ? (
                            <>
                              <CircularProgress size={16} sx={{ flexShrink: 0 }} />
                              <Box
                                component="span"
                                sx={{
                                  flexShrink: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: 13,
                                }}
                              >
                                Getting location…
                              </Box>
                            </>
                          ) : (
                            headerDeliveryLabel
                          )}
                        </Box>
                      </div>
                    </Box>
                  </div>
                </li>
                <li
                  onClick={() => {
                    if (!isLoggedIn) {
                      navigate("/auth/login");
                      return;
                    }
                    navigate("/wishlist");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <Box component="a" className="icon_textBtn">
                    <Badge
                      badgeContent={wishlistProductIds.length}
                      color="secondary"
                      invisible={wishlistProductIds.length === 0}
                      sx={{
                        marginRight:
                          wishlistProductIds.length === 0 ? "0" : "5px",
                      }}
                    >
                      <FavoriteBorderIcon />
                    </Badge>
                    <p>
                      <span className="d_block">Wishlist</span> My items
                    </p>
                  </Box>
                </li>
                {isLoggedIn ? (
                  <li>
                    <Box
                      component="a"
                      className="icon_textBtn"
                      onClick={() => navigate("/account/profile/")}
                    >
                      {headerAvatarUrl ? (
                        <img
                          key={headerAvatarUrl}
                          src={headerAvatarUrl}
                          alt="profile"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/user_placeholder.svg";
                          }}
                        />
                      ) : (
                        <img src="/images/user_placeholder.svg" alt="icon" />
                      )}
                      <p>
                        <span className="d_block">My Account</span>{" "}
                        {(profileUser as any)?.name || userData?.name || "User"}
                      </p>
                    </Box>
                  </li>
                ) : (
                  <li>
                    <Box
                      component="a"
                      className="icon_textBtn"
                      onClick={() => navigate("/auth/login/")}
                    >
                      <img src="/images/user_placeholder.svg" alt="icon" />
                      <p>
                        <span className="d_block">Sign up</span> Account
                      </p>
                    </Box>
                  </li>
                )}
                <li
                  onClick={() => {
                    if (!canAccessCart) {
                      navigate("/auth/login");
                      return;
                    }
                    const cartUrl =
                      deliveryMode === "quick_delivery"
                        ? "/cart?mode=quick_delivery&entry=nav"
                        : "/cart?entry=nav";
                    navigate(cartUrl);
                  }}
                >
                  {cartBadgeCount > 0 ? (
                    <Badge
                      badgeContent={cartBadgeCount}
                      color="secondary"
                      className="cart_iconBtn"
                      showZero={false}
                    >
                      <img src="/images/cart_icon.svg" alt="header" />
                      <p>₹{formatPriceInr(cartTotalAmount)}</p>
                    </Badge>
                  ) : (
                    <span className="cart_iconBtn">
                      <img src="/images/cart_icon.svg" alt="header" />
                      <p>₹{formatPriceInr(cartTotalAmount)}</p>
                    </span>
                  )}
                </li>
              </ul>
            </nav>
          </div>
        </div>
        <div className={`mid_header ${categories.length === 0 ? "mid_header--no-categories" : ""}`}>
          <div className="container">
            {/* Fixed: Properly closing nav element */}
            <nav>
              <ul>
                <li>
                  <Box
                    component="a"
                    id="category-button"
                    aria-controls={openCategory ? "category-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={openCategory ? "true" : undefined}
                    onClick={handleClickCategory}
                  >
                    Categories
                  </Box>
                  <Menu
                    id="category-menu"
                    className="header_menus category_mega_menu"
                    aria-labelledby="category-button"
                    anchorEl={anchorElCategory}
                    open={openCategory}
                    onClose={handleCloseCategory}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "left",
                    }}
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "left",
                    }}
                    slotProps={{
                      paper: {
                        sx: isMobile ? {
                          width: "100%",
                          maxWidth: "100%",
                          height: "100%",
                          maxHeight: "100%",
                          margin: 0,
                          borderRadius: 0,
                          top: "0 !important",
                          left: "0 !important",
                        } : {
                          maxWidth: "1200px",
                          width: "100%",
                          maxHeight: "calc(100vh - 24px)",
                          overflowY: "auto",
                        },
                      },
                    }}
                  >
                    <Box className="mega_menu_wrapper">
                      {isMobile && (
                        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#fff" }}>
                          {/* Static Header for mobile */}
                          <Box sx={{ display: "flex", alignItems: "center", borderBottom: "1px solid #f0f0f0", position: "relative", minHeight: "56px" }}>
                            {/* Back button removed as requested */}

                            <Typography sx={{
                              flex: 1,
                              textAlign: "center",
                              color: "#333",
                              fontWeight: 700,
                              fontSize: "16px",
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                              py: 2
                            }}>
                              {mobileMenuTab}
                            </Typography>

                            <IconButton
                              onClick={handleCloseCategory}
                              sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#333" }}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>

                          <Box sx={{ flex: 1, overflowY: "auto" }}>
                            {mobileMenuTab === "categories" ? (
                              <Box className="mobile_accordion_categories" sx={{ pb: 4, maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                                {categories
                                  .filter((cat: any) => !cat.is_brand) // Strict separation: filter out any brand-like categories if they exist
                                  .map((cat: any, index: number) => (
                                    <MobileCategoryItem key={`parent-cat-${cat.id || index}`} cat={cat} level={0} />
                                  ))}
                                <Box sx={{ px: 2, mt: 3 }}>
                                  <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => {
                                      navigate("/product/product-category");
                                      handleCloseCategory();
                                    }}
                                    sx={{
                                      backgroundColor: "var(--commerce-primary)",
                                      color: "#fff",
                                      textTransform: "none",
                                      fontWeight: 600,
                                      borderRadius: "30px", // Rounded like the "View More" button
                                      py: 1.5,
                                      fontFamily: "'Jost', sans-serif",
                                      boxShadow: "none",
                                      "&:hover": {
                                        backgroundColor: "var(--commerce-primary-hover)",
                                        boxShadow: "none"
                                      }
                                    }}
                                  >
                                    View All Categories
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              <BrandsListing key="mobile-brands-tab" onBrandClick={handleCloseCategory} variant="mega-menu" brands={allBrands} />
                            )}
                          </Box>
                        </Box>
                      )}
                      {!isMobile && (
                        <>
                          {/* Left Sidebar - Parent Categories (Visible only on desktop) */}
                          <Box className="mega_menu_sidebar">
                            {categories.length > 0 ? (
                              categories.map((cat: any, index: number) => (
                                <Box
                                  key={`header-category-${cat.id || cat.category_id || "no-id"}-${index}`}
                                  className={`parent_category_item ${selectedParentCategory?.id === cat.id ? "active" : ""}`}
                                  onClick={() => handleParentCategoryHover(cat)}
                                >
                                  {cat.name || cat.category_name || "Category"}
                                </Box>
                              ))
                            ) : (
                              <Box className="parent_category_item">
                                {isCategoriesLoading || isCategoriesFetching
                                  ? "Loading categories..."
                                  : "No category available on selected pincode"}
                              </Box>
                            )}
                          </Box>

                          {/* Right Content - Children Categories */}
                          <Box className="mega_menu_content">
                            {selectedParentCategory &&
                              selectedParentCategory.children &&
                              selectedParentCategory.children.length > 0 ? (
                              selectedParentCategory.children.map(
                                (subCat: any, subIndex: number) => (
                                  <Box
                                    key={subCat.id || subIndex}
                                    className="subcategory_section"
                                  >
                                    <h4
                                      className="subcategory_title"
                                      onClick={() => {
                                        navigate(
                                          buildCategoryUrl(
                                            [
                                              selectedParentCategory?.name || selectedParentCategory?.category_name || "",
                                              subCat.name || subCat.category_name || "",
                                            ],
                                            { category_id: subCat.id || subCat.category_id },
                                          ),
                                        );
                                        handleCloseCategory();
                                      }}
                                    >
                                      {subCat.name || subCat.category_name}
                                    </h4>
                                    {subCat.children &&
                                      subCat.children.length > 0 && (
                                        <Box className="child_categories_grid">
                                          {subCat.children.map(
                                            (child: any, childIndex: number) => (
                                              <Box
                                                key={`header-child-category-${child.id || child.category_id || "no-id"}-${subIndex}-${childIndex}`}
                                                className="child_category_item"
                                                onClick={() => {
                                                  navigate(
                                                    buildCategoryUrl(
                                                      [
                                                        selectedParentCategory?.name || selectedParentCategory?.category_name || "",
                                                        subCat.name || subCat.category_name || "",
                                                        child.name || child.category_name || "",
                                                      ],
                                                      { categoryIds: child.id || child.category_id },
                                                    ),
                                                  );
                                                  handleCloseCategory();
                                                }}
                                              >
                                                <span>
                                                  {child.name ||
                                                    child.category_name}
                                                </span>
                                              </Box>
                                            ),
                                          )}
                                        </Box>
                                      )}
                                  </Box>
                                ),
                              )
                            ) : selectedParentCategory ? (
                              <Box className="no_children_message">
                                <p>No subcategories available</p>
                              </Box>
                            ) : (
                              <Box className="no_children_message">
                                <p>
                                  {categories.length > 0
                                    ? "Click on a category to see subcategories"
                                    : isCategoriesLoading || isCategoriesFetching
                                      ? "Loading categories..."
                                      : "No category available on selected pincode"}
                                </p>
                              </Box>
                            )}
                          </Box>
                        </>
                      )}
                    </Box>
                  </Menu>
                </li>
                <li>
                  <Box
                    component="a"
                    id="brands-button"
                    aria-controls={openBrands ? "brands-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={openBrands ? "true" : undefined}
                    onClick={handleClickBrands}
                  >
                    Brands
                  </Box>
                  <Menu
                    id="brands-menu"
                    className="header_menus brands_mega_menu"
                    aria-labelledby="brands-button"
                    anchorEl={anchorElBrands}
                    open={openBrands}
                    onClose={handleCloseBrands}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "left",
                    }}
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "left",
                    }}
                    slotProps={{
                      paper: {
                        sx: {
                          width: "100%",
                          maxWidth: "1200px",
                          maxHeight: "calc(100vh - 24px)",
                          overflowY: "auto",
                          mt: 1.5,
                          borderRadius: "8px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                        },
                      },
                    }}
                  >
                    <BrandsListing key="header-brands-listing" onBrandClick={handleCloseBrands} variant="mega-menu" brands={allBrands} />
                  </Menu>
                </li>
                <li>
                  <Box
                    component="a"
                    onClick={() => navigate("/blogs/")}>
                    Blogs
                  </Box>
                </li>
              </ul>

              <div className="form" style={{ position: "relative" }}>
                <div className={`control_group search_group ${searchOpen ? "open" : ""}`}>
                  <TextField
                    fullWidth
                    hiddenLabel
                    placeholder="Search"
                    value={searchTerm}
                    inputRef={searchInputRef}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    slotProps={{
                      input: {
                        ["start" + "Adornment"]: (
                          <InputAdornment position="start">
                            <img
                              src="/images/form_search_icon.svg"
                              alt="icon"
                            />
                          </InputAdornment>
                        ),
                        ["end" + "Adornment"]:
                          searchTerm.trim().length > 0 ? (
                            <InputAdornment position="end">
                              <img
                                onClick={() => clearSearchInput()}
                                src="/images/close_icon.svg"
                                alt="icon"
                                style={{ width: "30px", cursor: "pointer" }}
                              />
                              {/* <img src="/images/microphone_icon.svg" alt="icon" /> */}
                            </InputAdornment>
                          ) : null,
                      },
                    }}
                  />
                </div>

                {/* <div
                  className={`res_search_icon ${searchOpen ? "active" : ""}`}
                  onClick={toggleSearch}
                >
                  <img src="/images/form_search_icon.svg" alt="icon" />
                </div> */}

                {showSearchSuggestions &&
                  (isLoading || isFetching) && (
                    <div
                      className="search_list_dropdown"
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        width: "100%",
                        background: "white",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        maxHeight: "300px",
                        overflowY: "auto",
                        marginTop: "4px",
                      }}
                    >
                      <div style={{ padding: "15px", textAlign: "center" }}>
                        Loading...
                      </div>
                    </div>
                  )}
                {showSearchSuggestions &&
                  searchResults &&
                  searchResults.data && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        width: "100%",
                        background: "white",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        maxHeight: "300px",
                        overflowY: "auto",
                        marginTop: "4px",
                      }}
                      className="search_list_dropdown"
                    >
                      {/* Categories */}
                      {searchResults.data.categories &&
                        searchResults.data.categories.length > 0 && (
                          <div style={{ padding: "10px" }}>
                            <h4
                              style={{
                                margin: "0 0 10px 0",
                                fontSize: "14px",
                                fontWeight: "bold",
                              }}
                            >
                              Categories
                            </h4>
                            <ul
                              style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0,
                              }}
                              className="search_listing"
                            >
                              {searchResults.data.categories
                                .slice(0, SEARCH_DROPDOWN_SECTION_LIMIT)
                                .map((category: any) => (
                                  <li
                                    key={category.id || category.category_id}
                                    style={{
                                      padding: "10px 12px",
                                      cursor: "pointer",
                                      display: "flex",
                                      flexDirection: "row",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      borderBottom: "1px solid #f0f0f0",
                                      whiteSpace: "normal",
                                      wordBreak: "break-word",
                                      width: "100%",
                                      boxSizing: "border-box",
                                    }}
                                    onClick={() => {
                                      const categoryId =
                                        category.category_id || category.id;
                                      if (categoryId) {
                                        const modeParam = searchParams.get("mode");
                                        navigate(
                                          buildCategoryUrl(
                                            [category.name || category.category_name || ""],
                                            {
                                              categoryIds: categoryId,
                                              ...(modeParam ? { mode: modeParam } : {}),
                                            },
                                          ),
                                        );
                                        dismissSearchDropdown();
                                      }
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#f5f5f5";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "transparent";
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        color: "#111827",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: "100%",
                                        flex: 1,
                                        minWidth: 0,
                                      }}
                                    >
                                      {category.name || category.category_name}
                                    </span>
                                    <IconButton
                                      size="small"
                                      style={{
                                        padding: "4px",
                                        marginLeft: "8px",
                                      }}
                                    >
                                      <KeyboardArrowRightIcon fontSize="small" />
                                    </IconButton>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      {/* Brands */}
                      {searchResults.data.brands &&
                        searchResults.data.brands.length > 0 && (
                          <div style={{ padding: "10px" }} className="search_list_dropdown_brands">
                            <h4
                              style={{
                                margin: "0 0 10px 0",
                                fontSize: "14px",
                                fontWeight: "bold",
                              }}
                            >
                              Brands
                            </h4>
                            <ul
                              style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0,
                              }}
                              className="search_listing"
                            >
                              {searchResults.data.brands
                                .slice(0, SEARCH_DROPDOWN_SECTION_LIMIT)
                                .map((brand: any) => (
                                  <li
                                    key={brand.id}
                                    style={{
                                      padding: "10px 12px",
                                      cursor: "pointer",
                                      display: "flex",
                                      flexDirection: "row",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      borderBottom: "1px solid #f0f0f0",
                                      whiteSpace: "normal",
                                      wordBreak: "break-word",
                                      width: "100%",
                                      boxSizing: "border-box",
                                    }}
                                    onClick={() => {
                                      const brandId = brand.id || brand.brand_id;
                                      if (brandId) {
                                        const modeParam = searchParams.get("mode");
                                        const url = buildBrandUrl(brand.name || brand.brand_name || "", {
                                          brandIds: brandId,
                                          ...(modeParam ? { mode: modeParam } : {}),
                                        });
                                        navigate(url);
                                        dismissSearchDropdown();
                                      }
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#f5f5f5";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "transparent";
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        color: "#111827",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: "100%",
                                        flex: 1,
                                        minWidth: 0,
                                      }}
                                    >
                                      {brand.name || brand.brand_name}
                                    </span>
                                    <IconButton
                                      size="small"
                                      style={{
                                        padding: "4px",
                                        marginLeft: "8px",
                                      }}
                                    >
                                      <KeyboardArrowRightIcon fontSize="small" />



                                    </IconButton>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      {/* Products */}
                      {searchResults.data.products &&
                        searchResults.data.products.length > 0 && (
                          <div style={{ padding: "10px" }} className="search_list_dropdown_product">
                            <h4
                              style={{
                                margin: "0 0 10px 0",
                                fontSize: "14px",
                                fontWeight: "bold",
                              }}
                            >
                              Products
                            </h4>
                            <ul
                              style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0,
                              }}
                              className="search_listing"
                            >
                              {searchResults.data.products
                                .slice(0, SEARCH_DROPDOWN_SECTION_LIMIT)
                                .map((product: any) => (
                                  <li
                                    key={product.id || product.product_id}
                                    style={{
                                      padding: "10px 12px",
                                      cursor: "pointer",
                                      display: "flex",
                                      flexDirection: "row",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      borderBottom: "1px solid #f0f0f0",
                                      whiteSpace: "normal",
                                      wordBreak: "break-word",
                                      width: "100%",
                                      boxSizing: "border-box",
                                    }}
                                    onClick={() => {
                                      const productId =
                                        product.product_id || product.id;
                                      if (productId) {
                                        const modeParam = searchParams.get("mode");
                                        const params: Record<string, string | number | undefined | null> = { productIds: String(productId) };
                                        if (modeParam) params.mode = modeParam;
                                        navigate(
                                          `/all-products?${new URLSearchParams(
                                            Object.fromEntries(
                                              Object.entries(params).filter(([, v]) => v != null) as [string, string][]
                                            )
                                          ).toString()}`,
                                        );
                                        dismissSearchDropdown();
                                      }
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#f5f5f5";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "transparent";
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        color: "#111827",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        maxWidth: "100%",
                                        flex: 1,
                                        minWidth: 0,
                                      }}
                                    >
                                      {product.name || product.product_name}
                                    </span>
                                    <IconButton
                                      size="small"
                                      style={{
                                        padding: "4px",
                                        marginLeft: "8px",
                                      }}
                                    >
                                      <KeyboardArrowRightIcon fontSize="small" />
                                    </IconButton>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      {!searchResults.data.products?.length &&
                        !searchResults.data.brands?.length &&
                        !searchResults.data.categories?.length && (
                          <div style={{ padding: "15px", textAlign: "center" }}>
                            <p style={{ margin: 0 }}>
                              No results found for "{searchTerm}".
                            </p>
                          </div>
                        )}
                    </div>
                  )}
              </div>

              <ToggleButtonGroup
                className="toggle_group"
                value={alignment}
                exclusive
                onChange={handleAlignment}
                aria-label="text alignment"
              >
                <ToggleButton
                  value="left"
                  aria-label="left aligned"
                  disabled={deliveryModeSwitchPending}
                  onClick={handleWomenCartDeliveryClick}
                >
                  <img src="/images/womencart_icon.png" alt="icon" /> WomanCart
                </ToggleButton>
                <ToggleButton
                  ref={desktopQuickDeliveryButtonRef}
                  value="center"
                  aria-label="centered"
                  aria-describedby={
                    quickDeliveryInfoOpen
                      ? "quick-delivery-info-tooltip"
                      : undefined
                  }
                  disabled={deliveryModeSwitchPending || quickLocationLoading}
                  onClick={handleQuickDeliveryClick}
                >
                  {quickLocationLoading && !deliveryModeSwitchPending ? (
                    <CircularProgress size={18} sx={{ mr: 0.5 }} color="inherit" />
                  ) : (
                    <img src="/images/quickDelivery_icon.svg" alt="icon" />
                  )}{" "}
                  2-Hr Delivery
                </ToggleButton>
              </ToggleButtonGroup>
            </nav>
          </div>
        </div>
        {categories.length > 0 && (
          <div className="nav_header">
            <div className="container">
              <nav>
                {/* <IconButton
                className="category_search_icon"
                aria-label="Search categories"
                onClick={handleOpenCategorySearch}
                sx={{ mr: 1 }}
              >
                <SearchIcon />
              </IconButton> */}
                <Tabs
                  value={value}
                  onChange={(_e, newValue) => setValue(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="scrollable tabs"
                  className="nav_categories"
                  sx={{
                    pr: { xs: 2, sm: 4 }, // add space from right side
                  }}
                >
                  {categories.length > 0 &&
                    categories.map((cat: any, index: number) => (
                      <Tab
                        key={`header-nav-category-${cat.id || cat.category_id || "no-id"}-${index}`}
                        label={cat.name || cat.category_name || "Category"}
                        id={`navMenu-button-${cat.id || index}`}
                        aria-controls={
                          openMenu && selectedNavCategory?.id === cat.id
                            ? "navMenu-menu"
                            : undefined
                        }
                        aria-haspopup="true"
                        aria-expanded={
                          openMenu && selectedNavCategory?.id === cat.id
                            ? "true"
                            : undefined
                        }
                        onClick={() => {
                          navigate(
                            buildCategoryUrl(
                              [cat.name || cat.category_name || ""],
                              { categoryIds: cat.id || cat.category_id },
                            ),
                          );
                          handleCloseMenu();
                        }}
                        onMouseEnter={(e) => {
                          // CRITICAL: Clear any pending close timeout FIRST
                          // This prevents the previous tab's onMouseLeave from closing the menu
                          if (closeMenuTimeoutRef.current) {
                            clearTimeout(closeMenuTimeoutRef.current);
                            closeMenuTimeoutRef.current = null;
                          }

                          // Immediately switch to this tab's menu
                          // This MUST execute even when moving directly from one tab to another
                          handleClickMenu(e, cat);
                        }}
                        onMouseLeave={(e) => {
                          // Clear any existing timeout immediately
                          if (closeMenuTimeoutRef.current) {
                            clearTimeout(closeMenuTimeoutRef.current);
                            closeMenuTimeoutRef.current = null;
                          }

                          // Check relatedTarget first (fastest check)
                          const { relatedTarget } = e;

                          if (relatedTarget instanceof Element) {
                            // If moving to menu, keep it open
                            if (relatedTarget.closest(".nav_category_menu")) {
                              return;
                            }

                            // If moving to another tab, do nothing - let the new tab handle it
                            if (
                              relatedTarget.closest('button[role="tab"]') ||
                              relatedTarget.closest(".MuiTab-root")
                            ) {
                              return;
                            }
                          }

                          // Use a very short delay to check actual position (handles edge cases)
                          // This allows the new tab's onMouseEnter to fire first
                          closeMenuTimeoutRef.current = setTimeout(() => {
                            const mouseX = e.clientX;
                            const mouseY = e.clientY;
                            const elementAtPoint = document.elementFromPoint(
                              mouseX,
                              mouseY,
                            );

                            if (!elementAtPoint) {
                              handleCloseMenu();
                              closeMenuTimeoutRef.current = null;
                              return;
                            }

                            // Check if mouse is over another tab or menu
                            const isOverTab =
                              elementAtPoint.closest('button[role="tab"]') ||
                              elementAtPoint.closest(".MuiTab-root") ||
                              elementAtPoint.closest(".nav_categories");
                            const isOverMenu =
                              elementAtPoint.closest(".nav_category_menu");

                            // Only close if not over any tab or menu
                            if (!isOverTab && !isOverMenu) {
                              handleCloseMenu();
                            }
                            closeMenuTimeoutRef.current = null;
                          }, 10); // Very short delay to let onMouseEnter fire first
                        }}
                      />
                    ))}
                  {/* <Tab
                  label="Men Store"
                  onClick={() => navigate("/product/product-category/")}
                />
                <Tab
                  label="New Arrivals"
                  onClick={() => navigate("/product/product-category/")}
                />
                <Tab
                  label="Best Sellers"
                  onClick={() => navigate("/product/product-category/")}
                />
                <Tab
                  label="Flash Sales"
                  onClick={() => navigate("/product/product-category/")}
                /> */}
                </Tabs>
                {/* Mega Menu for nav category with children */}
                {openMenu && (
                  <div
                    key={`nav-menu-${selectedNavCategory?.id || selectedNavCategory?.category_id || "none"}`}
                    id="navMenu-menu"
                    className="header_menus category_mega_menu nav_category_menu"
                    aria-labelledby={`navMenu-button-${selectedNavCategory?.id}`}
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      maxWidth: "100%",
                      width: "100%",
                      pointerEvents: "auto",
                      backgroundColor: "white",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                      zIndex: 1300,
                    }}
                    onMouseEnter={() => {
                      // Cancel any pending close timeout when mouse enters menu
                      if (closeMenuTimeoutRef.current) {
                        clearTimeout(closeMenuTimeoutRef.current);
                        closeMenuTimeoutRef.current = null;
                      }
                    }}
                    onMouseLeave={handleCloseMenu}
                  >
                    <Box className="mega_menu_wrapper nav_mega_wrapper mega_menu_figma">
                      {isMobile && (
                        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", borderBottom: "1px solid #f0f0f0", mb: 1 }}>
                          <IconButton
                            onClick={handleCloseMenu}
                            size="small"
                            sx={{ color: "var(--commerce-primary)", mr: 1 }}
                          >
                            <ArrowBackIcon />
                          </IconButton>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              color: "var(--commerce-primary)",
                              fontSize: "14px",
                            }}
                          >
                            Back
                          </Typography>
                        </Box>
                      )}
                      {/* Figma-style: multi-column layout - each column = subcategory with title, image, vertical links */}
                      <Box className="mega_menu_columns">
                        {selectedNavCategory?.children &&
                          selectedNavCategory.children.length > 0 ? (
                          selectedNavCategory.children.map(
                            (subCat: any, index: number) => (
                              <Box
                                key={`header-nav-subcategory-${subCat.id || subCat.category_id || "no-id"}-${index}`}
                                className="mega_menu_column"
                              >
                                <h4
                                  className="mega_menu_column_title"
                                  onClick={() => {
                                    navigate(
                                      buildCategoryUrl(
                                        [
                                          selectedNavCategory?.name || selectedNavCategory?.category_name || "",
                                          subCat.name || subCat.category_name || "",
                                        ],
                                        {
                                          category_id:
                                            subCat.id || subCat.category_id,
                                        },
                                      ),
                                    );
                                    handleCloseMenu();
                                  }}
                                >
                                  {subCat.name || subCat.category_name}
                                </h4>
                                {/* Removed product image as requested */}
                                {subCat.children && subCat.children.length > 0 && (
                                  <Box className="mega_menu_column_links">
                                    {subCat.children.map(
                                      (child: any, childIndex: number) => (
                                        <Box
                                          key={`header-nav-child-${child.id || child.category_id}-${childIndex}`}
                                          component="a"
                                          className="mega_menu_column_link"
                                          onClick={(e: React.MouseEvent) => {
                                            e.preventDefault();
                                            navigate(
                                              buildCategoryUrl(
                                                [
                                                  selectedNavCategory?.name || selectedNavCategory?.category_name || "",
                                                  subCat.name || subCat.category_name || "",
                                                  child.name || child.category_name || "",
                                                ],
                                                {
                                                  categoryIds:
                                                    child.id ||
                                                    child.category_id,
                                                },
                                              ),
                                            );
                                            handleCloseMenu();
                                          }}
                                        >
                                          {child.name || child.category_name}
                                        </Box>
                                      ),
                                    )}
                                  </Box>
                                )}
                              </Box>
                            ),
                          )
                        ) : selectedNavCategory ? (
                          <Box className="no_children_message mega_menu_no_children">
                            <p>Subcategory is not available</p>
                          </Box>
                        ) : (
                          <Box className="no_children_message">
                            <p>Click on a category to see details</p>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </div>
                )}
                {/* Standalone category search (before KIDS text similar to mobile) */}
                <Menu
                  id="category-search-menu"
                  className="header_menus category_search_menu"
                  anchorEl={anchorElCategorySearch}
                  open={openCategorySearch}
                  onClose={handleCloseCategorySearch}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "left",
                  }}
                  slotProps={{
                    paper: {
                      sx: {
                        maxHeight: "calc(100vh - 24px)",
                        overflowY: "auto",
                      },
                    },
                  }}
                >
                  <Box className="mega_menu_wrapper nav_mega_wrapper mega_menu_figma">
                    <Box className="mega_menu_search_bar">
                      <TextField
                        fullWidth
                        hiddenLabel
                        placeholder="Search categories"
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        size="small"
                      />
                    </Box>
                    <Box className="mega_menu_search_results">
                      {categorySearchTerm.trim() ? (
                        categorySearchResults.length > 0 ? (
                          categorySearchResults.map((item, index) => (
                            <Box
                              key={`header-category-search-${item.id}-${index}`}
                              className="mega_menu_search_result_item"
                              onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                navigate(
                                  buildCategoryUrl(
                                    [item.name || ""],
                                    { categoryIds: item.id },
                                  ),
                                );
                                handleCloseCategorySearch();
                              }}
                            >
                              <span className="mega_menu_search_result_name">
                                {item.name}
                              </span>
                              <span className="mega_menu_search_result_breadcrumb">
                                {item.breadcrumb}
                              </span>
                            </Box>
                          ))
                        ) : (
                          <Box className="no_children_message mega_menu_no_children">
                            <p>No categories found.</p>
                          </Box>
                        )
                      ) : (
                        <Box className="no_children_message mega_menu_no_children">
                          <p>Type to search parent or child categories</p>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Menu>
                {/* <Box
                component="a"
                className="text_btn"
                onClick={() => navigate("/account/refer-and-earn")}
                sx={{ cursor: "pointer" }}
              >
                Refer Friend, Get $20
              </Box> */}
              </nav>
            </div>
          </div>
        )}
      </header>

      <LocationSearchModal
        headerDeliverySearch
        open={guestDeliveryDrawerOpen}
        variant={
          hasUsableDeliveryLocation(addresses, deliveryMode)
            ? "change-location"
            : "onboarding"
        }
        canClose={hasUsableDeliveryLocation(addresses, deliveryMode)}
        onClose={handleLocationPromptClose}
        onLocationSelect={handleGuestDeliveryLocationSelect}
        apiKey={GOOGLE_MAPS_API_KEY}
        layout="drawer"
        showGuestSavedPrompt={!isLoggedIn}
        onGuestLoginClick={
          !isLoggedIn
            ? () => {
                setGuestDeliveryDrawerOpen(false);
                navigate("/auth/login/");
              }
            : undefined
        }
      />

      <QuickDeliveryInfoTooltip
        open={
          quickDeliveryInfoOpen &&
          !guestDeliveryDrawerOpen &&
          !headerAddressMapModalOpen
        }
        anchorEl={quickDeliveryAnchorEl}
        onClose={handleQuickDeliveryInfoClose}
      />

      {isLoggedIn && (
        <AddAddress
          open={headerAddressMapModalOpen}
          onClose={() => setHeaderAddressMapModalOpen(false)}
          setOpen={setHeaderAddressMapModalOpen}
          syncHeaderLocationOnSave
          showSeeSavedAddressButton
          onSuccess={() => {
            setHeaderAddressMapModalOpen(false);
            refetchAddressList();
          }}
          onSeeSavedAddressClick={() => {
            setHeaderAddressMapModalOpen(false);
            navigate(buildMyAddressUrlWithReturnTo(pathname, searchParams));
          }}
        />
      )}

      <div className="header_float_menu">
        <Box
          className={getActive("home") ? "active" : ""}
          onClick={() => {
            setTempActive("home");
            navigate("/");
          }}
        >
          <figure>
            <img src="/images/home_float_icon.svg" alt="Icon" />
            <span
              className="mobile_nav_filled_icon"
              style={{
                WebkitMaskImage: "url(/images/home_float_icon_filled.svg)",
                maskImage: "url(/images/home_float_icon_filled.svg)",
              }}
              aria-hidden
            />
          </figure>
          Home
        </Box>

        <Box
          component="a"
          id="brands-button-mobile"
          className={getActive("brands") ? "active" : ""}
          aria-controls={openBrands ? "brands-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={openBrands ? "true" : undefined}
          onClick={(e) => {
            handleClickBrands(e);
            handleDropdownClick("brands");
          }}
        >
          <figure>
            <img src="/images/brand_float_icon.svg" alt="Icon" />
            <span
              className="mobile_nav_filled_icon"
              style={{
                WebkitMaskImage: "url(/images/brand_float_icon_filled.svg)",
                maskImage: "url(/images/brand_float_icon_filled.svg)",
              }}
              aria-hidden
            />
          </figure>
          Brands
        </Box>

        <Box
          id="category-button-mobile"
          className={getActive("categories") ? "active" : ""}
          aria-controls={openCategory ? "category-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={openCategory ? "true" : undefined}
          onClick={(e) => {
            handleClickCategory(e);
            handleDropdownClick("categories");
          }}
        >
          <figure>
            <img src="/images/category_float_icon.svg" alt="Icon" />
            <span
              className="mobile_nav_filled_icon"
              style={{
                WebkitMaskImage: "url(/images/category_float_icon_filled.svg)",
                maskImage: "url(/images/category_float_icon_filled.svg)",
              }}
              aria-hidden
            />
          </figure>
          Categories
        </Box>

        <Box
          className={getActive("cart") ? "active" : ""}
          onClick={() => {
            setTempActive(null);
            if (!canAccessCart) {
              navigate("/auth/login");
              return;
            }
            const cartUrl =
              deliveryMode === "quick_delivery"
                ? "/cart?mode=quick_delivery&entry=nav"
                : "/cart?entry=nav";
            navigate(cartUrl);
          }}
        >
          {cartBadgeCount > 0 ? (
            <Badge
              badgeContent={cartBadgeCount}
              color="secondary"
              className="cart_iconBtn"
              showZero={false}
            >
              <figure>
                <img src="/images/cart_float_icon.svg" alt="Icon" />
                <span
                  className="mobile_nav_filled_icon"
                  style={{
                    WebkitMaskImage: "url(/images/cart_float_icon_filled.svg)",
                    maskImage: "url(/images/cart_float_icon_filled.svg)",
                  }}
                  aria-hidden
                />
              </figure>
            </Badge>
          ) : (
            <span className="cart_iconBtn">
              <figure>
                <img src="/images/cart_float_icon.svg" alt="Icon" />
                <span
                  className="mobile_nav_filled_icon"
                  style={{
                    WebkitMaskImage: "url(/images/cart_float_icon_filled.svg)",
                    maskImage: "url(/images/cart_float_icon_filled.svg)",
                  }}
                  aria-hidden
                />
              </figure>
            </span>
          )}
          Cart
        </Box>

        {isLoggedIn ? (
          <Box
            className={getActive("account") ? "active" : ""}
            onClick={() =>
              handleRouteClick(
                "account",
                isLoggedIn ? "/account/profile/" : "/auth/login/",
              )
            }
          >
            {userData?.avatar ? (
              <figure>
                <img
                  className="profile_filled"
                  src={userData.avatar}
                  alt="profile"
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/images/account_float_icon.svg";
                  }}
                />
              </figure>
            ) : (
              <figure>
                <img src="/images/account_float_icon.svg" alt="icon" />
              </figure>
            )}
            Account
          </Box>
        ) : (
          <Box onClick={() => navigate("/auth/login/")}>
            <figure>
              <img src="/images/account_float_icon.svg" alt="Icon" />
            </figure>
            Account
          </Box>
        )}
      </div>
    </>
  );
}


export default Header;