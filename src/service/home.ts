import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType } from "@/types/General";
import { getCartDeliveryContextForRequest } from "@/utils/cartRequestContext";
import { readPincodeForProductApi } from "@/utils/deliveryAddressSync";

export type HomePageQueryArg = {
  latitude: number;
  longitude: number;
  type: "quick" | "normal";
  /** Optional; quick / map flows often need pin-based catalog filtering on the node API. */
  pincode?: string | null;
};

export type CategoryDashboardQueryArg = {
  categoryId: number;
  page?: number;
  limit?: number;
  latitude: number;
  longitude: number;
  type: "quick" | "normal";
  pincode?: string | null;
};

type CookieConfigResponse = CommonResponseType & {
  data?: {
    isbanner?: boolean | number;
    page_analytics?: {
      post_url?: string;
      event_type?: string;
    };
  };
  isbanner?: boolean | number;
  page_analytics?: {
    post_url?: string;
    event_type?: string;
  };
};

export const homeService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    homePage: builder.query<
      CommonResponseType & { data: { data: any[] } },
      HomePageQueryArg
    >({
      query: ({ latitude, longitude, type, pincode }) => {
        const p = new URLSearchParams();
        p.set("limit", "25");
        p.set("latitude", String(latitude));
        p.set("longitude", String(longitude));
        p.set("type", type);
        const body: Record<string, unknown> = {
          latitude,
          longitude,
          type,
        };
        const pc = pincode != null ? String(pincode).trim() : "";
        if (pc) {
          body.pincode = pc;
        }
        return {
          url: `${END_POINTS.dashboard}?${p.toString()}`,
          method: "POST",
          body,
        };
      },
      keepUnusedDataFor: 300,
      providesTags: ["DASHBOARD"],
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
        } catch (error) {
          /* ignore */
        }
      },
    }),
    getProducts: builder.query<
      CommonResponseType & { data: { data: any[]; total?: number } },
      {
        type?: number;
        page?: number;
        limit?: number;
        latitude?: number;
        longitude?: number;
        brand_id?: number | string;
      }
    >({
      query: ({
        type = 2,
        page = 1,
        limit = 10,
        latitude = 28.6573,
        longitude = 77.1642,
        brand_id,
      }) => {
        const queryParams = new URLSearchParams();
        queryParams.append("type", type.toString());
        queryParams.append("page", page.toString());
        queryParams.append("limit", limit.toString());
        queryParams.append("latitude", latitude.toString());
        queryParams.append("longitude", longitude.toString());
        if (brand_id) {
          queryParams.append("brand_id", brand_id.toString());
        }
        return {
          url: `${END_POINTS.getProducts}?${queryParams.toString()}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 300,
    }),
    getProductDetails: builder.query<
      CommonResponseType & { data: any; recommended_products?: any[] },
      {
        product_id?: number | string | null;
        slug?: string;
        type?: "quick" | "normal";
        latitude?: number;
        longitude?: number;
        pincode?: string | null;
      }
    >({
      query: ({ product_id, slug, type, latitude, longitude, pincode }) => {
        const ctx = (() => {
          try {
            return getCartDeliveryContextForRequest();
          } catch {
            return {
              type: "normal" as const,
              latitude: 28.6573,
              longitude: 77.1642,
            };
          }
        })();
        const lat = latitude ?? ctx.latitude;
        const lng = longitude ?? ctx.longitude;
        const channel = type ?? ctx.type;
        const slugValue = String(slug || "").trim();
        const pid =
          product_id != null && product_id !== ""
            ? Number(product_id)
            : NaN;
        const resolvedProductId =
          Number.isFinite(pid) && pid > 0 ? pid : null;
        const body: Record<string, unknown> = {
          product_id: resolvedProductId,
          type: channel,
          latitude: lat,
          longitude: lng,
        };
        // Backend mis-resolves some OOS products when both product_id and slug
        // are sent (slug wins and can return an unrelated product). Prefer id.
        if (slugValue && resolvedProductId == null) {
          body.slug = slugValue;
        }
        const pc =
          pincode != null && String(pincode).trim()
            ? String(pincode).trim()
            : readPincodeForProductApi();
        if (pc) {
          body.pincode = pc;
        }
        return {
          url: `${END_POINTS.getProductDetails}`,
          method: "POST",
          body,
        };
      },
      keepUnusedDataFor: 300,
    }),
    subscribeStockAlert: builder.mutation<
      CommonResponseType & { message?: string },
      {
        product_id: number;
        variation_id?: number | null;
        email: string;
      }
    >({
      query: ({ product_id, variation_id, email }) => {
        const vid =
          variation_id !== undefined && variation_id !== null
            ? Number(variation_id)
            : NaN;
        const body: Record<string, number | string> = {
          product_id: Number(product_id),
          email: String(email || "").trim(),
        };
        if (Number.isFinite(vid) && vid > 0) {
          body.variation_id = vid;
        }
        return {
          url: END_POINTS.stockAlertSubscribe,
          method: "POST",
          body,
        };
      },
    }),
    getMoreProducts: builder.query<
      CommonResponseType & { data: { moreProducts: any[] } },
      { productId: number | string; type?: string }
    >({
      query: ({ productId, type }) => {
        const params = new URLSearchParams();
        if (type) params.append("type", type);
        const qs = params.toString();
        return {
          url: `${END_POINTS.moreProduct}/${productId}${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 60,
    }),
    getProductKitDetail: builder.query<
      CommonResponseType & {
        data: {
          productKit: {
            id: number;
            kit_name: string;
            description: string | null;
            image: string;
            price: string;
            final_price?: string;
            total_mrp: string;
            total_before_discount: string;
            discount_amount: string;
            in_stock: boolean;
            warehouse_id?: number;
            items: Array<{
              id: number;
              product_id: number;
              product_variation_id: number;
            // store_id removed/commented as it is no longer required in the application
            // store_id: number;
              quantity: number;
              final_price: string;
              in_stock: boolean;
              available_quantity: number;
              product: { id: number; name: string; price: string; mrp: string };
              store: { id: number; name: string };
            }>;
          };
        };
      },
      { kitId: number | string }
    >({
      query: ({ kitId }) => ({
        url: `${END_POINTS.getProductKitDetail}/${kitId}`,
        method: "GET",
      }),
      // skip: (arg) => !arg?.kitId,
    }),
    viewAllCategory: builder.query<
      CommonResponseType & { data: any[] },
      {
        latitude?: number;
        longitude?: number;
        type?: "quick" | "normal";
      } | void
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
        const latitude = arg && "latitude" in arg && arg.latitude != null ? arg.latitude : ctx.latitude;
        const longitude = arg && "longitude" in arg && arg.longitude != null ? arg.longitude : ctx.longitude;
        const type = arg && "type" in arg && arg.type ? arg.type : ctx.type;

        const queryParams = new URLSearchParams();
        queryParams.set("latitude", String(latitude));
        queryParams.set("longitude", String(longitude));
        queryParams.set("type", type);

        return {
          url: `${END_POINTS.viewAllCategory}?${queryParams.toString()}`,
          method: "POST",
          body: {
            latitude,
            longitude,
            type,
          },
        };
      },
      keepUnusedDataFor: 300,
      providesTags: ["CATEGORY"],
    }),
    getCategoryList: builder.query<
      CommonResponseType & {
        data: {
          id: number;
          name: string;
          image_url: string;
          parent_id: number;
          icon_url: string;
        }[];
      },
      {
        latitude?: number;
        longitude?: number;
        type?: "quick" | "normal";
      } | void
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
        const latitude =
          arg && "latitude" in arg && arg.latitude != null
            ? arg.latitude
            : ctx.latitude;
        const longitude =
          arg && "longitude" in arg && arg.longitude != null
            ? arg.longitude
            : ctx.longitude;
        const type = arg && "type" in arg && arg.type ? arg.type : ctx.type;

        const params = new URLSearchParams();
        params.set("latitude", String(latitude));
        params.set("longitude", String(longitude));
        params.set("type", type);

        return {
          url: `${END_POINTS.CATEGORY_LIST}?${params.toString()}`,
          method: "GET",
        };
      },
    }),
    viewAllProduct: builder.query<
      CommonResponseType & {
        data: {
          data: any[];
          total?: number;
          data_count?: number;
          total_pages?: number;
          current_page?: number;
          page_per_data?: number;
        };
      },
      {
        page?: number;
        limit?: number;
        /** Listing/filter type (POST body); not the same as delivery `deliveryType` on the query string. */
        type?: string;
        sortId?: number;
        category_id?: number | string;
        brand_id?: number | string;
        productIds?: number[] | string[];
        brandIds?: number[] | string[];
        categoryIds?: number[] | string[];
        shopAttributesEntityIds?: number[] | string[];
        attributeIds?: number[] | string[];
        /** Plain-text search (matches backend viewAllProduct search / keyword). */
        search?: string;
        /** Delivery context on the query string (same as dashboard). */
        latitude: number;
        longitude: number;
        deliveryType: "quick" | "normal";
      }
    >({
      query: ({
        page = 1,
        limit = 10,
        type,
        sortId,
        category_id,
        brand_id,
        productIds,
        brandIds,
        categoryIds,
        shopAttributesEntityIds,
        attributeIds,
        search,
        latitude,
        longitude,
        deliveryType,
      }) => {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("limit", limit.toString());
        queryParams.append("latitude", String(latitude));
        queryParams.append("longitude", String(longitude));
        queryParams.append("type", deliveryType);

        const body: any = {};
        if (type) {
          body.type = type;
        }
        if (sortId) {
          body.sortId = sortId;
        }
        if (category_id) {
          body.category_id = category_id;
        }
        if (brand_id) {
          body.brand_id = brand_id;
        }
        if (productIds && productIds.length > 0) {
          body.productIds = productIds;
        }
        if (brandIds && brandIds.length > 0) {
          body.brandIds = brandIds;
        }
        if (categoryIds && categoryIds.length > 0) {
          body.categoryIds = categoryIds;
        }
        // Send attribute/color filters: backend may expect attributeIds or shopAttributeIds
        const ids = attributeIds?.length ? attributeIds : shopAttributesEntityIds;
        if (ids && Array.isArray(ids) && ids.length > 0) {
          body.attributeIds = ids.map(Number);
          body.shopAttributeIds = ids.map(Number);
        }
        if (search && String(search).trim()) {
          body.search = String(search).trim();
        }
        // Ask backend to keep fully out-of-stock SKUs in results (Notify Me).
        // Ignored by older APIs; safe no-op when unsupported.
        body.include_out_of_stock = true;
        body.show_out_of_stock = true;

        return {
          url: `${END_POINTS.viewAllProduct}?${queryParams.toString()}`,
          method: "POST",
          body,
        };
      },
      keepUnusedDataFor: 300,
    }),
    getCategoryDashboard: builder.query<
      CommonResponseType & { data: { data: any[] } },
      CategoryDashboardQueryArg
    >({
      query: ({
        categoryId,
        page = 1,
        limit = 10,
        latitude,
        longitude,
        type,
        pincode,
      }) => {
        const queryParams = new URLSearchParams();
        queryParams.set("page", String(page));
        queryParams.set("limit", String(limit));
        queryParams.set("latitude", String(latitude));
        queryParams.set("longitude", String(longitude));
        queryParams.set("type", type);
        const body: Record<string, unknown> = {
          categoryId,
          latitude,
          longitude,
          type,
        };
        const pc = pincode != null ? String(pincode).trim() : "";
        if (pc) {
          body.pincode = pc;
        }
        return {
          url: `${END_POINTS.CATEGORY_DASHBOARD}?${queryParams.toString()}`,
          method: "POST",
          body,
        };
      },
      keepUnusedDataFor: 300,
      providesTags: ["DASHBOARD"],
    }),
    getBrandBanners: builder.query<
      CommonResponseType & { 
        data: { 
          data: Array<{
            id: number;
            title?: string;
            description?: string;
            image: string;
            url?: string | null;
            links?: Array<{
              id: number;
              linkable_type?: string | null;
              linkable_id?: number;
              banner_management_id?: number;
              type?: string;
            }>;
            banner_links?: Array<{
              id: number;
              linkable_type?: string | null;
              linkable_id?: number;
              banner_management_id?: number;
              type?: string;
            }>;
            linkable_ids?: number[];
          }>;
        };
      },
      {
        latitude?: number;
        longitude?: number;
        brand_ids?: number[] | string[];
      }
    >({
      query: ({
        latitude = 28.6573,
        longitude = 77.1642,
        brand_ids,
      }) => {
        const queryParams = new URLSearchParams();
        queryParams.append("latitude", latitude.toString());
        queryParams.append("longitude", longitude.toString());
        queryParams.append("module_type", "brands");
        if (brand_ids && brand_ids.length > 0) {
          queryParams.append("brand_ids", brand_ids.join(","));
        }
        return {
          url: `${END_POINTS.banners}?${queryParams.toString()}`,
          method: "GET",
          headers: {
            authorizationnode: "guest",
            Cookie: "i18next=en; i18next=en",
          },
        };
      },
      keepUnusedDataFor: 300,
    }),
    getCategoryBanners: builder.query<
      CommonResponseType & { 
        data: { 
          data: Array<{
            id: number;
            title?: string;
            description?: string;
            image: string;
            url?: string | null;
            links?: Array<{
              id: number;
              linkable_type?: string | null;
              linkable_id?: number;
              banner_management_id?: number;
              type?: string;
            }>;
            banner_links?: Array<{
              id: number;
              linkable_type?: string | null;
              linkable_id?: number;
              banner_management_id?: number;
              type?: string;
            }>;
            linkable_ids?: number[];
          }>;
        };
      },
      {
        latitude?: number;
        longitude?: number;
        category_ids?: number[] | string[];
      }
    >({
      query: ({
        latitude = 28.6573,
        longitude = 77.1642,
        category_ids,
      }) => {
        const queryParams = new URLSearchParams();
        queryParams.append("latitude", latitude.toString());
        queryParams.append("longitude", longitude.toString());
        queryParams.append("type", "normal");
        queryParams.append("module_type", "categories");
        if (category_ids && category_ids.length > 0) {
          queryParams.append("category_ids", category_ids.join(","));
        }
        return {
          url: `${END_POINTS.banners}?${queryParams.toString()}`,
          method: "GET",
        };
      },
      keepUnusedDataFor: 300,
    }),
    getCookieConfig: builder.query<CookieConfigResponse, void>({
      query: () => ({
        url: END_POINTS.cookieConfig,
        method: "GET",
      }),
      keepUnusedDataFor: 60,
    }),
    postCookieEvent: builder.mutation<
      CommonResponseType & { data?: unknown },
      {
        event_type: string;
        session_id: string;
        page_name: string;
        page_path: string;
        duration_ms: number;
      }
    >({
      query: (body) => ({
        url: END_POINTS.cookieEvent,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useHomePageQuery,
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useGetProductDetailsQuery,
  useLazyGetProductDetailsQuery,
  useSubscribeStockAlertMutation,
  useLazyGetMoreProductsQuery,
  useGetProductKitDetailQuery,
  useLazyGetProductKitDetailQuery,
  useViewAllCategoryQuery,
  useLazyViewAllCategoryQuery,
  useViewAllProductQuery,
  useLazyViewAllProductQuery,
  useGetCategoryListQuery,
  useGetCategoryDashboardQuery,
  useGetBrandBannersQuery,
  useLazyGetBrandBannersQuery,
  useGetCategoryBannersQuery,
  useLazyGetCategoryBannersQuery,
  useLazyGetCookieConfigQuery,
  usePostCookieEventMutation,
} = homeService;
