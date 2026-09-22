import { RootState } from "@/types/General";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface WishlistState {
  productIdsByType: {
    normal: number[];
    quick: number[];
  };
}

const initialState: WishlistState = {
  productIdsByType: {
    normal: [],
    quick: [],
  },
};

export const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    setWishlistProductIds: (
      state,
      action: PayloadAction<{ type: "normal" | "quick"; productIds: number[] }>,
    ) => {
      state.productIdsByType[action.payload.type] = action.payload.productIds;
    },
    addToWishlistState: (
      state,
      action: PayloadAction<{ type: "normal" | "quick"; productId: number }>,
    ) => {
      const productIds = state.productIdsByType[action.payload.type];
      if (!productIds.includes(action.payload.productId)) {
        productIds.push(action.payload.productId);
      }
    },
    removeFromWishlistState: (
      state,
      action: PayloadAction<{ type: "normal" | "quick"; productId: number }>,
    ) => {
      state.productIdsByType[action.payload.type] = state.productIdsByType[
        action.payload.type
      ].filter((id) => id !== action.payload.productId);
    },
    toggleWishlistState: (
      state,
      action: PayloadAction<{ type: "normal" | "quick"; productId: number }>,
    ) => {
      const productIds = state.productIdsByType[action.payload.type];
      const index = productIds.indexOf(action.payload.productId);
      if (index === -1) {
        productIds.push(action.payload.productId);
      } else {
        productIds.splice(index, 1);
      }
    },
    resetWishlist: (state) => {
      state.productIdsByType.normal = [];
      state.productIdsByType.quick = [];
    },
  },
});

export const {
  setWishlistProductIds,
  addToWishlistState,
  removeFromWishlistState,
  toggleWishlistState,
  resetWishlist,
} = wishlistSlice.actions;

export const getWishlistProductIds = (
  state: RootState,
  type: "normal" | "quick" = "normal",
) => state.wishlist?.productIdsByType?.[type] || [];

export default wishlistSlice.reducer;
