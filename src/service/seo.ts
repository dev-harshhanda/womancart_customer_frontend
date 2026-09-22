import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { SeoApiResponse } from "@/types/seo";

/**
 * Client-side access to the backend SEO-migration endpoints.
 *
 * These all live on the admin (Laravel) API and return a structured `seo`
 * object alongside the page entity. Use the matching `generate*Metadata`
 * helpers in `src/lib/seoMetadata.ts` for server-side <head> metadata.
 */
export const seoService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCategorySeo: builder.query<SeoApiResponse, { slug: string }>({
      query: ({ slug }) => ({
        url: `${END_POINTS.seoCategory}/${slug}`,
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
    getBrandSeo: builder.query<SeoApiResponse, { slug: string }>({
      query: ({ slug }) => ({
        url: `${END_POINTS.seoBrand}/${slug}`,
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
    getCollectionSeo: builder.query<SeoApiResponse, { slug: string }>({
      query: ({ slug }) => ({
        url: `${END_POINTS.seoCollection}/${slug}`,
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
    getCmsPageSeo: builder.query<SeoApiResponse, { slug: string }>({
      query: ({ slug }) => ({
        url: `${END_POINTS.seoCmsPage}/${slug}`,
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
    getBlogSeo: builder.query<SeoApiResponse, { slug: string }>({
      query: ({ slug }) => ({
        url: `${END_POINTS.seoBlog}/${slug}`,
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
    getHomepageSeo: builder.query<SeoApiResponse, void>({
      query: () => ({
        url: `${END_POINTS.seoHomepage}`,
        method: "GET",
      }),
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useGetCategorySeoQuery,
  useLazyGetCategorySeoQuery,
  useGetBrandSeoQuery,
  useLazyGetBrandSeoQuery,
  useGetCollectionSeoQuery,
  useLazyGetCollectionSeoQuery,
  useGetCmsPageSeoQuery,
  useLazyGetCmsPageSeoQuery,
  useGetBlogSeoQuery,
  useLazyGetBlogSeoQuery,
  useGetHomepageSeoQuery,
} = seoService;
