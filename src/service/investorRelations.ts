import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import type { CommonResponseType } from "@/types/General";

export type InvestorDocument = Record<string, unknown>;

export type InvestorTab = {
  id: number;
  title: string;
  slug: string;
  sort_order?: number;
  documents?: InvestorDocument[];
};

export type InvestorRelationsData = {
  id?: number;
  slug?: string;
  page_title?: string;
  meta_title?: string;
  meta_description?: string;
  status?: boolean;
  tabs?: InvestorTab[];
  updated_at?: string;
};

export const investorRelationsService = emptySplitApi.injectEndpoints({
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (builder) => ({
    getInvestorRelations: builder.query<
      CommonResponseType & { data: InvestorRelationsData },
      { slug?: string } | void
    >({
      query: (arg) => {
        const slug = arg?.slug?.trim();
        return {
          url: slug
            ? `${END_POINTS.investorRelations}/${slug}`
            : END_POINTS.investorRelations,
          method: "GET",
        };
      },
    }),
  }),
});

export const { useGetInvestorRelationsQuery } = investorRelationsService;
