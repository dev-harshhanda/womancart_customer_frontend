import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";

export const walletService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getWalletBalance: builder.query<CommonResponseType & { data: any }, void>({
      query: () => ({
        url: END_POINTS.walletBalance,
        method: "GET",
      }),
      providesTags: ["WALLET"],
    }),
    topUpWallet: builder.mutation<
      CommonResponseType & { data: any },
      { amount: number; payment_method: string; description: string }
    >({
      query: (body) => ({
        url: END_POINTS.walletTopUp,
        method: "POST",
        body,
      }),
      invalidatesTags: ["WALLET"],
    }),
    verifyTopUp: builder.mutation<
      CommonResponseType & { data: any },
      {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }
    >({
      query: (body) => ({
        url: END_POINTS.walletVerifyTopUp,
        method: "POST",
        body,
      }),
      invalidatesTags: ["WALLET"],
    }),
    getWalletHistory: builder.query<
      CommonResponseType & { data: any },
      { type?: string }
    >({
      query: ({ type }) => ({
        url: END_POINTS.walletHistory,
        method: "GET",
        params: type ? { type } : undefined,
      }),
      providesTags: ["WALLET"],
    }),
  }),
});

export const {
  useGetWalletBalanceQuery,
  useTopUpWalletMutation,
  useVerifyTopUpMutation,
  useGetWalletHistoryQuery,
} = walletService;
