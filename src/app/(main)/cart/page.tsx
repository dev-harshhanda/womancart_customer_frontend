/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRazorpay } from "@/hooks/useRazorpay";
import BredCrum from "@/components/bredCrum";
import { Button, MenuItem, Select, styled, CircularProgress, Box } from "@mui/material";
import RadioGroup, { useRadioGroup } from "@mui/material/RadioGroup";
import FormControlLabel, {
  FormControlLabelProps,
} from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import ShippingAddress from "@/modal/shippingAddress";
import ChangeStore from "@/modal/changeStore";
import Promocode from "@/modal/promocode";
import AddCardModal from "@/modal/addCardModal";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Checkbox from "@mui/material/Checkbox";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useGetCartQuery, usePlaceOrderMutation, useRemoveFromCartMutation, useGetCouponListQuery, useApplyCouponMutation, useRemoveCouponMutation, useVerifyPaymentMutation, useAddToCartMutation, useClearCartMutation } from "@/service/cart";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { getDeliveryMode, getDeliveryChannel } from "@/utils/deliveryMode";
import {
  buildEditAddressDefaultBody,
  DELIVERY_SELECTION_CHANGED,
  notifyDeliverySelectionChanged,
  persistDeliveryAddressIdForMode,
  readPersistedDeliveryAddressId,
  setNormalDeliverHerePinned,
  writeSelectedLocationFromAddress,
  restoreCommittedDeliverySelection,
  isAddressCompleteForOrder,
} from "@/utils/deliveryAddressSync";
import AddAddress from "@/modal/addAddress";
import { getCartDeliveryEtaLabel } from "@/utils/cartDeliveryEta";
import { formatPriceInr } from "@/utils/format";
import { pushEvent, buildGtmItem } from "@/lib/dataLayer";
import { showMrpAsCutPrice } from "@/utils/priceDisplay";
import { buildProductUrl, getVariantUrlSlug } from "@/utils/urlBuilder";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { getCurrentUser, getToken, setUser } from "@/lib/slices/authSlice";
import { getFromStorage, removeFromStorage, setToStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import {
  clearCartCouponUserIntent,
  getCartAppliedCouponStorageKey,
  getCartCouponAuthScope,
  getCartCouponIntentStorageKey,
  getCartReloadCouponSessionKey,
  readCartCouponUserIntent,
  removeLegacyUnscopedCartCouponKeys,
  writeCartCouponUserIntent,
} from "@/utils/cartCouponStorage";
import { RAZORPAY_KEY_ID } from "@/constants/constants";
import { useEditAddressMutation, useLazyGetAddressListQuery } from "@/service/address";
import { Address } from "@/types/General";
import { buildFullPhone, formatAddressPhone, normalizePhoneCode, resolvePhoneFields } from "@/utils/phoneNumber";
import { mergeAddressPhoneMeta } from "@/utils/addressPhoneCache";
import {
  normalizeAmountToRupees,
  resolveCartPayableAmountRupees,
  resolveOrderPaymentAmountRupees,
  toRazorpayAmountPaise,
} from "@/utils/razorpayAmount";
import { useAddWishlistMutation } from "@/service/wishlist";
import { useLazyGetProfileQuery, useGuestLoginMutation } from "@/service/auth";
import { useCancelOrderMutation, useLazyGetOrderByIdQuery } from "@/service/order";
import toast from "react-hot-toast";
import { useCookiePageView } from "@/hooks/useCookiePageView";
import { ensureGuestCartAuth } from "@/utils/guestLoginSession";

// Breadcrumb items will be generated dynamically based on route

/** Cap at 10, or available stock when it is below 10; unknown stock defaults to 10. */
function getCartItemAvailableQty(item: any): number | null {
  const v = item?.variation;
  const p = item?.product;
  const raw =
    v?.stock_quantity ??
    v?.stock ??
    p?.qty_available ??
    p?.stock_quantity ??
    item?.stock_quantity ??
    item?.max_quantity ??
    item?.available_quantity;
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return Math.max(0, Math.floor(n));
  }
  return null;
}

function getCartItemMaxSelectableQty(item: any): number {
  const hardCap = 10;
  const availableQty = getCartItemAvailableQty(item);
  if (availableQty === null) return hardCap;
  return Math.min(hardCap, availableQty);
}

const COUPON_AUTO_REMOVE_GRACE_MS = 2500;

