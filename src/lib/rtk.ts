/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import { resetAuth } from "./slices/authSlice";
import { RootState } from "@/types/General";
import { API_URL, END_POINTS, NODE_API_URL } from "@/constants/url";
import { getFromStorage, removeFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

/* -------------------------------------------------------------------------- */
/*                               SHARED HEADERS                               */
/* -------------------------------------------------------------------------- */

const prepareHeadersShared = (
  headers: Headers,
  { getState }: { getState: () => unknown }
) => {
  const { token } = (getState() as RootState).auth;
  const { tempToken } = (getState() as RootState).auth;
  const tokenFromStorage = getFromStorage(STORAGE_KEYS.token);
  const nodeToken = getFromStorage(STORAGE_KEYS.tokenNode);
  const guestJwtToken = getFromStorage(STORAGE_KEYS.guestJwtToken);
  const guestAuthToken = getFromStorage(STORAGE_KEYS.guestAuthToken);

  // Prefer localStorage API token so a tab picks up login/logout from other tabs immediately
  // (Redux can still hold the previous session until sync runs).
  let tokenKey: string | undefined;
  if (tokenFromStorage) {
    tokenKey = tokenFromStorage;
  } else if (token) {
    tokenKey = token;
  } else if (tempToken) {
    tokenKey = tempToken;
  } else if (guestAuthToken) {
    // Guest Sanctum token — required for Laravel cart remove/clear while not logged in
    tokenKey = guestAuthToken;
  }

  if (tokenKey) {
    headers.set("authorization", `Bearer ${tokenKey}`);
  }

  // Set AuthorizationNode: use actual token if available, otherwise default to "guest"
  if (nodeToken) {
    headers.set("AuthorizationNode", nodeToken);
  } else if (!token && !tempToken && !tokenFromStorage && guestJwtToken) {
    headers.set("AuthorizationNode", guestJwtToken);
  } else {
    headers.set("AuthorizationNode", "guest");
  }

  headers.set("x-portal", "user");
  headers.set("app", "anstmasr2588");

  return headers;
};

/* -------------------------------------------------------------------------- */
/*                               BASE QUERIES                                  */
/* -------------------------------------------------------------------------- */

const baseQueryApi = fetchBaseQuery({
  baseUrl: API_URL.replace(/\/$/, ""), // 🔒 remove trailing slash
  prepareHeaders: prepareHeadersShared,
});

const baseQueryNode = fetchBaseQuery({
  baseUrl: NODE_API_URL.replace(/\/$/, ""), // 🔒 remove trailing slash
  prepareHeaders: prepareHeadersShared,
});

const HOSTS = {
  api: baseQueryApi,
  node: baseQueryNode,
} as const;

/* -------------------------------------------------------------------------- */
/*                        DYNAMIC BASE QUERY WRAPPER                           */
/* -------------------------------------------------------------------------- */

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const rawUrl = typeof args === "string" ? args : args.url;

  if (!rawUrl) {
    // console.error("❌ RTK Query Error: URL is missing");
    return {
      error: {
        status: "CUSTOM_ERROR",
        data: "URL is missing",
      } as any,
    };
  }

  /**
   * Expected format:
   *  - api:/login
   *  - node:/register
   */
  const match = rawUrl.match(/^([a-z]+):\/(.+)$/i);

  const hostKey = (match?.[1]?.toLowerCase() as keyof typeof HOSTS) || "api";
  const path = match ? `/${match[2]}` : rawUrl;

  const selectedBaseQuery = HOSTS[hostKey] || HOSTS.api;

  const adjustedArgs: FetchArgs =
    typeof args === "string"
      ? { url: path }
      : {
        ...args,
        url: path,
        // Ensure Content-Type is set for POST requests with body
        ...(args.method === "POST" && args.body && typeof args.body === "object" && !(args.body instanceof FormData)
          ? {
            headers: {
              "Content-Type": "application/json",
              ...(args.headers || {}),
            },
          }
          : {}),
      };

  /* ------------------------------- LOG REQUEST ------------------------------ */

  if (adjustedArgs.body) {
  }
  if (adjustedArgs.headers) {
  }

  /* ----------------------------- EXECUTE REQUEST ----------------------------- */

  const result = await selectedBaseQuery(adjustedArgs, api, extraOptions);

  /* ------------------------------ LOG RESPONSE ------------------------------- */

  if (result.error) {
    // console.error("❌ API ERROR");
    // console.error("➡️ Status:", result.error.status);
    // console.error("➡️ Data:", result.error.data);
  } else {
  }

  /* ----------------------------- GLOBAL HANDLING ----------------------------- */

  /** Public APIs allowed for guests; errors must not force login redirect. */
  const isPublicBlogsRequest = path.includes(END_POINTS.blogs);
  const isPublicBrandsRequest = path.includes(END_POINTS.brands);
  const isPublicBannersRequest = path.includes(END_POINTS.banners);
  const isViewAllProductRequest = path.includes("viewAllProduct");
  const isViewAllCategoryRequest = path.includes("viewAllCategory");
  const isShopAttributesEntityRequest = path.includes("shop-attributes-entity");
  
  const searchEndpointMatch = END_POINTS.searchAllProducts.includes(":/") 
    ? END_POINTS.searchAllProducts.split(":/")[1] 
    : END_POINTS.searchAllProducts;
  const isPublicSearchRequest = path.includes(searchEndpointMatch);
  const addToCartEndpointMatch = END_POINTS.addToCart.includes(":/")
    ? END_POINTS.addToCart.split(":/")[1]
    : END_POINTS.addToCart;
  const isAddToCartRequest = path.includes(addToCartEndpointMatch);
  const isCartListRequest = path.includes("/cart/list");
  const isCartRemoveRequest = path.includes("/cart/remove");
  const isCartClearRequest = path.includes("/cart/clear");
  const isCartCouponRequest =
    path.includes("/cart/coupon-list") ||
    path.includes("/cart/apply-coupon") ||
    path.includes("/cart/remove-coupon");
  const isStockAlertSubscribeRequest = path.includes("stock-alert/subscribe");
  const isProductDetailRequest = path.includes("product/user/product-detail");

  const isPublicRequest = 
    isPublicBlogsRequest || 
    isPublicBrandsRequest || 
    isPublicBannersRequest || 
    isPublicSearchRequest ||
    isAddToCartRequest ||
    isCartListRequest ||
    isCartRemoveRequest ||
    isCartClearRequest ||
    isCartCouponRequest ||
    isViewAllProductRequest ||
    isViewAllCategoryRequest ||
    isShopAttributesEntityRequest ||
    isProductDetailRequest;

  if (result.error?.status === 401) {
    if (isPublicRequest || isStockAlertSubscribeRequest) {
      return result;
    }
    api.dispatch(resetAuth());
    if (typeof window !== "undefined") {
      // Fully clear auth-related storage so no auto-login redirects occur
      removeFromStorage(STORAGE_KEYS.tokenNode);
      removeFromStorage(STORAGE_KEYS.token);
      removeFromStorage(STORAGE_KEYS.credentials);

      // Get current pathname to avoid redirect loops
      const currentPath = window.location.pathname;

      // Skip redirect if already on auth pages or if the API call is for login/register
      const isAuthPage = currentPath.startsWith("/auth/");
      const isLoginEndpoint =
        path.includes("/login") ||
        path.includes("/guest-login") ||
        path.includes("/register") ||
        path.includes("/verifyOtp");

      // Only redirect if not already on auth page and not calling login-related endpoints
      if (!isAuthPage && !isLoginEndpoint) {
        const returnPath = `${currentPath}${window.location.search || ""}`;
        window.location.href = `/auth/login?redirect=${encodeURIComponent(returnPath)}`;
      }
    }
  }

  
  // new 

  // if (result.error?.status === 401) {
  //   if (typeof window !== "undefined") {
  //     // Get current pathname to avoid redirect loops
  //     const currentPath = window.location.pathname;
  //     // Only redirect if NOT already on login/register/forgot/verify
  //     const isAuthPage =
  //       currentPath.startsWith("/auth/login") ||
  //       currentPath.startsWith("/auth/register") ||
  //       currentPath.startsWith("/auth/forgot") ||
  //       currentPath.startsWith("/auth/verify");
  //     if (!isAuthPage) {
  //       window.location.href = "/auth/login";
  //     }
  //   }
  // }

  if (result.error?.status === 503) {
    console.log( "503------->", result.error);
    if (typeof window !== "undefined") {
      if (isPublicRequest || isStockAlertSubscribeRequest) {
        return result;
      }
      // window.location.href = "/maintenance";
    }
  }

  if (result.error?.status === 500) {
    if (typeof window !== "undefined") {
      // Get current pathname to avoid redirect loops
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.startsWith("/auth/");
      const isLoginEndpoint =
        path.includes("/login") || path.includes("/register");

      if (isPublicRequest || isStockAlertSubscribeRequest) {
        return result;
      }

      // Only redirect if not already on auth page and not calling login-related endpoints
      if (!isAuthPage && !isLoginEndpoint) {
        const returnPath = `${currentPath}${window.location.search || ""}`;
        window.location.href = `/auth/login?redirect=${encodeURIComponent(returnPath)}`;
      }
    }
  }

  return result;
};

/* -------------------------------------------------------------------------- */
/*                                  API SLICE                                  */
/* -------------------------------------------------------------------------- */

const emptySplitApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["DASHBOARD", "PROFILE", "CATEGORY", "CART", "ORDERS", "ADDRESS", "WISHLIST", "PREFERENCES", "WALLET", "REFERRAL", "LOYALTY", "SHOP_ATTRIBUTES_ENTITY", "PAYMENT_METHODS"],
  endpoints: (builder) => ({
    getReferralStats: builder.query<any, void>({
      query: () => ({ url: END_POINTS.getReferralStats, method: "GET" }),
      providesTags: ["REFERRAL"],
    }),
    getReferralHistory: builder.query<any, void>({
      query: () => ({ url: END_POINTS.getReferralHistory, method: "GET" }),
      providesTags: ["REFERRAL"],
    }),
  }),
});

export const { useGetReferralStatsQuery, useGetReferralHistoryQuery } = emptySplitApi;
export default emptySplitApi;
