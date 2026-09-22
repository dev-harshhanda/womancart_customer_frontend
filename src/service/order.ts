import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";
import { looksLikeInvoiceUrl } from "@/utils/orderInvoice";

export const orderService = emptySplitApi.injectEndpoints({
  // In development with HMR, endpoints can be injected multiple times.
  // Allow overriding to avoid runtime errors about duplicate endpoint names.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (builder) => ({
    getOrders: builder.query<
      CommonResponseType & { data: any[] },
      { page?: number; limit?: number; status?: string; userId?: string | number; type?: string }
    >({
      query: ({ page = 1, limit = 10, status, userId, type }) => {
        // Build query params
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", limit.toString());
        
        if (userId && userId.toString().trim() !== "") {
          queryParams.append("userId", userId.toString());
        }
        if (type && type.trim() !== "") {
          queryParams.append("type", type);
        }
        if (status && status.trim() !== "") {
          queryParams.append("status", status);
        }
        
        // Ensure the endpoint doesn't already have query params
        const baseUrl = END_POINTS.getOrders.split('?')[0];
        const queryString = queryParams.toString();
        const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
        
        return {
          url: url,
          method: "GET",
        };
      },
      providesTags: ["ORDERS"],
    }),

    getOrderById: builder.query<
      CommonResponseType & { data: any },
      { orderId: number | string }
    >({
      query: ({ orderId }) => ({
        url: `${END_POINTS.getOrderById}/${orderId}`,
        method: "GET",
      }),
      providesTags: ["ORDERS"],
    }),

    getOrderInvoice: builder.query<
      CommonResponseType & { data: any },
      { orderId?: number | string | null; orderItemId?: number | string | null }
    >({
      query: ({ orderId, orderItemId }) => {
        const params = new URLSearchParams();
        const itemId =
          orderItemId != null && String(orderItemId).trim() !== ""
            ? String(orderItemId)
            : null;
        const orderIdValue =
          orderId != null && String(orderId).trim() !== ""
            ? String(orderId)
            : null;

        if (orderIdValue) {
          params.set("orderId", orderIdValue);
        }
        if (itemId) {
          params.set("orderItemId", itemId);
        }

        const query = params.toString();
        return {
          url: query
            ? `${END_POINTS.getOrderInvoice}?${query}`
            : END_POINTS.getOrderInvoice,
          method: "GET",
          responseHandler: async (response) => {
            const contentType = response.headers.get("content-type") || "";
            if (
              contentType.includes("application/pdf") ||
              contentType.includes("octet-stream")
            ) {
              const blob = await response.blob();
              return {
                statusCode: 200,
                data: { invoice_url: URL.createObjectURL(blob) },
              };
            }

            const text = await response.text();
            if (!text) {
              return { statusCode: response.status, data: {} };
            }

            try {
              return JSON.parse(text);
            } catch {
              const trimmed = text.trim();
              if (looksLikeInvoiceUrl(trimmed)) {
                return {
                  statusCode: 200,
                  data: { invoice_url: trimmed },
                };
              }
              return { statusCode: response.status, data: {}, message: trimmed };
            }
          },
        };
      },
    }),

    cancelOrder: builder.mutation<
      CommonResponseType,
      { orderItemId: number | string; orderId?: number | string; reason?: string }
    >({
      query: (body) => ({
        url: END_POINTS.cancelOrder,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ORDERS"],
    }),

    returnOrder: builder.mutation<
      CommonResponseType,
      { orderItemId: number | string; return_reason: string; refund_method: string }
    >({
      query: (body) => ({
        url: END_POINTS.returnOrder,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ORDERS"],
    }),

    cancelReturn: builder.mutation<
      CommonResponseType,
      { orderItemId: number | string; orderId?: number | string }
    >({
      query: (body) => ({
        url: END_POINTS.cancelReturn,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ORDERS"],
    }),

    rateOrder: builder.mutation<
      CommonResponseType,
      { orderItemId: number | string; rating: number; comment?: string; images?: string[] }
    >({
      query: (body) => ({
        url: END_POINTS.rateOrder,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ORDERS"],
    }),

    exchangeOrder: builder.mutation<
      CommonResponseType,
      { previousOrderItemId: number | string; product_id: number | string; newVariationId: number | string; reason: string }
    >({
      query: (body) => ({
        url: END_POINTS.exchangeOrder,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ORDERS"],
    }),

    getExchangeProductDetails: builder.query<
      CommonResponseType & { data: any },
      { productId: number | string }
    >({
      query: ({ productId }) => ({
        url: `${END_POINTS.getExchangeProductDetails}/${productId}`,
        method: "GET",
      }),
    }),

    getDriverInfo: builder.query<
      CommonResponseType & { data: any },
      { orderId: number | string }
    >({
      query: ({ orderId }) => ({
        url: `${END_POINTS.getDriverInfo}/${orderId}`,
        method: "GET",
      }),
      providesTags: ["ORDERS"],
    }),

    getChatHistory: builder.query<
      CommonResponseType & {
        data: { messages: Array<{ id: number; sender_type: string; message: string; createdAt: string }>; nextCursor: number | null };
      },
      { orderId: number | string; limit?: number; cursor?: number }
    >({
      query: ({ orderId, limit = 30, cursor }) => {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        if (cursor != null) params.set("cursor", String(cursor));
        const query = params.toString();
        const url = `${END_POINTS.getChatHistory}/${orderId}${query ? `?${query}` : ""}`;
        return { url, method: "GET" as const };
      },
      providesTags: ["ORDERS"],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useLazyGetOrdersQuery,
  useGetOrderByIdQuery,
  useLazyGetOrderByIdQuery,
  useLazyGetOrderInvoiceQuery,
  useCancelOrderMutation,
  useReturnOrderMutation,
  useCancelReturnMutation,
  useRateOrderMutation,
  useExchangeOrderMutation,
  useGetExchangeProductDetailsQuery,
  useGetDriverInfoQuery,
  useLazyGetChatHistoryQuery,
} = orderService;