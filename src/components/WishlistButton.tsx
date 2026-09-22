/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useCallback } from "react";
import { Checkbox } from "@mui/material";
import { useAddWishlistMutation, useDeleteWishlistMutation } from "@/service/wishlist";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import {
  addToWishlistState,
  removeFromWishlistState,
  getWishlistProductIds,
} from "@/lib/slices/wishlistSlice";
import { getToken } from "@/lib/slices/authSlice";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { getDeliveryChannel } from "@/utils/deliveryMode";
import { useSearchParams } from "next/navigation";

interface WishlistButtonProps {
  productId: number | string;
  // store_id removed/commented as it is no longer required in the application
  // storeId: number | string;
  isWishlist?: boolean;
  className?: string;
}

function WishlistButton({
  productId,
  // store_id removed/commented as it is no longer required in the application
  // storeId,
  isWishlist = false,
  className = "",
}: WishlistButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [addWishlist, { isLoading }] = useAddWishlistMutation();
  const wishlistType = getDeliveryChannel(searchParams);
  const wishlistProductIds = useAppSelector((state) =>
    getWishlistProductIds(state, wishlistType),
  );
  const reduxToken = useAppSelector(getToken);

  const [deleteWishlist, { isLoading: isDeleting }] = useDeleteWishlistMutation();
  
  // Local loading state for immediate feedback
  const [localLoading, setLocalLoading] = React.useState(false);

  // Check token from both Redux and localStorage
  const token = reduxToken || getFromStorage(STORAGE_KEYS.token);

  const [wishlistOverride, setWishlistOverride] = React.useState<boolean | null>(
    null
  );
  const isInWishlistFromRedux = wishlistProductIds.includes(Number(productId));
  const isInWishlist = wishlistOverride ?? isInWishlistFromRedux;

  React.useEffect(() => {
    // Reset local override when button receives a different item/new payload.
    // Heart state itself must stay mode-specific, so rely on Redux wishlist ids
    // for the active delivery type instead of mixed API `is_wishlist` flags.
    setWishlistOverride(null);
  }, [productId, isWishlist]);

  const isCurrentlyLoading = isLoading || isDeleting || localLoading;

  const handleWishlistToggle = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();

      // Prevent multiple clicks during loading
      if (isCurrentlyLoading) {
        return;
      }

      // Re-check token at the time of click
      const currentToken = reduxToken || getFromStorage(STORAGE_KEYS.token);

      if (!currentToken) {
        toast.error("Please login to add items to wishlist");
        router.push("/auth/login");
        return;
      }

      if (!productId) {
        toast.error("Product information is missing");
        return;
      }

      const newWishlistState = !isInWishlist;

      // Set local loading immediately for instant feedback
      setLocalLoading(true);

      // Optimistic update - happens immediately
      setWishlistOverride(newWishlistState);
      if (newWishlistState) {
        dispatch(
          addToWishlistState({ type: wishlistType, productId: Number(productId) }),
        );
      } else {
        dispatch(
          removeFromWishlistState({
            type: wishlistType,
            productId: Number(productId),
          }),
        );
      }

      try {
        if (newWishlistState) {
          await addWishlist({
            product_id: productId,
            // store_id removed/commented as it is no longer required in the application
            // store_id: storeId,
            is_wishlist: true,
            type: wishlistType,
          }).unwrap();
          toast.success("Added to wishlist");
        } else {
          await deleteWishlist({
            product_id: productId,
            // store_id removed/commented as it is no longer required in the application
            // store_id: storeId,
            type: wishlistType,
          }).unwrap();
          toast.success("Removed from wishlist");
        }
      } catch (error: any) {
        // Revert optimistic update on error
        setWishlistOverride(!newWishlistState);
        if (newWishlistState) {
          dispatch(
            removeFromWishlistState({
              type: wishlistType,
              productId: Number(productId),
            }),
          );
        } else {
          dispatch(
            addToWishlistState({ type: wishlistType, productId: Number(productId) }),
          );
        }
        toast.error(error?.data?.message || "Failed to update wishlist");
      } finally {
        // Clear local loading state
        setLocalLoading(false);
      }
    },
    [addWishlist, deleteWishlist, dispatch, isInWishlist, productId, router, reduxToken, isCurrentlyLoading, wishlistType]
  );

  return (
    <Checkbox
      checked={isInWishlist}
      onChange={handleWishlistToggle}
      onClick={(e) => e.stopPropagation()}
      disabled={isCurrentlyLoading}
      className={className}
      sx={{
        padding: 0,
        opacity: isCurrentlyLoading ? 0.7 : 1,
        cursor: isCurrentlyLoading ? "not-allowed" : "pointer",
        transition: "opacity 0.2s ease",
        backgroundColor: "transparent",
        "&:hover": { backgroundColor: "transparent" },
        "&.Mui-checked": { backgroundColor: "transparent" },
        "&.MuiCheckbox-root:hover": { backgroundColor: "transparent" },
        "& .MuiSvgIcon-root": {
          display: "none"
        },
        "& .MuiCheckbox-root": {
          padding: 0
        }
      }}
      icon={
        <span
          className="icon_theme_primary"
          style={{
            display: "block",
            WebkitMaskImage: "url(/images/heart_outline_icon.svg)",
            maskImage: "url(/images/heart_outline_icon.svg)",
          }}
          aria-hidden
        />
      }
      checkedIcon={
        <span
          className="icon_theme_primary"
          style={{
            display: "block",
            WebkitMaskImage: "url(/images/heart_filled_icon.svg)",
            maskImage: "url(/images/heart_filled_icon.svg)",
          }}
          aria-hidden
        />
      }
    />
  );
}

export default WishlistButton;
