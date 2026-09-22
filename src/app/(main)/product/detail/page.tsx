/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import BredCrum from "@/components/bredCrum";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { styled } from "@mui/material/styles";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
} from "@mui/material";
import { Rating } from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import CheckIcon from "@mui/icons-material/Check";
import ShareProduct from "@/components/shareProduct";
import WishlistButton from "@/components/WishlistButton";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import LinearProgress, {
  linearProgressClasses,
} from "@mui/material/LinearProgress";
import ProductCard from "@/components/productCard";
import ReviewerAvatar from "@/components/ReviewerAvatar";
import LocationSearchModal from "@/components/LocationSearchModal";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import emptySplitApi from "@/lib/rtk";
import {
  useGetProductDetailsQuery,
  useLazyGetMoreProductsQuery,
  useSubscribeStockAlertMutation,
} from "@/service/home";
import { useAddToCartMutation, useGetCartQuery } from "@/service/cart";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { useGetOrdersQuery } from "@/service/order";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { getToken, setUser } from "@/lib/slices/authSlice";
import { useGuestLoginMutation, useLazyGetProfileQuery } from "@/service/auth";
import { performGuestLogin } from "@/utils/guestLoginSession";
import toast from "react-hot-toast";
import { getFromStorage, removeFromStorage, setToStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import {
  getDeliveryChannel,
  getDeliveryMode,
  getProductDetailApiChannel,
} from "@/utils/deliveryMode";
import {
  buildEditAddressDefaultBody,
  DELIVERY_SELECTION_CHANGED,
  getDeliveryDisplayLabel,
  hasUsableDeliveryLocation,
  hydrateDeliveryContextForProductRequest,
  notifyDeliverySelectionChanged,
  persistDeliveryAddressIdForMode,
  readPincodeForProductApi,
  readSelectedLocation,
  resolveDeliveryAddressId,
  setNormalDeliverHerePinned,
  writeSelectedLocationFromAddress,
} from "@/utils/deliveryAddressSync";
import { useEditAddressMutation, useLazyGetAddressListQuery } from "@/service/address";
import { Address } from "@/types/General";
import ShippingAddress from "@/modal/shippingAddress";
import { formatReviewCountText, parseReviewCount } from "@/utils/reviewText";
import { formatPriceInr } from "@/utils/format";
import { pushEvent, buildGtmItem } from "@/lib/dataLayer";
import { showMrpAsCutPrice } from "@/utils/priceDisplay";
import { collectVariationImageUrls } from "@/utils/variationImages";
import {
  getCartQtyForProductSku,
  getMaxUnitsPerSkuFromStock,
  isSkuInStock,
  toastMaxQuantityInCart,
} from "@/utils/cartSkuLimits";
import { lookupSlugId, saveSlugId } from "@/utils/idStore";
import {
  buildVariantProductPathSegment,
  buildCanonicalProductDetailPath,
  canonicalizeProductDetailBrowserUrl,
  canonicalizeProductSlugSegment,
  cleanPlainProductDetailUrl,
  extractProductIdFromSlug,
  getProductSlugFromPath,
  getProductSlugLookupKey,
  getVariantUrlSlug,
  hasProdSlugToken,
  resolveProductIdForSlug,
  resolveProductSlugFromRoute,
  slugify,
} from "@/utils/urlBuilder";
import { useCookiePageView } from "@/hooks/useCookiePageView";

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 12,
  borderRadius: 3,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[200],
    ...theme.applyStyles("dark", {
      backgroundColor: theme.palette.grey[800],
    }),
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 3,
    backgroundColor: "#FFB400",
    ...theme.applyStyles("dark", {
      backgroundColor: "#FFB400",
    }),
  },
}));

const PDP_GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

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

const CustomNextArrow = (props: any) => {
  const { className, onClick } = props;
  return (
    <button
      type="button"
      className={`custom-slick-arrow next-arrow ${className || ""}`}
      onClick={onClick}
      aria-label="Next"
    >
      <ArrowForwardIosRoundedIcon fontSize="small" />
    </button>
  );
};

const CustomPrevArrow = (props: any) => {
  const { className, onClick } = props;
  return (
    <button
      type="button"
      className={`custom-slick-arrow prev-arrow ${className || ""}`}
      onClick={onClick}
      aria-label="Previous"
    >
      <ArrowBackIosNewRoundedIcon fontSize="small" />
    </button>
  );
};

const getUpdatedAgoText = (value?: string | number | Date | null) => {
  if (!value) return "";
  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.getTime())) return "";

  const diffMs = Date.now() - updatedAt.getTime();
  if (diffMs <= 0) return "Updated just now";

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(diffMs / dayMs);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
};

// Items will be set dynamically based on product data

const productImages = [
  "/images/product_main_img.png",
  "/images/product_thumb_img.png",
  "/images/product_main_img.png",
  "/images/product_thumb_img2.png",
  "/images/product_main_img.png",
  "/images/product_thumb_img3.png",
  "/images/product_main_img.png",
  "/images/product_main_img.png",
  "/images/product_thumb_img.png",
  "/images/product_main_img.png",
  "/images/product_thumb_img2.png",
  "/images/product_main_img.png",
  "/images/product_thumb_img3.png",
  "/images/product_main_img.png",
];

const products = [
  {
    image: "/images/product_img1.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: "9 MINS",
  },
  {
    image: "/images/product_img2.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: "9 MINS",
  },
  {
    image: "/images/product_img3.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: "9 MINS",
  },
  {
    image: "/images/product_img4.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: "9 MINS",
  },
  {
    image: "/images/product_img5.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: "9 MINS",
  },
];

const videoData = [
  {
    img: "/images/video1.png",
    title: "Perfect blush for festive season",
    count: 959,
  },
  {
    img: "/images/video2.png",
    title: "Dewy Foundation that lasts",
    count: 959,
  },
  {
    img: "/images/video3.png",
    title: "Step by step make up glam",
    count: 959,
  },
  {
    img: "/images/video1.png",
    title: "Perfect blush for festive season",
    count: 959,
  },
  {
    img: "/images/video2.png",
    title: "Dewy Foundation that lasts",
    count: 959,
  },
  {
    img: "/images/video3.png",
    title: "Step by step make up glam",
    count: 959,
  },
  {
    img: "/images/video1.png",
    title: "Perfect blush for festive season",
    count: 959,
  },
];

function createData(
  Size: string,
  Bust: number,
  Waist: number,
  Length: number,
  Hip: number
) {
  return { Size, Bust, Waist, Length, Hip };
}

const rows = [
  createData("S", 34.0, 28.0, 52.0, 36.0),
  createData("M", 36.0, 30.0, 52.0, 38.0),
  createData("L", 38.0, 32.0, 52.0, 40.0),
  createData("XL", 40.0, 34.0, 52.0, 42.0),
  createData("XXL", 42.0, 36.0, 52.0, 44.0),
];

// Fallback hex for common color names when API does not send color_code
const COLOR_NAME_FALLBACKS: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  navy: "#000080",
  red: "#e53935",
  blue: "#1976d2",
  green: "#43a047",
  grey: "#9e9e9e",
  gray: "#9e9e9e",
  pink: "#ec407a",
  brown: "#795548",
  beige: "#d4c4a8",
  gold: "#ffd700",
  silver: "#c0c0c0",
  orange: "#f39c12",
  yellow: "#fdd835",
  purple: "#8e24aa",
};

function getColorCodeFallback(value: string): string {
  if (!value || typeof value !== "string") return "#e0e0e0";
  const key = value.trim().toLowerCase();
  return COLOR_NAME_FALLBACKS[key] ?? "#e0e0e0";
}

const COLOR_LIKE_NAMES = ["color", "colour", "shade", "shades"];

function isColorLikeAttributeName(name: string): boolean {
  const lowered = (name || "").toString().toLowerCase();
  return COLOR_LIKE_NAMES.some((c) => lowered === c || lowered.includes(c));
}

// Build "Size -> 10ML" / "Shades -> Beige" lines from variation_attributes (Node API); include color_code for Color attribute
function getVariantAttributeLines(variant: any): { name: string; value: string; color_code?: string }[] {
  if (!variant?.variation_attributes || !Array.isArray(variant.variation_attributes)) return [];
  return variant.variation_attributes.map((attr: any) => {
    const opt = attr?.attribute_option;
    const name = attr?.attribute?.name || "Option";
    const value = opt?.display_value ?? (opt as any)?.displayValue ?? "";
    let colorCode = opt?.color_code ?? (opt as any)?.colorCode ?? null;
    const isColorAttr = isColorLikeAttributeName(name);
    if (isColorAttr && !colorCode) colorCode = getColorCodeFallback(value);
    return { name, value, ...(colorCode ? { color_code: String(colorCode) } : {}) };
  });
}

const SIZE_LIKE_NAMES = ["size", "volume", "capacity", "weight", "ml", "gm", "g", "kg"];

function isSizeLikeAttributeName(name: string): boolean {
  const lowered = (name || "").toString().toLowerCase();
  return SIZE_LIKE_NAMES.some((token) => lowered === token || lowered.includes(token));
}

function getVariantSizeLabel(variant: any): string {
  const lines = getVariantAttributeLines(variant);
  const sizeAttr = lines.find((line) => isSizeLikeAttributeName(line.name));
  if (sizeAttr?.value) return sizeAttr.value;
  const mlValue = lines.find((line) => /\b\d+(\.\d+)?\s*ml\b/i.test(line.value));
  return mlValue?.value?.trim() || "";
}

const FASHION_SIZE_PATTERN =
  /\b(XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL|\d{1,2})\b/i;

function getVariantColorValue(variant: any): string {
  const lines = getVariantAttributeLines(variant);
  const colorAttr = lines.find((line) => isColorLikeAttributeName(line.name));
  return String(colorAttr?.value || "").trim().toLowerCase();
}

function getVariantColorCode(variant: any): string | null {
  const lines = getVariantAttributeLines(variant);
  const colorAttr = lines.find((line) => isColorLikeAttributeName(line.name));
  const code = colorAttr?.color_code;
  return code ? String(code).trim().toLowerCase() : null;
}

function getVariantSizeDisplayLabel(
  variant: any,
  baseName?: string,
): string {
  const fromAttr = getVariantSizeLabel(variant).trim();
  if (fromAttr) return fromAttr;

  const name = String(variant?.name || "").trim();
  if (name) {
    const sizeMatch = name.match(FASHION_SIZE_PATTERN);
    if (sizeMatch) return sizeMatch[1].toUpperCase();
    if (baseName) {
      const base = String(baseName).trim();
      if (name.toLowerCase().startsWith(base.toLowerCase())) {
        const rest = name.slice(base.length).replace(/^[\s\-–—]+/, "").trim();
        const restSize = rest.match(FASHION_SIZE_PATTERN);
        if (restSize) return restSize[1].toUpperCase();
        if (rest) return rest;
      }
    }
  }

  const picker = getVariantPickerLabel(variant).trim();
  const pickerSize = picker.match(FASHION_SIZE_PATTERN);
  if (pickerSize) return pickerSize[1].toUpperCase();

  return "";
}

function variantsHaveDistinctColors(variations: any[]): boolean {
  const values = new Set<string>();
  const codes = new Set<string>();
  for (const variant of variations) {
    const value = getVariantColorValue(variant);
    const code = getVariantColorCode(variant);
    if (value) values.add(value);
    if (code) codes.add(code);
  }
  return codes.size > 1 || values.size > 1;
}

function variantsHaveDistinctSizes(variations: any[], baseName?: string): boolean {
  const sizes = new Set<string>();
  for (const variant of variations) {
    const label = getVariantSizeDisplayLabel(variant, baseName).trim().toLowerCase();
    if (label) sizes.add(label);
  }
  return sizes.size > 1;
}

