import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";

export interface ThemeSettingItem {
  id: number;
  primary_color: string;
  buttons_primary_color: string;
  text_buttons_primary_color: string;
  text_color: string;
  secondary_color: string;
  website_primary_color: string;
  website_secondary_color: string;
  header_background_color: string;
  landing_page_header_color: string;
  login_background_color: string;
  created_at: string;
  updated_at: string;
}

export interface ThemeSettingResponse {
  statusCode: number;
  data: ThemeSettingItem[];
  message: string;
}

export const themeService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getThemeSetting: builder.query<ThemeSettingResponse, void>({
      query: () => ({
        url: END_POINTS.themeSetting,
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetThemeSettingQuery, useLazyGetThemeSettingQuery } =
  themeService;
