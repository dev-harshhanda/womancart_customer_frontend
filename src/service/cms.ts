import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";

export const cmsService = emptySplitApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({
        getAboutUs: builder.query<string, void>({
            query: () => ({
                url: `${END_POINTS.aboutUs}`,
                method: "GET",
                responseHandler: (response) => response.text(),
            }),
        }),
        getTermsConditions: builder.query<string, void>({
            query: () => ({
                url: `${END_POINTS.termsConditions}`,
                method: "GET",
                responseHandler: (response) => response.text(),
            }),
        }),
        getPrivacyPolicy: builder.query<string, void>({
            query: () => ({
                url: `${END_POINTS.privacyPolicy}`,
                method: "GET",
                responseHandler: (response) => response.text(),
            }),
        }),
        getReturnPolicy: builder.query<string, void>({
            query: () => ({
                url: `${END_POINTS.returnPolicy}`,
                method: "GET",
                responseHandler: (response) => response.text(),
            }),
        }),
        getRefundPolicy: builder.query<string, void>({
            query: () => ({
                url: `${END_POINTS.refundPolicy}`,
                method: "GET",
                responseHandler: (response) => response.text(),
            }),
        }),
        getFaqs: builder.query<string, void>({
            query: () => ({
                url: `${END_POINTS.faqs}`,
                method: "GET",
                responseHandler: (response) => response.text(),
            }),
        }),
        submitHelpCenter: builder.mutation<
            {
                statusCode: number;
                data: {
                    status: string;
                    id: number;
                    type: string;
                    subject: string;
                    message: string;
                    allocate_user_id: number;
                    ticket_id: string;
                    ticketable_id: number;
                    ticketable_type: string;
                    updatedAt: string;
                    createdAt: string;
                };
                message: string;
            },
            {
                type: string;
                subject: string;
                message: string;
            }
        >({
            query: (body) => ({
                url: `${END_POINTS.helpCenter}`,
                method: "POST",
                body,
            }),
        }),
    }),
});

export const { 
    useGetAboutUsQuery, 
    useGetTermsConditionsQuery, 
    useGetPrivacyPolicyQuery,
    useGetReturnPolicyQuery, 
    useGetRefundPolicyQuery, 
    useGetFaqsQuery,
    useSubmitHelpCenterMutation 
} = cmsService;