function shouldUseSizePicker(variations: any[], baseName?: string): boolean {
  if (!Array.isArray(variations) || variations.length <= 1) return false;
  if (variantsHaveDistinctColors(variations)) return false;
  return variantsHaveDistinctSizes(variations, baseName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleAlreadyContainsSize(name: string, sizeLabel: string): boolean {
  const cleanName = String(name || "").trim();
  const cleanSize = String(sizeLabel || "").trim();
  if (!cleanName || !cleanSize) return false;

  const parenPattern = new RegExp(`\\(${escapeRegExp(cleanSize)}\\)`, "i");
  if (parenPattern.test(cleanName)) return true;

  const tokenPattern = new RegExp(`\\b${escapeRegExp(cleanSize)}\\b`, "i");
  return tokenPattern.test(cleanName);
}

function getVariantPickerLabel(variant: any): string {
  const lines = getVariantAttributeLines(variant);
  const colorAttr = lines.find((line) => isColorLikeAttributeName(line.name));
  if (colorAttr?.value) return colorAttr.value;
  const nonSize = lines.filter((line) => !isSizeLikeAttributeName(line.name));
  if (nonSize.length > 0) {
    return nonSize.map((line) => line.value).filter(Boolean).join(" / ");
  }
  return (
    variant?.name ||
    lines.map((line) => line.value).filter(Boolean).join(" / ") ||
    "Variant"
  );
}

function getVariantSwatchColor(variant: any): string {
  const lines = getVariantAttributeLines(variant);
  const colorAttr = lines.find((line) => isColorLikeAttributeName(line.name));
  if (colorAttr?.color_code) return colorAttr.color_code;
  if (colorAttr?.value) return getColorCodeFallback(colorAttr.value);
  return "#e8d8cf";
}

/** e.g. shade: "Lipstick - 223 VELVET MAROON - (3.8 GRAM)"; size: "Suit Set - (XL)" */
function buildProductDisplayTitle(
  baseName: string,
  variant: any | null | undefined,
  options?: { sizeOnly?: boolean },
): string {
  const name = String(baseName || "Product Name").trim();
  if (!variant) return name;

  const sizeLabel = getVariantSizeDisplayLabel(variant, name).trim();

  if (options?.sizeOnly) {
    if (!sizeLabel) return name;
    if (titleAlreadyContainsSize(name, sizeLabel)) return name;
    return `${name} - (${sizeLabel})`;
  }

  const shadeLabel = getVariantPickerLabel(variant).trim();

  const shadeInName =
    shadeLabel.length > 0 && name.toLowerCase().includes(shadeLabel.toLowerCase());
  const sizeInName = titleAlreadyContainsSize(name, sizeLabel);

  const showShade =
    Boolean(shadeLabel) && !shadeInName && shadeLabel !== sizeLabel;
  const showSize = Boolean(sizeLabel) && !sizeInName;

  if (!showShade && !showSize) return name;
  if (showShade && showSize) return `${name} - ${shadeLabel} - (${sizeLabel})`;
  if (showShade) return `${name} - ${shadeLabel}`;
  return `${name} (${sizeLabel})`;
}

function variantMatchesSelection(selected: any, candidate: any): boolean {
  const selectedId =
    selected?.id ?? selected?.variation_id ?? selected?.product_variation_id ?? null;
  const candidateId =
    candidate?.id ?? candidate?.variation_id ?? candidate?.product_variation_id ?? null;
  return Number(selectedId) === Number(candidateId);
}

function positiveStoreNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Storefront id for PDP APIs — wide fallbacks because node product-detail often omits store.* */
function resolvePdpStoreId(
  selectedVariant: any | null | undefined,
  productDetails: any | null | undefined,
  searchParams: URLSearchParams,
  cartItems?: any[] | null,
  cartDataRoot?: any | null,
  relatedProducts?: any[] | null,
): number | null {
  const fromEntity = (e: any): number | null => {
    if (!e || typeof e !== "object") return null;
    return (
      positiveStoreNumber(e.store_id) ??
      positiveStoreNumber(e.storeId) ??
      positiveStoreNumber(e.store?.id) ??
      positiveStoreNumber(e.warehouse_id) ??
      positiveStoreNumber(e.warehouseId) ??
      positiveStoreNumber(e.shop_id) ??
      positiveStoreNumber(e.shop?.id) ??
      positiveStoreNumber(e.default_store_id) ??
      positiveStoreNumber(e.seller_store_id) ??
      positiveStoreNumber(e.inventory_store_id) ??
      positiveStoreNumber(e.pickup_location?.store_id) ??
      positiveStoreNumber(e.pickup_location?.warehouse_id) ??
      positiveStoreNumber(e.vendor?.store_id) ??
      positiveStoreNumber(e.seller?.store_id) ??
      positiveStoreNumber(e.inventory?.warehouse_id)
    );
  };

  let id = fromEntity(selectedVariant);
  if (id != null) return id;

  id = fromEntity(productDetails);
  if (id != null) return id;

  id = positiveStoreNumber(searchParams.get("store_id"));
  if (id != null) return id;

  const variations = productDetails?.variations;
  if (Array.isArray(variations)) {
    for (const v of variations) {
      id = fromEntity(v);
      if (id != null) return id;
    }
  }

  const pid = productDetails?.id != null ? Number(productDetails.id) : NaN;
  const vidRaw =
    selectedVariant?.id ??
    selectedVariant?.variation_id ??
    selectedVariant?.product_variation_id ??
    null;
  const vidNum = vidRaw != null ? Number(vidRaw) : NaN;
  const vidOk = Number.isFinite(vidNum) && vidNum > 0;

  if (Array.isArray(cartItems) && Number.isFinite(pid)) {
    for (const item of cartItems) {
      if (item?.is_free_gift === true || item?.is_free_gift === 1) continue;

      const itemPid = Number(item?.product?.id ?? item?.product_id ?? NaN);
      if (!Number.isFinite(itemPid) || itemPid !== pid) continue;

      const itemVid = item?.variation?.id != null ? Number(item.variation.id) : NaN;
      const itemVidOk = Number.isFinite(itemVid);

      if (vidOk) {
        if (!itemVidOk || itemVid !== vidNum) continue;
      }

      id =
        fromEntity(item) ??
        fromEntity(item?.product) ??
        fromEntity(item?.variation);
      if (id != null) return id;
    }
  }

  if (Array.isArray(relatedProducts)) {
    for (const p of relatedProducts) {
      id = fromEntity(p);
      if (id != null) return id;
      const relVars = (p as any)?.variations;
      if (Array.isArray(relVars)) {
        for (const v of relVars) {
          id = fromEntity(v);
          if (id != null) return id;
        }
      }
    }
  }

  id = fromEntity(cartDataRoot);
  if (id != null) return id;

  if (Array.isArray(cartItems)) {
    for (const item of cartItems) {
      if (item?.is_free_gift === true || item?.is_free_gift === 1) continue;
      id =
        fromEntity(item) ??
        fromEntity(item?.product) ??
        fromEntity(item?.variation);
      if (id != null) return id;
    }
  }

  return null;
}

function unwrapProductDetailPayload(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== "object") return null;
  const envelope = response as Record<string, unknown>;
  const statusCode = Number(envelope.statusCode);
  if (Number.isFinite(statusCode) && statusCode !== 200) return null;

  const nested = envelope.data;
  const payload =
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    ("data" in (nested as Record<string, unknown>))
      ? (nested as Record<string, unknown>).data
      : nested ?? envelope;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const product = payload as Record<string, unknown>;
  if (
    product.id != null ||
    product.product_id != null ||
    Array.isArray(product.variations) ||
    typeof product.name === "string" ||
    typeof product.product_name === "string"
  ) {
    return product;
  }
  return null;
}

function ProductDetail() {
  useCookiePageView("Product details page");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ slug?: string | string[]; productSlug?: string | string[] }>();

  const dispatch = useAppDispatch();
  const [getProfile] = useLazyGetProfileQuery();
  const [addToCartApi, { isLoading: addToCartLoading }] =
    useAddToCartMutation();
  const [subscribeStockAlert, { isLoading: notifyMeLoading }] =
    useSubscribeStockAlertMutation();

  // store_id removed/commented as it is no longer required in the application
  // const storeId = searchParams.get("store_id");
  const queryProductId = searchParams.get("product_id");
  const [browserPathRevision, setBrowserPathRevision] = useState(0);
  const lockedProductIdForSlugRef = React.useRef<{
    slug: string;
    productId: string;
  } | null>(null);
  const slugParamClean = useMemo(() => {
    const raw = resolveProductSlugFromRoute(pathname, params);
    return String(raw || "").trim().replace(/^\/+|\/+$/g, "");
  }, [pathname, params, browserPathRevision]);
  const slugIdFromEmbedded = extractProductIdFromSlug(slugParamClean);
  const canonicalSlugSegment = canonicalizeProductSlugSegment(
    slugParamClean,
    slugIdFromEmbedded || undefined,
  );
  const slugLookupKey = getProductSlugLookupKey(
    slugParamClean,
    slugIdFromEmbedded || undefined,
  );
  const slugBasePart = useMemo(() => {
    const match = canonicalSlugSegment.match(/^(.*)-(\d+)$/);
    return match?.[1] || slugParamClean || "";
  }, [canonicalSlugSegment, slugParamClean]);
  const productId = useMemo(() => {
    const resolved = resolveProductIdForSlug(slugParamClean, {
      queryProductId,
    });
    if (resolved) {
      if (slugParamClean) {
        lockedProductIdForSlugRef.current = {
          slug: slugParamClean,
          productId: String(resolved),
        };
      }
      return resolved;
    }
    // After the address bar drops ?product_id=, keep the id we already resolved
    // for this slug so we never fall back to a broken slug-only detail fetch.
    if (
      lockedProductIdForSlugRef.current &&
      lockedProductIdForSlugRef.current.slug === slugParamClean
    ) {
      return lockedProductIdForSlugRef.current.productId;
    }
    if (!slugParamClean) return null;

    const onProductUrl =
      /\/product\//.test(pathname || "") ||
      (typeof window !== "undefined" &&
        /\/product\//.test(window.location.pathname));
    if (!onProductUrl) return null;
    if (!slugParamClean.includes("-") && !/^\d+$/.test(slugParamClean)) {
      return null;
    }

    const lookupKey = getProductSlugLookupKey(slugParamClean);
    if (!lookupKey) return null;
    const fromSession = lookupSlugId("product", lookupKey);
    if (fromSession && slugParamClean) {
      lockedProductIdForSlugRef.current = {
        slug: slugParamClean,
        productId: String(fromSession),
      };
    }
    return fromSession;
  }, [slugParamClean, queryProductId, pathname]);

  React.useEffect(() => {
    if (!productId || !slugLookupKey) return;
    saveSlugId("product", slugLookupKey, productId);
  }, [productId, slugLookupKey]);
  const detailTypeParam = searchParams.get("type");
  const detailType: "quick" | "normal" =
    detailTypeParam === "quick"
      ? "quick"
      : detailTypeParam === "normal"
        ? "normal"
        : getProductDetailApiChannel(searchParams);
  const [detailTypeFallback, setDetailTypeFallback] = useState<
    "quick" | "normal" | null
  >(null);
  const effectiveDetailType = detailTypeFallback ?? detailType;
  const deliveryMode = getDeliveryMode(searchParams);

  useEffect(() => {
    setDetailTypeFallback(null);
  }, [productId, slugParamClean]);

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;
    const cleaned = canonicalizeProductDetailBrowserUrl(pathname, searchParams);
    const current = `${window.location.pathname}${window.location.search}`;
    if (cleaned === current) return;
    window.history.replaceState(window.history.state, "", cleaned);
    setBrowserPathRevision((tick) => tick + 1);
  }, [pathname, searchParams]);

  const [
    triggerMoreProducts,
    { isLoading: moreProductsLoading },
  ] = useLazyGetMoreProductsQuery();

  const [productDetails, setProductDetails] = useState<any>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [moreFromThisShop, setMoreFromThisShop] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [productReviewsOnly, setProductReviewsOnly] = useState<any[]>([]); // Store product reviews separately
  const [recommendedPercentage, setRecommendedPercentage] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [productDeals, setProductDeals] = useState<
    { deal_title: string; deal_subtitle: string }[]
  >([]);
  const [isPdpReloadVisit, setIsPdpReloadVisit] = useState(false);
  const [allowPersistedVariantRestore, setAllowPersistedVariantRestore] = useState(false);
  const pdpReloadSessionKey = "WC_PDP_RELOAD";
  const pdpReloadVariantSlugSessionKey = "WC_PDP_RELOAD_VARIANT_SLUG";
  const [reloadVariantSlug, setReloadVariantSlug] = useState<string>("");
  const [deliveryContextTick, setDeliveryContextTick] = useState(0);
  const [isClientReady, setIsClientReady] = useState(false);
  const [guestAuthReady, setGuestAuthReady] = useState(false);
  const [guestLogin] = useGuestLoginMutation();
  // Get auth token to fetch user orders
  const token = useAppSelector(getToken) || getFromStorage(STORAGE_KEYS.token);
  const cartListArgs = useDashboardHomeQueryArgs();
  const { data: cartData } = useGetCartQuery(cartListArgs, { skip: !token });

  useLayoutEffect(() => {
    hydrateDeliveryContextForProductRequest();
    setDeliveryContextTick((tick) => tick + 1);
    setIsClientReady(true);

    const hasUserToken = Boolean(getFromStorage(STORAGE_KEYS.token));
    const hasGuestJwt = Boolean(getFromStorage(STORAGE_KEYS.guestJwtToken));
    if (hasUserToken || hasGuestJwt) {
      setGuestAuthReady(true);
      return;
    }
    void performGuestLogin(guestLogin).finally(() => {
      setGuestAuthReady(true);
    });
  }, [guestLogin]);

  useEffect(() => {
    const onDeliveryChange = () => setDeliveryContextTick((tick) => tick + 1);
    window.addEventListener(DELIVERY_SELECTION_CHANGED, onDeliveryChange);
    return () =>
      window.removeEventListener(DELIVERY_SELECTION_CHANGED, onDeliveryChange);
  }, []);

  const requestPincode = useMemo(() => {
    const fromArgs =
      cartListArgs.pincode != null ? String(cartListArgs.pincode).trim() : "";
    if (fromArgs) return fromArgs;
    return readPincodeForProductApi() || null;
  }, [cartListArgs.pincode, deliveryContextTick]);

  const productDetailsQueryArg = React.useMemo(
    () => ({
      product_id: productId ?? null,
      // Only send slug when we do not yet have a product_id. Sending both can
      // make the backend ignore the id and return an unrelated product (OOS bug).
      slug: productId ? undefined : slugParamClean || undefined,
      type: effectiveDetailType,
      latitude: cartListArgs.latitude,
      longitude: cartListArgs.longitude,
      pincode: requestPincode,
    }),
    [
      productId,
      slugParamClean,
      effectiveDetailType,
      cartListArgs.latitude,
      cartListArgs.longitude,
      requestPincode,
    ],
  );

  const canFetchProductDetails = Boolean(productId || slugParamClean);

  const {
    data: productDetailsResponse,
    isLoading: productDetailsLoading,
    isFetching: productDetailsFetching,
    isUninitialized: productDetailsUninitialized,
    error: productDetailsError,
    refetch: refetchProductDetailsQuery,
  } = useGetProductDetailsQuery(productDetailsQueryArg, {
    skip: !canFetchProductDetails || !isClientReady || !guestAuthReady,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    const onGuestToken = () => {
      setGuestAuthReady(true);
      if (canFetchProductDetails) void refetchProductDetailsQuery();
    };
    window.addEventListener("guestTokenUpdated", onGuestToken);
    return () => window.removeEventListener("guestTokenUpdated", onGuestToken);
  }, [productId, slugParamClean, refetchProductDetailsQuery, canFetchProductDetails]);

  const productDetailsFromQuery = useMemo(() => {
    if (!productDetailsResponse) return null;
    const unwrapped = unwrapProductDetailPayload(productDetailsResponse);
    if (!unwrapped) return null;
    // Guard against backend returning an unrelated product when slug was involved.
    if (productId) {
      const responseId = String(
        (unwrapped as { id?: unknown; product_id?: unknown }).id ??
          (unwrapped as { product_id?: unknown }).product_id ??
          "",
      ).trim();
      if (responseId && responseId !== String(productId)) {
        return null;
      }
    }
    return unwrapped;
  }, [productDetailsResponse, productId]);

  useEffect(() => {
    if (detailTypeFallback != null) return;
    if (!canFetchProductDetails || !isClientReady || !guestAuthReady) return;
    if (
      productDetailsUninitialized ||
      productDetailsLoading ||
      productDetailsFetching
    ) {
      return;
    }
    if (productDetailsFromQuery) return;
    setDetailTypeFallback(detailType === "quick" ? "normal" : "quick");
  }, [
    detailType,
    detailTypeFallback,
    canFetchProductDetails,
    isClientReady,
    guestAuthReady,
    productDetailsUninitialized,
    productDetailsLoading,
    productDetailsFetching,
    productDetailsFromQuery,
    productDetailsError,
    productDetailsResponse,
  ]);

  const activeProductDetails = productDetailsFromQuery ?? productDetails;
  const pd = activeProductDetails;
  const resolvedProductId = useMemo(() => {
    if (productId) return productId;
    const fromPd = (pd as { id?: unknown; product_id?: unknown } | null)?.id ??
      (pd as { product_id?: unknown } | null)?.product_id;
    if (fromPd != null && fromPd !== "") return String(fromPd);
    return null;
  }, [productId, pd]);

  const viewItemFiredForIdRef = useRef<string | number | null>(null);
  useEffect(() => {
    const currentId = pd?.id;
    if (!currentId || viewItemFiredForIdRef.current === currentId) return;
    viewItemFiredForIdRef.current = currentId;
    pushEvent("view_item", { items: [buildGtmItem(pd)] });
  }, [pd]);

  const syncPdpSlugInBrowserUrl = React.useCallback(
    (variant: any, parentProduct?: any | null) => {
      if (typeof window === "undefined" || !pathname) return;
      const parent = parentProduct ?? pd;
      const parentId = parent?.id ?? productId;
      if (!parentId) return;

      // Prefer short_slug for the visible PDP URL. Never replace a short_slug
      // landing URL with the longer `slug` when short_slug is missing from the payload.
      const shortSlug = String(variant?.short_slug || "").trim();
      const fullSlug = String(variant?.slug || "").trim();
      const browserSlug =
        getProductSlugFromPath(window.location.pathname) || slugParamClean;
      const browserNorm = slugify(browserSlug);
      if (
        browserNorm &&
        (browserNorm === slugify(shortSlug) || browserNorm === slugify(fullSlug))
      ) {
        return;
      }

      const variantSlug = shortSlug || fullSlug;
      if (!variantSlug) return;
      // If short_slug is unavailable, keep the current URL (do not expand to full slug).
      if (!shortSlug) return;

      const targetSlugSegment = buildVariantProductPathSegment(
        variantSlug,
        parentId,
      );
      if (!targetSlugSegment) return;
      if (browserNorm === slugify(targetSlugSegment)) return;

      const nextPath = buildCanonicalProductDetailPath(targetSlugSegment);
      const nextUrl = cleanPlainProductDetailUrl(nextPath, searchParams);
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl === nextUrl) return;

      window.history.replaceState(window.history.state, "", nextUrl);
      setBrowserPathRevision((tick) => tick + 1);
      saveSlugId(
        "product",
        getProductSlugLookupKey(targetSlugSegment, parentId),
        parentId,
      );
    },
    [pathname, pd, productId, searchParams, slugParamClean],
  );

  const [getAddressList, { data: addressResponse }] = useLazyGetAddressListQuery();
  const [editAddress] = useEditAddressMutation();
  const addresses = addressResponse?.data || [];
  const [selectedAddressId, setSelectedAddressId] = React.useState<string>("");
  const [openAddressModal, setOpenAddressModal] = useState(false);
  const [guestDeliveryDrawerOpen, setGuestDeliveryDrawerOpen] = useState(false);
  /** Re-read session location label when it updates but id stays `__current__` (same as header). */
  const [deliveryLabelTick, setDeliveryLabelTick] = useState(0);

  // Scroll to top when navigating to this product detail page
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  const selectedVariantStorageKey = React.useMemo(
    () => (productId ? `wc_selected_variant_${productId}` : ""),
    [productId]
  );
  const selectedVariantReloadSessionKey = React.useMemo(
    () => (productId ? `wc_pdp_reload_variant_${productId}` : ""),
    [productId]
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const wasReloadFromSession = window.sessionStorage.getItem(pdpReloadSessionKey) === "1";
    let wasReloadFromNavigation = false;
    let fromProductReferrer = false;
    try {
      const navEntry = window.performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      wasReloadFromNavigation = navEntry?.type === "reload";
    } catch {
      wasReloadFromNavigation = false;
    }
    try {
      const referrerPath = document.referrer
        ? new URL(document.referrer).pathname
        : "";
      fromProductReferrer = referrerPath.includes("/product/");
    } catch {
      fromProductReferrer = false;
    }
    const isReload = wasReloadFromSession || wasReloadFromNavigation;
    if (wasReloadFromSession) {
      window.sessionStorage.removeItem(pdpReloadSessionKey);
    }
    setAllowPersistedVariantRestore(isReload || fromProductReferrer);
    if (isReload) {
      const slugFromReload = window.sessionStorage.getItem(pdpReloadVariantSlugSessionKey) || "";
      setReloadVariantSlug(slugFromReload);
      window.sessionStorage.removeItem(pdpReloadVariantSlugSessionKey);
    } else {
      setReloadVariantSlug("");
    }
    setIsPdpReloadVisit(isReload);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (searchParams.get("entry") !== "nav") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("entry");
      const query = url.searchParams.toString();
      const nextUrl = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    } catch {
      // ignore URL parse/replace failures
    }
  }, [searchParams]);

  const getPersistedVariantId = React.useCallback((): number | null => {
    if (typeof window === "undefined") return null;
    if (!selectedVariantStorageKey || !allowPersistedVariantRestore) return null;
    const raw =
      (selectedVariantReloadSessionKey
        ? window.sessionStorage.getItem(selectedVariantReloadSessionKey)
        : null) || getFromStorage(selectedVariantStorageKey);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [selectedVariantStorageKey, selectedVariantReloadSessionKey, allowPersistedVariantRestore]);

  const pickInitialVariant = React.useCallback(
    (variants: any[] = []) => {
      if (!Array.isArray(variants) || variants.length === 0) return null;
      const normalizeSlug = (value: any) =>
        String(value || "")
          .trim()
          .replace(/^\/+|\/+$/g, "")
          .toLowerCase();
      const variantMatchesPathSlug = (variant: any, targetSlug: string) => {
        const targetNorm = normalizeSlug(targetSlug);
        if (!targetNorm) return false;
        const shortNorm = normalizeSlug(variant?.short_slug);
        const fullNorm = normalizeSlug(variant?.slug);
        if (shortNorm && shortNorm === targetNorm) return true;
        if (fullNorm && fullNorm === targetNorm) return true;
        const resolvedProductId = pd?.id ?? productId;
        if (!resolvedProductId) return false;
        const targetCanon = normalizeSlug(
          canonicalizeProductSlugSegment(targetSlug, resolvedProductId),
        );
        const shortCanon = normalizeSlug(
          canonicalizeProductSlugSegment(String(variant?.short_slug || ""), resolvedProductId),
        );
        const fullCanon = normalizeSlug(
          canonicalizeProductSlugSegment(String(variant?.slug || ""), resolvedProductId),
        );
        return Boolean(
          targetCanon &&
            ((shortCanon && shortCanon === targetCanon) ||
              (fullCanon && fullCanon === targetCanon)),
        );
      };
      const reloadSlugNorm = normalizeSlug(reloadVariantSlug);
      if (isPdpReloadVisit && reloadSlugNorm) {
        const fromReloadSlug = variants.find((variant: any) =>
          variantMatchesPathSlug(variant, reloadVariantSlug),
        );
        if (fromReloadSlug) return fromReloadSlug;
      }
      // Path slug (variation) wins over stored preference so links and URL bar stay consistent.
      const slugCandidates = [slugBasePart, slugParamClean, canonicalSlugSegment].filter(Boolean);
      for (const candidate of slugCandidates) {
        const matchingVariantBySlug = variants.find((variant: any) =>
          variantMatchesPathSlug(variant, String(candidate)),
        );
        if (matchingVariantBySlug) return matchingVariantBySlug;
      }
      const persistedVariantId = getPersistedVariantId();
      if (persistedVariantId != null) {
        const persistedVariant = variants.find(
          (variant: any) => Number(variant?.id) === persistedVariantId
        );
        if (persistedVariant) return persistedVariant;
      }
      // First variant in API order (index 0) — do not use `is_default` here; backends often set it on the last SKU.
      return variants[0] || null;
    },
    [
      getPersistedVariantId,
      isPdpReloadVisit,
      reloadVariantSlug,
      slugBasePart,
      slugParamClean,
      canonicalSlugSegment,
      pd?.id,
      productId,
    ]
  );

  /** Keep selection across refetches when the same SKU still exists (pin/location refresh). */
  const resolveSelectedVariantAfterDetailsLoad = React.useCallback(
    (variations: any[], previousVariant: any | null) => {
      const list = Array.isArray(variations) ? variations : [];
      const prevId =
        previousVariant?.id ??
        previousVariant?.variation_id ??
        previousVariant?.product_variation_id ??
        null;
      if (prevId != null && Number.isFinite(Number(prevId))) {
        const stillThere = list.find(
          (v: any) => Number(v?.id) === Number(prevId),
        );
        if (stillThere) return stillThere;
      }
      return pickInitialVariant(list);
    },
    [pickInitialVariant],
  );

  const handleVariantSelect = React.useCallback(
    (variant: any) => {
      setSelectedVariant(variant);
      setNotifyMeFormOpen(false);
      setNotifyEmail("");
      const variantId =
        variant?.id ?? variant?.variation_id ?? variant?.product_variation_id ?? null;
      const idNum = Number(variantId);
      if (selectedVariantStorageKey && Number.isFinite(idNum) && idNum > 0) {
        setToStorage(selectedVariantStorageKey, String(idNum));
      }
      if (selectedVariantReloadSessionKey && Number.isFinite(idNum) && idNum > 0) {
        window.sessionStorage.setItem(selectedVariantReloadSessionKey, String(idNum));
      }
      const rawVariantSlug =
        String(variant?.slug || "").trim() ||
        String(variant?.short_slug || "").trim();
      const resolvedProductId = variant?.product_id ?? pd?.id ?? productId;
      const selectedSlug = rawVariantSlug
        ? canonicalizeProductSlugSegment(rawVariantSlug, resolvedProductId)
        : getVariantUrlSlug(variant);
      if (selectedSlug) {
        window.sessionStorage.setItem(pdpReloadVariantSlugSessionKey, selectedSlug);
      }
      syncPdpSlugInBrowserUrl(
        selectedSlug ? { ...variant, short_slug: selectedSlug } : variant,
      );
    },
    [
      pdpReloadVariantSlugSessionKey,
      pd?.id,
      productId,
      selectedVariantReloadSessionKey,
      selectedVariantStorageKey,
      syncPdpSlugInBrowserUrl,
    ]
  );

  const handleLoadMoreProducts = async (sectionType: "recommended" | "shop") => {
    const productIdForMore = resolvedProductId ?? pd?.id;
    if (!productIdForMore) {
      toast.error("Product id is missing");
      return;
    }
    try {
      const typeToSend = sectionType === "recommended" ? "recommended" : "shop";
      const res = await triggerMoreProducts({
        productId: productIdForMore,
        type: typeToSend,
      }).unwrap();

      const resAny: any = res;
      const apiMoreProducts = resAny?.data?.moreProducts ?? resAny?.moreProducts ?? [];

      if (!Array.isArray(apiMoreProducts) || apiMoreProducts.length === 0) return;

      if (sectionType === "recommended") {
        setRecommendedProducts((prev) => {
          const existingIds = new Set(prev.map((p: any) => p?.product_id));
          const filtered = apiMoreProducts.filter((p: any) => !existingIds.has(p?.product_id));
          return [...prev, ...filtered];
        });
      } else {
        setMoreFromThisShop((prev) => {
          const existingIds = new Set(prev.map((p: any) => p?.product_id));
          const filtered = apiMoreProducts.filter((p: any) => !existingIds.has(p?.product_id));
          return [...prev, ...filtered];
        });
      }
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "Failed to load more products");
    }
  };

  // Fetch addresses when component mounts or token changes
  React.useEffect(() => {
    const currentToken = token || getFromStorage(STORAGE_KEYS.token);
    if (currentToken) {
      getAddressList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const applyResolvedProductAddress = React.useCallback(() => {
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
    setSelectedAddressId(resolveDeliveryAddressId(addresses, deliveryMode));
  }, [addresses, deliveryMode]);

  React.useEffect(() => {
    applyResolvedProductAddress();
  }, [applyResolvedProductAddress]);

  React.useEffect(() => {
    const handler = () => {
      applyResolvedProductAddress();
      setDeliveryLabelTick((n) => n + 1);
    };
    window.addEventListener(DELIVERY_SELECTION_CHANGED, handler);
    return () => window.removeEventListener(DELIVERY_SELECTION_CHANGED, handler);
  }, [applyResolvedProductAddress]);

  // Refetch addresses when opening the picker (same as cart)
  React.useEffect(() => {
    if (!openAddressModal) return;
    const currentToken = token || getFromStorage(STORAGE_KEYS.token);
    if (currentToken) {
      getAddressList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAddressModal]);

  const handleGuestDeliveryLocationSelect = React.useCallback(() => {
    const mode =
      getDeliveryMode(searchParams) === "quick_delivery"
        ? "quick_delivery"
        : "normal";
    persistDeliveryAddressIdForMode("normal", "__current__");
    persistDeliveryAddressIdForMode("quick_delivery", "__current__");
    if (mode === "normal") {
      setNormalDeliverHerePinned(true);
    }
    notifyDeliverySelectionChanged();
    dispatch(emptySplitApi.util.invalidateTags(["DASHBOARD", "CART"]));
  }, [dispatch, searchParams]);

  const handleOpenDeliveryAddressModal = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const currentToken = token || getFromStorage(STORAGE_KEYS.token);
      if (!currentToken) {
        setGuestDeliveryDrawerOpen(true);
        return;
      }
      setOpenAddressModal(true);
    },
    [token],
  );

  const selectedAddress =
    addresses.find((addr: Address) => addr.id.toString() === selectedAddressId) ||
    null;
  /** PDP line should show only the PIN (same idea as guest header), not city/state/address. */
  const deliveryPinOnlyLabel = React.useMemo(() => {
    const sixDigitPin = (text: string) => {
      const m = String(text || "").match(/\b(\d{6})\b/);
      return m ? m[1] : "";
    };

    const fromSaved = selectedAddress?.pincode
      ? String(selectedAddress.pincode).trim()
      : "";
    if (fromSaved) return fromSaved;

    const loc = readSelectedLocation();
    const fromSessionPin = loc?.pincode ? String(loc.pincode).trim() : "";
    if (fromSessionPin) return fromSessionPin;

    if (selectedAddress?.address) {
      const p = sixDigitPin(selectedAddress.address);
      if (p) return p;
    }
    if (loc?.address) {
      const p = sixDigitPin(loc.address);
      if (p) return p;
    }

    const fullLabel = getDeliveryDisplayLabel(selectedAddressId, addresses);
    const fromLabel = sixDigitPin(fullLabel);
    if (fromLabel) return fromLabel;

    if (
      !selectedAddressId ||
      fullLabel === "Select delivery address" ||
      fullLabel === "Current location"
    ) {
      return fullLabel;
    }

    return "Select delivery address";
  }, [selectedAddress, selectedAddressId, addresses, deliveryLabelTick]);

  // Fetch user orders to get reviews from orders API
  const { data: ordersData, refetch: refetchOrders } = useGetOrdersQuery(
    { page: 1, limit: 100 },
    { skip: !token || !productId }
  );

  // Keep slug→product id map in sync when the visible path slug changes (variant URL); avoid refetching product for slug-only changes.
  React.useEffect(() => {
    if (!pd?.id || !slugLookupKey) return;
    saveSlugId("product", slugLookupKey, pd.id);
  }, [slugLookupKey, pd?.id]);

  // Function to extract reviews from orders API and merge with product reviews
  const mergeReviewsFromOrders = React.useCallback((productReviews: any[]) => {
    if (!productId) {
      return productReviews;
    }

    if (!ordersData?.data) {
      return productReviews;
    }

    const orders = Array.isArray(ordersData.data) ? ordersData.data : [];
    const orderReviews: any[] = [];

    // Extract reviews from all orders
    orders.forEach((order: any) => {
      // Check for ratings_reviews in order
      if (order.ratings_reviews && Array.isArray(order.ratings_reviews)) {
        order.ratings_reviews.forEach((review: any) => {
          if (review.product_id?.toString() === productId?.toString() ||
            review.productId?.toString() === productId?.toString()) {
            const transformedReview = {
              id: review.id,
              rating: review.rating,
              comment: review.comment || review.review_text || review.text,
              created_at: review.createdAt || review.created_at || review.date,
              updated_at: review.updatedAt || review.updated_at,
              product_id: review.product_id || review.productId,
              user_id: review.user_id || review.userId,
              order_id: review.order_id || review.orderId,
              status: review.status,
              images: review.ratings_images || review.images || [],
              name: review.user?.name || review.user_name || review.customer_name || "User",
              user_name: review.user?.name || review.user_name,
              customer_name: review.user?.name || review.customer_name,
            };
            orderReviews.push(transformedReview);
          }
        });
      }

      // Also check items in order for reviews
      const items = order.items || order.order_items || [];
      items.forEach((item: any) => {
        if (item.ratings_reviews && Array.isArray(item.ratings_reviews)) {
          item.ratings_reviews.forEach((review: any) => {
            if (review.product_id?.toString() === productId?.toString() ||
              review.productId?.toString() === productId?.toString() ||
              item.product_id?.toString() === productId?.toString() ||
              item.productId?.toString() === productId?.toString()) {
              const transformedReview = {
                id: review.id,
                rating: review.rating,
                comment: review.comment || review.review_text || review.text,
                created_at: review.createdAt || review.created_at || review.date,
                updated_at: review.updatedAt || review.updated_at,
                product_id: review.product_id || review.productId || item.product_id || item.productId,
                user_id: review.user_id || review.userId,
                order_id: review.order_id || review.orderId || order.id || order.order_id,
                status: review.status,
                images: review.ratings_images || review.images || [],
                name: review.user?.name || review.user_name || review.customer_name || "User",
                user_name: review.user?.name || review.user_name,
                customer_name: review.user?.name || review.customer_name,
              };
              orderReviews.push(transformedReview);
            }
          });
        }
      });
    });

    // Merge product reviews with order reviews
    const reviewsMap = new Map<number, any>();

    productReviews.forEach((review: any) => {
      if (review.id) {
        reviewsMap.set(review.id, review);
      }
    });

    orderReviews.forEach((review: any) => {
      if (review.id) {
        reviewsMap.set(review.id, review);
      }
    });

    const mergedReviews = Array.from(reviewsMap.values());
    const sortedReviews = [...mergedReviews].sort((a: any, b: any) => {
      const dateA = a.created_at || a.createdAt || a.date || a.updated_at || a.updatedAt || '';
      const dateB = b.created_at || b.createdAt || b.date || b.updated_at || b.updatedAt || '';
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return sortedReviews;
  }, [ordersData, productId]);

  useLayoutEffect(() => {
    if (!productDetailsResponse) return;

    const response = productDetailsResponse;
    const responseAny = response as any;

    let recommendedProductsData: any[] = [];
    if (
      responseAny?.recommended_products &&
      Array.isArray(responseAny.recommended_products)
    ) {
      recommendedProductsData = responseAny.recommended_products;
    } else if (
      responseAny?.data?.recommended_products &&
      Array.isArray(responseAny.data.recommended_products)
    ) {
      recommendedProductsData = responseAny.data.recommended_products;
    }
    setRecommendedProducts(recommendedProductsData);

    let moreFromThisShopData: any[] = [];
    if (
      responseAny?.data?.more_from_this_shop &&
      Array.isArray(responseAny.data.more_from_this_shop)
    ) {
      moreFromThisShopData = responseAny.data.more_from_this_shop;
    } else if (
      responseAny?.more_from_this_shop &&
      Array.isArray(responseAny.more_from_this_shop)
    ) {
      moreFromThisShopData = responseAny.more_from_this_shop;
    }
    setMoreFromThisShop(moreFromThisShopData);

    let reviewsData: any[] = [];
    if (responseAny?.reviews && Array.isArray(responseAny.reviews)) {
      reviewsData = responseAny.reviews;
    } else if (
      responseAny?.data?.reviews &&
      Array.isArray(responseAny.data.reviews)
    ) {
      reviewsData = responseAny.data.reviews;
    } else if (
      responseAny?.product_reviews &&
      Array.isArray(responseAny.product_reviews)
    ) {
      reviewsData = responseAny.product_reviews;
    } else if (
      responseAny?.data?.product_reviews &&
      Array.isArray(responseAny.data.product_reviews)
    ) {
      reviewsData = responseAny.data.product_reviews;
    }

    reviewsData = [...reviewsData].sort((a: any, b: any) => {
      const dateA = a.created_at || a.createdAt || a.date || a.updated_at || a.updatedAt || '';
      const dateB = b.created_at || b.createdAt || b.date || b.updated_at || b.updatedAt || '';
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    setProductReviewsOnly(reviewsData);
    setReviews(mergeReviewsFromOrders(reviewsData));

    const productPayload = unwrapProductDetailPayload(response);
    if (productPayload) {
      setProductDetails(productPayload);
      setSelectedVariant((prev: any) =>
        resolveSelectedVariantAfterDetailsLoad(
          (productPayload.variations as any[]) || [],
          prev,
        ),
      );
    } else {
      setProductDetails(null);
    }

    const dealText = responseAny?.data?.dealText;
    if (Array.isArray(dealText) && dealText.length > 0) {
      setProductDeals(
        dealText.map((d: any) => ({
          deal_title: d.deal_title ?? d.dealTitle ?? "",
          deal_subtitle: d.deal_subtitle ?? d.dealSubtitle ?? "",
        }))
      );
    } else {
      setProductDeals([]);
    }
  }, [
    productDetailsResponse,
    mergeReviewsFromOrders,
    resolveSelectedVariantAfterDetailsLoad,
  ]);

  const refetchProductDetails = React.useCallback(() => {
    void refetchProductDetailsQuery();
  }, [refetchProductDetailsQuery]);

  React.useEffect(() => {
    if (!selectedVariantStorageKey) return;
    const variantId =
      selectedVariant?.id ??
      selectedVariant?.variation_id ??
      selectedVariant?.product_variation_id ??
      null;
    const n = Number(variantId);
    if (Number.isFinite(n) && n > 0) {
      setToStorage(selectedVariantStorageKey, String(n));
      if (selectedVariantReloadSessionKey) {
        window.sessionStorage.setItem(selectedVariantReloadSessionKey, String(n));
      }
    }
    const rawVariantSlug =
      String(selectedVariant?.slug || "").trim() ||
      String(selectedVariant?.short_slug || "").trim();
    const resolvedProductId =
      selectedVariant?.product_id ?? pd?.id ?? productId;
    const selectedSlug = rawVariantSlug
      ? canonicalizeProductSlugSegment(rawVariantSlug, resolvedProductId)
      : getVariantUrlSlug(selectedVariant);
    if (selectedSlug) {
      window.sessionStorage.setItem(pdpReloadVariantSlugSessionKey, selectedSlug);
    }
  }, [
    selectedVariant,
    selectedVariantStorageKey,
    selectedVariantReloadSessionKey,
    pdpReloadVariantSlugSessionKey,
    pd?.id,
    productId,
  ]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const markPdpReload = () => {
      if (window.location.pathname.includes("/product/")) {
        window.sessionStorage.setItem(pdpReloadSessionKey, "1");
      }
    };
    window.addEventListener("beforeunload", markPdpReload);
    return () => {
      window.removeEventListener("beforeunload", markPdpReload);
    };
  }, []);

  // Update reviews when orders data changes (to include latest reviews from orders API)
  React.useEffect(() => {
    if (ordersData && productId && productReviewsOnly.length >= 0) {
      const mergedReviews = mergeReviewsFromOrders(productReviewsOnly);

      const currentIds = new Set(reviews.map((r: any) => r.id));
      const mergedIds = new Set(mergedReviews.map((r: any) => r.id));
      const hasChanges =
        mergedIds.size !== currentIds.size ||
        Array.from(mergedIds).some((id) => !currentIds.has(id));

      if (hasChanges) {
        setReviews(mergedReviews);
      }
    }
  }, [
    ordersData,
    productId,
    productReviewsOnly,
    mergeReviewsFromOrders,
    // storeId removed/commented as it is no longer required in the application
    // storeId,
    reviews,
  ]);

  // Listen for review submission events to refetch reviews
  React.useEffect(() => {
    const handleReviewSubmitted = (event?: any) => {
      if (refetchOrders) {
        setTimeout(() => {
          refetchOrders();
        }, 2000);

        setTimeout(() => {
          refetchOrders();
        }, 5000);
      }

      setTimeout(() => {
        refetchProductDetails();
      }, 2000);

      setTimeout(() => {
        refetchProductDetails();
      }, 5000);
    };

    const handleRefetchOrders = () => {
      if (refetchOrders) {
        setTimeout(() => refetchOrders(), 1000);
      }
    };

    window.addEventListener('reviewSubmitted', handleReviewSubmitted);
    window.addEventListener('refetchOrders', handleRefetchOrders);

    return () => {
      window.removeEventListener('reviewSubmitted', handleReviewSubmitted);
      window.removeEventListener('refetchOrders', handleRefetchOrders);
    };
  }, [refetchProductDetails, refetchOrders]);

  const [quantity, setQuantity] = React.useState("1");
  const [isAddedToCart, setIsAddedToCart] = React.useState(false);
  const [notifyMeFormOpen, setNotifyMeFormOpen] = React.useState(false);
  const [notifyEmail, setNotifyEmail] = React.useState("");

  useEffect(() => {
    setIsAddedToCart(false);
    setNotifyMeFormOpen(false);
    setNotifyEmail("");
  }, [productId]);

  /** Product detail API `stock_quantity`, capped at 10 for the quantity dropdown. */
  const maxSelectableQuantity = useMemo(
    () => getMaxUnitsPerSkuFromStock(selectedVariant, pd),
    [
      selectedVariant,
      pd?.stock_quantity,
      pd?.stockQuantity,
      pd?.qty_available,
    ],
  );

  const cartQtyForThisSku = useMemo(() => {
    const items = cartData?.data?.items;
    return getCartQtyForProductSku(
      items,
      pd?.id ?? pd?.product_id,
      selectedVariant?.id ?? selectedVariant?.variation_id,
    );
  }, [
    cartData?.data?.items,
    pd?.id,
    pd?.product_id,
    selectedVariant?.id,
    selectedVariant?.variation_id,
  ]);

  /** How many more units the user can add in one go (stock cap minus already in cart). */
  const maxAddNow = useMemo(() => {
    if (maxSelectableQuantity < 1) return 0;
    return Math.max(0, maxSelectableQuantity - cartQtyForThisSku);
  }, [maxSelectableQuantity, cartQtyForThisSku]);

  const cartSkuLimitReached =
    maxSelectableQuantity > 0 && maxAddNow < 1 && !isAddedToCart;

  useEffect(() => {
    if (maxSelectableQuantity < 1) {
      setQuantity("0");
      return;
    }
    setQuantity((prev) => {
      const n = Number(prev);
      if (!Number.isFinite(n) || n < 1) return "1";
      if (n > maxSelectableQuantity) return String(maxSelectableQuantity);
      return prev;
    });
  }, [maxSelectableQuantity, selectedVariant?.id]);

  const handleChange = (event: SelectChangeEvent) => {
    setQuantity(event.target.value);
  };
  const [] = React.useState<null | HTMLElement>(null);
  const [] = useState(0);

  type Slider = any;
  const mainSliderRef = useRef<Slider | null>(null);
  const thumbSliderRef = useRef<Slider | null>(null);
  const sliderRef = useRef<Slider | null>(null);
  const dealSliderRef = useRef<Slider | null>(null);
  const fullViewSliderRef = useRef<Slider | null>(null);
  const youMayAlsoLikeRef = useRef<HTMLElement | null>(null);
  const reviewsSectionRef = useRef<HTMLElement | null>(null);
  const pendingReplaySignatureRef = useRef<string | null>(null);
  const [nav1, setNav1] = useState<Slider | null>(null);
  const [nav2, setNav2] = useState<Slider | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [imageZoomScale, setImageZoomScale] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageZoomPan, setImageZoomPan] = useState({ x: 0, y: 0 });
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const zoomDragRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0 });
  const [isReviewImageZoomOpen, setIsReviewImageZoomOpen] = useState(false);
  const [activeReviewImageUrl, setActiveReviewImageUrl] = useState<string>("");

  React.useEffect(() => {
    if (isImageZoomOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.overflowX = "hidden";
    } else {
      document.body.style.overflow = "";
      document.body.style.overflowX = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.overflowX = "";
    };
  }, [isImageZoomOpen]);

  const filteredReviews = React.useMemo(() => {
    return (reviews || []).filter((review: any) => {
      return (
        review &&
        (review.rating ||
          review.comment ||
          review.review_text ||
          review.text ||
          review.message)
      );
    });
  }, [reviews]);

  /** Stars, bars, and average from rows we actually show — not API average_rating when reviews[] is empty. */
  const displayedReviewRatingSummary = React.useMemo(() => {
    const list = filteredReviews;
    const distribution: { [key: number]: number } = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    let totalRating = 0;
    for (const review of list) {
      const rating = parseInt(
        String(review.rating || review.star_rating || review.rating_value || "0"),
        10
      );
      if (rating >= 1 && rating <= 5) {
        distribution[rating] = (distribution[rating] || 0) + 1;
      }
      const ratingValue = parseFloat(
        String(review.rating || review.star_rating || review.rating_value || "0")
      );
      if (ratingValue > 0) {
        totalRating += ratingValue;
      }
    }
    const count = list.length;
    const average =
      count > 0 ? (totalRating / count).toFixed(1) : "0.0";
    return { distribution, average, count };
  }, [filteredReviews]);

  const ratingSectionCount =
    pd?.review_count ?? displayedReviewRatingSummary.count ?? 0;
  const showProductReviews =
    parseReviewCount(ratingSectionCount) > 0 ||
    displayedReviewRatingSummary.count > 0;
  const ratingBarDenominator =
    displayedReviewRatingSummary.count > 0
      ? displayedReviewRatingSummary.count
      : Number(pd?.review_count) || 0;

  const computeRecommendedPercentage = React.useCallback((list: any[]) => {
    const total = list?.length ?? 0;
    if (total <= 0) return 0;
    const recommendedCount = list.filter((r: any) => {
      const ratingValue = parseFloat(r?.rating || r?.star_rating || r?.rating_value || "0");
      return ratingValue >= 4;
    }).length;
    return Math.round((recommendedCount / total) * 100);
  }, []);

  React.useEffect(() => {
    // Align with mobile logic: based on currently displayed reviews
    setRecommendedPercentage(computeRecommendedPercentage(filteredReviews));
  }, [filteredReviews, computeRecommendedPercentage]);

  const customerPhotoUrls = React.useMemo(() => {
    const urls: string[] = [];
    filteredReviews.forEach((review: any) => {
      const rawImages =
        review.images ||
        review.review_images ||
        review.ratings_images ||
        review.media ||
        review.attachments ||
        [];
      rawImages.forEach((img: any) => {
        const url =
          typeof img === "string"
            ? img
            : img?.url ||
            img?.image_url ||
            img?.image ||
            img?.src ||
            img?.path ||
            img?.file_url ||
            "";
        if (url) urls.push(url);
      });
    });
    // unique, preserve order
    return Array.from(new Set(urls));
  }, [filteredReviews]);

  useEffect(() => {
    setNav1(mainSliderRef.current);
    setNav2(thumbSliderRef.current);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    // When variant changes, reset the active image to the first one.
    setActiveImageIndex(0);
    try {
      (nav1 as any)?.slickGoTo?.(0, true);
      (nav2 as any)?.slickGoTo?.(0, true);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedVariant?.id,
    selectedVariant?.variation_id,
    selectedVariant?.product_variation_id,
  ]);

  React.useEffect(() => {
    if (!pathname || typeof window === "undefined" || !selectedVariant) return;

    const variantRowId =
      selectedVariant?.id ??
      selectedVariant?.variation_id ??
      selectedVariant?.product_variation_id ??
      null;
    const fromList =
      variantRowId != null && Array.isArray(pd?.variations)
        ? pd.variations.find(
            (v: any) => Number(v?.id) === Number(variantRowId),
          )
        : null;

    syncPdpSlugInBrowserUrl(fromList || selectedVariant);
  }, [
    pathname,
    pd?.id,
    pd?.variations,
    productId,
    searchParams,
    selectedVariant,
    syncPdpSlugInBrowserUrl,
  ]);

  const isProductQueryPending =
    !isClientReady ||
    !guestAuthReady ||
    (canFetchProductDetails &&
      (productDetailsUninitialized ||
        productDetailsLoading ||
        productDetailsFetching ||
        (!pd && !productDetailsError)));
  // IMPORTANT: This must be declared before `if (!mounted) return null;`
  // so hook order stays stable.
  const scrollToReviewsSection = React.useCallback(() => {
    reviewsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);
  useEffect(() => {
    if (!token || !pd?.id) return;

    const pendingStr = getFromStorage(STORAGE_KEYS.pendingAddToCart);
    if (!pendingStr) return;
    if (pendingReplaySignatureRef.current === pendingStr) return;

    let pending: any = null;
    try {
      pending = JSON.parse(pendingStr);
    } catch {
      return;
    }
    if (!pending) return;

    const pendingProductId =
      pending?.product_id != null ? Number(pending.product_id) : null;
    const currentProductId = Number(pd?.id);

    if (!pendingProductId || pendingProductId !== currentProductId) return;

    pendingReplaySignatureRef.current = pendingStr;

    const deliveryChannel =
      pending?.channel ?? getDeliveryChannel(searchParams);
    const qty = pending?.qty != null ? Number(pending.qty) : 1;
    const variationId =
      pending?.variation_id !== undefined && pending?.variation_id !== null
        ? Number(pending.variation_id)
        : null;

    addToCartApi({
      product_id: currentProductId,
      variation_id: variationId,
      qty,
      channel: deliveryChannel,
    })
      .unwrap()
      .then((res: any) => {
        if (res?.statusCode === 200) {
          toast.success(res?.message || "Added to cart successfully");
        } else {
          toast.error(res?.message || "Failed to add to cart");
        }

        removeFromStorage(STORAGE_KEYS.pendingAddToCart);
        return getProfile()
          .unwrap()
          .then((profileRes: any) => {
            if (profileRes?.data) dispatch(setUser({ user: profileRes.data }));
          });
      })
      .catch(() => {
        // Avoid infinite loops: clear pending even on failure.
        removeFromStorage(STORAGE_KEYS.pendingAddToCart);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pd?.id]);

  if (!mounted) {
    return null;
  }

  const settings = {
    infinite: videoData.length > 6,
    slidesToShow: 6,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    responsive: [
      {
        breakpoint: 1400,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 1,
          infinite: videoData.length > 5,
        },
      },
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          infinite: videoData.length > 4,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: videoData.length > 3,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: videoData.length > 2,
          swipeToSlide: true,
        },
      },
    ],
    swipeToSlide: true,
    touchThreshold: 10,
  };
  const getProductSliderSettings = (dataLength: number) => ({
    infinite: dataLength > 5,
    slidesToShow: 5,
    slidesToScroll: 1,
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />,
    dots: false,
    swipeToSlide: true,
    touchThreshold: 10,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: dataLength > 3,
          swipeToSlide: true,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: dataLength > 2,
          swipeToSlide: true,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: dataLength > 2,
          swipeToSlide: true,
        },
      },
    ],
  });

  const dealSliderSettings = {
    dots: productDeals.length > 1,
    infinite: productDeals.length > 1,
    speed: 400,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: productDeals.length > 1,
    autoplaySpeed: 4500,
    swipeToSlide: true,
    touchThreshold: 10,
  };

  // Always show Home > product name from API (same for search, brand, and category URLs).
  const breadcrumbItems = [
    { label: "Home", path: "/" },
    {
      label:
        pd?.name || pd?.product_name || "Product",
    },
  ];

  // Get product images from API (variant first, then product gallery) so main image matches variant but thumbnails show when gallery has more than one
  const getProductImagesList = () => {
    if (!pd) return productImages;

    const buildProductLevelImages = (): string[] => {
      const out: string[] = [];
      const pushIfValid = (url?: string) => {
        const u = (url || "").toString().trim();
        if (!u) return;
        if (!out.includes(u)) out.push(u);
      };
      const pushMany = (arr: any) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((img: any) => {
          if (typeof img === "string") return pushIfValid(img);
          pushIfValid(
            img?.url || img?.image_url || img?.image || img?.src || img?.path || ""
          );
        });
      };

      pushIfValid(pd.primary_image || pd.primaryImage);
      pushMany(pd.gallery_images || pd.galleryImages);

      if (out.length === 0) {
        pushMany(pd.images);
        pushIfValid(pd.image);
      }
      return out;
    };

    const productLevel = buildProductLevelImages();
    const variantUrls = selectedVariant
      ? collectVariationImageUrls(selectedVariant)
      : [];

    if (variantUrls.length > 0) {
      const merged: string[] = [...variantUrls];
      for (const u of productLevel) {
        if (u && !merged.includes(u)) merged.push(u);
      }
      return merged.length > 0 ? merged : productImages;
    }

    return productLevel.length > 0 ? productLevel : productImages;
  };

  const productImagesList = getProductImagesList();
  const showThumbGallery = productImagesList.length > 1;

  // Main price block should follow selected variant (fallback to product price).
  const selectedStorePrice =
    selectedVariant?.price?.store_price ?? selectedVariant?.selling_price ?? null;
  const selectedMrp = selectedVariant?.price?.mrp ?? selectedVariant?.mrp ?? null;
  const selectedPercentageOff = selectedVariant?.price?.percentage_off ?? null;

  const displayStorePrice =
    selectedStorePrice ?? pd?.price?.store_price ?? "0.00";
  const displayMrp = selectedMrp ?? pd?.price?.mrp ?? "0.00";
  const displayPercentageOff =
    selectedPercentageOff != null
      ? Number(selectedPercentageOff)
      : Number(displayMrp) > 0 && Number(displayStorePrice) > 0
        ? Math.round(
          ((Number(displayMrp) - Number(displayStorePrice)) / Number(displayMrp)) * 100
        )
        : Number(pd?.price?.percentage_off ?? 0);

  const showCutMrpMain = showMrpAsCutPrice(displayMrp, displayStorePrice);

  const selectedVariantPickerLabel = selectedVariant
    ? getVariantPickerLabel(selectedVariant)
    : "";
  const selectedVariantSwatchColor = selectedVariant
    ? getVariantSwatchColor(selectedVariant)
    : "#e8d8cf";
  const useSizeVariantPicker = Array.isArray(pd?.variations)
    ? shouldUseSizePicker(
        pd.variations,
        pd?.name || pd?.product_name || "",
      )
    : false;
  const productDisplayTitle = buildProductDisplayTitle(
    pd?.name || pd?.product_name || "Product Name",
    selectedVariant,
    { sizeOnly: useSizeVariantPicker },
  );

  if (isProductQueryPending) {
    return (
      <section className="product_detail_sc u_spc">
        <div className="container">
          <p className="product_loading_text">Loading product details...</p>
          <div className="product_detail_skeleton">
            <div className="skeleton_col lt">
              <div className="skeleton_thumbs">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="skeleton_shimmer skeleton_thumb_item"
                  />
                ))}
              </div>
              <div className="skeleton_shimmer skeleton_main_image" />
            </div>

            <div className="skeleton_col rt">
              <div className="skeleton_shimmer skeleton_badge" />
              <div className="skeleton_shimmer skeleton_title" />
              <div className="skeleton_shimmer skeleton_subtitle" />

              <div className="skeleton_price_row">
                <div className="skeleton_shimmer skeleton_price_main" />
                <div className="skeleton_shimmer skeleton_price_strike" />
              </div>

              <div className="skeleton_variant_list">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="skeleton_shimmer skeleton_variant_item"
                  />
                ))}
              </div>

              <div className="skeleton_shimmer skeleton_delivery" />
              <div className="skeleton_shimmer skeleton_button" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (productDetailsError || (!isProductQueryPending && !pd)) {
    return (
      <section className="product_detail_sc u_spc">
        <div className="container">
          <p>Data not found</p>
        </div>
      </section>
    );
  }

  const addToCart = async () => {
    try {
      if (!pd?.id) {
        toast.error("Product information missing");
        return;
      }

      // Get the selected quantity, default to 1 if not selected
      const selectedQuantity = quantity ? Number(quantity) : 1;

      if (selectedQuantity < 1) {
        toast.error("Please select a quantity greater than 0");
        return;
      }

      if (maxSelectableQuantity > 0 && selectedQuantity > maxAddNow) {
        if (maxAddNow < 1) {
          toastMaxQuantityInCart(maxSelectableQuantity);
        } else {
          toast.error(
            `You can add at most ${maxAddNow} more (up to ${maxSelectableQuantity} total for this item).`,
          );
        }
        return;
      }

      const deliveryChannel = getDeliveryChannel(searchParams);
      const resolvedStoreId = resolvePdpStoreId(
        selectedVariant,
        pd,
        searchParams,
        cartData?.data?.items,
        cartData?.data,
        [...(moreFromThisShop || []), ...(recommendedProducts || [])],
      );
      const normalizedStoreId =
        resolvedStoreId != null ? resolvedStoreId : Number.NaN;
      const res = await addToCartApi({
        product_id: pd.id,
        variation_id: selectedVariant?.id ?? null,
        qty: selectedQuantity,
        ...(Number.isFinite(normalizedStoreId) && normalizedStoreId > 0
          ? { store_id: normalizedStoreId }
          : {}),
        channel: deliveryChannel,
      }).unwrap();
      if (res?.statusCode === 200) {
        toast.success(res?.message || "Added to cart successfully", {
          id: "add-to-cart-success",
        });
        pushEvent("add_to_cart", {
          items: [buildGtmItem(pd, { quantity: selectedQuantity })],
        });
        setIsAddedToCart(true);
        removeFromStorage(STORAGE_KEYS.pendingAddToCart);
        const currentToken = getFromStorage(STORAGE_KEYS.token);
        if (currentToken) {
          try {
            const profileRes = await getProfile().unwrap();
            if (profileRes?.data) dispatch(setUser({ user: profileRes.data }));
          } catch (_) {
            // ignore profile refresh failure
          }
        }
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to add to cart");
    }
  };

  const handleAddToCartButtonClick = () => {
    if (isAddedToCart) {
      router.push("/cart?entry=nav");
      return;
    }
    if (cartSkuLimitReached) {
      toastMaxQuantityInCart(maxSelectableQuantity);
      return;
    }
    void addToCart();
  };

  const currentSkuInStock = isSkuInStock(selectedVariant, pd);

  const handleNotifyMeSubmit = async () => {
    if (!pd?.id) {
      toast.error("Product information missing");
      return;
    }
    const normalizedEmail = notifyEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Please enter your email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    const variationRaw =
      selectedVariant?.id ??
      selectedVariant?.variation_id ??
      selectedVariant?.product_variation_id ??
      (Array.isArray(pd.variations) &&
      pd.variations.length === 1
        ? pd.variations[0]?.id
        : null);
    const variationNum = Number(variationRaw);
    const variationPayload =
      Number.isFinite(variationNum) && variationNum > 0 ? variationNum : null;

    const stockAlertPayload = {
      product_id: Number(pd.id),
      email: normalizedEmail,
      ...(variationPayload != null ? { variation_id: variationPayload } : {}),
    };

    try {
      const res: any = await subscribeStockAlert(stockAlertPayload).unwrap();
      if (res?.statusCode !== undefined && res.statusCode !== 200) {
        toast.error(res?.message || "Could not subscribe to stock alert");
        return;
      }
      toast.success(
        res?.message || "We will notify you when this product is back in stock",
      );
      setNotifyMeFormOpen(false);
      setNotifyEmail("");
    } catch (error: unknown) {
      let message = "Could not subscribe to stock alert";
      if (error && typeof error === "object" && "data" in error) {
        const data = (error as { data: unknown }).data;
        if (typeof data === "string" && data.trim()) {
          message = data;
        } else if (data && typeof data === "object" && "message" in data) {
          const m = (data as { message: unknown }).message;
          if (typeof m === "string" && m.trim()) message = m;
        }
      }
      toast.error(message);
    }
  };

  return (
    <>
      <section className="product_detail_sc u_spc">
        <div className="container ">
          <BredCrum items={breadcrumbItems} />

          <div className="about_product gap_m">
            <div className="lt">
              <div
                className={
                  showThumbGallery ? "product_slider" : "product_slider product_slider_single"
                }
              >
                {/* Thumbnail Slider — only when multiple images */}
                {showThumbGallery && (
                  <Slider
                    asNavFor={nav1 as Slider}
                    ref={(slider: Slider | null) => setNav2(slider)}
                    slidesToShow={7}
                    swipeToSlide
                    touchThreshold={10}
                    focusOnSelect
                    vertical
                    verticalSwiping
                    arrows={productImagesList.length > 6}
                    infinite={productImagesList.length > 6}
                    responsive={[
                      {
                        breakpoint: 1200,
                        settings: {
                          slidesToShow: 5,
                          arrows: productImagesList.length > 5,
                          infinite: productImagesList.length > 5,
                        },
                      },
                      {
                        breakpoint: 767,
                        settings: {
                          slidesToShow: 4,
                          arrows: productImagesList.length > 4,
                          infinite: productImagesList.length > 4,
                        },
                      },
                      {
                        breakpoint: 575,
                        settings: {
                          slidesToShow: 3,
                          arrows: productImagesList.length > 3,
                          infinite: productImagesList.length > 3,
                          swipeToSlide: true,
                        },
                      },
                    ]}
                    className="thumb_slider"
                  >
                    {productImagesList?.map((img: string, i: number) => (
                      <figure key={i} className="main">
                        <img
                          src={img || "/images/product_default.png"}
                          alt={`thumb-${i}`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/product_default.png";
                          }}
                        />
                      </figure>
                    ))}
                  </Slider>
                )}

                {/* main slider */}
                <Slider
                  asNavFor={
                    showThumbGallery ? (nav2 as Slider) : undefined
                  }
                  ref={(slider: Slider | null) => setNav1(slider)}
                  arrows={productImagesList.length > 1}
                  infinite={productImagesList.length > 1}
                  swipeToSlide={true}
                  touchThreshold={10}
                  className="main_slider"
                  beforeChange={(_: any, next: any) => {
                    setActiveImageIndex(next);
                  }}
                >
                  {productImagesList.map((img: string, i: number) => (
                    <figure
                      key={i}
                      className={
                        recommendedProducts.length > 0
                          ? "main view_similar_main"
                          : "main"
                      }
                    >
                      <img
                        src={img || "/images/product_default.png"}
                        alt={`main-${i}`}
                        style={{ transition: "opacity 0.25s ease-in-out" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/images/product_default.png";
                        }}
                      />
                      {recommendedProducts.length > 0 && (
                        <figcaption
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            youMayAlsoLikeRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              youMayAlsoLikeRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          View Similar Items
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </Slider>
                <div className="btn_group">
                  {productId && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#ffffff",
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <WishlistButton
                        productId={productId}
                        // storeId removed/commented as it is no longer required in the application
                        // storeId={storeId}
                        isWishlist={pd?.is_wishlist}
                      />
                    </div>
                  )}
                  <Button
                    className="icon_btn"
                    aria-label="Full view"
                    onClick={() => {
                      setImageZoomScale(1);
                      setImageZoomPan({ x: 0, y: 0 });
                      setIsImageZoomOpen(true);
                    }}
                  >
                    <img src="/images/zoomout_icon.svg" alt="Full view" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="rt">

              <div className="right_head_content">
                <div className="lt_content">
                  <div className="brand_share_row">
                    {pd?.brand?.name ? (
                      <h2>{pd.brand.name}</h2>
                    ) : (
                      <span />
                    )}
                    <ShareProduct />
                  </div>
                  <h3>{productDisplayTitle}</h3>
                  {showProductReviews ? (
                    <p
                      className="review"
                      role="button"
                      tabIndex={0}
                      onClick={scrollToReviewsSection}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          scrollToReviewsSection();
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <Rating
                        name="read-only"
                        value={
                          displayedReviewRatingSummary.count > 0
                            ? parseFloat(displayedReviewRatingSummary.average)
                            : parseFloat(String(pd?.average_rating || "0")) || 0
                        }
                        readOnly
                      />
                      <span>({parseReviewCount(ratingSectionCount)})</span>
                    </p>
                  ) : null}
                  <p className="price">
                    <ins>₹{formatPriceInr(displayStorePrice)}</ins>
                    {showCutMrpMain && (
                      <span className="price_cut">
                        <del>₹{formatPriceInr(displayMrp)}</del>
                        {displayPercentageOff > 0 && (
                          <span>{displayPercentageOff}% off</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {/* <div className="variant">
                <div className="variant_bx">
                  <div className="variant_head">
                    <h4>
                      Size: <span>{productDetails.size || "Select Size"}</span>
                    </h4>
                    {productDetails.size_chart && (
                      <a
                        className="text_btn"right_head
                        href={productDetails.size_chart}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Size Chart
                      </a>
                    )}
                  </div>
                  {productDetails.sizes && productDetails.sizes.length > 0 ? (
                    <ul className="size_list gap_m">
                      {productDetails.sizes.map((size: any, index: number) => (
                        <li
                          key={index}
                          className={size.in_stock ? "" : "disable"}
                        >
                          <div className="size_list_inr">
                            <p className="size">{size.name || size.size}</p>
                            {size.measurements && <p>{size.measurements}</p>}
                            {size.in_stock ? (
                              <h3>
                                ₹
                                {size.price ||
                                  productDetails.price?.store_price}
                                {size.original_price && (
                                  <del>₹{size.original_price}</del>
                                )}
                              </h3>
                            ) : (
                              <p>Out of stock</p>
                            )}
                          </div>
                          {size.in_stock && size.discount && (
                            <h4>{size.discount}% OFF</h4>
                          )}
                          {!size.in_stock && <h4>Notify Me</h4>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="size_list gap_m">
                      <li>
                        <div className="size_list_inr">
                          <p>Size information not available</p>
                        </div>
                      </li>
                    </ul>
                  )}
                </div>
              </div> */}

              {Array.isArray(pd?.variations) &&
                pd.variations.length > 1 ? (
                useSizeVariantPicker ? (
                  <div className="variant variant_size_picker">
                    <div className="variant_bx">
                      <div className="variant_head">
                        <h4>Select Size</h4>
                      </div>
                      <ul className="size_list gap_m variant_size_chips">
                        {pd.variations.map((variant: any) => {
                          const inStock = isSkuInStock(variant, null);
                          const isSelected = variantMatchesSelection(
                            selectedVariant,
                            variant,
                          );
                          const sizeLabel = getVariantSizeDisplayLabel(
                            variant,
                            pd?.name || pd?.product_name || "",
                          );

                          return (
                            <li
                              key={variant.id}
                              className={`${isSelected ? "selected" : ""}${!inStock ? " disable" : ""}`}
                              onClick={() => {
                                if (inStock) handleVariantSelect(variant);
                              }}
                              onKeyDown={(e) => {
                                if (
                                  inStock &&
                                  (e.key === "Enter" || e.key === " ")
                                ) {
                                  e.preventDefault();
                                  handleVariantSelect(variant);
                                }
                              }}
                              role="button"
                              tabIndex={inStock ? 0 : -1}
                              aria-pressed={isSelected}
                              aria-label={`Select size ${sizeLabel || "option"}`}
                            >
                              <div className="size_list_inr">
                                <p className="size">{sizeLabel || "—"}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : (
                <div className="variant variant_shade_picker">
                  <div className="variant_bx">
                    <div className="variant_head">
                      <h4>
                        Select Variant -{" "}
                        <span>{selectedVariantPickerLabel || "Choose option"}</span>
                      </h4>
                    </div>

                    <div className="shade_picker_row">
                      <div
                        className="shade_preview"
                        style={{ backgroundColor: selectedVariantSwatchColor }}
                        aria-hidden
                      />
                      <ul className="shade_swatch_list">
                        {pd.variations.map((variant: any) => {
                          const inStock = isSkuInStock(variant, null);
                          const isSelected = variantMatchesSelection(
                            selectedVariant,
                            variant,
                          );
                          const swatchColor = getVariantSwatchColor(variant);
                          const swatchLabel = getVariantPickerLabel(variant);

                          return (
                            <li key={variant.id}>
                              <button
                                type="button"
                                className={`shade_swatch_btn${isSelected ? " selected" : ""}${!inStock ? " out_of_stock" : ""}`}
                                style={{ backgroundColor: swatchColor }}
                                aria-label={`Select variant ${swatchLabel}`}
                                aria-pressed={isSelected}
                                onClick={() => handleVariantSelect(variant)}
                              >
                                {isSelected ? <CheckIcon fontSize="small" /> : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
                )
              ) : null}

              <div className="arving_time">
                {/* {productDetails.delivery_time && (
                  <p>Arrives in {productDetails.delivery_time} days</p>
                )} */}
                <div className="dlvry_adrs">
                  <span>Deliver to</span>
                  <strong>
                    {deliveryPinOnlyLabel}
                  </strong>
                  <a
                    className="text_btn"
                    href="#"
                    role="button"
                    onClick={handleOpenDeliveryAddressModal}
                    style={{ cursor: 'pointer' }}
                  >
                    Change
                  </a>
                </div>
              </div>

              {/* <div className="promo_bx_lst">
                <div className="promo_bx ">
                  <img src="/images/discount.svg" alt="icon" />
                  <p>
                    <span>
                      Get it for <span className="c_primary">₹400</span> with
                      coupon offers
                      <a className="c_primary">View all offers</a>
                    </span>
                  </p>
                  <ArrowForwardIosIcon />
                </div>
                {pd.brand?.name && (
                  <div
                    className="promo_bx cursor_pointer"
                    onClick={() =>
                      router.push(
                        `/product/product-category/?brand=${pd.brand.id ||
                        pd.brand.slug ||
                        ""
                        }`
                      )
                    }
                  >
                    <p className="view">
                      View all {pd.brand.name} products
                    </p>
                    <ArrowForwardIosIcon />
                  </div>
                )}
              </div> */}

              <div className="return_plcy">
                {/* {productDetails.easy_return && ( */}
                <Link href="/refund-return-policy" className="return_plcy_bx">
                  <figure>
                    <img src="/images/easy_return.svg" alt="" />
                  </figure>
                  <p>Easy Return Policy</p>
                </Link>
                {/* )} */}
                {/* {productDetails.delivery_time && ( */}
                <div className="return_plcy_bx">
                  <figure>
                    <img src="/images/fast_delivery.svg" alt="" />
                  </figure>
                  <p>Fast Delivery</p>
                </div>
                {/* )} */}
              </div>

              <div className="add_cart form mt_20">
                <label htmlFor="quantity">
                  <Select
                    value={maxSelectableQuantity < 1 ? "0" : quantity}
                    onChange={handleChange}
                    id="quantity"
                    disabled={maxSelectableQuantity < 1}
                    inputProps={{ "aria-label": "Without label" }}
                  >
                    {maxSelectableQuantity > 0 ? (
                      Array.from({ length: maxSelectableQuantity }, (_, i) => (
                        <MenuItem key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="0">0</MenuItem>
                    )}
                  </Select>
                </label>
                {currentSkuInStock ? (
                  <Button
                    onClick={handleAddToCartButtonClick}
                    disabled={!isAddedToCart && addToCartLoading}
                  >
                    {isAddedToCart
                      ? "Go to cart"
                      : addToCartLoading
                        ? "Adding..."
                        : "Add to Cart"}
                  </Button>
                ) : (
                  notifyMeFormOpen ? (
                    <div style={{ flex: 1, display: "flex", gap: 10 }}>
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleNotifyMeSubmit();
                          }
                        }}
                        placeholder="Enter email"
                        aria-label="Enter email for stock alert"
                        style={{
                          flex: 1,
                          border: "1px solid #d0d0d0",
                          borderRadius: 10,
                          padding: "0 12px",
                          minHeight: 48,
                          outline: "none",
                          fontSize: 14,
                          background: "#fff",
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => void handleNotifyMeSubmit()}
                        disabled={notifyMeLoading}
                        variant="contained"
                        sx={{
                          minWidth: 120,
                          bgcolor: "#9e9e9e",
                          color: "#fff",
                          boxShadow: "none",
                          "&:hover": {
                            bgcolor: "#888888",
                            boxShadow: "none",
                          },
                          "&:active": {
                            bgcolor: "#757575",
                          },
                          "&.Mui-disabled": {
                            bgcolor: "#9e9e9e",
                            color: "#fff",
                          },
                        }}
                      >
                        {notifyMeLoading ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setNotifyMeFormOpen(true)}
                      disabled={notifyMeLoading}
                      variant="contained"
                      sx={{
                        bgcolor: "#9e9e9e",
                        color: "#fff",
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: "#888888",
                          boxShadow: "none",
                        },
                        "&:active": {
                          bgcolor: "#757575",
                        },
                        "&.Mui-disabled": {
                          bgcolor: "#9e9e9e",
                          color: "#fff",
                        },
                      }}
                    >
                      {notifyMeLoading ? "Submitting..." : "Notify Me"}
                    </Button>
                  )
                )}
              </div>

              {/* <ShippingType /> */}
            </div>
            {productDeals.length > 0 && (
              <div
                className="product-deals-slider mb_30"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                {productDeals.length > 1 && (
                  <IconButton
                    className="btn_rounded prev"
                    onClick={() =>
                      dealSliderRef.current?.slickPrev()
                    }
                    aria-label="Previous deal"
                    sx={{ flexShrink: 0 }}
                  >
                    <ArrowBackIosNewRoundedIcon />
                  </IconButton>
                )}
                <div style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}>
                  <Slider
                    ref={dealSliderRef}
                    {...dealSliderSettings}
                    className="deal-banner-slider"
                  >
                    {productDeals.map(
                      (deal, index) =>
                        deal?.deal_title && (
                          <div
                            key={index}
                            style={{ padding: "0 6px" }}
                          >
                            <div className="free-shipping-banner">
                              <figure>
                                <img
                                  src="/images/offer_icon.svg"
                                  alt="Icon"
                                />
                              </figure>
                              <div className="text">
                                <strong>{deal.deal_title}</strong>
                                <span>{deal.deal_subtitle}</span>
                              </div>
                            </div>
                          </div>
                        )
                    )}
                  </Slider>
                </div>
                {productDeals.length > 1 && (
                  <IconButton
                    className="btn_rounded next"
                    onClick={() =>
                      dealSliderRef.current?.slickNext()
                    }
                    aria-label="Next deal"
                    sx={{ flexShrink: 0 }}
                  >
                    <ArrowForwardIosRoundedIcon />
                  </IconButton>
                )}
              </div>
            )}
          </div>
        </div>

        <section className="prodct_info_sc ub_spc">
          <div className="container">
            <ProductDetailInfo
              productDetails={pd}
              selectedVariant={selectedVariant}
            />
          </div>
        </section>
        {/* you may also like  */}
        {recommendedProducts && recommendedProducts.length > 0 && (
          <section className="product_sc" ref={youMayAlsoLikeRef}>
            <div className="container">
              <div className="s_head flex hd_4">
                <h2>You may also like</h2>
                <div className="rt">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleLoadMoreProducts("recommended")}
                    disabled={moreProductsLoading}
                  >
                    {moreProductsLoading ? (
                      "Loading..."
                    ) : (
                      <>
                        More <KeyboardArrowRightIcon />{" "}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Slider
                ref={sliderRef}
                {...getProductSliderSettings(recommendedProducts.length)}
                className="products_card_list"
              >
                {recommendedProducts.map((product: any, index: number) => (
                  <ProductCard
                    // store_id removed/commented as it is no longer required in the application
                    // key={`detail-also-like-${product.product_id || 'no-id'}-${product.store_id || 'no-store'}-${index}`}
                    key={`detail-also-like-${product.product_id || 'no-id'}-${index}`}
                    product={{
                      // store_id removed/commented as it is no longer required in the application
                      // store_id: parseInt(product.store_id) || product.store_id,
                      product_id: product.product_id,
                      variation_id:
                        product.variation_id ??
                        product.product_variation_id ??
                        product.default_variation_id ??
                        product.variations?.find((v: any) => Number(v?.is_default) === 1)?.id ??
                        product.variations?.[0]?.id,
                      product_name: product.product_name,
                      slug: product.slug,
                      short_description: product.how_to_use || product.short_description || "",
                      featured: product.featured,
                      is_new: product.is_new,
                      best_seller: product.best_seller,
                      average_rating: product.average_rating,
                      review_count: product.review_count,
                      qty_available:
                        parseInt(product.qty_available) ||
                        product.qty_available,
                      delivery_time: product.delivery_time?.toString() || null,
                      easy_return: product.delivery_return ? true : null,
                      delivery_policy: null,
                      delivery_return: product.delivery_return,
                      price: product.price,
                      brand: product.brand,
                      category: product.category,
                      image: product.image,
                      is_wishlist: product.is_wishlist,
                      barcode_image_url: null,
                      size_chart: null,
                      variations: Array.isArray(product.variations) ? product.variations : [],
                    } as any}
                  />
                ))}
              </Slider>
            </div>
          </section>
        )}

        {/* Full-screen image zoom viewer with slider and zoom in/out */}
        {isImageZoomOpen && (
          <div
            className="image_zoom_overlay"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              touchAction: "none",
            }}
            onClick={() => {
              setIsImageZoomOpen(false);
              setImageZoomScale(1);
              setImageZoomPan({ x: 0, y: 0 });
            }}
            onWheel={(e) => {
              if (isImageZoomOpen) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <button
              type="button"
              aria-label="Close full view"
              style={{
                position: "fixed",
                top: 16,
                right: 16,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "999px",
                color: "#fff",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                zIndex: 1301,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsImageZoomOpen(false);
                setImageZoomScale(1);
                setImageZoomPan({ x: 0, y: 0 });
              }}
            >
              ✕
            </button>

            {/* Slider prev/next - only show when multiple images */}
            {productImagesList.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  className=""
                  style={{
                    position: "fixed",
                    top: "50%",
                    left: 16,
                    transform: "translateY(-50%)",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "50%",
                    color: "#fff",
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 20,
                    zIndex: 1301,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fullViewSliderRef.current?.slickPrev();
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  className=""
                  style={{
                    position: "fixed",
                    top: "50%",
                    right: 16,
                    transform: "translateY(-50%)",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "50%",
                    color: "#fff",
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 20,
                    zIndex: 1301,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fullViewSliderRef.current?.slickNext();
                  }}
                >
                  ›
                </button>
              </>
            )}

            <button
              type="button"
              aria-label="Zoom out"
              className=""
              style={{
                position: "fixed",
                bottom: 24,
                left: "50%",
                transform: "translateX(calc(-50% - 60px))",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                padding: "10px 16px",
                cursor: imageZoomScale <= 0.5 ? "not-allowed" : "pointer",
                fontSize: 14,
                zIndex: 1301,
                opacity: imageZoomScale <= 0.5 ? 0.5 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setImageZoomScale((s) => {
                  const newScale = Math.max(0.5, s - 0.25);
                  if (newScale <= 1) setImageZoomPan({ x: 0, y: 0 });
                  return newScale;
                });
              }}
              disabled={imageZoomScale <= 0.5}
            >
              Zoom out
            </button>

            <button
              type="button"
              aria-label="Zoom in"
              className=""
              style={{
                position: "fixed",
                bottom: 24,
                left: "50%",
                transform: "translateX(calc(-50% + 60px))",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                padding: "10px 16px",
                cursor: imageZoomScale >= 3 ? "not-allowed" : "pointer",
                fontSize: 14,
                zIndex: 1301,
                opacity: imageZoomScale >= 3 ? 0.5 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setImageZoomScale((s) => Math.min(3, s + 0.25));
              }}
              disabled={imageZoomScale >= 3}
            >
              Zoom in
            </button>

            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 56px 56px",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <style>{`
                .image_zoom_overlay {
                  overflow-x: hidden !important;
                  overflow-y: hidden !important;
                }
                .zoomed-slick-slider {
                  overflow: hidden !important;
                }
                .zoomed-slick-slider .slick-slide:not(.slick-current) {
                  opacity: 0 !important;
                  visibility: hidden !important;
                  pointer-events: none !important;
                }
                .zoomed-slick-slider .slick-slide.slick-current {
                  z-index: 10 !important;
                  position: relative;
                }
                @media (max-width: 767px) {
                  .hide-on-mobile {
                    display: none !important;
                  }
                }
                @media (min-width: 768px) {
                  .hide-on-desktop,
                  ul.slick-dots.image_zoom_dots.hide-on-desktop {
                    display: none !important;
                  }
                }
              `}</style>
              <Slider
                className={imageZoomScale > 1 ? "zoomed-slick-slider" : ""}
                ref={fullViewSliderRef}
                initialSlide={activeImageIndex}
                afterChange={(idx: number) => {
                  setActiveImageIndex(idx);
                  setImageZoomScale(1);
                  setImageZoomPan({ x: 0, y: 0 });
                }}
                swipe={imageZoomScale <= 1}
                infinite={productImagesList.length > 1}
                slidesToShow={1}
                slidesToScroll={1}
                arrows={false}
                dots={productImagesList.length > 1}
                dotsClass="slick-dots image_zoom_dots hide-on-desktop"
                adaptiveHeight
                style={{ width: "100%", maxWidth: "100%" }}
              >
                {(productImagesList.length ? productImagesList : ["/images/product_default.png"]).map(
                  (src: string, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        outline: "none",
                        opacity: activeImageIndex === idx ? 1 : (imageZoomScale > 1 ? 0 : 1),
                        visibility: activeImageIndex === idx ? "visible" : (imageZoomScale > 1 ? "hidden" : "visible"),
                        zIndex: activeImageIndex === idx ? 10 : 1,
                        position: "relative",
                        touchAction: imageZoomScale > 1 ? "none" : "auto",
                      }}
                      onPointerDown={(e) => {
                        if (imageZoomScale <= 1) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setIsZoomDragging(true);
                        zoomDragRef.current = {
                          startX: e.clientX,
                          startY: e.clientY,
                          initialPanX: imageZoomPan.x,
                          initialPanY: imageZoomPan.y,
                        };
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (!isZoomDragging) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const dx = e.clientX - zoomDragRef.current.startX;
                        const dy = e.clientY - zoomDragRef.current.startY;
                        setImageZoomPan({
                          x: zoomDragRef.current.initialPanX + dx / imageZoomScale,
                          y: zoomDragRef.current.initialPanY + dy / imageZoomScale,
                        });
                      }}
                      onPointerUp={(e) => {
                        if (isZoomDragging) {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsZoomDragging(false);
                          try {
                            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                          } catch (err) { }
                        }
                      }}
                      onPointerCancel={(e) => {
                        if (isZoomDragging) {
                          setIsZoomDragging(false);
                          try {
                            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                          } catch (err) { }
                        }
                      }}
                    >
                      <img
                        src={src}
                        alt={`Product view ${idx + 1}`}
                        style={{
                          display: "block",
                          maxWidth: "100%",
                          width: "600px",
                          height: "auto",
                          maxHeight: "calc(100vh - 120px)",
                          margin: "0 auto",
                          objectFit: "contain",
                          borderRadius: 8,
                          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                          backgroundColor: "#fff",
                          transform: `scale(${imageZoomScale}) translate(${imageZoomPan.x}px, ${imageZoomPan.y}px)`,
                          transformOrigin: "center center",
                          transition: isZoomDragging ? "none" : "transform 0.2s ease",
                          cursor: imageZoomScale > 1 ? (isZoomDragging ? "grabbing" : "grab") : "default",
                        }}
                        onDragStart={(e) => e.preventDefault()}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/product_default.png";
                        }}
                      />
                    </div>
                  )
                )}
              </Slider>
            </div>
          </div>
        )}

        {/* Full-screen review image viewer */}
        {isReviewImageZoomOpen && (
          <div
            className="review_image_zoom_overlay"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.85)",
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setIsReviewImageZoomOpen(false)}
          >
            <button
              type="button"
              aria-label="Close image"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "999px",
                color: "#fff",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsReviewImageZoomOpen(false);
              }}
            >
              ✕
            </button>

            <img
              src={activeReviewImageUrl || "/images/review1.png"}
              alt="Review image"
              style={{
                maxWidth: "92vw",
                maxHeight: "92vh",
                objectFit: "contain",
                borderRadius: 8,
                backgroundColor: "#fff",
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/images/review1.png";
              }}
            />
          </div>
        )}

        {moreFromThisShop && moreFromThisShop.length > 0 && (
          <section className="product_sc ut_spc">
            <div className="container">
              <div className="s_head flex hd_4">
                <h2>More from this shop</h2>
                <div className="rt">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleLoadMoreProducts("shop")}
                    disabled={moreProductsLoading}
                  >
                    {moreProductsLoading ? (
                      "Loading..."
                    ) : (
                      <>
                        More <KeyboardArrowRightIcon />{" "}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Slider
                ref={sliderRef}
                {...getProductSliderSettings(moreFromThisShop.length)}
                className="products_card_list"
              >
                {moreFromThisShop.map((product: any, index: number) => (
                  <ProductCard
                    // store_id removed/commented as it is no longer required in the application
                    // key={`detail-more-shop-${product.product_id || 'no-id'}-${product.store_id || 'no-store'}-${index}`}
                    key={`detail-more-shop-${product.product_id || 'no-id'}-${index}`}
                    product={{
                      // store_id removed/commented as it is no longer required in the application
                      // store_id: parseInt(product.store_id) || product.store_id,
                      product_id: product.product_id,
                      variation_id:
                        product.variation_id ??
                        product.product_variation_id ??
                        product.default_variation_id ??
                        product.variations?.find((v: any) => Number(v?.is_default) === 1)?.id ??
                        product.variations?.[0]?.id,
                      product_name: product.product_name,
                      slug: product.slug,
                      short_description: product.how_to_use || product.short_description || "",
                      featured: product.featured,
                      is_new: product.is_new,
                      best_seller: product.best_seller,
                      average_rating: product.average_rating,
                      review_count: product.review_count,
                      qty_available:
                        parseInt(product.qty_available) ||
                        product.qty_available,
                      delivery_time: product.delivery_time?.toString() || null,
                      easy_return: product.delivery_return ? true : null,
                      delivery_policy: null,
                      delivery_return: product.delivery_return,
                      price: product.price,
                      brand: product.brand,
                      category: product.category,
                      image: product.image,
                      is_wishlist: product.is_wishlist,
                      barcode_image_url: null,
                      size_chart: null,
                      variations: Array.isArray(product.variations)
                        ? product.variations
                        : [],
                    } as any}
                  />
                ))}
              </Slider>
            </div>
          </section>
        )}

        {/* Feature Video */}
        {/* <section className="product_featrs_sc ut_spc">
          <div className="container">
            <div className="s_head flex hd_4">
              <h2 className="fw_med">Featured In Videos</h2>
              <div className="rt flex gap_s">
                <div className="slick_arrows">
                  <IconButton
                    className="btn_rounded prev"
                    onClick={() => sliderRef.current?.slickPrev()}
                  >
                    <ArrowBackIosNewRoundedIcon />
                  </IconButton>
                  <IconButton
                    className="btn_rounded next"
                    onClick={() => sliderRef.current?.slickNext()}
                  >
                    <ArrowForwardIosRoundedIcon />
                  </IconButton>
                </div>
              </div>
            </div>
            <Slider
              ref={sliderRef}
              {...settings}
              className="feature_video_list"
            >
              {videoData.map((item, index) => (
                <div className="feature_video_bx" key={index}>
                  <div className="feature_video_inr">
                    <figure className="main">
                      <img src={item.img} alt={item.title} />
                    </figure>

                    <div className="ply_count">
                      <figure>
                        <img src="/images/play_icon.svg" alt="play" />
                        <span>{item.count}</span>
                      </figure>

                      <figure>
                        <img src="/images/mute.svg" alt="mute" />
                      </figure>
                    </div>
                  </div>

                  <div className="video_dtl">
                    <p>{item.title}</p>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        </section> */}
        {/* Feature Video */}

        {/* Review */}
        {showProductReviews ? (
        <section
          id="product-reviews"
          ref={reviewsSectionRef}
          className="product_rvws_sc ut_spc"
        >
          <div className="container">
            <div className="s_head hd_4">
              <h2 className="fw_med">
                Ratings & Reviews ({ratingSectionCount})
              </h2>
            </div>
            <div className="rating_overall">
              <ul className="rating_prgrs">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count =
                    displayedReviewRatingSummary.distribution[star] || 0;
                  const percentage =
                    ratingBarDenominator > 0
                      ? Math.round((count / ratingBarDenominator) * 100)
                      : 0;
                  return (
                    <li key={star}>
                      <span className="count">{star}</span>
                      <BorderLinearProgress
                        variant="determinate"
                        value={percentage}
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="overall_info">
                <span className="revws_detail rtng">
                  {displayedReviewRatingSummary.count > 0
                    ? displayedReviewRatingSummary.average
                    : "0.0"}
                  <img src="/images/Star_rating.svg" alt="" />
                </span>
                <span className="revws_detail">
                  {formatReviewCountText(ratingSectionCount)}
                </span>

                <span className="revws_detail rtng" style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <span className="rating_prgrs">{recommendedPercentage}%</span>
                  <span className="revws_detail">Recommended</span>
                </span>
              </div>
            </div>
            <div className="wrt_rvw">
              {/* <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Button>Write a review</Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    refetchProductDetails();
                  }}
                  style={{ marginLeft: '10px' }}
                >
                  Refresh Reviews
                </Button>
              </div> */}
              <p>
                Product reviews are managed by a third party to verify
                authenticity and compliance with our{" "}
                <a href="/terms-conditions">
                  Ratings & Reviews Guidelines
                </a>
              </p>
            </div>

            {/* Customer Photos */}
            {customerPhotoUrls.length > 0 && (
              <div className="customer_photos_sc" style={{ marginTop: 18 }}>
                <div className="s_head hd_4" style={{ marginBottom: 10 }}>
                  <h3 className="fw_med">
                    Customer Photos ({customerPhotoUrls.length})
                  </h3>
                </div>
                <ul
                  className="rvw_imgs"
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                    padding: 0,
                    margin: 0,
                    listStyle: "none",
                  }}
                >
                  {customerPhotoUrls.slice(0, 6).map((img: string, idx: number) => (
                    <li key={idx} className="rvw_imgsbx">
                      <figure>
                        <img
                          src={img || "/images/review1.png"}
                          alt={`Customer photo ${idx + 1}`}
                          style={{
                            cursor: "pointer",
                            width: 64,
                            height: 64,
                            objectFit: "cover",
                            borderRadius: 8,
                            display: "block",
                          }}
                          onClick={() => {
                            setActiveReviewImageUrl(img);
                            setIsReviewImageZoomOpen(true);
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/review1.png";
                          }}
                        />
                      </figure>
                    </li>
                  ))}
                  {customerPhotoUrls.length > 6 && (
                    <li className="rvw_imgsbx">
                      <figure>
                        <img
                          src={customerPhotoUrls[5] || "/images/review4.png"}
                          alt="More customer photos"
                          style={{
                            cursor: "pointer",
                            width: 64,
                            height: 64,
                            objectFit: "cover",
                            borderRadius: 8,
                            display: "block",
                          }}
                          onClick={() => {
                            const target = customerPhotoUrls[5] || "";
                            setActiveReviewImageUrl(target);
                            setIsReviewImageZoomOpen(true);
                          }}
                        />
                        <span>+ {customerPhotoUrls.length - 6}</span>
                      </figure>
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="s_head hd_4" style={{ marginTop: 22 }}>
              <h3 className="fw_med">Customer  ({filteredReviews.length})</h3>
            </div>
            <ul className="product_rvws_lst">
              {filteredReviews && filteredReviews.length > 0 ? (
                // Show ALL reviews - no filtering by status
                filteredReviews.map((review: any, index: number) => {

                  const reviewRating = parseFloat(
                    review.rating || review.star_rating || "0"
                  );
                  const dateSource = review.created_at || review.createdAt || review.date || review.updated_at || review.updatedAt;
                  const reviewDate = dateSource
                    ? new Date(dateSource).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    : "N/A";
                  // Handle various image formats from API (including ratings_images from product reviews API)
                  const rawImages = review.images || review.review_images || review.ratings_images || review.media || review.attachments || [];
                  const reviewImages = rawImages.map((img: any) => {
                    if (typeof img === 'string') return img;
                    return img?.url || img?.image_url || img?.image || img?.src || img?.path || img?.file_url || '';
                  }).filter((url: string) => url);

                  const helpfulYes =
                    review.helpful_yes || review.helpful_count || 0;
                  const helpfulNo =
                    review.helpful_no || review.not_helpful_count || 0;

                  // Get reviewer name - check all possible fields
                  const reviewerName = review.name || review.user_name || review.customer_name ||
                    review.username || review.reviewer_name || review.full_name ||
                    review.user?.name || review.customer?.name || "";

                  return (
                    <li
                      key={review.id || review.review_id || index}
                      className="product_rvws_bx"
                    >
                      <div className="lt">
                        <div className="prfle">
                          <ReviewerAvatar review={review} name={reviewerName} />
                          <div className="prfl_rtng">
                            <h3>
                              {reviewerName
                                ? reviewerName
                                : review.user?.email ||
                                review.customer?.email ||
                                review.user_email ||
                                review.customer_email ||
                                "Anonymous"}
                            </h3>
                            <Rating
                              name="read-only"
                              value={reviewRating}
                              readOnly
                              size="small"
                            />
                          </div>
                        </div>
                        <p>
                          {review.comment ||
                            review.review ||
                            review.message ||
                            review.description ||
                            "No review text available."}
                        </p>
                        {reviewRating >= 4 && (
                          <span
                            className="recommended_badge"
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <img
                              src="/images/recommended.svg"
                              alt=""
                              style={{ marginRight: "4px" }}
                            />
                            Recommended
                          </span>
                        )}
                        {/* <div className="rcmndtns">
                            <div className="feedback">
                              <span>Helpful ?</span>
                              <span>Yes ({helpfulYes})</span>
                              <span className="divider">|</span>
                              <span>NO ({helpfulNo})</span>
                            </div>
                            <div className="details_row" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div className="details" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span>
                                  Color : <span>Cinnamon</span>
                                </span>
                                <span className="divider">|</span>
                                <span>
                                  Size : <span>M</span>
                                </span>
                                
                              </div>

                            </div>
                          </div> */}
                      </div>
                      <div className="rt">
                        <h3>{reviewDate}</h3>
                        {reviewImages && reviewImages.length > 0 && (
                          <ul className="rvw_imgs">
                            {reviewImages
                              .slice(0, 4)
                              .map((img: string, imgIndex: number) => (
                                <li key={imgIndex} className="rvw_imgsbx">
                                  <figure>
                                    <img
                                      src={img || "/images/review1.png"}
                                      alt={`Review ${imgIndex + 1}`}
                                      style={{
                                        cursor: "pointer",
                                        width: 64,
                                        height: 64,
                                        objectFit: "cover",
                                        borderRadius: 8,
                                        display: "block",
                                      }}
                                      onClick={() => {
                                        setActiveReviewImageUrl(img);
                                        setIsReviewImageZoomOpen(true);
                                      }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "/images/review1.png";
                                      }}
                                    />
                                  </figure>
                                </li>
                              ))}
                            {reviewImages.length > 4 && (
                              <li className="rvw_imgsbx">
                                <figure>
                                  <img
                                    src={
                                      reviewImages[3] || "/images/review4.png"
                                    }
                                    alt="More"
                                    style={{
                                      cursor: "pointer",
                                      width: 64,
                                      height: 64,
                                      objectFit: "cover",
                                      borderRadius: 8,
                                      display: "block",
                                    }}
                                    onClick={() => {
                                      const target = reviewImages[3] || "";
                                      setActiveReviewImageUrl(target);
                                      setIsReviewImageZoomOpen(true);
                                    }}
                                  />
                                  <span>+ {reviewImages.length - 4}</span>
                                </figure>
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="product_rvws_bx">
                  <div className="lt">
                    <p>No reviews available for this product yet.</p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </section>
        ) : null}
      </section>
      {/* Review */}
      <ShippingAddress
        open={openAddressModal}
        onClose={() => setOpenAddressModal(false)}
        setOpen={setOpenAddressModal}
        addresses={addresses}
        selectedAddress={selectedAddress}
        onSelectAddress={async (address) => {
          setSelectedAddressId(address.id.toString());
          const nextAddressId = address.id.toString();
          // Keep normal and quick headers aligned to the last user-selected saved address.
          persistDeliveryAddressIdForMode("normal", nextAddressId);
          persistDeliveryAddressIdForMode("quick_delivery", nextAddressId);
          if (deliveryMode === "normal") setNormalDeliverHerePinned(true);
          writeSelectedLocationFromAddress(address);
          setOpenAddressModal(false);
          if (deliveryMode === "quick_delivery") {
            try {
              await editAddress({
                id: address.id,
                body: buildEditAddressDefaultBody(address),
              }).unwrap();
              getAddressList();
            } catch {
              toast.error("Could not update default address for quick delivery");
            }
          }
          notifyDeliverySelectionChanged();
        }}
      />

      {!token && (
        <LocationSearchModal
          open={guestDeliveryDrawerOpen}
          canClose={hasUsableDeliveryLocation(addresses, deliveryMode)}
          onClose={() => setGuestDeliveryDrawerOpen(false)}
          onLocationSelect={handleGuestDeliveryLocationSelect}
          apiKey={PDP_GOOGLE_MAPS_API_KEY}
          layout="drawer"
          showGuestSavedPrompt
          onGuestLoginClick={() => {
            setGuestDeliveryDrawerOpen(false);
            router.push("/auth/login/");
          }}
        />
      )}
    </>
  );
}

export default ProductDetail;

const ProductDetailInfo = ({
  productDetails,
  selectedVariant,
}: {
  productDetails: any;
  selectedVariant?: any | null;
}) => {
  const displayBarcode =
    selectedVariant?.barcode ?? productDetails?.barcode ?? "";
  const [expanded, setExpanded] = React.useState<string | false>("panel1");
  const [value, setValue] = React.useState(0);
  const handleChange1 = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const [value2, setValue2] = React.useState(0);
  const handleChange2 = (event: React.SyntheticEvent, newValue: number) => {
    setValue2(newValue);
  };

  const [value3, setValue3] = React.useState("female");

  const handleChange3 = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue3((event.target as HTMLInputElement).value);
  };
  return (
    <>
      <div className="product_detail">
        <div className="descrptn hd_3">
          <h2 className="fw_med">Product Description</h2>
          <div
            className="product-description-content"
            dangerouslySetInnerHTML={{
              __html:
                productDetails?.short_description ||
                productDetails?.description ||
                "No description available for this product.",
            }}
          />
        </div>
        <div className="prodct_info_mn">
          <div className="lt">
            <Tabs
              value={value}
              onChange={handleChange1}
              aria-label="basic tabs example"
              className="site_tabs2"
            >
              <Tab label="Specifications" {...a11yProps(0)} />
              <Tab label="How to use" {...a11yProps(1)} />
              <Tab label="Delivery & Returns" {...a11yProps(2)} />
            </Tabs>
            <CustomTabPanel value={value} index={0}>
              <ul className="spcificatns_tb" style={{ textAlign: "left" }}>
                {(productDetails?.specifications && productDetails.specifications.length > 0) ? (
                  <>
                    {displayBarcode && (
                      <li>
                        <span>Barcode</span> {displayBarcode}
                      </li>
                    )}

                    {productDetails?.brand?.name && (
                      <li>
                        <span>Brand</span> {productDetails.brand.name}
                      </li>
                    )}
                    {productDetails?.category?.name && (
                      <li>
                        <span>Category</span> {productDetails.category.name}
                      </li>
                    )}
                    {productDetails?.qty_available !== undefined && (
                      <li>
                        <span>Available Quantity</span>{" "}
                        {productDetails.qty_available}
                      </li>
                    )}
                    {productDetails?.delivery_time && (
                      <li>
                        <span>Delivery Time</span> {productDetails.delivery_time}
                      </li>
                    )}
                    {productDetails?.easy_return !== null && (
                      <li>
                        <span>Easy Return</span>{" "}
                        {productDetails.easy_return ? "Yes" : "No"}
                      </li>
                    )}
                    {/* spec_key / spec_value for all items except the last (index 0 to length-2) */}
                    {productDetails.specifications
                      .slice(0, -1)
                      .map((spec: any, index: number) => {
                        const label =
                          spec.spec_key ??
                          spec.key ??
                          spec.label ??
                          spec.name ??
                          "";
                        const value = String(
                          spec.spec_value ?? spec.value ?? ""
                        ).trim();
                        if (!label && !value) return null;
                        return (
                          <li key={`spec-${spec.id ?? index}`}>
                            <span>{label}</span> {value}
                          </li>
                        );
                      })}
                    {/* Last object: static keys (ideal_for, country_of_origin, ingredients, expiry, Maximum_shelf_life, shelf_life_unit) - only when non-empty / not null */}
                    {(() => {
                      const arr = productDetails.specifications;
                      const lastSpec =
                        Array.isArray(arr) && arr.length > 0
                          ? arr[arr.length - 1]
                          : null;
                      if (!lastSpec || typeof lastSpec !== "object") return null;
                      const hasVal = (v: unknown) =>
                        v != null && String(v).trim() !== "";
                      const idealForMap: Record<number, string> = {
                        1: "Male",
                        2: "Female",
                        3: "Unisex",
                      };
                      const idealFor =
                        lastSpec.ideal_for != null
                          ? idealForMap[Number(lastSpec.ideal_for)] ?? "N/A"
                          : null;
                      const countryOfOrigin =
                        lastSpec.country_of_origin != null
                          ? Number(lastSpec.country_of_origin) === 1
                            ? "India"
                            : "N/A"
                          : null;
                      const maxShelf =
                        lastSpec.Maximum_shelf_life ??
                        lastSpec.maximum_shelf_life ??
                        (lastSpec as any).MaximumShelfLife;
                      const maxShelfStrRaw =
                        maxShelf != null ? String(maxShelf).trim() : "";
                      const maxShelfStr =
                        maxShelfStrRaw === ""
                          ? ""
                          : (() => {
                            const n = Number(maxShelfStrRaw.replace(/,/g, ""));
                            if (!Number.isFinite(n)) {
                              return maxShelfStrRaw;
                            }
                            return n % 1 === 0
                              ? String(Math.trunc(n))
                              : String(n);
                          })();
                      const shelfLifeUnit =
                        lastSpec.shelf_life_unit ?? (lastSpec as any).shelfLifeUnit;
                      const shelfLifeUnitStr =
                        shelfLifeUnit != null
                          ? String(shelfLifeUnit).trim()
                          : "";
                      const shelfLifeLineParts: string[] = [];
                      if (maxShelfStr !== "") {
                        shelfLifeLineParts.push(maxShelfStr);
                      }
                      if (shelfLifeUnitStr !== "") {
                        shelfLifeLineParts.push(shelfLifeUnitStr);
                      }
                      const shelfLifeLineValue = shelfLifeLineParts.join(" ");
                      const ingredientsStr =
                        lastSpec.ingredients != null
                          ? String(lastSpec.ingredients).trim()
                          : "";
                      const expiryStr =
                        lastSpec.expiry != null
                          ? String(lastSpec.expiry).trim()
                          : "";
                      return (
                        <>
                          {idealFor != null && (
                            <li>
                              <span>Ideal For</span> {idealFor}
                            </li>
                          )}
                          {countryOfOrigin != null && (
                            <li>
                              <span>Country of Origin</span> {countryOfOrigin}
                            </li>
                          )}
                          {hasVal(lastSpec.ingredients) && (
                            <li>
                              <span>Ingredients</span> {ingredientsStr}
                            </li>
                          )}
                          {hasVal(lastSpec.expiry) && (
                            <li>
                              <span>Expiry</span> {expiryStr}
                            </li>
                          )}
                          {shelfLifeLineValue !== "" && (
                            <li>
                              <span>Maximum shelf life</span> {shelfLifeLineValue}
                            </li>
                          )}

                        </>
                      );
                    })()}
                  </>
                ) : (
                  <li>No specifications available</li>
                )}
              </ul>
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
              <ul className="spcificatns_tb" style={{ textAlign: "left" }}>
                {productDetails?.how_to_use ? (
                  <li>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: productDetails.how_to_use,
                      }}
                      style={{ textAlign: "left" }}
                    />
                  </li>
                ) : (
                  <li>No usage instructions available for this product.</li>
                )}
              </ul>
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
              <ul className="spcificatns_tb" style={{ textAlign: "left" }}>
                {productDetails?.delivery_policy && (
                  <li>
                    <span>Delivery Policy</span>{" "}
                    {productDetails.delivery_policy}
                  </li>
                )}
                {productDetails?.delivery_return && (
                  <li>
                    <span>Return Policy</span> {productDetails.delivery_return}
                  </li>
                )}
                {productDetails?.return_policy && (
                  <li>
                    <span>Return Policy</span> {productDetails.return_policy}
                  </li>
                )}
                {productDetails?.delivery_time && (
                  <li>
                    <span>Delivery Time</span> {productDetails.delivery_time}
                  </li>
                )}
                {productDetails?.shipping_policy && (
                  <li>
                    <span>Shipping Policy</span>{" "}
                    {productDetails.shipping_policy}
                  </li>
                )}
                {productDetails?.refund_policy && (
                  <li>
                    <span>Refund Policy</span> {productDetails.refund_policy}
                  </li>
                )}
                {productDetails?.warranty && (
                  <li>
                    <span>Warranty</span> {productDetails.warranty}
                  </li>
                )}
                {productDetails?.easy_return !== null && (
                  <li>
                    <span>Easy Return</span>{" "}
                    {productDetails.easy_return ? "Yes" : "No"}
                  </li>
                )}
                {!productDetails?.delivery_policy &&
                  !productDetails?.delivery_return &&
                  !productDetails?.return_policy &&
                  !productDetails?.shipping_policy &&
                  !productDetails?.refund_policy && (
                    <li>No delivery and return information available.</li>
                  )}
              </ul>
            </CustomTabPanel>
          </div>
          {productDetails?.size_chart && (
            <div className="ryt">
              <div className="s_head flex hd_6 border_none">
                <h2>Size Chart</h2>
              </div>
              <div className="size_chart_img" style={{ marginTop: '20px' }}>
                <img
                  src={productDetails.size_chart}
                  alt="Size Chart"
                  style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
