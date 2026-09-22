import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import type { CommonResponseType } from "@/types/General";

type NewsletterSubscribeBody = {
  email: string;
  notify_new_products: boolean;
  notify_new_coupons: boolean;
  notify_new_offers: boolean;
};

export const newsletterService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    subscribeNewsletter: builder.mutation<
      CommonResponseType & { data?: unknown },
      { body: NewsletterSubscribeBody }
    >({
      query: ({ body }) => ({
        url: END_POINTS.newsletterSubscribe,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useSubscribeNewsletterMutation } = newsletterService;

