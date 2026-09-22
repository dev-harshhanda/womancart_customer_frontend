import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import type { CommonResponseType } from "@/types/General";

export type FranchiseStat = { label: string; value: string };
export type FranchiseFaq = { question: string; answer: string; status?: boolean };
export type FranchiseCardItem = {
  title: string;
  description?: string;
  icon?: string | null;
  icon_url?: string | null;
};
export type FranchiseMetric = { label: string; value: string };

export type FranchisePageContent = {
  hero?: {
    title?: string;
    subtitle?: string;
    description?: string;
    cta_label?: string;
    form_title?: string;
    stats?: FranchiseStat[];
    image?: string | null;
    image_url?: string | null;
    whatsapp_number?: string;
    whatsapp_message?: string;
  };
  deserves_section?: {
    title?: string;
    content?: string;
    image?: string | null;
    image_url?: string | null;
  };
  why_partner?: {
    title?: string;
    items?: FranchiseCardItem[];
  };
  program?: {
    title?: string;
    description?: string;
    metrics?: FranchiseMetric[];
  };
  gallery?: {
    title?: string;
    images?: Array<string | Record<string, unknown>>;
    image_urls?: string[];
  };
  support?: {
    title?: string;
    items?: FranchiseCardItem[];
  };
  faqs?: FranchiseFaq[];
  bottom_cta?: {
    title?: string;
    subtitle?: string;
    submit_label?: string;
  };
};

export type FranchiseOpportunityData = {
  id?: number;
  slug?: string;
  status?: boolean;
  meta_title?: string;
  meta_description?: string;
  content?: FranchisePageContent;
  updated_at?: string;
};

export type FranchiseEnquiryBody = {
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  postal_code?: string;
  message?: string;
  source?: string;
  slug?: string;
};

export const franchiseService = emptySplitApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (builder) => ({
    getFranchiseOpportunity: builder.query<
      CommonResponseType & { data: FranchiseOpportunityData },
      { slug?: string } | void
    >({
      query: (arg) => {
        const slug = arg?.slug?.trim();
        return {
          url: slug
            ? `${END_POINTS.franchiseOpportunity}/${slug}`
            : END_POINTS.franchiseOpportunity,
          method: "GET",
        };
      },
    }),
    submitFranchiseEnquiry: builder.mutation<
      CommonResponseType & { data?: { id?: number; submitted_at?: string } },
      FranchiseEnquiryBody
    >({
      query: (body) => ({
        url: END_POINTS.franchiseEnquiry,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetFranchiseOpportunityQuery,
  useSubmitFranchiseEnquiryMutation,
} = franchiseService;
