import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";

export interface Preferences {
    email_notification: number;
    sms_notification: number;
    push_notification: number;
    offers_promotion: number;
    order_update: number;
    personalized_recommendations: number;
    daily_deals: number;
    specific_offers: number;
}

export const CategoryApiService = emptySplitApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getShopAttributesEntity: builder.query<CommonResponseType & { data: { result: any[] } }, { category_id: number | string | undefined | null }>({
            query: ({ category_id }) => {
                const queryParams = new URLSearchParams();
                if (category_id) {
                    queryParams.append("category_id", category_id.toString());
                }
                return {
                    url: `${END_POINTS.shopAttributesEntity}?${queryParams.toString()}`, 
                    method: "GET",
                };
            },
            providesTags: ["SHOP_ATTRIBUTES_ENTITY"],
        }),
  }),
});

export const { useGetShopAttributesEntityQuery } = CategoryApiService;
