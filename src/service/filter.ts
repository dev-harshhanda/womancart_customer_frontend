import { END_POINTS } from "../constants/url";
import emptySplitApi from "../lib/rtk";
import { CommonResponseType } from "@/types/General";
import { getCartDeliveryContextForRequest } from "@/utils/cartRequestContext";

/** Comma-separated IDs, e.g. "183,182,181" for ?category_ids=183,182,181 */
export type GetFilterListArg = {
  category_ids?: string;
  brand_ids?: string;
  product_id?: string;
  latitude?: number;
  longitude?: number;
  type?: "quick" | "normal";
};

export const filterService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getFilterList: builder.query<
      CommonResponseType & { data: any },
      GetFilterListArg
    >({
      query: (arg) => {
        const ctx =
          typeof window !== "undefined"
            ? getCartDeliveryContextForRequest()
            : {
                type: "normal" as const,
                latitude: 28.6573,
                longitude: 77.1642,
              };
        const params: Record<string, string> = {};
        if (arg.category_ids) params.category_ids = arg.category_ids;
        if (arg.brand_ids) params.brand_ids = arg.brand_ids;
        if (arg.product_id) params.product_id = arg.product_id;
        params.latitude = String(arg.latitude ?? ctx.latitude);
        params.longitude = String(arg.longitude ?? ctx.longitude);
        params.type = String(arg.type ?? ctx.type);
        return {
        url: `${END_POINTS.FILTER_LIST}`,
        method: "GET",
        params,
        };
      },
    }),
  }),
});

export const { useGetFilterListQuery } = filterService;