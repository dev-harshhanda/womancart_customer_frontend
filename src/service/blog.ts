import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";

/** Request body for POST /api/blogs (multipart form). */
export type GetBlogsListArgs = {
  page?: number;
  limit?: number;
  /** Optional filter; omit to fetch all categories. */
  categoryId?: number | string;
};

/** `data` object from GET-all-blogs success response. */
export type BlogsListData = {
  data_count: number;
  total_pages: number;
  page_per_data: string;
  current_page: string;
  data: unknown[];
};

export type BlogsListResponse = CommonResponseType & {
  data: BlogsListData;
  message?: string;
};

export const blogService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getBlogsList: builder.mutation<BlogsListResponse, GetBlogsListArgs>({
      query: ({ page = 1, limit = 10, categoryId }) => {
        const formData = new FormData();
        formData.append("page", String(page));
        formData.append("limit", String(limit));
        if (categoryId !== undefined && categoryId !== null && `${categoryId}` !== "") {
          formData.append("categoryId", String(categoryId));
        }
        return {
          url: `${END_POINTS.blogs}`,
          method: "POST",
          body: formData,
        };
      },
    }),
    getBlogBySlug: builder.query<
      CommonResponseType & { data: unknown },
      { slug: string }
    >({
      query: ({ slug }) => ({
        url: `${END_POINTS.blogBySlug}/${slug}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetBlogsListMutation,
  useGetBlogBySlugQuery,
  useLazyGetBlogBySlugQuery,
} = blogService;