function getCouponMinimumPurchase(coupon: any): number | null {
  if (!coupon || typeof coupon !== "object") return null;
  const candidates = [
    coupon.min_order_amount,
    coupon.minimum_order_amount,
    coupon.min_cart_value,
    coupon.min_purchase_amount,
    coupon.minimum_purchase,
    coupon.min_amount,
    coupon.minimum_amount,
    coupon.promotion?.min_order_amount,
    coupon.promotion?.minimum_order_amount,
    coupon.promotion?.min_cart_value,
    coupon.promotion?.min_purchase_amount,
    coupon.promotion?.minimum_purchase,
    coupon.promotion?.min_amount,
    coupon.promotion?.minimum_amount,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function findCouponMetaByCode(couponList: any[], code: string): any | null {
  const codeNorm = String(code || "").trim().toLowerCase();
  if (!codeNorm || !Array.isArray(couponList)) return null;
  return (
    couponList.find((c: any) => String(c?.code || "").toLowerCase() === codeNorm) ??
    null
  );
}

/** Resolve cart line id for legacy remove API; coupons are often cart-level, not on items. */
function resolveCouponRemovalCartId(
  items: any[],
  cartData: any,
  activeCouponItem: any | undefined,
): number | string | null {
  const itemWithCoupon =
    activeCouponItem ?? items.find((item: any) => item?.coupons);
  if (itemWithCoupon) {
    const couponObj = itemWithCoupon?.coupons;
    const lineId =
      couponObj?.cart_id ??
      itemWithCoupon?.cart_id ??
      itemWithCoupon?.id ??
      null;
    if (lineId != null && lineId !== "") return lineId;
  }

  // Cart-level coupon: legacy API expects any cart line id (original: items[0].cart_id).
  const firstItem = items[0];
  const fallbackId = firstItem?.cart_id ?? firstItem?.id;
  if (fallbackId != null && fallbackId !== "") return fallbackId;

  const data = cartData ?? {};
  const cartLevelCandidates = [
    data.cart_id,
    data.coupon_cart_id,
    data.applied_coupon_cart_id,
  ];
  for (const candidate of cartLevelCandidates) {
    if (candidate != null && candidate !== "") return candidate;
  }
  return null;
}

function isCouponMutationSuccess(res: any): boolean {
  return res?.statusCode === 200 || res?.success === true;
}

function shouldAutoRemoveAppliedCoupon(args: {
  couponIsActive: boolean;
  rawDiscount: number;
  rawSubTotal: number;
  couponMeta: any;
  previousSubTotal: number | null;
}): boolean {
  const { couponIsActive, rawDiscount, rawSubTotal, couponMeta, previousSubTotal } =
    args;
  if (!couponIsActive) return false;
  if (rawSubTotal <= 0) return false;

  const minimumPurchase = getCouponMinimumPurchase(couponMeta);
  if (minimumPurchase != null) {
    return rawSubTotal < minimumPurchase;
  }

  if (rawDiscount > 0) return false;

  // Cart value increased — allow coupon to stay while totals/API catch up.
  if (previousSubTotal != null && rawSubTotal > previousSubTotal + 0.01) {
    return false;
  }

  // Coupon is attached but gives no discount on the current cart.
  return true;
}

function isFalsyAvailability(value: any): boolean {
  if (value === false || value === 0 || value === "0") return true;
  if (typeof value === "string" && value.trim().toLowerCase() === "false") {
    return true;
  }
  return false;
}

function isCartItemLocationUnavailable(item: any): boolean {
  const candidates = [
    item?.location_availability,
    item?.locationAvailability,
    item?.is_location_available,
    item?.location_available,
    // Keep this typo fallback for backward compatibility with inconsistent APIs.
    item?.location_availablity,
  ];
  return candidates.some((value) => isFalsyAvailability(value));
}

function isCartItemOutOfStock(item: any): boolean {
  const inStockValue = item?.in_stock;
  if (typeof inStockValue === "boolean") return !inStockValue;
  if (typeof inStockValue === "number") return inStockValue <= 0;
  if (typeof inStockValue === "string") {
    const normalized = inStockValue.trim().toLowerCase();
    if (normalized === "false" || normalized === "0") return true;
    if (normalized === "true" || normalized === "1") return false;
  }
  return getCartItemMaxSelectableQty(item) <= 0;
}

function isCartItemPurchasable(item: any): boolean {
  const isFreeItem = item?.is_free_gift === true || item?.is_free_gift === 1;
  if (isFreeItem) return false;
  return !isCartItemOutOfStock(item) && !isCartItemLocationUnavailable(item);
}

interface StyledFormControlLabelProps extends FormControlLabelProps {
  checked: boolean;
}

const StyledFormControlLabel = styled((props: StyledFormControlLabelProps) => (
  <FormControlLabel {...props} />
))(({ theme }) => ({
  variants: [
    {
      props: { checked: true },
      style: {
        ".MuiFormControlLabel-label": {
          color: theme.palette.primary.main,
        },
      },
    },
  ],
}));

function MyFormControlLabel(props: FormControlLabelProps) {
  const radioGroup = useRadioGroup();

  let checked = false;

  if (radioGroup) {
    checked = radioGroup.value === props.value;
  }

  return <StyledFormControlLabel checked={checked} {...props} />;
}

export default function Cart() {
  const { openPayment } = useRazorpay();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const deliveryMode = getDeliveryMode(searchParams);
  // API expects "quick" | "normal", not "quick_delivery"
  const deliveryChannelForApi = getDeliveryChannel(searchParams);
  const isExplicitNavEntry = searchParams?.get("entry") === "nav";


  // Generate breadcrumb items based on current pathname
  const getBreadcrumbItems = (): Array<{ label: string; path?: string }> => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbItems: Array<{ label: string; path?: string }> = [{ label: "Home", path: "/" }];

    // Map path segments to readable labels
    const pathLabels: Record<string, string> = {
      'cart': 'Cart',
      'product': 'Product',
      'wishlist': 'Wishlist',
      'account': 'Account',
      'category': 'Category',
    };

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `${segment}`;
      const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      // Only add path to items that aren't the last one
      if (index === pathSegments.length - 1) {
        breadcrumbItems.push({ label });
      } else {
        breadcrumbItems.push({ label, path: currentPath });
      }
    });

    return breadcrumbItems;
  };

  const breadcrumbItems = getBreadcrumbItems();

  const dispatch = useAppDispatch();

  const cartListArgs = useDashboardHomeQueryArgs();
  const { data: cartData, isLoading: cartLoading, isFetching: cartFetching, refetch: refetchCart } =
    useGetCartQuery(cartListArgs);

  // After delivery location updates, wait for coords to flow into `cartListArgs` then refetch cart list.
  useEffect(() => {
    const onDeliveryChange = () => {
      window.setTimeout(() => {
        void refetchCart();
      }, 0);
    };
    window.addEventListener(DELIVERY_SELECTION_CHANGED, onDeliveryChange);
    return () =>
      window.removeEventListener(DELIVERY_SELECTION_CHANGED, onDeliveryChange);
  }, [refetchCart]);

  const { data: couponData } = useGetCouponListQuery({
    type: cartListArgs.type,
    latitude: cartListArgs.latitude,
    longitude: cartListArgs.longitude,
  });

  const [placeOrder, { isLoading: isPlacingOrder }] = usePlaceOrderMutation();
  const [verifyPayment, { isLoading: isVerifyingPayment }] = useVerifyPaymentMutation();
  const [removeFromCart] = useRemoveFromCartMutation();
  const [clearCart] = useClearCartMutation();
  const [addToCart, { isLoading: isUpdatingQuantity }] = useAddToCartMutation();
  const [addWishlist] = useAddWishlistMutation();
  const [applyCoupon, { isLoading: isApplyingCoupon }] = useApplyCouponMutation();
  const [removeCoupon] = useRemoveCouponMutation(); // Import hook
  const [getProfile] = useLazyGetProfileQuery();
  const [guestLogin] = useGuestLoginMutation();
  const [cancelOrder] = useCancelOrderMutation();
  const [getOrderById] = useLazyGetOrderByIdQuery();
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [updatingItemsCache, setUpdatingItemsCache] = useState<Record<number, any>>({});
  const [lastAppliedCouponCode, setLastAppliedCouponCode] = useState<string | null>(null);
  const [hasAutoClearedCouponOnEntry, setHasAutoClearedCouponOnEntry] = useState(false);
  const [hasAppliedCouponInCurrentVisit, setHasAppliedCouponInCurrentVisit] = useState(false);
  const [suppressCouponDisplayOnEntry, setSuppressCouponDisplayOnEntry] = useState(false);
  const [isReloadCartVisit, setIsReloadCartVisit] = useState(false);
  const [isReloadDetectionReady, setIsReloadDetectionReady] = useState(false);
  const cartReloadSessionKey = "WC_CART_RELOAD";
  const user = useAppSelector(getCurrentUser);
  const token = useAppSelector(getToken);
  const cartCouponAuthScope = React.useMemo(
    () => getCartCouponAuthScope(user),
    [user, token],
  );

  // Guests need Laravel Sanctum auth_token for remove / quantity updates.
  useEffect(() => {
    if (token || getFromStorage(STORAGE_KEYS.token)) return;
    void ensureGuestCartAuth(guestLogin);
  }, [token, guestLogin]);
  const cartReloadCouponKey = getCartReloadCouponSessionKey(
    deliveryChannelForApi,
    cartCouponAuthScope,
  );
  const persistedCouponKey = getCartAppliedCouponStorageKey(
    deliveryChannelForApi,
    cartCouponAuthScope,
  );
  const couponIntentKey = getCartCouponIntentStorageKey(
    deliveryChannelForApi,
    cartCouponAuthScope,
  );
  const previousDeliveryChannelRef = React.useRef(deliveryChannelForApi);
  const previousCouponAuthScopeRef = React.useRef<string | null>(null);
  const cartMutationSettledAtRef = React.useRef(0);
  const couponRestoreInFlightRef = React.useRef(false);
  const couponRestoreAttemptKeyRef = React.useRef<string | null>(null);
  const couponOrphanRemoveInFlightRef = React.useRef(false);
  const markCartMutationSettled = React.useCallback(() => {
    cartMutationSettledAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    removeLegacyUnscopedCartCouponKeys();
    const intentCode = readCartCouponUserIntent(
      deliveryChannelForApi,
      cartCouponAuthScope,
    );
    if (!intentCode) {
      removeFromStorage(persistedCouponKey);
      setLastAppliedCouponCode(null);
    }
  }, [deliveryChannelForApi, cartCouponAuthScope, persistedCouponKey]);

  useEffect(() => {
    const intentCode = readCartCouponUserIntent(
      deliveryChannelForApi,
      cartCouponAuthScope,
    );
    const persistedCode = intentCode ? getFromStorage(persistedCouponKey) : null;
    if (persistedCode) {
      setLastAppliedCouponCode(persistedCode);
    } else {
      setLastAppliedCouponCode(null);
    }
  }, [persistedCouponKey, deliveryChannelForApi, cartCouponAuthScope]);

  useEffect(() => {
    const previousScope = previousCouponAuthScopeRef.current;
    if (previousScope === null) {
      previousCouponAuthScopeRef.current = cartCouponAuthScope;
      return;
    }
    if (previousScope === cartCouponAuthScope) return;

    if (
      previousScope === "user_pending" &&
      cartCouponAuthScope.startsWith("user_")
    ) {
      const pendingKey = getCartAppliedCouponStorageKey(
        deliveryChannelForApi,
        "user_pending",
      );
      const pendingCode = getFromStorage(pendingKey);
      if (pendingCode) {
        setToStorage(persistedCouponKey, pendingCode);
        removeFromStorage(pendingKey);
        setLastAppliedCouponCode(pendingCode);
        previousCouponAuthScopeRef.current = cartCouponAuthScope;
        return;
      }
    }

    previousCouponAuthScopeRef.current = cartCouponAuthScope;
    couponRestoreAttemptKeyRef.current = null;
    setHasAppliedCouponInCurrentVisit(false);
    setHasAutoClearedCouponOnEntry(false);
    const scopedCode = getFromStorage(persistedCouponKey);
    setLastAppliedCouponCode(scopedCode || null);
    if (!scopedCode) {
      setSuppressCouponDisplayOnEntry(true);
    }
  }, [cartCouponAuthScope, persistedCouponKey, deliveryChannelForApi]);

  useEffect(() => {
    const previousDeliveryChannel = previousDeliveryChannelRef.current;
    if (previousDeliveryChannel === deliveryChannelForApi) {
      return;
    }

    previousDeliveryChannelRef.current = deliveryChannelForApi;
    setHasAppliedCouponInCurrentVisit(false);
    setSuppressCouponDisplayOnEntry(true);
    setHasAutoClearedCouponOnEntry(true);

    const persistedCode = getFromStorage(persistedCouponKey);
    setLastAppliedCouponCode(persistedCode || null);
  }, [deliveryChannelForApi, persistedCouponKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isExplicitNavEntry) {
      setIsReloadCartVisit(false);
      setIsReloadDetectionReady(true);
      return;
    }
    const wasCartReloadFromSession =
      window.sessionStorage.getItem(cartReloadSessionKey) === "1";
    let wasCartReloadFromNavigation = false;
    try {
      const navEntry = window.performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      wasCartReloadFromNavigation = navEntry?.type === "reload";
    } catch {
      wasCartReloadFromNavigation = false;
    }
    const wasCartReload = wasCartReloadFromSession || wasCartReloadFromNavigation;
    if (wasCartReloadFromSession) {
      window.sessionStorage.removeItem(cartReloadSessionKey);
    }
    if (wasCartReload) {
      const intentCode = readCartCouponUserIntent(
        deliveryChannelForApi,
        cartCouponAuthScope,
      );
      const couponFromReloadSession = intentCode
        ? window.sessionStorage.getItem(cartReloadCouponKey)
        : null;
      if (couponFromReloadSession && intentCode) {
        setLastAppliedCouponCode(couponFromReloadSession);
        setToStorage(persistedCouponKey, couponFromReloadSession);
        window.sessionStorage.removeItem(cartReloadCouponKey);
      }
    }
    setIsReloadCartVisit(wasCartReload);
    setIsReloadDetectionReady(true);
  }, [
    isExplicitNavEntry,
    persistedCouponKey,
    cartReloadCouponKey,
    deliveryChannelForApi,
    cartCouponAuthScope,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !isExplicitNavEntry) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("entry");
      const query = url.searchParams.toString();
      const nextUrl = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    } catch {
      // ignore URL parse/replace failures
    }
  }, [isExplicitNavEntry]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const markCartReload = () => {
      // Mark only if user is currently on cart page.
      if (window.location.pathname.includes("/cart")) {
        window.sessionStorage.setItem(cartReloadSessionKey, "1");
      }
    };
    window.addEventListener("beforeunload", markCartReload);
    return () => {
      window.removeEventListener("beforeunload", markCartReload);
    };
  }, []);

  useEffect(() => {
    if (!isReloadDetectionReady) return;
    // On any non-reload entry (home/other screens), always start with coupon hidden.
    // This prevents previous in-memory state from making coupon visible.
    if (!isReloadCartVisit) {
      setHasAppliedCouponInCurrentVisit(false);
      setSuppressCouponDisplayOnEntry(true);
    } else {
      setSuppressCouponDisplayOnEntry(false);
    }
  }, [isReloadDetectionReady, isReloadCartVisit]);

  const refreshProfileForHeader = React.useCallback(async () => {
    const currentToken = token || getFromStorage(STORAGE_KEYS.token);
    if (!currentToken) return;
    try {
      const profileRes = await getProfile().unwrap();
      if (profileRes?.statusCode === 200 && profileRes?.data) {
        dispatch(setUser({ user: profileRes.data }));
      }
    } catch {
      // ignore
    }
  }, [dispatch, getProfile, token]);

  const safeRefetchCart = React.useCallback(async () => {
    try {
      return await refetchCart();
    } catch (err: any) {
      const message = String(err?.message || "");
      if (message.includes("Cannot refetch a query that has not been started yet")) {
        return null;
      }
      throw err;
    }
  }, [refetchCart]);

  const extractOrderItemIds = React.useCallback((source: any): Array<number | string> => {
    const containers = [
      source,
      source?.data,
      source?.data?.order,
      source?.order,
    ];
    const allItems = containers.flatMap((container: any) => {
      if (!container) return [];
      const items = container?.items || container?.order_items || [];
      return Array.isArray(items) ? items : [];
    });
    const ids = allItems
      .map((item: any) =>
        item?.orderItemId ||
        item?.order_item_id ||
        item?.order_itemid ||
        item?.item_id ||
        item?.id ||
        null
      )
      .filter((id: any) => id !== null && id !== undefined && id !== "");
    return Array.from(new Set(ids));
  }, []);

  const cancelCreatedOnlineOrder = React.useCallback(
    async (source: any) => {
      const orderId =
        source?.data?.id ||
        source?.data?.order_id ||
        source?.data?.orderId ||
        source?.data?.order?.id ||
        source?.data?.order?.order_id ||
        source?.data?.order?.orderId ||
        source?.id ||
        source?.order_id ||
        source?.orderId ||
        null;
      let orderItemIds = extractOrderItemIds(source);
      if (orderItemIds.length === 0 && orderId) {
        try {
          const detailRes = await getOrderById({ orderId }).unwrap();
          const detailData = (detailRes as any)?.data?.data || (detailRes as any)?.data || detailRes;
          orderItemIds = extractOrderItemIds(detailData);
        } catch {
          // Ignore detail fetch failure; fallback will still be attempted.
        }
      }
      const fallbackIds =
        orderItemIds.length > 0
          ? orderItemIds
          : orderId !== null && orderId !== undefined
            ? [orderId]
            : [];

      if (fallbackIds.length === 0) return false;

      const results = await Promise.allSettled(
        fallbackIds.map((orderItemId) =>
          cancelOrder({
            orderItemId,
            ...(orderId ? { orderId } : {}),
            reason: "ordered_by_mistake",
          }).unwrap()
        )
      );

      return results.some((result) => result.status === "fulfilled");
    },
    [cancelOrder, extractOrderItemIds, getOrderById]
  );

  /** Re-add cart lines after online place-order (backend clears cart) when Razorpay is aborted. */
  const buildAddToCartPayloadFromCartItem = React.useCallback(
    (item: any) => {
      const product = item?.product;
      const variation = item?.variation;
      const productKitId =
        item?.product_kit_id ||
        item?.kit_id ||
        product?.product_kit_id ||
        null;
      const productId =
        product?.product_id || product?.id || item?.product_id || null;
      const variationId =
        variation?.id ||
        variation?.variation_id ||
        item?.variation_id ||
        null;
      const qty = Number(item?.qty || item?.quantity || 1);
      const isFreeGift =
        item?.is_free_gift === true || item?.is_free_gift === 1;

      if (!productKitId && !productId) return null;

      const payload: Record<string, unknown> = {
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        channel: deliveryChannelForApi,
      };
      if (productKitId) {
        payload.product_kit_id = productKitId;
      } else {
        payload.product_id = productId;
        if (variationId != null && variationId !== "") {
          payload.variation_id = variationId;
        }
      }
      if (isFreeGift) {
        payload.is_free_gift = true;
      }
      return payload;
    },
    [deliveryChannelForApi],
  );

  const restoreCartItemsAfterPaymentAbort = React.useCallback(
    async (items: any[]) => {
      if (!Array.isArray(items) || items.length === 0) return false;
      const payloads = items
        .map((item) => buildAddToCartPayloadFromCartItem(item))
        .filter(Boolean) as Array<Record<string, unknown>>;
      if (payloads.length === 0) return false;

      const results = await Promise.allSettled(
        payloads.map((payload) => addToCart(payload as any).unwrap()),
      );
      return results.some((result) => result.status === "fulfilled");
    },
    [addToCart, buildAddToCartPayloadFromCartItem],
  );

  const handleApplyCoupon = async (code: string) => {
    try {
      const res = await applyCoupon({ coupon_code: code, type: deliveryChannelForApi }).unwrap();
      if (res?.statusCode === 200) {
        toast.success(res?.message || "Coupon applied successfully");
        setLastAppliedCouponCode(code);
        setHasAppliedCouponInCurrentVisit(true);
        writeCartCouponUserIntent(deliveryChannelForApi, cartCouponAuthScope, code);
        setToStorage(persistedCouponKey, code);
        await refetchCart();
        markCartMutationSettled();
        setOpen2(false);
      } else {
        toast.error(res?.message || "Failed to apply coupon");
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      // console.error("Coupon apply error:", error);
      toast.error(error?.data?.message || error?.message || "Something went wrong");
    }
  };

  const handleDeleteItem = async (item: any) => {
    try {
      if (removingIds.includes(item.id)) return;
      setRemovingIds((prev) => [...prev, item.id]);

      const guestReady = await ensureGuestCartAuth(guestLogin);
      if (!guestReady && !getFromStorage(STORAGE_KEYS.token)) {
        toast.error("Unable to update cart. Please try again.");
        setRemovingIds((prev) => prev.filter((id) => id !== item.id));
        return;
      }

      const res = await removeFromCart({ cart_id: item.id, type: deliveryChannelForApi }).unwrap();
      if (res?.statusCode === 200 || res?.statusCode === 201) {
        toast.success(res?.message || "Item removed successfully");
        pushEvent("remove_from_cart", {
          items: [buildGtmItem(item)],
        });
        await refetchCart();
        markCartMutationSettled();
        await refreshProfileForHeader();
      } else {
        toast.error(res?.message || "Failed to remove item");
        setRemovingIds((prev) => prev.filter((id) => id !== item.id));
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to remove item");
      setRemovingIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const handleClearCart = async () => {
    try {
      const guestReady = await ensureGuestCartAuth(guestLogin);
      if (!guestReady && !getFromStorage(STORAGE_KEYS.token)) {
        toast.error("Unable to update cart. Please try again.");
        return;
      }

      const res = await clearCart({ type: deliveryChannelForApi }).unwrap();
      if (res?.statusCode === 200 || res?.statusCode === 201) {
        toast.success(res?.message || "Cart cleared successfully");
        await refetchCart();
        markCartMutationSettled();
        await refreshProfileForHeader();
      } else {
        toast.error(res?.message || "Failed to clear cart");
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to clear cart");
    }
  };


  const handleUpdateQuantity = async (item: any, newQuantity: number) => {
    if (!item || newQuantity === item.qty) {
      return;
    }

    if (newQuantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const maxSelectable = getCartItemMaxSelectableQty(item);
    if (newQuantity > maxSelectable) {
      if (maxSelectable <= 0) {
        toast.error("This product is out of stock");
        return;
      }
      toast.error(
        `Only ${maxSelectable} quantity is available for this product`,
      );
      return;
    }

    const product = item.product;
    const variation = item.variation;
    const deliveryChannel = getDeliveryChannel(searchParams);

    const productKitId =
      item?.product_kit_id ||
      item?.kit_id ||
      product?.product_kit_id ||
      null;
    const productId =
      product?.product_id ||
      product?.id ||
      item.product_id;
    const variationId = variation?.id || variation?.variation_id || null;

    const buildAddPayload = (qty: number) => {
      const payload: any = {
        variation_id: variationId,
        qty: Number(qty),
        channel: deliveryChannel,
      };
      if (productKitId) {
        payload.product_kit_id = productKitId;
      } else if (productId) {
        payload.product_id = productId;
      }
      return payload;
    };

    if (!productKitId && !productId) {
      toast.error("Invalid cart item: missing product id");
      return;
    }

    setUpdatingItemId(item.id);
    setUpdatingItemsCache((prev) => ({
      ...prev,
      [item.id]: { ...item, qty: newQuantity },
    }));
    setUpdatingQuantities((prev) => ({
      ...prev,
      [item.id]: newQuantity,
    }));

    const previousQty = Number(item.qty) || 1;
    const qtyDelta = newQuantity - previousQty;

    const selectedFreeGift = freeGifts
      .flatMap((promotion: any) => {
        const rewards = Array.isArray(promotion?.rewards) ? promotion.rewards : [];
        return rewards
          .filter((reward: any) => reward?.product != null && reward?.is_added)
          .map((reward: any) => ({
            promotionId: promotion?.promotion_id ?? promotion?.id ?? null,
            rewardId: reward?.id ?? null,
            rewardableId:
              reward?.rewardable_id ??
              reward?.product?.product_id ??
              reward?.product?.id ??
              null,
            variationId: reward?.product?.variation_id ?? null,
          }));
      })
      .find(Boolean);

    try {
      // cart/add is incremental (adds to existing qty).
      // Increase 1→2 must send qty:1 (not 2), otherwise cart becomes 3.
      if (qtyDelta === 0) return;

      let res: any;

      if (qtyDelta > 0) {
        res = await addToCart(buildAddPayload(qtyDelta)).unwrap();
      } else {
        // Decrease cannot use cart/add alone — replace the line with the target qty.
        await ensureGuestCartAuth(guestLogin);
        await removeFromCart({
          cart_id: item.id,
          type: deliveryChannel,
        }).unwrap();
        res = await addToCart(buildAddPayload(newQuantity)).unwrap();
      }

      if (res?.statusCode === 200 || res?.statusCode === 201) {
        const refetchResult = await safeRefetchCart();
        const refreshedCart = (refetchResult as any)?.data;
        const refreshedPromotions = Array.isArray(refreshedCart?.data?.free_gifts)
          ? refreshedCart.data.free_gifts
          : [];

        if (selectedFreeGift) {
          const unlockedPromotion = refreshedPromotions.find((promotion: any) => {
            const promotionId = promotion?.promotion_id ?? promotion?.id ?? null;
            return (
              promotionId === selectedFreeGift.promotionId &&
              !!promotion?.is_unlocked
            );
          });

          if (unlockedPromotion) {
            const unlockedRewards = Array.isArray(unlockedPromotion?.rewards)
              ? unlockedPromotion.rewards
              : [];
            const matchingReward = unlockedRewards.find((reward: any) => {
              const rewardProduct = reward?.product || {};
              const rewardableId =
                reward?.rewardable_id ??
                rewardProduct?.product_id ??
                rewardProduct?.id ??
                null;
              const rewardVariationId = rewardProduct?.variation_id ?? null;

              if (
                selectedFreeGift.rewardId !== null &&
                reward?.id === selectedFreeGift.rewardId
              ) {
                return true;
              }

              return (
                rewardableId === selectedFreeGift.rewardableId &&
                rewardVariationId === selectedFreeGift.variationId
              );
            });

            if (matchingReward && !matchingReward?.is_added) {
              await handleAddFreeGift(unlockedPromotion, matchingReward);
            }
          }
        }

        await refreshProfileForHeader();
      } else {
        toast.error(res?.message || "Failed to update quantity");
        await safeRefetchCart();
      }
    } catch (error: any) {
      const msg =
        error?.data?.message || error?.message || "Failed to update quantity";
      toast.error(msg);
      await safeRefetchCart();
    } finally {
      setUpdatingItemId(null);
      markCartMutationSettled();
      setTimeout(() => {
        setUpdatingQuantities((prev) => {
          const newState = { ...prev };
          delete newState[item.id];
          return newState;
        });
        setUpdatingItemsCache((prev) => {
          const newState = { ...prev };
          delete newState[item.id];
          return newState;
        });
      }, 500);
    }
  };

  // Fetch address list
  const [getAddressList, { data: addressResponse }] = useLazyGetAddressListQuery();
  const [editAddress] = useEditAddressMutation();
  const addresses = addressResponse?.data || [];
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  const cartAddressUserId = user?.id ?? user?._id;
  const cartAddressStorageKey =
    cartAddressUserId != null
      ? `WC_CART_DELIVERY_ADDRESS:${String(cartAddressUserId)}`
      : null;

  const applyResolvedCartAddress = React.useCallback(() => {
    const isAuthenticated = Boolean(
      token || getFromStorage(STORAGE_KEYS.token),
    );

    if (!isAuthenticated || !addresses.length) {
      setSelectedAddressId("");
      return;
    }

    const persistedId = readPersistedDeliveryAddressId(deliveryMode);
    const explicitlySelectedAddress =
      persistedId && persistedId !== "__current__"
        ? addresses.find((address) => String(address.id) === persistedId)
        : undefined;

    let rememberedId: string | null = null;

    if (cartAddressStorageKey && typeof window !== "undefined") {
      try {
        rememberedId = window.sessionStorage.getItem(cartAddressStorageKey);
      } catch {
        rememberedId = null;
      }
    }

    const rememberedAddress = rememberedId
      ? addresses.find((address) => String(address.id) === rememberedId)
      : undefined;

    const nextAddress =
      explicitlySelectedAddress ??
      rememberedAddress ??
      addresses.find((address) => Number(address.is_default) === 1) ??
      addresses[0];

    const nextAddressId = nextAddress ? String(nextAddress.id) : "";
    setSelectedAddressId(nextAddressId);

    if (
      nextAddressId &&
      cartAddressStorageKey &&
      typeof window !== "undefined"
    ) {
      try {
        window.sessionStorage.setItem(
          cartAddressStorageKey,
          nextAddressId,
        );
      } catch {
        // The current selection still works when session storage is unavailable.
      }
    }
  }, [addresses, deliveryMode, token, cartAddressStorageKey]);

  useEffect(() => {
    restoreCommittedDeliverySelection();
    applyResolvedCartAddress();
  }, [applyResolvedCartAddress]);

  useEffect(() => {
    const handler = () => applyResolvedCartAddress();
    window.addEventListener(DELIVERY_SELECTION_CHANGED, handler);
    return () => window.removeEventListener(DELIVERY_SELECTION_CHANGED, handler);
  }, [applyResolvedCartAddress]);

  const selectedAddressEntity =
    addresses.find((addr) => String(addr.id) === selectedAddressId) ?? null;

  const selectedAddressForOrder = selectedAddressEntity;
  const cartDeliveryAddress = selectedAddressEntity;

  // Fetch addresses when user is logged in
  useEffect(() => {
    if (token) {
      getAddressList();
    }
  }, [token, getAddressList]);

  // Also fetch addresses when component mounts (in case token loads after mount)
  useEffect(() => {
    const checkAndFetch = async () => {
      const currentToken = token || getFromStorage(STORAGE_KEYS.token);
      if (currentToken) {
        getAddressList();
      }
    };
    checkAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format delivery address - show like home screen
  const formatPhoneNumber = (addr: Address | null): string => {
    if (!addr?.mobile && !addr?.phone) return "";
    const merged = mergeAddressPhoneMeta(
      addr as unknown as Record<string, unknown>,
    ) as unknown as Address;
    return formatAddressPhone(merged.phone, merged.phone_code, merged.mobile);
  };

  const formatAddressLines = (addr: Address | null): string => {
    if (!addr) return "No address available";

    const address = String(addr.address ?? "").trim();
    const address1 = String(addr.address1 ?? "").trim();
    const landmark = String(addr.landmark ?? "").trim();
    const city = String(addr.city ?? "").trim();
    const state = String(addr.state ?? "").trim();
    const pincode = String(addr.pincode ?? "").trim();
    const locationSuffix = [city, state, pincode].filter(Boolean).join(", ");

    const isContained = (needle: string, haystack: string) => {
      if (!needle || !haystack) return false;
      return haystack.toLowerCase().includes(needle.toLowerCase());
    };

    const locationAlreadyInAddress =
      Boolean(address) &&
      (!pincode || address.includes(pincode)) &&
      (!city || isContained(city, address));

    if (locationAlreadyInAddress) {
      const parts = [address];
      if (landmark && !isContained(landmark, address)) parts.push(landmark);
      return parts.join(", ");
    }

    const parts: string[] = [];
    if (address) parts.push(address);
    if (address1 && address1 !== address && !isContained(address1, address)) {
      parts.push(address1);
    }
    if (landmark && !parts.some((part) => isContained(landmark, part))) {
      parts.push(landmark);
    }
    if (
      locationSuffix &&
      !parts.some(
        (part) =>
          isContained(locationSuffix, part) ||
          (pincode ? part.includes(pincode) : false),
      )
    ) {
      parts.push(locationSuffix);
    }

    return parts.length > 0 ? parts.join(", ") : "No address available";
  };

  const formatFullAddress = (addr: Address | null): string => {
    if (!addr) return "No address available";
    const parts: string[] = [];
    if (addr.name) parts.push(addr.name);
    const phone = formatPhoneNumber(addr);
    if (phone) parts.push(phone);
    if (addr.email) parts.push(addr.email);
    const location = formatAddressLines(addr);
    if (location && location !== "No address available") parts.push(location);
    return parts.length > 0 ? parts.join(", ") : "No address available";
  };

  const items = Array.isArray(cartData?.data?.items) ? cartData.data.items : [];
  const expectedDeliveryDate = getCartDeliveryEtaLabel(cartData);
  const hasCustomerToken = Boolean(token || getFromStorage(STORAGE_KEYS.token));
  const shouldShowExpectedDeliveryDate =
    deliveryMode === "quick_delivery" &&
    Boolean(selectedAddressForOrder) &&
    Boolean(expectedDeliveryDate);
  const rawSubTotal = Number(cartData?.data?.sub_total || 0);
  const rawDiscount = Number(
    cartData?.data?.discount_amount ??
      (cartData?.data as any)?.coupon_discount ??
      (cartData?.data as any)?.discount ??
      0,
  );
  const rawTax = Number(cartData?.data?.tax_total || 0);
  const rawDelivery = Number(cartData?.data?.delivery_charges || 0);
  const rawTotalMrp = Number(
    cartData?.data?.total_mrp ?? cartData?.data?.sub_total ?? 0,
  );
  const canPlaceOrder =
    cartData?.data?.can_place_order === undefined
      ? true
      : Boolean(cartData.data.can_place_order);
  const promo = 0;
  const freeGifts = Array.isArray(cartData?.data?.free_gifts)
    ? cartData?.data?.free_gifts
    : [];

  // Extract active coupon from items (assuming first item with coupon represents the applied coupon)
  const activeCouponItem = items.find((item: any) => item.coupons);
  const activeCoupon = activeCouponItem?.coupons;
  const cartLevelCouponCode = String(
    (cartData?.data as any)?.coupon_code ||
      (cartData?.data as any)?.coupon?.code ||
      (cartData?.data as any)?.applied_coupon_code ||
      ""
  ).trim();
  const activeCouponCode = String((activeCoupon as any)?.code || cartLevelCouponCode || "").trim();
  const hasCouponAppliedOnCart =
    Boolean(activeCouponCode) ||
    Boolean(activeCoupon) ||
    Boolean(cartLevelCouponCode);
  const userCouponIntent = readCartCouponUserIntent(
    deliveryChannelForApi,
    cartCouponAuthScope,
  );
  const couponListFromApi = couponData?.data || [];
  // Remove-coupon API expects cart line id (same as removeFromCart), not coupon/promotion id.
  const appliedCouponRemoveId = resolveCouponRemovalCartId(
    items,
    cartData?.data,
    activeCouponItem,
  );

  const clearLocalCouponState = React.useCallback(async () => {
    setLastAppliedCouponCode(null);
    setHasAppliedCouponInCurrentVisit(false);
    couponRestoreAttemptKeyRef.current = null;
    clearCartCouponUserIntent(deliveryChannelForApi, cartCouponAuthScope);
    removeFromStorage(persistedCouponKey);
    await refetchCart();
    markCartMutationSettled();
  }, [
    cartCouponAuthScope,
    deliveryChannelForApi,
    markCartMutationSettled,
    persistedCouponKey,
    refetchCart,
  ]);

  const handleRemoveCoupon = React.useCallback(
    async (options?: { silent?: boolean; autoBelowMinimum?: boolean }) => {
      const isSilent = Boolean(options?.silent);
      const isAutoBelowMinimum = Boolean(options?.autoBelowMinimum);
      const couponCode = String(
        activeCouponCode ||
          userCouponIntent ||
          lastAppliedCouponCode ||
          "",
      ).trim();
      const legacyRemoveId = resolveCouponRemovalCartId(
        items,
        cartData?.data,
        activeCouponItem,
      );

      const showRemoveFailure = (message?: string) => {
        if (!isSilent && !isAutoBelowMinimum) {
          toast.error(message || "Failed to remove coupon");
        }
      };

      const showRemoveSuccess = async (message?: string) => {
        if (isAutoBelowMinimum) {
          toast.error(
            "Coupon removed because your cart value is below the minimum required amount.",
          );
        } else if (!isSilent) {
          toast.success(message || "Coupon removed successfully");
        }
        await clearLocalCouponState();
      };

      const attemptRemove = async (
        payload:
          | { coupon_code: string; type: string }
          | { id: number | string; type: string },
      ) => removeCoupon(payload).unwrap();

      try {
        if (couponCode) {
          const res = await attemptRemove({
            coupon_code: couponCode,
            type: deliveryChannelForApi,
          });
          if (isCouponMutationSuccess(res)) {
            await showRemoveSuccess(res?.message);
            return true;
          }
        }
      } catch {
        // Fall through to legacy cart-id remove.
      }

      if (legacyRemoveId != null) {
        try {
          const res = await attemptRemove({
            id: legacyRemoveId,
            type: deliveryChannelForApi,
          });
          if (isCouponMutationSuccess(res)) {
            await showRemoveSuccess(res?.message);
            return true;
          }
          showRemoveFailure(res?.message);
          return false;
        } catch (error: any) {
          showRemoveFailure(error?.data?.message || error?.message);
          return false;
        }
      }

      showRemoveFailure(
        couponCode
          ? "Failed to remove coupon"
          : "No coupon is applied to this cart",
      );
      return false;
    },
    [
      activeCouponCode,
      activeCouponItem,
      cartData?.data,
      clearLocalCouponState,
      deliveryChannelForApi,
      items,
      lastAppliedCouponCode,
      removeCoupon,
      userCouponIntent,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const intentCode = readCartCouponUserIntent(
      deliveryChannelForApi,
      cartCouponAuthScope,
    );
    if (!intentCode) {
      window.sessionStorage.removeItem(cartReloadCouponKey);
      return;
    }
    const codeForReload =
      activeCouponCode &&
      activeCouponCode.toLowerCase() === intentCode.toLowerCase()
        ? activeCouponCode
        : lastAppliedCouponCode &&
            lastAppliedCouponCode.toLowerCase() === intentCode.toLowerCase()
          ? lastAppliedCouponCode
          : "";
    if (codeForReload) {
      window.sessionStorage.setItem(cartReloadCouponKey, codeForReload);
    } else {
      window.sessionStorage.removeItem(cartReloadCouponKey);
    }
  }, [
    activeCouponCode,
    lastAppliedCouponCode,
    cartReloadCouponKey,
    deliveryChannelForApi,
    cartCouponAuthScope,
  ]);

  useEffect(() => {
    if (!isReloadDetectionReady || !activeCouponCode) return;

    const intentCode = readCartCouponUserIntent(
      deliveryChannelForApi,
      cartCouponAuthScope,
    );
    if (
      !intentCode ||
      intentCode.toLowerCase() !== activeCouponCode.toLowerCase()
    ) {
      return;
    }

    setLastAppliedCouponCode(activeCouponCode);
    setToStorage(persistedCouponKey, activeCouponCode);
  }, [
    activeCouponCode,
    persistedCouponKey,
    isReloadDetectionReady,
    deliveryChannelForApi,
    cartCouponAuthScope,
  ]);

  useEffect(() => {
    if (
      cartLoading ||
      !isReloadDetectionReady ||
      isReloadCartVisit ||
      hasAutoClearedCouponOnEntry ||
      hasAppliedCouponInCurrentVisit
    ) return;

    // Server cart already has a coupon — keep it visible (e.g. applied on mobile).
    if (activeCouponCode && rawDiscount > 0) {
      const intentCode = readCartCouponUserIntent(
        deliveryChannelForApi,
        cartCouponAuthScope,
      );
      if (
        !intentCode ||
        intentCode.toLowerCase() !== activeCouponCode.toLowerCase()
      ) {
        writeCartCouponUserIntent(
          deliveryChannelForApi,
          cartCouponAuthScope,
          activeCouponCode,
        );
        setToStorage(persistedCouponKey, activeCouponCode);
        setLastAppliedCouponCode(activeCouponCode);
      }
      setHasAppliedCouponInCurrentVisit(true);
      setSuppressCouponDisplayOnEntry(false);
      setHasAutoClearedCouponOnEntry(true);
      return;
    }

    // For non-reload entries, hide coupon UI only.
    // Do not clear persisted value here, otherwise reload cannot restore correctly.
    setSuppressCouponDisplayOnEntry(true);
    setHasAutoClearedCouponOnEntry(true);
  }, [
    cartLoading,
    isReloadDetectionReady,
    isReloadCartVisit,
    hasAutoClearedCouponOnEntry,
    hasAppliedCouponInCurrentVisit,
    persistedCouponKey,
    appliedCouponRemoveId,
    activeCouponCode,
    rawDiscount,
  ]);

  // Show applied coupon on parent: prefer cart data.
  // Fallback from storage is shown only on reload or current-visit apply,
  // so first cart visit from other pages stays empty.
  const shouldHideCouponForNonReloadEntry =
    isReloadDetectionReady && !isReloadCartVisit && !hasAppliedCouponInCurrentVisit;
  const serverCouponApplied = rawDiscount > 0 && hasCouponAppliedOnCart;
  const visibleActiveCoupon = serverCouponApplied
    ? activeCoupon ?? (activeCouponCode ? { code: activeCouponCode } : null)
    : (suppressCouponDisplayOnEntry || shouldHideCouponForNonReloadEntry) &&
        !hasAppliedCouponInCurrentVisit
      ? null
      : activeCoupon;
  const shouldShowPersistedCoupon =
    isReloadDetectionReady &&
    (isReloadCartVisit || hasAppliedCouponInCurrentVisit) &&
    !visibleActiveCoupon &&
    Boolean(lastAppliedCouponCode) &&
    Boolean(userCouponIntent);
  const displayCoupon = visibleActiveCoupon ?? (shouldShowPersistedCoupon ? { code: lastAppliedCouponCode } : null);

  // Enrich from coupon list (description, name, end_date) when cart response omits fields
  const displayCouponWithPromotion = React.useMemo(() => {
    if (!displayCoupon?.code) return displayCoupon;
    const codeNorm = String(displayCoupon.code || "").toLowerCase();
    const fromList = Array.isArray(couponListFromApi)
      ? couponListFromApi.find(
          (c: any) => String(c?.code || "").toLowerCase() === codeNorm
        )
      : null;
    if (!fromList) return displayCoupon;
    const dc = displayCoupon as any;
    const listPromo = fromList.promotion || {};
    const cartPromo = dc.promotion || {};
    return {
      ...dc,
      // Show same casing as coupon list (API cart may return different case)
      code: fromList.code ?? dc.code,
      description: dc.description ?? fromList.description,
      promotion: {
        ...listPromo,
        ...cartPromo,
        description: cartPromo.description ?? listPromo.description,
        name: cartPromo.name ?? listPromo.name,
        end_date: cartPromo.end_date ?? listPromo.end_date,
      },
    };
  }, [displayCoupon, couponListFromApi]);

  const appliedCouponSubtitle = React.useMemo(() => {
    const c: any = displayCouponWithPromotion;
    if (!c?.code) return "";
    const text =
      c.promotion?.description ||
      c.description ||
      c.promotion?.name ||
      "";
    return String(text).trim();
  }, [displayCouponWithPromotion]);

  const visibleDisplayCouponWithPromotion = React.useMemo(() => {
    if (!displayCouponWithPromotion?.code) return null;
    if (isApplyingCoupon) return displayCouponWithPromotion;
    if (serverCouponApplied) return displayCouponWithPromotion;
    if (!userCouponIntent) return null;
    if (
      displayCouponWithPromotion.code.toLowerCase() !==
      userCouponIntent.toLowerCase()
    ) {
      return null;
    }
    if (rawDiscount > 0) return displayCouponWithPromotion;
    return null;
  }, [
    displayCouponWithPromotion,
    isApplyingCoupon,
    rawDiscount,
    userCouponIntent,
    serverCouponApplied,
  ]);

  const appliedCouponMeta = React.useMemo(() => {
    const code =
      activeCouponCode ||
      displayCoupon?.code ||
      (activeCoupon as any)?.code ||
      "";
    return (
      findCouponMetaByCode(couponListFromApi, code) ||
      displayCouponWithPromotion ||
      activeCoupon ||
      null
    );
  }, [
    activeCoupon,
    activeCouponCode,
    couponListFromApi,
    displayCoupon?.code,
    displayCouponWithPromotion,
  ]);

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');
    } catch (e) {
      return "";
    }
  };

  const [formValues, setFormValues] = React.useState({
    Enquiry: 0,
    city: 0,
    state: 0,
  });
  const handleChange1 = (event: any) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [checkoutAddAddressOpen, setCheckoutAddAddressOpen] = React.useState(false);
  const handleCloseModal = () => {
    setOpen(false);
  };

  const handleOpenDeliveryAddress = React.useCallback(() => {
    if (!hasCustomerToken) return;

    if (!isAddressCompleteForOrder(cartDeliveryAddress)) {
      if (addresses.length > 0) {
        setOpen(true);
        return;
      }
      setCheckoutAddAddressOpen(true);
      return;
    }

    setOpen(true);
  }, [hasCustomerToken, cartDeliveryAddress, addresses.length]);

  const promptAddDeliveryAddress = React.useCallback(() => {
    toast.error(
      "Please add your delivery address with name and contact number.",
    );
    if (addresses.length > 0) {
      setOpen(true);
    } else {
      setCheckoutAddAddressOpen(true);
    }
  }, [addresses.length]);

  const ensureCompleteDeliveryAddress = React.useCallback((): boolean => {
    if (isAddressCompleteForOrder(cartDeliveryAddress)) return true;
    promptAddDeliveryAddress();
    return false;
  }, [cartDeliveryAddress, promptAddDeliveryAddress]);


  const redirectGuestToLogin = React.useCallback(() => {
    const qs = searchParams?.toString();
    const returnPath = `${pathname}${qs ? `?${qs}` : ""}`;
    router.push(`/auth/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [pathname, router, searchParams]);

  // Refetch addresses when modal opens to ensure fresh data
  useEffect(() => {
    if (open) {
      const currentToken = token || getFromStorage(STORAGE_KEYS.token);
      if (currentToken) {
        getAddressList();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [open1, setOpen1] = React.useState(false);
  const handleCloseModal1 = () => {
    setOpen1(false);
  };

  const [open2, setOpen2] = React.useState(false);
  const handleCloseModal2 = () => {
    setOpen1(false);
  };
  const [open3, setOpen3] = React.useState(false);
  const handleCloseModal3 = () => {
    setOpen3(false);
  };

  const [showPayment, setShowPayment] = useState(false);
  useCookiePageView(showPayment ? "Checkout" : "Cart");
  const [movingItemId, setMovingItemId] = useState<number | null>(null);
  const [removingIds, setRemovingIds] = useState<number[]>([]);
  const [updatingQuantities, setUpdatingQuantities] = useState<Record<number, number>>({});

  const [checked, setChecked] = React.useState(false);
  const [activePaymentAction, setActivePaymentAction] = React.useState<string | null>(null);
  const [isDirectOrderProcessing, setIsDirectOrderProcessing] = useState(false);
  const lastStableTotalsRef = React.useRef<{
    subTotal: number;
    discount: number;
    tax: number;
    delivery: number;
    totalMrp: number;
  } | null>(null);
  const couponAutoRemoveInFlightRef = React.useRef(false);
  const couponAutoRemoveFailedKeyRef = React.useRef<string | null>(null);
  const couponSubtotalSnapshotRef = React.useRef<number | null>(null);
  const [addressData, setAddressData] = React.useState({
    address: "123 Main Street",
    address1: "Apt 4B",
    landmark: "Near Central Park",
    latitude: 40.7128,
    longitude: -74.006,
    phone: "",
    phone_code: "91",
    name: "",
  });

  // Loyalty points discount - only apply when checkbox is checked
  const loyaltyPointsAvailable = Number(cartData?.data?.loyalty_points || 0);
  const canRedeemLoyaltyPoints = loyaltyPointsAvailable > 0;
  const loyaltyPointsDiscount = checked
    ? Number(cartData?.data?.loyalty_points_Discount || 0)
    : 0;

  React.useEffect(() => {
    if (!canRedeemLoyaltyPoints) {
      setChecked(false);
    }
  }, [canRedeemLoyaltyPoints]);

  const isQuantityUpdateInProgress = updatingItemId !== null || isUpdatingQuantity;

  const handleChange2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canRedeemLoyaltyPoints) return;
    setChecked(event.target.checked);
  };

  const isPaymentActionBusy =
    isPlacingOrder || cartLoading || isDirectOrderProcessing || activePaymentAction != null;

  const getCartVariantLabel = (variation: any, productName?: string): string => {
    if (!variation) return "";
    const attrs = Array.isArray(variation?.variation_attributes)
      ? variation.variation_attributes
      : [];
    if (attrs.length === 0) return "";

    const values = attrs
      .map((a: any) => {
        const value =
          a?.attribute_option?.display_value ??
          a?.attributeOption?.display_value ??
          a?.display_value ??
          a?.value ??
          a?.option_value ??
          a?.option ??
          "";
        return String(value || "").trim();
      })
      .filter(Boolean);
    if (values.length === 0) return "";

    const label = values.join(" - ");
    const normalizedProduct = String(productName || "").trim().toLowerCase();
    if (normalizedProduct && label.toLowerCase() === normalizedProduct) return "";
    return label;
  };

  // When cart data updates, drop any removingIds that are no longer in the cart
  useEffect(() => {
    if (!cartData?.data?.items) return;
    const currentIds = new Set(
      (cartData.data.items as any[]).map((i: any) => i.id)
    );
    setRemovingIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [cartData?.data?.items]);

  // Header cart badge uses sum of line qty from getCart (see sumCartLineQuantities)
  const prevCartItemCountRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (cartLoading || !cartData?.data) return;
    const currentToken = token || getFromStorage(STORAGE_KEYS.token);
    if (!currentToken) return;

    const count = (cartData.data.items || []).length;
    const prev = prevCartItemCountRef.current;
    const shouldSyncProfile = count === 0 && (prev === null || prev > 0);
    prevCartItemCountRef.current = count;

    if (!shouldSyncProfile) return;

    (async () => {
      try {
        const profileRes = await getProfile().unwrap();
        if (profileRes?.statusCode === 200 && profileRes?.data) {
          dispatch(setUser({ user: profileRes.data }));
        }
      } catch {
        // ignore
      }
    })();
  }, [cartLoading, cartData?.data, token, dispatch, getProfile]);

  // Combine cart items with cached updating items to keep them visible
  const allItems = [
    ...items,
    ...Object.values(updatingItemsCache).filter((cachedItem: any) => {
      // Deduplicate by looking for matching product/variation instead of just ID
      // This prevents duplicates when the backend re-adds an item with a new database ID
      const isAlreadyInItems = items.some((item: any) => {
        const itemProdId = item.product_kit_id || item.product_id || item.product?.id;
        const cachedProdId = cachedItem.product_kit_id || cachedItem.product_id || cachedItem.product?.id;
        const itemVarId = item.variation_id || item.variation?.id || null;
        const cachedVarId = cachedItem.variation_id || cachedItem.variation?.id || null;

        return itemProdId === cachedProdId && itemVarId === cachedVarId;
      });
      return !isAlreadyInItems;
    }),
  ];

  const displayedItems = allItems
    .filter((item: any) => !removingIds.includes(item.id))
    .map((item: any) => {
      // If this item is being updated, show the optimistic quantity + scaled price
      if (updatingQuantities[item.id] !== undefined) {
        const previousQty = Math.max(1, Number(item.qty) || 1);
        const nextQty = Number(updatingQuantities[item.id]) || previousQty;
        const ratio = nextQty / previousQty;
        const scaleMoney = (value: unknown) => {
          const n = Number(value);
          return Number.isFinite(n) ? n * ratio : value;
        };
        return {
          ...item,
          qty: nextQty,
          sub_total: scaleMoney(item.sub_total),
          item_sub_total: scaleMoney(item.item_sub_total),
          total: scaleMoney(item.total),
          item_total: scaleMoney(item.item_total),
          total_mrp: scaleMoney(item.total_mrp),
        };
      }
      return item;
    });

  // Total quantity across all line items (for "X Items in cart" and "Total (X items)")
  const totalItemQuantity = displayedItems.reduce(
    (sum: number, item: any) => sum + (Number(item.qty) || 1),
    0
  );
  const hasOutOfStockItem = displayedItems.some((item: any) => isCartItemOutOfStock(item));
  const hasLocationUnavailableItem = displayedItems.some((item: any) =>
    isCartItemLocationUnavailable(item)
  );
  const purchasableItems = displayedItems.filter((item: any) => isCartItemPurchasable(item));
  const hasPurchasableItems = purchasableItems.length > 0;

  const hasTransientZeroTotals =
    displayedItems.length > 0 &&
    rawSubTotal <= 0 &&
    rawTotalMrp <= 0 &&
    rawDiscount <= 0 &&
    rawTax <= 0 &&
    rawDelivery <= 0;
  const hasUsableStableTotals =
    !!lastStableTotalsRef.current &&
    (lastStableTotalsRef.current.subTotal > 0 ||
      lastStableTotalsRef.current.totalMrp > 0);
  const shouldHoldPreviousTotals = hasTransientZeroTotals && hasUsableStableTotals;

  const hasAuthorizedCoupon =
    Boolean(userCouponIntent) &&
    Boolean(activeCouponCode) &&
    userCouponIntent.toLowerCase() === activeCouponCode.toLowerCase();
  const couponDiscountForSummary = Math.max(0, rawDiscount);

  const subTotal = shouldHoldPreviousTotals
    ? lastStableTotalsRef.current!.subTotal
    : rawSubTotal;
  const discount = shouldHoldPreviousTotals
    ? Math.max(0, lastStableTotalsRef.current!.discount)
    : couponDiscountForSummary;
  const tax = shouldHoldPreviousTotals
    ? lastStableTotalsRef.current!.tax
    : rawTax;
  const delivery = shouldHoldPreviousTotals
    ? lastStableTotalsRef.current!.delivery
    : rawDelivery;
  const totalMrp = shouldHoldPreviousTotals
    ? lastStableTotalsRef.current!.totalMrp
    : rawTotalMrp;

  const computedTotalAmount =
    subTotal - discount + tax + delivery - promo - loyaltyPointsDiscount;

  const payableAmount = resolveCartPayableAmountRupees({
    cartData: cartData?.data as Record<string, unknown> | undefined,
    computedTotal: computedTotalAmount,
    subTotal,
    totalMrp,
  });

  const totalAmount = payableAmount;

  const viewCartFiredSignatureRef = useRef<string>("");
  useEffect(() => {
    if (!cartData?.data || items.length === 0) return;
    const signature = `${items.length}:${totalAmount}`;
    if (viewCartFiredSignatureRef.current === signature) return;
    viewCartFiredSignatureRef.current = signature;
    pushEvent("view_cart", {
      value: totalAmount,
      items: items.map((item: any) => buildGtmItem(item)),
    });
  }, [cartData?.data, items, totalAmount]);

  useEffect(() => {
    if (!cartData?.data) return;
    if (isQuantityUpdateInProgress) return;
    if (hasTransientZeroTotals) return;
    lastStableTotalsRef.current = {
      subTotal: rawSubTotal,
      discount: rawDiscount,
      tax: rawTax,
      delivery: rawDelivery,
      totalMrp: rawTotalMrp,
    };
  }, [
    cartData?.data,
    isQuantityUpdateInProgress,
    rawSubTotal,
    rawDiscount,
    rawTax,
    rawDelivery,
    rawTotalMrp,
    hasTransientZeroTotals,
  ]);

  // Auto-remove coupon when cart value drops below the coupon minimum.
  useEffect(() => {
    if (cartLoading || cartFetching || isApplyingCoupon || isQuantityUpdateInProgress) {
      return;
    }
    if (!cartData?.data) return;
    if (!hasAuthorizedCoupon) return;
    if (couponAutoRemoveInFlightRef.current) return;
    if (
      Date.now() - cartMutationSettledAtRef.current <
      COUPON_AUTO_REMOVE_GRACE_MS
    ) {
      return;
    }

    const previousSubTotal = couponSubtotalSnapshotRef.current;
    couponSubtotalSnapshotRef.current = rawSubTotal;

    const couponIsActive =
      Boolean(activeCouponCode) || Boolean(activeCoupon);

    if (
      !shouldAutoRemoveAppliedCoupon({
        couponIsActive,
        rawDiscount,
        rawSubTotal,
        couponMeta: appliedCouponMeta,
        previousSubTotal,
      })
    ) {
      if (rawDiscount > 0) {
        couponAutoRemoveFailedKeyRef.current = null;
      }
      return;
    }
    if (resolveCouponRemovalCartId(items, cartData?.data, activeCouponItem) == null) {
      return;
    }
    if (hasTransientZeroTotals && hasUsableStableTotals) return;

    const autoRemoveKey = `${activeCouponCode}:${rawSubTotal}:${rawDiscount}`;
    if (couponAutoRemoveFailedKeyRef.current === autoRemoveKey) return;

    couponAutoRemoveInFlightRef.current = true;
    void handleRemoveCoupon({
      silent: true,
      autoBelowMinimum: true,
    })
      .then((removed) => {
        if (!removed) {
          couponAutoRemoveFailedKeyRef.current = autoRemoveKey;
        } else {
          couponAutoRemoveFailedKeyRef.current = null;
        }
      })
      .finally(() => {
        couponAutoRemoveInFlightRef.current = false;
      });
  }, [
    cartLoading,
    cartFetching,
    isApplyingCoupon,
    isQuantityUpdateInProgress,
    cartData?.data,
    activeCouponCode,
    activeCoupon,
    displayCoupon?.code,
    rawDiscount,
    rawSubTotal,
    appliedCouponMeta,
    appliedCouponRemoveId,
    hasTransientZeroTotals,
    hasUsableStableTotals,
    hasAuthorizedCoupon,
  ]);

  const cartAuthSessionKey = cartCouponAuthScope;

  // Re-apply persisted coupon after login/logout or when guest cart merges to a user cart.
  useEffect(() => {
    if (cartLoading || cartFetching || isApplyingCoupon || isQuantityUpdateInProgress) {
      return;
    }
    if (!isReloadDetectionReady || !cartData?.data) return;
    if (items.length === 0) return;

    const intendedCode = readCartCouponUserIntent(
      deliveryChannelForApi,
      cartCouponAuthScope,
    );
    if (!intendedCode) return;

    if (activeCouponCode) {
      const codeMatches =
        activeCouponCode.toLowerCase() === intendedCode.toLowerCase();
      if (codeMatches) {
        if (!hasAppliedCouponInCurrentVisit || suppressCouponDisplayOnEntry) {
          setHasAppliedCouponInCurrentVisit(true);
          setSuppressCouponDisplayOnEntry(false);
          setLastAppliedCouponCode(activeCouponCode);
          setToStorage(persistedCouponKey, activeCouponCode);
        }
      }
      if (rawDiscount > 0 || codeMatches) {
        return;
      }
    }

    const attemptKey = `${cartAuthSessionKey}:${deliveryChannelForApi}:${intendedCode}`;
    if (couponRestoreAttemptKeyRef.current === attemptKey) return;
    if (couponRestoreInFlightRef.current) return;

    couponRestoreInFlightRef.current = true;
    couponRestoreAttemptKeyRef.current = attemptKey;

    void (async () => {
      try {
        const res = await applyCoupon({
          coupon_code: intendedCode,
          type: deliveryChannelForApi,
        }).unwrap();
        if (res?.statusCode === 200) {
          setLastAppliedCouponCode(intendedCode);
          setHasAppliedCouponInCurrentVisit(true);
          setSuppressCouponDisplayOnEntry(false);
          setToStorage(persistedCouponKey, intendedCode);
          await refetchCart();
          markCartMutationSettled();
        }
      } catch {
        // Keep persisted code; user can change coupon manually if restore fails.
      } finally {
        couponRestoreInFlightRef.current = false;
      }
    })();
  }, [
    cartLoading,
    cartFetching,
    isApplyingCoupon,
    isQuantityUpdateInProgress,
    isReloadDetectionReady,
    cartData?.data,
    items.length,
    lastAppliedCouponCode,
    persistedCouponKey,
    activeCouponCode,
    rawDiscount,
    cartAuthSessionKey,
    deliveryChannelForApi,
    hasAppliedCouponInCurrentVisit,
    suppressCouponDisplayOnEntry,
    applyCoupon,
    refetchCart,
    markCartMutationSettled,
  ]);

  // Remove coupons that exist on the server but were not applied by this user.
  useEffect(() => {
    if (
      cartLoading ||
      cartFetching ||
      isApplyingCoupon ||
      isQuantityUpdateInProgress ||
      couponOrphanRemoveInFlightRef.current
    ) {
      return;
    }
    if (!isReloadDetectionReady || !cartData?.data) return;
    if (!activeCouponCode && rawDiscount <= 0) return;

    const intentCode = readCartCouponUserIntent(
      deliveryChannelForApi,
      cartCouponAuthScope,
    );
    const hasValidIntent =
      Boolean(intentCode) &&
      Boolean(activeCouponCode) &&
      intentCode.toLowerCase() === activeCouponCode.toLowerCase();
    if (hasValidIntent) return;

    // Cart API already applied a coupon with discount — sync local intent instead of removing.
    if (activeCouponCode && rawDiscount > 0) {
      writeCartCouponUserIntent(
        deliveryChannelForApi,
        cartCouponAuthScope,
        activeCouponCode,
      );
      setLastAppliedCouponCode(activeCouponCode);
      setHasAppliedCouponInCurrentVisit(true);
      setSuppressCouponDisplayOnEntry(false);
      setToStorage(persistedCouponKey, activeCouponCode);
      return;
    }

    if (resolveCouponRemovalCartId(items, cartData?.data, activeCouponItem) == null) {
      return;
    }

    couponOrphanRemoveInFlightRef.current = true;
    void handleRemoveCoupon({ silent: true }).finally(() => {
      couponOrphanRemoveInFlightRef.current = false;
    });
  }, [
    cartLoading,
    cartFetching,
    isApplyingCoupon,
    isQuantityUpdateInProgress,
    isReloadDetectionReady,
    cartData?.data,
    activeCouponCode,
    rawDiscount,
    appliedCouponRemoveId,
    deliveryChannelForApi,
    cartCouponAuthScope,
  ]);

  // Line total for one cart item: prefer store/selling price × qty over stale MRP line totals.
  const getItemLineTotal = (item: any): number => {
    const qty = Number(item?.qty) || 1;
    const priceObj =
      item?.variation?.price ??
      item?.product?.price ??
      (typeof item?.price === "object" ? item.price : null);
    const storeUnit = Number(
      priceObj?.store_price ??
        priceObj?.selling_price ??
        priceObj?.final_price ??
        item?.store_price ??
        item?.selling_price ??
        (typeof item?.price === "number" || typeof item?.price === "string"
          ? item.price
          : undefined) ??
        item?.unit_price,
    );

    if (Number.isFinite(storeUnit) && storeUnit > 0) {
      return storeUnit * qty;
    }

    const lineTotal = Number(
      item?.sub_total ?? item?.item_sub_total ?? item?.total ?? item?.item_total,
    );
    if (Number.isFinite(lineTotal) && lineTotal > 0) return lineTotal;

    return (Number(item?.unit_price) || 0) * qty;
  };

  const handlePlaceOrder = async (method: string) => {
    if (!hasCustomerToken) {
      redirectGuestToLogin();
      return;
    }

    if (!ensureCompleteDeliveryAddress()) {
      return;
    }

    const isDirectOrder = method === "cod" || method === "wallet";
    setActivePaymentAction(method);
    if (isDirectOrder) {
      setIsDirectOrderProcessing(true);
    }

    // Prevent placing a new order when backend indicates an order is already in progress
    if (!canPlaceOrder) {
      if (isDirectOrder) {
        setIsDirectOrderProcessing(false);
      }
      setActivePaymentAction(null);
      toast.error("You can only place one order at a time.", {
        duration: 4000,
      });
      return;
    }

    try {
      // Get user ID from user object or storage
      const userDataFromStorage = getFromStorage(STORAGE_KEYS.credentials);
      let userId = "";

      if (user?.id) {
        userId = user.id.toString();
      } else if (user?._id) {
        userId = user._id.toString();
      } else if (userDataFromStorage) {
        try {
          const credentials = JSON.parse(userDataFromStorage);
          userId = credentials?.id || credentials?._id || credentials?.userId || "3";
        } catch (e) {
          userId = "3";
        }
      } else {
        userId = "3";
      }

      // Include purchasable paid items + eligible free gifts in placed order payload.
      // Free gifts were previously excluded by isCartItemPurchasable(), so they never reached orders.
      const cartIds = displayedItems
        .filter((item: any) => {
          const blocked = isCartItemOutOfStock(item) || isCartItemLocationUnavailable(item);
          return !blocked;
        })
        .map((item: any) => Number(item.id))
        .filter((id: number) => Number.isFinite(id));

      if (cartIds.length === 0) {
        if (isDirectOrder) {
          setIsDirectOrderProcessing(false);
        }
        setActivePaymentAction(null);
        toast.error("Your cart is empty");
        return;
      }

      const checkoutAddress = selectedAddressForOrder
        ? (mergeAddressPhoneMeta(
            selectedAddressForOrder as unknown as Record<string, unknown>,
          ) as unknown as Address)
        : null;

      const resolvedPhone = resolvePhoneFields(
        checkoutAddress?.phone ||
          user?.phoneNumber ||
          addressData.phone ||
          "",
        checkoutAddress?.phone_code ||
          user?.countryCode ||
          addressData.phone_code ||
          "91",
        checkoutAddress?.mobile || "",
      );
      const phone = resolvedPhone.phone;
      const phone_code = resolvedPhone.phone_code;
      console.log(
        selectedAddressForOrder,
        addressData.latitude,
        "selectedAddress?.latitude, addressData.latitude=====>",
      );
      const latitude = Number(
        selectedAddressForOrder?.latitude ?? addressData.latitude,
      );
      const longitude = Number(
        selectedAddressForOrder?.longitude ?? addressData.longitude,
      );

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        if (isDirectOrder) {
          setIsDirectOrderProcessing(false);
        }
        setActivePaymentAction(null);
        toast.error("Invalid delivery location. Please reselect your address.");
        return;
      }

      // Prepare order payload — send store/selling payable so Razorpay does not use MRP.
      const orderPayload = {
        latitude,
        phone_code: phone_code,
        phone: phone,
        address1: selectedAddressForOrder?.address1 || "",
        order_type: deliveryChannelForApi,
        cartIds: cartIds,
        longitude,
        userId: userId,
        landmark: selectedAddressForOrder?.landmark || "",
        address: selectedAddressForOrder?.address || addressData.address,
        name: selectedAddressForOrder?.name || addressData.name,
        address_type:
          selectedAddressForOrder?.address_type?.toLowerCase() || "home" || "office" || "others",
        payment_method: method,
        is_loyalty_redemption: checked,
        sub_total: subTotal,
        discount_amount: discount,
        tax_total: tax,
        delivery_charges: delivery,
        total_amount: payableAmount,
        payable_amount: payableAmount,
        grand_total: payableAmount,
        total: payableAmount,
        amount: payableAmount,
      };


      // Call the API
      pushEvent("payment_initiated", {
        payment_type: method,
        value: totalAmount,
        items: items.map((item: any) => buildGtmItem(item)),
      });
      const response = await placeOrder(orderPayload).unwrap();

      // Navigate to payment success on success
      if (response?.statusCode === 200 || response?.statusCode === 201) {
        // Extract order ID from response - check multiple possible locations
        const responseData = response as any;

        // Try to extract order ID from various possible locations
        const orderId = responseData?.data?.id ||
          responseData?.data?.order_id ||
          responseData?.data?.orderId ||
          responseData?.data?.order_number ||
          responseData?.data?.order?.id ||
          responseData?.data?.order?.order_id ||
          responseData?.data?.order?.orderId ||
          responseData?.data?.order?.order_number ||
          responseData?.data?.orderId ||
          responseData?.id ||
          responseData?.order_id ||
          responseData?.orderId ||
          responseData?.order_number ||
          responseData?.order?.id ||
          responseData?.order?.order_id ||
          responseData?.order?.orderId ||
          responseData?.order?.order_number ||
          null;

        // Store order ID in localStorage as fallback
        if (orderId) {
          localStorage.setItem("lastOrderId", orderId.toString());
        }

        // Navigate with order ID as query parameter
        if (orderId) {
          if (method === "cod" || method === "wallet") {
            // COD/Wallet - Navigate directly
            setIsDirectOrderProcessing(false);
            setActivePaymentAction(null);
            const url = `/cart/payment-success?orderId=${orderId}`;
            router.push(url);
          } else {
            // Online Payment (Net Banking / UPI) - Open Razorpay
            // place-order clears the cart server-side; keep a snapshot to restore on abort.
            const cartItemsSnapshotForRestore = displayedItems.filter(
              (item: any) =>
                !(
                  isCartItemOutOfStock(item) ||
                  isCartItemLocationUnavailable(item)
                ),
            );
            let paymentHandled = false;
            let cancellationInProgress = false;
            const tryCancelOnAbort = async () => {
              if (paymentHandled || cancellationInProgress) return;
              cancellationInProgress = true;
              try {
                const cancelled = await cancelCreatedOnlineOrder(responseData);
                // Restore cart so items remain until payment actually succeeds.
                await restoreCartItemsAfterPaymentAbort(
                  cartItemsSnapshotForRestore,
                );
                if (cancelled) {
                  toast.error(
                    "Payment cancelled. Order has been cancelled. Your cart has been restored.",
                  );
                } else {
                  toast.error(
                    "Payment cancelled. Your cart has been restored.",
                  );
                }
              } catch {
                try {
                  await restoreCartItemsAfterPaymentAbort(
                    cartItemsSnapshotForRestore,
                  );
                } catch {
                  // ignore restore failure; refetch still runs below
                }
                toast.error("Payment cancelled.");
              } finally {
                pushEvent("payment_failed", {
                  payment_type: method,
                  value: totalAmount,
                  failure_reason: "cancelled_by_user",
                });
                await safeRefetchCart();
                await refreshProfileForHeader();
              }
            };

            // Prefer the key_id returned by the backend (matches the order's account/mode),
            // otherwise fall back to the env-configured public key.
            const keyId =
              responseData?.data?.payment?.key_id ||
              responseData?.data?.key_id ||
              RAZORPAY_KEY_ID;

            const paymentData = responseData?.data?.payment || {};
            const razorpayPayableRupees = resolveOrderPaymentAmountRupees({
              payment: paymentData,
              order: responseData?.data,
              fallbackRupees: payableAmount,
              mrpRupees: totalMrp,
            });
            const backendOrderAmountRupees = normalizeAmountToRupees(
              paymentData?.amount,
              razorpayPayableRupees,
            );
            const razorpayOrderId = paymentData?.razorpay_order_id || "";
            const backendOrderLooksLikeMrp =
              totalMrp > 0 &&
              razorpayPayableRupees > 0 &&
              razorpayPayableRupees < totalMrp &&
              backendOrderAmountRupees != null &&
              Math.abs(backendOrderAmountRupees - totalMrp) <= 0.02;

            const options = {
              key: keyId,
              amount: toRazorpayAmountPaise(razorpayPayableRupees),
              currency: paymentData?.currency || "INR",
              name: "Womancart",
              description: "Order Payment",
              image: "/images/logo.png",
              ...(razorpayOrderId && !backendOrderLooksLikeMrp
                ? { order_id: razorpayOrderId }
                : {}),
              handler: async function (response: any) {
                paymentHandled = true;
                try {
                  // Verify payment with backend
                  const verifyResponse = await verifyPayment({
                    razorpay_order_id: response?.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }).unwrap();

                  if (verifyResponse?.success === true) {
                    // Payment verified successfully
                    toast.success("Payment verified successfully");
                    const url = `/cart/payment-success?orderId=${orderId}&paymentId=${response.razorpay_payment_id}`;
                    router.push(url);
                  } else {
                    // Payment verification failed
                    toast.error(verifyResponse?.message || "Payment verification failed");
                    pushEvent("payment_failed", {
                      payment_type: method,
                      value: totalAmount,
                      failure_reason: "verification_failed",
                    });
                  }
                } catch (error: any) {
                  // Handle verification error
                  toast.error(error?.data?.message || error?.message || "Payment verification failed. Please contact support.");
                  pushEvent("payment_failed", {
                    payment_type: method,
                    value: totalAmount,
                    failure_reason: "verification_error",
                  });
                  // Still navigate to success page but with error flag
                  // const url = `/cart/payment-success?orderId=${orderId}&paymentId=${response.razorpay_payment_id}&error=true`;
                  // router.push(url);
                }
              },
              onPaymentFailed: () => {
                void tryCancelOnAbort();
              },
              prefill: {
                name: (user as any)?.name || (user as any)?.full_name || addressData.name || "User",
                email: user?.email || "",
                contact: user?.phoneNumber || addressData.phone || "",
              },
              notes: {
                address: formatFullAddress(selectedAddressForOrder),
                orderId: orderId.toString()
              },
              theme: {
                color:
                  getComputedStyle(document.documentElement)
                    .getPropertyValue("--commerce-primary")
                    .trim() || "#E91E63",
              },
              modal: {
                ondismiss: () => {
                  void tryCancelOnAbort();
                },
              },
            };
            openPayment(options);
            setActivePaymentAction(null);
          }
        } else {
          router.push("/cart/payment-success");
        }
      } else {
        if (isDirectOrder) {
          setIsDirectOrderProcessing(false);
        }
        setActivePaymentAction(null);
        toast.error(response?.message || "Failed to place order");
        pushEvent("payment_failed", {
          payment_type: method,
          value: totalAmount,
          failure_reason: "order_placement_failed",
        });
      }
    } catch (error: any) {
      if (isDirectOrder) {
        setIsDirectOrderProcessing(false);
      }
      setActivePaymentAction(null);
      toast.error(error?.data?.message || error?.message || "Failed to place order. Please try again.");
      pushEvent("payment_failed", {
        payment_type: method,
        value: totalAmount,
        failure_reason: "order_placement_error",
      });
    }
  };

  // const handleMoveToWishlist = async (item: any) => {
  //   try {
  //     // Avoid duplicate clicks while already processing this item
  //     if (movingItemId === item.id) return;
  //     setMovingItemId(item.id);
  //     // Optimistically hide this item from the UI
  //     setRemovingIds((prev) =>
  //       prev.includes(item.id) ? prev : [...prev, item.id]
  //     );

  //     // Show immediate feedback
  //     const loadingToastId = toast.loading("Moving item to wishlist...");

  //     const product = item.product;
  //     const productId = product?.id || product?.product_id || item?.product_id;

  //     if (!productId) {
  //       toast.error("Invalid product ID");
  //       return;
  //     }

  //     const store_id = item.store_id || product?.store_id || 1;


  //     // Fire both calls in parallel
  //     const [wishlistRes, removeRes] = await Promise.allSettled([
  //       addWishlist({
  //         product_id: String(productId),
  //         store_id: store_id,
  //         is_wishlist: true,
  //         type: deliveryChannelForApi,
  //       }).unwrap(),
  //       removeFromCart({ cart_id: item.id }).unwrap(),
  //     ]);

  //     if (
  //       wishlistRes.status === "fulfilled" &&
  //       removeRes.status === "fulfilled"
  //     ) {
  //       toast.success("Moved to wishlist successfully", {
  //         id: loadingToastId,
  //       });
  //     } else {
  //       // Revert optimistic update on error
  //       setRemovingIds((prev) => prev.filter((id) => id !== item.id));
  //       const err =
  //         (wishlistRes.status === "rejected" && wishlistRes.reason) ||
  //         (removeRes.status === "rejected" && removeRes.reason);
  //       throw err;
  //     }
  //   } catch (error: any) {
  //     toast.error(
  //       error?.data?.message || error?.message || "Failed to move to wishlist"
  //     );
  //     // On error, ensure the item is visible again
  //     setRemovingIds((prev) => prev.filter((id) => id !== item.id));
  //   } finally {
  //     setMovingItemId(null);
  //   }
  // };

  const handleMoveToWishlist = async (item: any) => {
    let loadingToastId: string | number | undefined;
    try {
      // Avoid duplicate clicks while already processing this item
      if (movingItemId === item.id) return;
      setMovingItemId(item.id);
      // Optimistically hide this item from the UI
      setRemovingIds((prev) =>
        prev.includes(item.id) ? prev : [...prev, item.id]
      );

      // Show immediate feedback
      loadingToastId = toast.loading("Moving item to wishlist...");

      const product = item.product;

      // Prefer product_kit_id when present (offer kit), otherwise fallback to normal product id
      const productId =
        item?.product_kit_id ||
        product?.product_kit_id ||
        product?.id ||
        product?.product_id ||
        item?.product_id;


      if (!productId) {
        toast.error("Invalid product ID", loadingToastId ? { id: loadingToastId } : undefined);
        return;
      }

      // store_id removed/commented as it is no longer required in the application
      // const store_id = item.store_id || product?.store_id || 1;


      // Fire both calls in parallel
      const [wishlistRes, removeRes] = await Promise.allSettled([
        addWishlist({
          product_id: String(productId),
          // store_id removed/commented as it is no longer required in the application
          // store_id: store_id,
          is_wishlist: true,
          type: deliveryChannelForApi,
        }).unwrap(),
        removeFromCart({ cart_id: item.id, type: deliveryChannelForApi }).unwrap(),
      ]);

      if (
        wishlistRes.status === "fulfilled" &&
        removeRes.status === "fulfilled"
      ) {
        toast.success("Moved to wishlist successfully", {
          id: loadingToastId,
        });
        // Ensure cart (including free gifts) refreshes after primary item removal
        const refetchResult = await refetchCart();
        const nextCart = (refetchResult as any)?.data;
        const itemCount = (nextCart?.data?.items || []).length;
        if (itemCount === 0) {
          await refreshProfileForHeader();
        }
      } else {
        // Revert optimistic update on error
        setRemovingIds((prev) => prev.filter((id) => id !== item.id));
        const err =
          (wishlistRes.status === "rejected" && wishlistRes.reason) ||
          (removeRes.status === "rejected" && removeRes.reason);
        throw err;
      }
    } catch (error: any) {
      toast.error(
        error?.data?.message || error?.message || "Failed to move to wishlist",
        loadingToastId ? { id: loadingToastId.toString() } : undefined as any
      );
      // On error, ensure the item is visible again
      setRemovingIds((prev) => prev.filter((id) => id !== item.id));
    } finally {
      setMovingItemId(null);
      if (loadingToastId) {
        toast.dismiss(loadingToastId.toString() as any);
      }
    }
  };

  const handleAddFreeGift = async (promotion: any, reward: any) => {
    try {
      if (!promotion?.is_unlocked) {
        toast.error(
          promotion?.message ||
          "Add more items to your cart to unlock this free gift."
        );
        return;
      }

      if (reward?.is_added) {
        // Already the selected free item; no-op (or could show "Already selected")
        return;
      }

      const product = reward?.product;
      if (!product) {
        toast.error("Free gift product details not available.");
        return;
      }

      const qty = Number(reward?.quantity || 1);
      // store_id removed/commented as it is no longer required in the application
      // const storeId = product.store_id || 1;
      const variationId = product.variation_id || null;
      const productId = product.product_id || reward.rewardable_id;

      if (!productId) {
        toast.error("Unable to add free gift. Missing product ID.");
        return;
      }

      // Only one free item at checkout: remove any existing free gift(s) then add this one
      const freeGiftCartItems = (cartData?.data?.items || []).filter(
        (it: any) => it?.is_free_gift === true || it?.is_free_gift === 1
      );
      for (const freeItem of freeGiftCartItems) {
        if (freeItem?.id) {
          try {
            await removeFromCart({ cart_id: freeItem.id, type: deliveryChannelForApi }).unwrap();
          } catch {
            // continue to add new one
          }
        }
      }

      const payload: any = {
        product_id: productId,
        variation_id: variationId,
        qty,
        // store_id removed/commented as it is no longer required in the application
        // store_id: storeId,
        channel: deliveryChannelForApi,
        is_free_gift: true,
      };

      const res = await addToCart(payload).unwrap();
      if (res?.statusCode === 200 || res?.statusCode === 201) {
        toast.success("Free gift added to cart");
        await refetchCart();
      } else {
        toast.error(res?.message || "Failed to add free gift");
      }
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
        error?.message ||
        "Failed to add free gift"
      );
    }
  };


  if (cartLoading || !cartData?.data) {
    return (
      <section className="u_spc mycrt_sc">
        <div className="container">
          <BredCrum items={breadcrumbItems} />
          <p className="cart_loading_text">Loading cart details...</p>
          <div className="cart_skeleton">
            <div className="cart_skeleton_lt">
              {/* Delivery Address Skeleton */}
              <div className="skeleton_shimmer skeleton_address_card" />

              {/* Order Review Skeleton */}
              <div className="ordr_rvw mt_20">
                <div className="skeleton_order_review_header">
                  <div className="skeleton_shimmer" />
                  <div className="skeleton_shimmer" />
                </div>

                <ul className="ordr_rvw_lst hd_5 mt_30">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <li key={index} className="skeleton_cart_item">
                      <div className="skeleton_shimmer skeleton_item_image" />
                      <div className="skeleton_item_content">
                        <div className="skeleton_shimmer" />
                        <div className="skeleton_shimmer" />
                        <div className="skeleton_shimmer" />
                      </div>
                      <div className="skeleton_item_price">
                        <div className="skeleton_shimmer" />
                        <div className="skeleton_shimmer" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Promo Code Skeleton */}
              <div className="skeleton_shimmer skeleton_promo_card" />
            </div>

            <div className="cart_skeleton_rt">
              {/* Free Shipping Banner Skeleton */}
              <div className="skeleton_shimmer skeleton_shipping_banner" />

              {/* Billing Summary Skeleton */}
              <div className="skeleton_billing_summary">
                <div className="skeleton_shimmer skeleton_billing_header" />
                <div className="blng_smmry mt_20">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className={`skeleton_billing_item ${index === 4 ? "skeleton_total" : ""
                        }`}
                    >
                      <div className="skeleton_shimmer" />
                      <div className="skeleton_shimmer" />
                    </div>
                  ))}
                </div>
                <div className="skeleton_shimmer skeleton_checkout_button" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {isDirectOrderProcessing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255, 255, 255, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "12px",
            zIndex: 2000,
          }}
        >
          <CircularProgress size={36} />
          <p className="cart_loading_text">Placing your order...</p>
        </div>
      )}
      <section className="u_spc mycrt_sc">
        <div className="container">
          <BredCrum items={breadcrumbItems} />
          <div className="mycrt_mn">
            <div className="mycrt_lt">
                            {displayedItems.length > 0 && (
                <div className="sphng_dtls mt_20">
                  {hasCustomerToken ? (
                    <div className="sphng_dtls_mn">
                      <div className="sphng_dtls_inr hd_5">
                        <figure>
                          <img src="/images/package_box.png" alt="" />
                        </figure>
                        <div className="sphng_dtls_cntnt">
                          <h3>Delivery Address</h3>
                          {cartDeliveryAddress?.name ? (
                            <p>{cartDeliveryAddress.name}</p>
                          ) : null}
                          {formatPhoneNumber(cartDeliveryAddress) ? (
                            <p>{formatPhoneNumber(cartDeliveryAddress)}</p>
                          ) : null}
                          <p>
                            {cartDeliveryAddress
                              ? formatAddressLines(cartDeliveryAddress)
                              : "No delivery address selected"}
                          </p>
                          {shouldShowExpectedDeliveryDate && (
                            <p>Arrives in {expectedDeliveryDate}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cart_address_link"
                        onClick={handleOpenDeliveryAddress}
                      >
                        {isAddressCompleteForOrder(cartDeliveryAddress)
                          ? "Change"
                          : "Add Address"}
                      </button>
                    </div>
                  ) : (
                    <div className="cart_guest_address">
                      <div className="cart_guest_address_copy">
                        <h3>Delivery Address</h3>
                        <p>
                          Please log in to add or select a delivery address.
                        </p>
                      </div>
                      <Button
                        variant="contained"
                        className="cart_guest_login"
                        onClick={redirectGuestToLogin}
                      >
                        Login
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!showPayment ? (
                <>
                  <div className="ordr_rvw mt_20">
                    <div className="ordr_rvw_inr hd_4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Order Review</h3>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ marginBottom: "5px" }}>{totalItemQuantity} Items in cart</p>
                        {displayedItems.length > 0 && (
                          <a
                            onClick={handleClearCart}
                            style={{
                              color: "var(--commerce-primary, #d91b76)",
                              cursor: "pointer",
                              fontSize: "14px",
                              textDecoration: "underline"
                            }}
                          >
                            Clear cart
                          </a>
                        )}
                      </div>
                    </div>

                    {displayedItems.length === 0 ? (
                      <div className="empty_cart_order_review" style={{ textAlign: "center", padding: "40px 20px" }}>
                        <p style={{ color: "#666", fontSize: "16px" }}>Your cart is empty</p>
                        <p style={{ color: "#999", fontSize: "14px", marginTop: "10px" }}>
                          Add items to your cart to continue shopping
                        </p>
                      </div>
                    ) : (
                      <ul className="ordr_rvw_lst hd_5 mt_30">
                        {displayedItems.map((item: any) => {
                          const product = item.product;
                          const variation = item.variation;
                          const isFreeItem =
                            item?.is_free_gift === true ||
                            item?.is_free_gift === 1;
                          const isLocationUnavailable =
                            !isFreeItem && isCartItemLocationUnavailable(item);



                          const productIdForDetail =
                            product?.product_id || product?.id || item?.product_id;
                          const cartVariantLabel = getCartVariantLabel(
                            variation,
                            product?.product_name || item?.kit_name,
                          );

                          const handleGoToProductDetail = () => {
                            if (isLocationUnavailable) return;
                            if (!productIdForDetail) return;
                            const variantUrlSlug = getVariantUrlSlug(variation);
                            const productSlug =
                              variantUrlSlug ||
                              product?.slug ||
                              product?.product_name ||
                              "";
                            router.push(
                              buildProductUrl(
                                productSlug,
                                { product_id: productIdForDetail },
                                { usePathSlugAsIs: Boolean(variantUrlSlug) },
                              ),
                            );
                          };

                          return (
                            <li
                              key={item?.id}
                              style={{
                                opacity: isLocationUnavailable ? 0.5 : 1,
                              }}
                            >
                              <figure
                                style={{ cursor: !isLocationUnavailable && productIdForDetail ? "pointer" : "default" }}
                                onClick={handleGoToProductDetail}
                              >
                                <img
                                  src={
                                    product?.image ||
                                    item?.kit_image ||
                                    "/images/product_img2.jpg"
                                  }
                                  alt={product?.product_name || item?.kit_name}
                                />
                              </figure>

                              <div className="ordr_rvw_cntn">
                                <h3
                                  style={{
                                    cursor: !isLocationUnavailable && productIdForDetail ? "pointer" : "default",
                                  }}
                                  onClick={handleGoToProductDetail}
                                >
                                  {product?.product_name || item?.kit_name}
                                </h3>

                                {cartVariantLabel && (
                                  <h4>
                                    Variant:
                                    <span>{cartVariantLabel}</span>
                                  </h4>
                                )}
                                {isLocationUnavailable && (
                                  <p
                                    style={{
                                      marginTop: "8px",
                                      color: "var(--commerce-primary)",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Item not available at selected address
                                  </p>
                                )}

                                {!isFreeItem && (
                                  <div style={{ display: "flex", gap: "15px", alignItems: "center", marginTop: "10px" }}>
                                    <a
                                      onClick={() => {
                                        if (!movingItemId && !isLocationUnavailable) handleMoveToWishlist(item);
                                      }}
                                      style={{
                                        cursor:
                                          movingItemId === item.id || isLocationUnavailable
                                            ? "default"
                                            : "pointer",
                                        textDecoration: "underline",
                                        opacity: movingItemId === item.id || isLocationUnavailable ? 0.6 : 1,
                                        pointerEvents:
                                          movingItemId === item.id || isLocationUnavailable ? "none" : "auto",
                                        fontSize: "14px"
                                      }}
                                    >
                                      {movingItemId === item.id
                                        ? "Moving..."
                                        : "Move to wishlist"}
                                    </a>
                                    <a
                                      onClick={() => handleDeleteItem(item)}
                                      style={{
                                        cursor: removingIds.includes(item.id) ? "default" : "pointer",
                                        opacity: removingIds.includes(item.id) ? 0.6 : 1,
                                        pointerEvents: removingIds.includes(item.id) ? "none" : "auto",
                                        color: "var(--commerce-primary, #E91E63)",
                                        display: "flex",
                                        alignItems: "center"
                                      }}
                                    >
                                      <DeleteOutlineIcon fontSize="small" />
                                    </a>
                                  </div>
                                )}
                              </div>

                              <div
                                className="quntiti_slctr"
                                style={{ position: "relative" }}
                              >
                                {!isFreeItem && updatingItemId === item.id && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "50%",
                                      left: "50%",
                                      transform: "translate(-50%, -50%)",
                                      zIndex: 10,
                                      pointerEvents: "none",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <CircularProgress
                                      size={24}
                                      sx={{
                                        color:
                                          "var(--commerce-primary, #d91b76)",
                                      }}
                                    />
                                  </div>
                                )}

                                {!isFreeItem && (() => {
                                  const stockCap = getCartItemMaxSelectableQty(item);
                                  const rawQty = Math.max(1, Number(item.qty) || 1);
                                  const current = Math.min(rawQty, stockCap);
                                  if (stockCap <= 0) {
                                    return (
                                      <div
                                        style={{
                                          fontSize: "12px",
                                          fontWeight: 600,
                                          color: "var(--commerce-primary)",
                                        }}
                                      >
                                        Out of stock
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      className="quantity-dropdown form"
                                      style={{
                                        position: "relative",
                                        zIndex: 1,
                                        opacity: updatingItemId === item.id ? 0.5 : 1,
                                      }}
                                    >
                                      <Select
                                        value={current}
                                        onChange={(e) => {
                                          const newQty = Number(e.target.value);
                                          if (newQty !== current) {
                                            handleUpdateQuantity(item, newQty);
                                          }
                                        }}
                                        disabled={
                                          updatingItemId === item.id ||
                                          isUpdatingQuantity ||
                                          isLocationUnavailable
                                        }
                                        MenuProps={{
                                          PaperProps: {
                                            style: {
                                              maxHeight: 300,
                                            },
                                          },
                                        }}
                                      >
                                        {Array.from(
                                          { length: stockCap },
                                          (_, i) => i + 1,
                                        ).map((q) => (
                                          <MenuItem key={q} value={q}>
                                            {q}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </div>
                                  );
                                })()}
                                <p
                                  style={{
                                    position: "relative",
                                    zIndex: 1,
                                    opacity: updatingItemId === item.id ? 0.5 : 1,
                                    marginTop: isFreeItem ? 0 : "8px",
                                  }}
                                >
                                  {isFreeItem ? (
                                    <span
                                      style={{
                                        color: "#05944F",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Free
                                    </span>
                                  ) : (
                                    <>
                                      ₹
                                      {formatPriceInr(getItemLineTotal(item))}
                                      <br />
                                      {showMrpAsCutPrice(
                                        item?.total_mrp,
                                        getItemLineTotal(item),
                                      ) && (
                                        <del>
                                          ₹{formatPriceInr(item?.total_mrp)}
                                        </del>
                                      )}
                                    </>
                                  )}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {freeGifts.length > 0 && (
                    <div className="free_gifts_section mt_20">
                      <h3 className="fw_semi_bold">Extra rewards for you</h3>
                      {freeGifts.map((gift: any) => {
                        const isUnlocked = !!gift?.is_unlocked;
                        const rewardsWithProducts = Array.isArray(gift?.rewards)
                          ? gift.rewards
                          : [];

                        return (
                          <div
                            key={gift.promotion_id}
                            className="free_gift_box"
                            style={{
                              border: "1px solid #eee",
                              borderRadius: "12px",
                              padding: "16px",
                              marginTop: "12px",
                              background: "#fff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "8px",
                              }}
                            >
                              <div>
                                <p
                                  style={{
                                    margin: 0,
                                    fontWeight: 600,
                                    fontSize: "14px",
                                  }}
                                >
                                  {gift.name || "Free gift"}
                                </p>
                                {gift?.message && (
                                  <p
                                    style={{
                                      margin: "4px 0 0",
                                      fontSize: "12px",
                                      color: "#666",
                                    }}
                                  >
                                    {gift.message}
                                  </p>
                                )}
                              </div>
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  backgroundColor: isUnlocked
                                    ? "rgba(5, 148, 79, 0.08)"
                                    : "rgba(255, 152, 0, 0.08)",
                                  color: isUnlocked ? "#05944F" : "#FF9800",
                                }}
                              >
                                {isUnlocked ? "Deal unlocked!" : "Deal not unlocked"}
                              </span>
                            </div>

                            <div
                              className="free_gift_products"
                              style={
                                rewardsWithProducts.length
                                  ? {
                                    display: "flex",
                                    gap: "12px",
                                    overflowX: "auto",
                                    paddingTop: "8px",
                                  }
                                  : { paddingTop: 0 }
                              }
                            >
                              {rewardsWithProducts.length > 0 &&
                                rewardsWithProducts
                                  .filter((rw: any) => rw.product != null)
                                  .map((rw: any) => {
                                    const prod = rw.product || {};
                                    const alreadyAdded = !!rw.is_added;
                                    const disableAddButton =
                                      !isUnlocked || alreadyAdded;
                                    return (
                                      <div
                                        key={rw.id}
                                        className="free_gift_product_card"
                                        style={{
                                          minWidth: "140px",
                                          maxWidth: "160px",
                                          border: "1px solid #f3f3f3",
                                          borderRadius: "10px",
                                          padding: "10px",
                                          display: "flex",
                                          flexDirection: "column",
                                          minHeight: "200px",
                                        }}
                                      >
                                        <figure
                                          style={{
                                            width: "100%",
                                            height: "80px",
                                            margin: 0,
                                            marginBottom: "8px",
                                            flexShrink: 0,
                                          }}
                                        >
                                          <img
                                            src={
                                              prod?.image || "/images/product_img2.jpg"
                                            }
                                            alt={prod?.product_name || "Free gift"}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                              borderRadius: "8px",
                                            }}
                                          />
                                        </figure>
                                        <h4
                                          style={{
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            margin: "0 0 4px",
                                            minHeight: "32px",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {prod?.product_name ||
                                            prod?.name ||
                                            "Free product"}
                                        </h4>
                                        {prod?.price ? (
                                          <p
                                            style={{
                                              margin: "0 0 6px",
                                              fontSize: "12px",
                                              color: "#333",
                                              flexShrink: 0,
                                            }}
                                          >
                                            ₹{" "}
                                            {formatPriceInr(
                                              prod.price.store_price ||
                                              prod.price.mrp ||
                                              0
                                            )}
                                          </p>
                                        ) : (
                                          <div style={{ marginBottom: "6px", flexShrink: 0 }} />
                                        )}
                                        <Button
                                          variant="outlined"
                                          size="small"
                                          disabled={disableAddButton}
                                          onClick={() =>
                                            handleAddFreeGift(gift, rw)
                                          }
                                          sx={{
                                            width: "100%",
                                            marginTop: "auto",
                                            flexShrink: 0,
                                            textTransform: "none",
                                            borderRadius: "999px",
                                            fontSize: "12px",
                                            padding: "4px 0",
                                            borderColor:
                                              "var(--commerce-primary, #E91E63)",
                                            color:
                                              "var(--commerce-primary, #E91E63)",
                                            "&.Mui-disabled": {
                                              borderColor: "#bdbdbd !important",
                                              color: "#757575 !important",
                                              backgroundColor: "#f5f5f5 !important",
                                            },
                                          }}
                                        >
                                          {alreadyAdded ? "Added" : "Add"}
                                        </Button>
                                      </div>
                                    );
                                  })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="ordr_rvw mt_20">
                    <div className="ordr_rvw_inr hd_4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Order Review</h3>
                      {/* <div style={{ textAlign: "right" }}>
                        <p style={{ marginBottom: "5px" }}>{totalItemQuantity} Items in cart</p>
                        {displayedItems.length > 0 && (
                          <a
                            onClick={handleClearCart}
                            style={{
                              color: "var(--commerce-primary, #d91b76)",
                              cursor: "pointer",
                              fontSize: "14px",
                              textDecoration: "underline"
                            }}
                          >
                            Clear cart
                          </a>
                        )}
                      </div> */}
                    </div>
                    {displayedItems.length === 0 ? (
                      <div className="empty_cart_order_review" style={{ textAlign: "center", padding: "40px 20px" }}>
                        <p style={{ color: "#666", fontSize: "16px" }}>Your cart is empty</p>
                        <p style={{ color: "#999", fontSize: "14px", marginTop: "10px" }}>
                          Add items to your cart to continue shopping
                        </p>
                      </div>
                    ) : (
                      <ul className="ordr_rvw_lst hd_5 mt_30">
                        {displayedItems.map((item: any) => {
                          const product = item.product;
                          const variation = item.variation;
                          const productIdForDetail =
                            product?.product_id || product?.id || item?.product_id;
                          const cartVariantLabel = getCartVariantLabel(
                            variation,
                            product?.product_name || item?.kit_name,
                          );
                          const isFreeItem =
                            item?.is_free_gift === true ||
                            item?.is_free_gift === 1;
                          const isLocationUnavailable =
                            !isFreeItem && isCartItemLocationUnavailable(item);

                          const handleGoToProductDetail = () => {
                            if (isLocationUnavailable) return;
                            if (!productIdForDetail) return;
                            const variantUrlSlug = getVariantUrlSlug(variation);
                            const productSlug =
                              variantUrlSlug ||
                              product?.slug ||
                              product?.product_name ||
                              "";
                            router.push(
                              buildProductUrl(
                                productSlug,
                                { product_id: productIdForDetail },
                                { usePathSlugAsIs: Boolean(variantUrlSlug) },
                              ),
                            );
                          };

                          return (
                            <li
                              key={item.id}
                              style={{
                                opacity: isLocationUnavailable ? 0.5 : 1,
                              }}
                            >
                              <figure
                                style={{
                                  cursor: !isLocationUnavailable && productIdForDetail ? "pointer" : "default",
                                }}
                                onClick={handleGoToProductDetail}
                              >
                                <img
                                  src={
                                    product?.image ||
                                    item?.kit_image ||
                                    "/images/product_img2.jpg"
                                  }
                                  alt={product?.product_name || item?.kit_name}
                                />
                              </figure>
                              <div className="ordr_rvw_cntn">
                                <h3
                                  style={{
                                    cursor: !isLocationUnavailable && productIdForDetail ? "pointer" : "default",
                                  }}
                                  onClick={handleGoToProductDetail}
                                >
                                  {product?.product_name || item?.kit_name}
                                </h3>
                                {cartVariantLabel && (
                                  <h4>
                                    Variant:
                                    <span>{cartVariantLabel}</span>
                                  </h4>
                                )}
                                {isLocationUnavailable && (
                                  <p
                                    style={{
                                      marginTop: "8px",
                                      color: "var(--commerce-primary)",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Item not available at selected address
                                  </p>
                                )}
                              </div>
                              <div className="quntiti_slctr">
                                {!isFreeItem && (
                                  <p style={{ marginBottom: "8px" }}>Qty: {item.qty}</p>
                                )}
                                <p style={{ marginTop: isFreeItem ? 0 : "8px" }}>
                                  {isFreeItem ? (
                                    <span
                                      style={{
                                        color: "#05944F",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Free
                                    </span>
                                  ) : (
                                    <>
                                      ₹{formatPriceInr(getItemLineTotal(item))}
                                      <br />
                                      {showMrpAsCutPrice(
                                        item?.total_mrp,
                                        getItemLineTotal(item),
                                      ) && (
                                        <del>₹{formatPriceInr(item?.total_mrp)}</del>
                                      )}
                                    </>
                                  )}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="mycrt_rt hd_5 mt_20">
              {displayedItems.length === 0 ? (
                <>
                  <div className="empty_cart_message" style={{ textAlign: "center", padding: "40px 20px" }}>
                    <img
                      src="/images/empty-cart.svg"
                      alt="Empty Cart"
                      style={{ maxWidth: "200px", margin: "0 auto 20px", display: "block" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <h3 className="fw_semi_bold" style={{ marginBottom: "10px" }}>Your cart is empty</h3>
                    <p style={{ color: "#666", marginBottom: "30px" }}>
                      Looks like you haven't added anything to your cart yet.
                    </p>
                    <Button
                      className="chkot_btn w_100 br_15"
                      onClick={() => router.push("/")}
                      sx={{
                        backgroundColor: "var(--commerce-primary)",
                        color: "#fff",
                        "&:hover": {
                          backgroundColor: "var(--commerce-primary-hover)",
                        },
                      }}
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </>
              ) : !showPayment ? (
                <>
                  {/* <div className="free-shipping-banner mb_30">
                    <figure>
                      <img src="/images/offer_icon.svg" alt="Icon" />
                    </figure>
                    <div className="text">
                      <strong>Free Shipping</strong>
                      <span>You're ₹101.00 away from free shipping</span>
                    </div>
                  </div> */}

                  <div
                    className="promo_cd mb_20 hd_5"
                    onClick={() => setOpen2(true)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <h3>Promo Code</h3>
                      {visibleDisplayCouponWithPromotion &&
                        (visibleDisplayCouponWithPromotion as any)?.promotion?.end_date && (
                          <span
                            style={{
                              background: "#D3D3D3",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              color: "#333",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Valid Until{" "}
                            {formatDate(
                              (visibleDisplayCouponWithPromotion as any).promotion.end_date
                            )}
                          </span>
                        )}
                    </div>
                    <div className="promo_cd_inr mt_20">
                      {visibleDisplayCouponWithPromotion ? (
                        <>
                          <figure>
                            <span
                              className="icon_theme_primary"
                              style={{
                                WebkitMaskImage: "url(/images/discount.png)",
                                maskImage: "url(/images/discount.png)",
                                ["--icon-size" as string]: "32px",
                              }}
                              aria-hidden
                            />
                            <figcaption>
                              <strong className="promo_hd">
                                {visibleDisplayCouponWithPromotion.code}
                              </strong>
                              {appliedCouponSubtitle ? (
                                <span className="promo_cd_sub">
                                  {appliedCouponSubtitle}
                                </span>
                              ) : null}
                            </figcaption>
                          </figure>
                          <div style={{ marginLeft: "auto" }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCoupon();
                              }}
                              sx={{
                                fontSize: "14px",
                                color: "var(--commerce-primary)",
                                borderColor: "var(--commerce-primary)",
                                textTransform: "none",
                                borderRadius: "8px",
                                padding: "4px 12px",
                                minWidth: "auto",
                                "&:hover": {
                                  borderColor: "var(--commerce-primary)",
                                  backgroundColor: "var(--commerce-primary-light)",
                                },
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <figure>
                            <span
                              className="icon_theme_primary"
                              style={{
                                WebkitMaskImage: "url(/images/discount.png)",
                                maskImage: "url(/images/discount.png)",
                                ["--icon-size" as string]: "32px",
                              }}
                              aria-hidden
                            />
                            <figcaption>Check for available promos</figcaption>
                          </figure>
                          <img
                            className="arrow_img"
                            src="/images/arrow-right.png"
                            alt="icon"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <h3 className="fw_semi_bold">Billing Summary</h3>
                  <div className="blsmry_dlts">
                    <ul className="blng_smmry mt_20">
                      <li>
                        <span>Total MRP ({totalItemQuantity} item{totalItemQuantity !== 1 ? "s" : ""})</span>
                        <strong>
                          ₹ {formatPriceInr(totalMrp)}
                        </strong>
                      </li>
                      <li>
                        <span>Subtotal ({totalItemQuantity} item{totalItemQuantity !== 1 ? "s" : ""})</span>
                        <strong>
                          ₹ {formatPriceInr(subTotal)}
                        </strong>
                      </li>
                      <li>
                        <span>Coupon Discount</span>
                        <strong>
                          -₹{" "}
                          {formatPriceInr(discount)}
                        </strong>
                      </li>
                      <li>
                        <span>Shipping</span>
                        <strong>
                          {formatPriceInr(delivery)}
                        </strong>
                      </li>
                      {/* {checked && loyaltyPointsDiscount > 0 && (
                        <li>
                          <span>Loyalty Points</span>
                          <strong>
                            -₹ {formatPriceInr(loyaltyPointsDiscount)}
                          </strong>
                        </li>
                      )} */}
                      <li className="total">
                        <span>Total Amount</span>
                        <strong>₹ {formatPriceInr(totalAmount)}</strong>
                      </li>
                    </ul>
                    <Button
                      className="chkot_btn w_100 br_15"
                      onClick={() => {
                        if (!hasPurchasableItems) {
                          toast.error("No purchasable items found in cart");
                          return;
                        }
                        if (!hasCustomerToken) {
                          redirectGuestToLogin();
                          return;
                        }
                        if (!ensureCompleteDeliveryAddress()) {
                          return;
                        }
                        // Ensure cart is up to date before proceeding
                        refetchCart();
                        pushEvent("begin_checkout", {
                          value: totalAmount,
                          items: items.map((item: any) => buildGtmItem(item)),
                        });
                        pushEvent("add_shipping_info", {
                          value: totalAmount,
                          shipping_tier: selectedAddressForOrder?.address_type,
                          items: items.map((item: any) => buildGtmItem(item)),
                        });
                         setShowPayment(true);
                        window.scrollTo({
                          top: 0,
                          left: 0,
                          behavior: "auto",
                        });
                      }}
                      disabled={
                        updatingItemId !== null ||
                        isUpdatingQuantity ||
                        !hasPurchasableItems
                      }
                    >
                      {!hasPurchasableItems
                        ? hasOutOfStockItem
                          ? "Out of stock"
                          : hasLocationUnavailableItem
                            ? "Unavailable at selected address"
                            : "No items available"
                        : "Continue to Checkout"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="promo_cd mb_20 hd_5"
                    onClick={() => setOpen2(true)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <h3>Promo Code</h3>
                      {visibleDisplayCouponWithPromotion &&
                        (visibleDisplayCouponWithPromotion as any)?.promotion?.end_date && (
                          <span
                            style={{
                              background: "#D3D3D3",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              color: "#333",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Valid Until{" "}
                            {formatDate(
                              (visibleDisplayCouponWithPromotion as any).promotion.end_date
                            )}
                          </span>
                        )}
                    </div>
                    <div className="promo_cd_inr mt_20">
                      {visibleDisplayCouponWithPromotion ? (
                        <>
                          <figure>
                            <span
                              className="icon_theme_primary"
                              style={{
                                WebkitMaskImage: "url(/images/discount.png)",
                                maskImage: "url(/images/discount.png)",
                                ["--icon-size" as string]: "32px",
                              }}
                              aria-hidden
                            />
                            <figcaption>
                              <strong className="promo_hd">
                                {visibleDisplayCouponWithPromotion.code}
                              </strong>
                              {appliedCouponSubtitle ? (
                                <span className="promo_cd_sub">
                                  {appliedCouponSubtitle}
                                </span>
                              ) : null}
                            </figcaption>
                          </figure>
                          <div style={{ marginLeft: "auto" }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCoupon();
                              }}
                              sx={{
                                color: "var(--commerce-primary)",
                                borderColor: "var(--commerce-primary)",
                                textTransform: "none",
                                borderRadius: "8px",
                                padding: "4px 12px",
                                minWidth: "auto",
                                "&:hover": {
                                  borderColor: "#D81B60",
                                  backgroundColor: "rgba(233, 30, 99, 0.04)",
                                },
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <figure>
                            <span
                              className="icon_theme_primary"
                              style={{
                                WebkitMaskImage: "url(/images/discount.png)",
                                maskImage: "url(/images/discount.png)",
                                ["--icon-size" as string]: "32px",
                              }}
                              aria-hidden
                            />
                            <figcaption>Check for available promos</figcaption>
                          </figure>
                          <img
                            className="arrow_img"
                            src="/images/arrow-right.png"
                            alt="icon"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <h3 className="fw_semi_bold">Billing Summary</h3>
                  <div className="pymts_dtls">
                    <ul className="blng_smmry mt_20">
                      <li>
                        <span>Total MRP ({totalItemQuantity} item{totalItemQuantity !== 1 ? "s" : ""})</span>
                        <strong>
                          ₹ {formatPriceInr(totalMrp)}
                        </strong>
                      </li>
                      <li>
                        <span>Subtotal ({totalItemQuantity} item{totalItemQuantity !== 1 ? "s" : ""})</span>
                        <strong>₹ {formatPriceInr(subTotal)}</strong>
                      </li>
                      <li>
                        <span>Coupon Discount</span>
                        <strong>
                          -₹{" "}
                          {formatPriceInr(discount)}
                        </strong>
                      </li>
                      <li>
                        <span>Shipping</span>
                        <strong>₹ {formatPriceInr(delivery)}</strong>
                      </li>
                      <li className="total">
                        <span>Total Amount</span>
                        <strong>₹ {formatPriceInr(totalAmount)}</strong>
                      </li>
                    </ul>
                    <div className="hd_5 pymnts_optn ut_spc">
                      <h3>Payment Options</h3>

                      <div className="pymnts_optn_lst">
                        {[
                          {
                            method: "online",
                            label: "Pay Online",
                            icon: "/images/net_banking.svg",
                            sublabel: `Proceed to Pay ₹ ${formatPriceInr(totalAmount)}`,
                            amt_limit: 0
                          },
                          {
                            method: "cod",
                            label: "Pay on Delivery",
                            icon: "/images/cash_delivery.svg",
                            sublabel: "Pay when your order arrives",
                            amt_limit: 200
                          },
                          {
                            method: "wallet",
                            label: "Wallet",
                            icon: "/images/wallet.png",
                            sublabel: "Pay using your wallet balance",
                            amt_limit: 0
                          },
                        ].map((option) => {
                          const isBusy =
                            isPaymentActionBusy && activePaymentAction === option.method;
                          return (
                            <Box
                                key={option.method}
                                component="button"
                                type="button"
                                className="pymnts_optn_bx pymnts_optn_btn"
                                disabled={
                                  isPaymentActionBusy ||
                                  (option.method === "cod" &&
                                    option.amt_limit !== 0 &&
                                    totalAmount < option.amt_limit)
                                }
                                onClick={() => {
                                  // Don't allow COD when minimum amount isn't reached
                                  if (
                                    option.method === "cod" &&
                                    option.amt_limit !== 0 &&
                                    totalAmount < option.amt_limit
                                  ) {
                                    return;
                                  }

                                  pushEvent("payment_method_select", {
                                    payment_type: option.method,
                                    value: totalAmount,
                                  });

                                  pushEvent("add_payment_info", {
                                    payment_type: option.method,
                                    value: totalAmount,
                                    items: items.map((item: any) => buildGtmItem(item)),
                                  });

                                  void handlePlaceOrder(option.method);
                                }}
                                sx={{
                                  width: "100%",
                                  border: "none",
                                  cursor:
                                    isPaymentActionBusy ||
                                    (option.method === "cod" &&
                                      option.amt_limit !== 0 &&
                                      totalAmount < option.amt_limit)
                                      ? "not-allowed"
                                      : "pointer",
                                  textAlign: "left",
                                  opacity:
                                    (isPaymentActionBusy && !isBusy) ||
                                    (option.method === "cod" &&
                                      option.amt_limit !== 0 &&
                                      totalAmount < option.amt_limit)
                                      ? 0.5
                                      : 1,
                                  backgroundColor:
                                    (isPaymentActionBusy && !isBusy) ||
                                    (option.method === "cod" &&
                                      option.amt_limit !== 0 &&
                                      totalAmount < option.amt_limit)
                                      ? '#f5f5f5 !important'
                                      : 'revert',
                                }}
                              >
                                <div className="pymnts_optn_inr">
                                  <figure>
                                    <img src={option.icon} alt="" />
                                  </figure>

                                  <div>
                                    <p style={{ margin: 0, fontWeight: 600 }}>
                                      {option.label}
                                    </p>

                                    <p
                                      style={{
                                        margin: "4px 0 0",
                                        fontSize: "13px",
                                        color:
                                          option.method === "cod" &&
                                          option.amt_limit !== 0 &&
                                          totalAmount < option.amt_limit
                                            ? "#ff0073"
                                            : "#666",
                                        fontWeight: 400,
                                      }}
                                    >
                                      {option.method === "cod" &&
                                      option.amt_limit !== 0 &&
                                      totalAmount < option.amt_limit
                                        ? `Add ₹${formatPriceInr(
                                            option.amt_limit - totalAmount
                                          )} more to unlock COD`
                                        : isBusy
                                          ? "Processing..."
                                          : option.sublabel}
                                    </p>
                                  </div>
                                </div>

                                {isBusy ? (
                                  <CircularProgress
                                    size={20}
                                    sx={{
                                      color: "var(--commerce-primary)",
                                      ml: "auto",
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : null}
                              </Box>
                          );
                        })}

                        <MyFormControlLabel
                          className="pymnts_optn_bx checkbx v2"
                          disabled={!canRedeemLoyaltyPoints}
                          control={
                            <Checkbox
                              checked={canRedeemLoyaltyPoints && checked}
                              disabled={!canRedeemLoyaltyPoints}
                              onChange={handleChange2}
                              slotProps={{
                                input: { "aria-label": "controlled" },
                              }}
                            />
                          }
                          label={
                            <h3>
                              Redeem {loyaltyPointsAvailable} loyalty points{" "}
                              <span>on item total</span>
                            </h3>
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      {hasCustomerToken ? (
        <ShippingAddress
          open={open}
          onClose={handleCloseModal}
          setOpen={setOpen}
          addresses={addresses}
          selectedAddress={selectedAddressEntity}
          onSelectAddress={async (address) => {
          setSelectedAddressId(address.id.toString());
          const nextAddressId = address.id.toString();
          // Keep normal and quick headers aligned to the last user-selected saved address.
          persistDeliveryAddressIdForMode("normal", nextAddressId);
          persistDeliveryAddressIdForMode("quick_delivery", nextAddressId);
          if (deliveryMode === "normal") setNormalDeliverHerePinned(true);
          writeSelectedLocationFromAddress(address);
          handleCloseModal();
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
          void refetchCart();
        }}
        />
      ) : null}

      {hasCustomerToken ? (
        <AddAddress
          open={checkoutAddAddressOpen}
          onClose={() => setCheckoutAddAddressOpen(false)}
          setOpen={setCheckoutAddAddressOpen}
          syncHeaderLocationOnSave
          onSuccess={() => {
            setCheckoutAddAddressOpen(false);
            getAddressList();
            notifyDeliverySelectionChanged();
            void refetchCart();
          }}
        />
      ) : null}


      <ChangeStore
        open={open1}
        onClose={handleCloseModal1}
        setOpen={setOpen1}
      />

      <AddCardModal
        open={open3}
        onClose={handleCloseModal3}
        setOpen={setOpen3}
      />

      <Promocode
        open={open2}
        onClose={handleCloseModal2}
        setOpen={setOpen2}
        couponList={couponData?.data || []}
        activeCouponCode={visibleDisplayCouponWithPromotion?.code}
        onApply={handleApplyCoupon}
        onRemove={
          visibleDisplayCouponWithPromotion?.code
            ? () => handleRemoveCoupon()
            : undefined
        }
        applyingCoupon={isApplyingCoupon}
      />
    </>
  );
}
