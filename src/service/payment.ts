import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";

export interface PaymentMethod {
  id?: string;
  _id?: string;
  card_number?: string;
  card_type?: string;
  expiry_month?: string;
  expiry_year?: string;
  expiry_date?: string;
  card_holder_name?: string;
  is_default?: boolean;
  type?: string; // 'card' or 'upi'
  upi_id?: string;
  last_four?: string;
  brand?: string;
  [key: string]: any;
}

export interface GetPaymentMethodsResponse extends CommonResponseType {
  data: PaymentMethod[];
}

export const paymentService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getPaymentMethods: builder.query<
      GetPaymentMethodsResponse,
      { type?: "card" | "upi" } | void
    >({
      query: (params) => {
        const type = params?.type;
        const queryParams = new URLSearchParams();
        if (type) {
          queryParams.append("type", type);
        }
        const url = queryParams.toString() 
          ? `${END_POINTS.getPaymentMethods}?${queryParams.toString()}`
          : END_POINTS.getPaymentMethods;
        return {
          url,
          method: "GET",
        };
      },
      providesTags: ["PAYMENT_METHODS"],
    }),
    deletePaymentMethod: builder.mutation<
      CommonResponseType,
      { id: string | number }
    >({
      query: ({ id }) => ({
        url: `${END_POINTS.getPaymentMethods}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PAYMENT_METHODS"],
    }),
    saveCardPayment: builder.mutation<
      CommonResponseType & { data: any },
      void
    >({
      query: () => ({
        url: END_POINTS.saveCardPayment,
        method: "POST",
      }),
    }),
    verifyCardPayment: builder.mutation<
      CommonResponseType & { data: any },
      {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }
    >({
      query: (body) => ({
        url: END_POINTS.verifyCardPayment,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PAYMENT_METHODS"],
    }),
  }),
});

export const { 
  useGetPaymentMethodsQuery,
  useDeletePaymentMethodMutation,
  useSaveCardPaymentMutation,
  useVerifyCardPaymentMutation
} = paymentService;
