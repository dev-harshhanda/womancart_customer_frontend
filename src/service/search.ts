import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";

export const searchService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    searchAll: builder.query<
      CommonResponseType & { data: { products: any[]; brands: any[]; categories: any[] } },
      {
        search: string;
        latitude?: number;
        longitude?: number;
        type?: "normal" | "quick";
      }
    >(
      {
        query: ({ search, latitude, longitude, type }) => {
          const params = new URLSearchParams();
          params.set("search", search);
          if (typeof latitude === "number") params.set("latitude", String(latitude));
          if (typeof longitude === "number") params.set("longitude", String(longitude));
          if (type) params.set("type", type);

          return {
            url: `${END_POINTS.searchAllProducts}?${params.toString()}`,
            method: "GET",
          headers: {
            authorizationnode: "guest",
            Cookie: "i18next=en; i18next=en",
          },
          };
        },
      }
    ),
  }),
});

export const { useSearchAllQuery, useLazySearchAllQuery } = searchService;