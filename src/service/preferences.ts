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

export const PreferencesService = emptySplitApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getPreferences: builder.query<CommonResponseType & { data: Preferences }, void>({
            query: () => ({
                url: END_POINTS.preferences,
                method: "GET",
            }),
            providesTags: ["PREFERENCES"],
        }),
        updatePreferences: builder.mutation<
            CommonResponseType,
            { body: FormData | any }
        >({
            query: ({ body }) => ({
                url: END_POINTS.preferences,
                method: "POST",
                body,
            }),
            invalidatesTags: ["PREFERENCES"],
        }),
    }),
});

export const {
    useGetPreferencesQuery,
    useUpdatePreferencesMutation,
} = PreferencesService;
