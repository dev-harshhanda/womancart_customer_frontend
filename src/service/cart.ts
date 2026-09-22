import { END_POINTS } from "@/constants/url";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";
import type { HomePageQueryArg } from "@/service/home";
import { getCartDeliveryContextForRequest } from "@/utils/cartRequestContext";

/** Query args for GET /cart/coupon-list — same location + channel as cart list. */
export type GetCouponListQueryArg = Pick<HomePageQueryArg, "type" | "latitude" | "longitude"> & {
  search?: string;
};

const ADD_TO_CART_DEBUG_KEY = "WC_ADD_TO_CART_DEBUG_LOGS";

function persistAddToCartDebug(entry: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(ADD_TO_CART_DEBUG_KEY);
    const prev = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
    const next = [
      ...prev.slice(-14),
      { ts: new Date().toISOString(), ...entry },
    ];
    localStorage.setItem(ADD_TO_CART_DEBUG_KEY, JSON.stringify(next));
  } catch {
    /* ignore debug persistence issues */
  }
}

function extractAddToCartError(error: unknown) {
  const err = error as {
    error?: { status?: number | string; data?: unknown };
    status?: number | string;
    data?: unknown;
  };
  return {
    status: err?.error?.status ?? err?.status ?? "unknown",
    data: err?.error?.data ?? err?.data ?? null,
    raw: err,
  };
}

