import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType, Product } from "@/types/General";

export interface WishlistItem {
  id: number;
  product_id: number;
  // store_id removed/commented as it is no longer required in the application
  // store_id: number;
  product: Product;
  created_at: string;
  updated_at: string;
}

export interface GetWishlistResponse extends CommonResponseType {
  data: {
    data: WishlistItem[];
    total?: number;
    current_page?: number;
    last_page?: number;
  };
}

export interface AddWishlistResponse extends CommonResponseType {
  data: {
    is_wishlist: boolean;
    message?: string;
  };
}

export const wishlistService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getWishlist: builder.query<
      GetWishlistResponse,
      { type?: string; product_id?: number | string }
    >({
      query: ({ type = "quick", product_id }) => {
        const queryParams = new URLSearchParams();
        queryParams.append("type", type);
        if (product_id) {
          queryParams.append("product_id", product_id.toString());
        }
        return {
          url: `${END_POINTS.getWishlist}?${queryParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["WISHLIST"],
    }),

    addWishlist: builder.mutation<
      AddWishlistResponse,
      {
        product_id: number | string;
        // store_id removed/commented as it is no longer required in the application
        // store_id: number | string;
        is_wishlist: boolean;
        type?: string;
      }
    >({
      query: (data) => {
        return {
          url: `${END_POINTS.addWishlist}`,
          method: "POST",
          body: {
            product_id: String(data.product_id),
            // store_id removed/commented as it is no longer required in the application
            // store_id: String(data.store_id),
            is_wishlist: data.is_wishlist,
            type: data.type || "normal",
          },
          headers: {
            "Content-Type": "application/json",
          },
        };
      },
      invalidatesTags: ["WISHLIST"],
    }),

    deleteWishlist: builder.mutation<
      AddWishlistResponse,
      {
        product_id: number | string;
        // store_id removed/commented as it is no longer required in the application
        // store_id: number | string;
        type?: string;
      }
    >({
      query: (data) => {
        return {
          url: `${END_POINTS.deleteWishlist}`,
          method: "DELETE",
          body: {
            product_id: data.product_id,
            // store_id removed/commented as it is no longer required in the application
            // store_id: data.store_id,
            type: data.type || "normal",
          },
          headers: {
            "Content-Type": "application/json",
          },
        };
      },
      invalidatesTags: ["WISHLIST"],
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useLazyGetWishlistQuery,
  useAddWishlistMutation,
  useDeleteWishlistMutation,
} = wishlistService;

