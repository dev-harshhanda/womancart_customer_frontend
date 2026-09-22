import { API_URL, END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

const appendGuestUserId = <T extends Record<string, any>>(body: T): T => {
  const guestUserIdRaw = getFromStorage(STORAGE_KEYS.guestUserId);
  if (!guestUserIdRaw) return body;
  const normalizedGuestUserId = Number(guestUserIdRaw);
  if (!Number.isFinite(normalizedGuestUserId) || normalizedGuestUserId <= 0) {
    return body;
  }
  return {
    ...body,
    guest_user_id: normalizedGuestUserId,
  };
};

export const AuthService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    login: builder.mutation<CommonResponseType & { data: any }, { body: any }>({
      query: ({ body }) => ({
        url: `${END_POINTS.login}`,
        method: "POST",
        body: appendGuestUserId(body),
      }),
      invalidatesTags: ["PROFILE", "CART"],
    }),
    loginWithPhone: builder.mutation<
      CommonResponseType & { data: any },
      { body: any }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.loginWithPhone}`,
        method: "POST",
        body: appendGuestUserId(body),
      }),
      invalidatesTags: ["PROFILE", "CART"],
    }),
    signUp: builder.mutation<CommonResponseType & { data: any }, { body: any }>(
      {
        query: ({ body }) => ({
          url: `${END_POINTS.signUp}`,
          method: "POST",
          body: appendGuestUserId(body),
        }),
        invalidatesTags: ["PROFILE"],
      }
    ),

    verifyOtp: builder.mutation<
      CommonResponseType & { data: any },
      { body: any }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.verifyOtp}`,
        method: "POST",
        body: appendGuestUserId(body),
      }),
      invalidatesTags: ["PROFILE", "CART"],
    }),
    resendOtp: builder.mutation<
      CommonResponseType & { data: any },
      { body: any }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.resendOtp}`,
        method: "POST",
        body,
      }),
    }),
    updateProfile: builder.mutation<
      CommonResponseType & { data: any },
      { body: any }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.updateProfile}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PROFILE"],
    }),
    getProfile: builder.query<
      CommonResponseType & { data: any },
      void
    >({
      query: () => ({
        url: `${END_POINTS.getProfile}`,
        method: "GET",
      }),
      providesTags: ["PROFILE"],
      // Separate cache per stored session so another tab's login does not reuse the previous user's profile
      serializeQueryArgs: () => {
        if (typeof window === "undefined") return "profile:ssr";
        const node = getFromStorage(STORAGE_KEYS.tokenNode) || "";
        const api = getFromStorage(STORAGE_KEYS.token) || "";
        if (!node && !api) return "profile:guest";
        return `profile:${node.length}:${api.length}:${node.slice(-20)}:${api.slice(-20)}`;
      },
    }),
    imageUpload: builder.mutation<
      CommonResponseType & { data: any },
      { body: FormData }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.imageUpload}`,
        method: "POST",
        body,
      }),
    }),
    verifyChangePhoneNumber: builder.mutation<
      CommonResponseType & { data: any },
      { body: { otp: string | number; type: number } }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.verifyChangePhoneNumber}`,
        method: "POST",
        body,
      }),
    }),
    changePhoneNumber: builder.mutation<
      CommonResponseType & { data: any },
      {
        body: {
          phone_code: string | number;
          phone: string | number;
          phone_country: string;
        };
      }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.changePhoneNumber}`,
        method: "POST",
        body,
      }),
    }),
    changeEmail: builder.mutation<
      CommonResponseType & { data: any },
      { body: { email: string } }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.changeEmail}`,
        method: "POST",
        body,
      }),
    }),
    forgotPassword: builder.mutation<
      CommonResponseType & { data: any },
      { body: FormData }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.forgotPassword}`,
        method: "POST",
        body,
      }),
    }),
    changePassword: builder.mutation<
      CommonResponseType & { data: any },
      { body: FormData }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.changePassword}`,
        method: "POST",
        body,
      }),
    }),
    logout: builder.mutation<
      CommonResponseType & { data: any },
      { params?: { name?: string; gender?: string; dob?: string } }
    >({
      query: ({ params }) => {
        // Build query string if params are provided
        const queryParams = new URLSearchParams();
        if (params?.name) queryParams.append("name", params.name);
        if (params?.gender) queryParams.append("gender", params.gender);
        if (params?.dob) queryParams.append("dob", params.dob);

        const queryString = queryParams.toString();
        const url = queryString
          ? `${END_POINTS.logout}?${queryString}`
          : `${END_POINTS.logout}`;

        return {
          url,
          method: "GET",
        };
      },
      invalidatesTags: ["PROFILE"],
    }),
    deleteAccount: builder.mutation<
      CommonResponseType & { data: any },
      void
    >({
      query: () => {
        const deleteAccountUrl = `${API_URL.replace(/\/$/, "")}${END_POINTS.deleteAccount}`;
        console.log("Delete account URL:", deleteAccountUrl);
        return {
          url: `${END_POINTS.deleteAccount}`,
          method: "GET",
        };
      },
    }),
    getBrands: builder.query<
      CommonResponseType & { data: { data: any[]; data_count?: number; total_pages?: number } },
      { page?: number; limit?: number; featured?: number; new_launch?: number; only_at_womancart?: number }
    >({
      query: ({ page = 1, limit, featured, new_launch, only_at_womancart }) => {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", (limit || 20).toString());
        if (featured) queryParams.append("featured", featured.toString());
        if (new_launch) queryParams.append("new_launch", new_launch.toString());
        if (only_at_womancart) queryParams.append("only_at_womancart", only_at_womancart.toString());
        return {
          url: `${END_POINTS.brands}?${queryParams.toString()}`,
          method: "GET",
          headers: {
            authorizationnode: "guest",
            Cookie: "i18next=en; i18next=en", // Some endpoints require cookie for session tracking
          },
        };
      },
      keepUnusedDataFor: 300,
    }),
    /** Brand detail by slug — includes `description` / `meta_description` (and nested `seo`). */
    getBrandBySlug: builder.query<
      CommonResponseType & { data: any },
      { slug: string }
    >({
      query: ({ slug }) => ({
        url: `${END_POINTS.brands}/${encodeURIComponent(String(slug || "").trim())}`,
        method: "GET",
        headers: {
          authorizationnode: "guest",
          Cookie: "i18next=en; i18next=en",
        },
      }),
      keepUnusedDataFor: 300,
    }),
    socialLogin: builder.mutation<
      CommonResponseType & { data: any },
      { body: { socialId: string; socialType: "google" | "facebook" | "apple"; email: string; name: string; fcm_token: string } }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.socialLogin}`,
        method: "POST",
        body: appendGuestUserId(body),
      }),
      invalidatesTags: ["PROFILE", "CART"],
    }),
    guestLogin: builder.mutation<
      CommonResponseType & {
        data?: { auth?: string; jwt_token?: string; [key: string]: unknown };
        auth?: string;
        jwt_token?: string;
      },
      { body: { fcm_token: string } }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.guestLogin}`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLoginWithPhoneMutation,
  useSignUpMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useUpdateProfileMutation,
  useGetProfileQuery,
  useImageUploadMutation,
  useVerifyChangePhoneNumberMutation,
  useChangePhoneNumberMutation,
  useChangeEmailMutation,
  useForgotPasswordMutation,
  useChangePasswordMutation,
  useLogoutMutation,
  useLazyGetProfileQuery,
  useDeleteAccountMutation,
  useGetBrandsQuery,
  useLazyGetBrandsQuery,
  useGetBrandBySlugQuery,
  useLazyGetBrandBySlugQuery,
  useSocialLoginMutation,
  useGuestLoginMutation,
} = AuthService;