export const homeService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCart: builder.query<CommonResponseType & { data: any }, HomePageQueryArg>(
      {
        query: ({ type, latitude, longitude, pincode }) => {
          const p = new URLSearchParams();
          p.set("type", type);
          p.set("latitude", String(latitude));
          p.set("longitude", String(longitude));
          const pc = pincode != null ? String(pincode).trim() : "";
          if (pc) {
            p.set("pincode", pc);
          }
          return {
            url: `${END_POINTS.getCart}?${p.toString()}`,
            method: "GET",
          };
        },
        providesTags: ["CART"],
      },
    ),

    addToCart: builder.mutation<
      CommonResponseType & { data: any },
      {
        product_id?: number | string;
        product_kit_id?: number | string;
        variation_id?: number | string | null;
        qty: number;
        store_id?: number | string;
        channel?: string;
        /** Override cart/list context when needed (defaults from URL + stored delivery location). */
        type?: "quick" | "normal";
        latitude?: number;
        longitude?: number;
        is_free_gift?: boolean;
      }
    >({
      query: (data) => {
        const ctx =
          typeof window !== "undefined"
            ? getCartDeliveryContextForRequest()
            : {
                type: "normal" as const,
                latitude: 28.6573,
                longitude: 77.1642,
              };
        const type = data.type ?? ctx.type;
        const latitude = data.latitude ?? ctx.latitude;
        const longitude = data.longitude ?? ctx.longitude;

        const body: any = {
          qty: Number(data.qty),
          channel: data.channel || type,
          type,
          latitude,
          longitude,
        };
        if (data.store_id !== undefined && data.store_id !== null && data.store_id !== "") {
          const normalizedStoreId = Number(data.store_id);
          if (Number.isFinite(normalizedStoreId) && normalizedStoreId > 0) {
            body.store_id = normalizedStoreId;
          }
        }

        // Either normal product or product kit (one of them should be present)
        if (data.product_kit_id !== undefined && data.product_kit_id !== null) {
          body.product_kit_id = Number(data.product_kit_id);
        } else if (data.product_id !== undefined && data.product_id !== null) {
          body.product_id = Number(data.product_id);
        }

        // Mark as free gift only when explicitly requested
        if (data.is_free_gift) {
          body.is_free_gift = true;
        }

        // Debug log for quantity updates / kit handling
        // eslint-disable-next-line no-console

        // Backend requirement: don't send variation_id when it's null/undefined
        if (data.variation_id !== null && data.variation_id !== undefined) {
          body.variation_id = Number(data.variation_id);
        }
        const userToken = getFromStorage(STORAGE_KEYS.token);
        const guestAuthToken = getFromStorage(STORAGE_KEYS.guestAuthToken);
        const authorizationHeader = userToken
          ? `Bearer ${userToken}`
          : guestAuthToken
            ? `Bearer ${guestAuthToken}`
            : "guest";
        const debugRequest = {
          phase: "request",
          endpoint: END_POINTS.addToCart,
          authMode: userToken ? "token" : guestAuthToken ? "guest_auth" : "guest",
          authorization: authorizationHeader,
          body,
        };
        // eslint-disable-next-line no-console
        console.log("[addToCart]", debugRequest);
        persistAddToCartDebug(debugRequest);

        return {
          url: `${END_POINTS.addToCart}`,
          method: "POST",
          body,
          headers: {
            Authorization: authorizationHeader,
          },
        };
      },
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const debugSuccess = { phase: "success", arg, data };
          // eslint-disable-next-line no-console
          console.log("[addToCart]", debugSuccess);
          persistAddToCartDebug(debugSuccess);
        } catch (error) {
          const normalizedError = extractAddToCartError(error);
          const debugError = { phase: "error", arg, ...normalizedError };
          // eslint-disable-next-line no-console
          console.log("[addToCart]", debugError);
          persistAddToCartDebug(debugError);
        }
      },
      invalidatesTags: ["CART"],
    }),

    placeOrder: builder.mutation<CommonResponseType & { data: any }, any>({
      query: (body) => ({
        url: `${END_POINTS.placeOrder}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["CART", "ORDERS"],
    }),

    removeFromCart: builder.mutation<
      CommonResponseType & { data: any },
      { cart_id: number | string; type?: string }
    >({
      query: (data) => {
        return {
          url: `${END_POINTS.removeFromCart}/${data.cart_id}`,
          method: "DELETE",
          body: {
            type: data.type || "normal",
          },
          headers: {
            "Content-Type": "application/json",
          },
        };
      },
      invalidatesTags: ["CART"],
    }),

    clearCart: builder.mutation<
      CommonResponseType & { data: any },
      { type?: string }
    >({
      query: (data) => {
        return {
          url: `${END_POINTS.clearCart}`,
          method: "DELETE",
          body: {
            type: data.type || "normal",
          },
          headers: {
            "Content-Type": "application/json",
          },
        };
      },
      invalidatesTags: ["CART"],
    }),

    getCouponList: builder.query<CommonResponseType & { data: any }, GetCouponListQueryArg>({
      query: (params) => {
        const ctx =
          typeof window !== "undefined"
            ? getCartDeliveryContextForRequest()
            : {
                type: "normal" as const,
                latitude: 28.6573,
                longitude: 77.1642,
              };
        const type = params.type ?? ctx.type;
        const latitude = params.latitude ?? ctx.latitude;
        const longitude = params.longitude ?? ctx.longitude;

        const p = new URLSearchParams();
        p.set("type", type);
        p.set("latitude", String(latitude));
        p.set("longitude", String(longitude));
        const q = params.search?.trim();
        if (q) {
          p.set("search", q);
        }

        return {
          url: `${END_POINTS.getCouponList}?${p.toString()}`,
          method: "GET",
        };
      },
    }),

    applyCoupon: builder.mutation<
      CommonResponseType & { data: any },
      {
        coupon_code: string;
        type: string;
        latitude?: number;
        longitude?: number;
      }
    >({
      query: (body) => {
        const ctx =
          typeof window !== "undefined"
            ? getCartDeliveryContextForRequest()
            : {
                type: "normal" as const,
                latitude: 28.6573,
                longitude: 77.1642,
              };
        const latitude = body.latitude ?? ctx.latitude;
        const longitude = body.longitude ?? ctx.longitude;

        return {
          url: `${END_POINTS.applyCoupon}`,
          method: "POST",
          body: {
            ...body,
            latitude,
            longitude,
          },
        };
      },
      invalidatesTags: ["CART"],
    }),

    removeCoupon: builder.mutation<
      CommonResponseType & { data: any },
      {
        coupon_code?: string;
        id?: number | string;
        type?: string;
        latitude?: number;
        longitude?: number;
      }
    >({
      query: (body) => {
        const ctx =
          typeof window !== "undefined"
            ? getCartDeliveryContextForRequest()
            : {
                type: "normal" as const,
                latitude: 28.6573,
                longitude: 77.1642,
              };
        const type = body.type ?? ctx.type;
        const latitude = body.latitude ?? ctx.latitude;
        const longitude = body.longitude ?? ctx.longitude;
        const couponCode = String(body.coupon_code || "").trim();

        if (couponCode) {
          return {
            url: END_POINTS.removeCoupon,
            method: "POST",
            body: {
              coupon_code: couponCode,
              type,
              latitude,
              longitude,
            },
          };
        }

        return {
          url: `${END_POINTS.removedCoupon}/${body.id}`,
          method: "DELETE",
          body: {
            type,
          },
          headers: {
            "Content-Type": "application/json",
          },
        };
      },
      invalidatesTags: ["CART"],
    }),

    verifyPayment: builder.mutation<
      CommonResponseType & { data: any },
      { razorpay_order_id: string | number; razorpay_payment_id: string; razorpay_signature?: string }
    >({
      query: (body) => ({
        url: END_POINTS.verifyPayment,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ORDERS"],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  usePlaceOrderMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useGetCouponListQuery,
  useApplyCouponMutation,
  useRemoveCouponMutation,
  useVerifyPaymentMutation,
} = homeService;
