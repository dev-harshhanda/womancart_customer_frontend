/* eslint-disable @next/next/no-img-element */
import {
  Box,
  Checkbox,
  CircularProgress,
  MenuItem,
  Rating,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import React, { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Product } from "@/types/General";
import { useAddWishlistMutation, useDeleteWishlistMutation } from "@/service/wishlist";
import { useAddToCartMutation, useGetCartQuery } from "@/service/cart";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { useLazyGetProfileQuery } from "@/service/auth";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { setUser } from "@/lib/slices/authSlice";

import toast from "react-hot-toast";
import { getToken } from "@/lib/slices/authSlice";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { getDeliveryChannel, getDeliveryMode } from "@/utils/deliveryMode";
import { getProductBadgeLabel } from "@/utils/productBadge";
import {
  buildProductUrl,
  getVariantUrlSlug,
  resolveProductNavigationSlug,
} from "@/utils/urlBuilder";
import { parseReviewCount } from "@/utils/reviewText";
import { formatPriceInr } from "@/utils/format";
import { showMrpAsCutPrice } from "@/utils/priceDisplay";
import {
  getCartQtyForProductSku,
  getMaxUnitsPerSkuFromStock,
  isSkuInStock,
  toastMaxQuantityInCart,
} from "@/utils/cartSkuLimits";
import { pushEvent, buildGtmItem } from "@/lib/dataLayer";
import {
  collectVariationImageUrls,
  getMergedHeroImageUrl,
  getProductImageUrlForVariationId,
} from "@/utils/variationImages";
import { useLazyGetProductDetailsQuery } from "@/service/home";
import WishlistButton from "./WishlistButton";

interface ProductCardProps {
  product: {
    image: string;
    category: string;
    title: string;
    price: number;
    oldPrice: number;
    discount: number;
    rating: number;
    reviews: number;
    bestseller?: boolean;
    time?: string;
    variation_id?: number | undefined;
  };
}

function ProductCard({ product }: { product: Product }) {

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deliveryMode = getDeliveryMode(searchParams);
  const quickModeTagLabel =
    deliveryMode === "quick_delivery" ? "Quick Delivery" : null;
  const dispatch = useAppDispatch();

  // Variations from API: prefer in-stock, skip stock_quantity 0; label = name ?? id
  const rawVariations = Array.isArray((product as any)?.variations)
    ? (product as any).variations
    : [];
  const productId = product?.product_id;
  const inStockVariations = rawVariations.filter(
    (v: any) => Number(v?.stock_quantity) > 0
  );
  const displayVariations =
    inStockVariations.length > 0 ? inStockVariations : rawVariations;
  const defaultVariation =
    displayVariations.find((v: any) => v?.is_default === 1) ||
    displayVariations[0];
  const getVariationLabel = (v: any) => {
    const attrs = Array.isArray(v?.variation_attributes)
      ? v.variation_attributes
      : Array.isArray(v?.attributes)
        ? v.attributes
        : [];
    const values = attrs
      .map((a: any) => {
        const value =
          a?.attribute_option?.display_value ??
          a?.attributeOption?.display_value ??
          a?.attribute_option?.value ??
          a?.attributeOption?.value ??
          a?.value ??
          a?.attribute_value ??
          a?.option ??
          a?.option_value ??
          a?.display_value ??
          a?.label ??
          "";
        return String(value || "").trim();
      })
      .filter(Boolean);

    if (values.length === 1) return values[0];
    if (values.length > 1) return values.join(" - ");

    if (v?.name != null && String(v.name).trim() !== "") {
      return String(v.name).trim();
    }
    return "Variant " + String(v?.id ?? "");
  };

  // Color attribute option from a variation (for swatch UI). Uses same attrs source as getVariationLabel.
  const getColorOption = (v: any): { display_value: string; color_code: string } | null => {
    const attrs = Array.isArray(v?.variation_attributes)
      ? v.variation_attributes
      : Array.isArray(v?.attributes)
        ? v.attributes
        : [];
    if (!attrs.length) return null;
    const colorNames = ["color", "colour", "shade", "shades"];
    const colorAttr = attrs.find((a: any) => {
      const name = (a?.attribute?.name ?? (a as any)?.attributeName ?? a?.name ?? "").toString().toLowerCase();
      return colorNames.some((c) => name === c || name.includes(c));
    });
    const opt = colorAttr?.attribute_option ?? (colorAttr as any)?.attributeOption ?? colorAttr;
    const displayValue = opt?.display_value ?? (opt as any)?.displayValue ?? opt?.value ?? opt?.label;
    if (!displayValue) return null;
    const colorCode = opt?.color_code ?? (opt as any)?.colorCode ?? opt?.color;
    return {
      display_value: String(displayValue).trim(),
      color_code: colorCode ? String(colorCode).trim() : "#e0e0e0",
    };
  };

  // Show color swatch dropdown if at least one variation has a Color attribute (with or without color_code)
  const isColorVariation =
    displayVariations.length > 0 &&
    displayVariations.some((v: any) => getColorOption(v) !== null);

  const [selectedVariationId, setSelectedVariationId] = React.useState<string>(
    defaultVariation ? String(defaultVariation.id) : ""
  );

  const [colorModalOpen, setColorModalOpen] = React.useState(false);
  const figureRef = React.useRef<HTMLDivElement>(null);
  const colorPopupRef = React.useRef<HTMLDivElement>(null);
  const colorTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const handleColorDropdownOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setColorModalOpen((prev) => !prev);
  };
  const handleColorDropdownClose = () => setColorModalOpen(false);

  // Close shade picker on outside click / Escape (standard dropdown behavior)
  React.useEffect(() => {
    if (!colorModalOpen || !isColorVariation) return;

    const closeIfOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (colorPopupRef.current?.contains(target)) return;
      if (colorTriggerRef.current?.contains(target)) return;
      setColorModalOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setColorModalOpen(false);
    };

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [colorModalOpen, isColorVariation]);

  // Keep selected variation in sync when product/variations change (e.g. from list API)
  React.useEffect(() => {
    const nextDefault = defaultVariation ? String(defaultVariation.id) : "";
    setSelectedVariationId((prev) => {
      const stillValid = displayVariations.some(
        (v: any) => String(v?.id) === prev
      );
      return stillValid ? prev : nextDefault;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.product_id, rawVariations.length, defaultVariation?.id]);

  const [addWishlist, { isLoading: isAdding }] = useAddWishlistMutation();
  const [deleteWishlist, { isLoading: isDeleting }] = useDeleteWishlistMutation();
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();
  const [getProfile] = useLazyGetProfileQuery();
  const [getProductDetails] = useLazyGetProductDetailsQuery();


  /** Full PDP payload resolves variant images like the product detail page (list API is often incomplete). */
  const pdpHeroByVariationRef = React.useRef<Record<string, string>>({});
  const [pdpHeroRevision, setPdpHeroRevision] = React.useState(0);

  React.useEffect(() => {
    pdpHeroByVariationRef.current = {};
    setPdpHeroRevision((n) => n + 1);
  }, [product?.product_id]);

  const fetchPdpHeroForVariation = React.useCallback(
    async (variationId: string) => {
      if (!productId || !variationId) return;
      if (pdpHeroByVariationRef.current[variationId]) return;
      try {
        const channel = getDeliveryChannel(searchParams);
        const res = await getProductDetails({
          product_id: productId,
          type: channel,
        }).unwrap();
        const data = (res as { data?: unknown }).data ?? res;
        const variations = (data as { variations?: unknown[] })?.variations;
        const variant = Array.isArray(variations)
          ? variations.find(
            (x: unknown) =>
              String((x as { id?: unknown })?.id) === variationId
          )
          : null;
        if (!variant) return;
        const hero = getMergedHeroImageUrl(variant, data);
        if (hero) {
          pdpHeroByVariationRef.current[variationId] = hero;
          setPdpHeroRevision((n) => n + 1);
        }
      } catch (e) {
        console.warn("ProductCard: PDP fetch for variant image failed", e);
      }
    },
    [productId, getProductDetails, searchParams]
  );

  const isDisabled = (product as any)?.status === false;

  const selectedVariationForStock =
    displayVariations.length > 0
      ? displayVariations.find((v: any) => String(v?.id) === selectedVariationId) ??
        defaultVariation ??
        displayVariations[0] ??
        null
      : null;
  const currentSkuInStock = isSkuInStock(
    displayVariations.length > 0 ? selectedVariationForStock : null,
    product as any,
  );

  const reduxToken = useAppSelector(getToken);

  // Check token from both Redux and localStorage
  const token = reduxToken || getFromStorage(STORAGE_KEYS.token);
  const cartListArgs = useDashboardHomeQueryArgs();
  const { data: cartData } = useGetCartQuery(cartListArgs, { skip: !token });

  const handleVariationChange = (event: SelectChangeEvent) => {
    const nextId = event.target.value as string;
    setSelectedVariationId(nextId);
    void fetchPdpHeroForVariation(nextId);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isDisabled) return;
    if (!currentSkuInStock) {
      return;
    }

    const productId = product?.product_id;
    // Use selected variation from dropdown when variations exist; else fallback to product-level variation_id
    const variationId =
      displayVariations.length > 0 && selectedVariationId
        ? Number(selectedVariationId)
        : (product as any)?.variation_id ??
        (product as any)?.product_variation_id ??
        (product as any)?.default_variation_id ??
        (product as any)?.variation?.id ??
        (Array.isArray((product as any)?.variations) && (product as any).variations[0]?.id) ??
        null;
    const variationIdNum = variationId != null && !Number.isNaN(variationId) ? Number(variationId) : null;

    if (!productId) {
      toast.error("Invalid product: Product ID is missing");
      return;
    }

    const selectedVarForLimit =
      displayVariations.length > 0
        ? displayVariations.find((v: any) => String(v?.id) === selectedVariationId) ??
        null
        : null;
    const maxSelectable = getMaxUnitsPerSkuFromStock(
      displayVariations.length > 0 ? selectedVarForLimit : null,
      product as any,
    );
    const cartQty = getCartQtyForProductSku(
      cartData?.data?.items,
      productId,
      variationIdNum,
    );
    const maxAddNow =
      maxSelectable < 1 ? 0 : Math.max(0, maxSelectable - cartQty);

    if (maxSelectable > 0 && maxAddNow < 1) {
      toastMaxQuantityInCart(maxSelectable);
      return;
    }

    try {
      const deliveryChannel = getDeliveryChannel(searchParams);
      const payload: {
        product_id: number;
        qty: number;
        channel: string;
        variation_id?: number | null;
        store_id?: number;
      } = {
        product_id: Number(productId),
        qty: 1,
        channel: deliveryChannel,
      };
      const rawStoreId =
        (product as any)?.store_id ??
        (product as any)?.store?.id ??
        (product as any)?.warehouse_id ??
        null;
      const normalizedStoreId = Number(rawStoreId);
      if (Number.isFinite(normalizedStoreId) && normalizedStoreId > 0) {
        payload.store_id = normalizedStoreId;
      }
      if (variationIdNum != null && !Number.isNaN(variationIdNum)) {
        payload.variation_id = variationIdNum;
      }

      const res = await addToCart(payload).unwrap();
      if (res?.statusCode === 200) {
        toast.success("Added to cart successfully", {
          id: "add-to-cart-success",
        });
        pushEvent("add_to_cart", {
          items: [buildGtmItem(product, { quantity: payload.qty })],
        });
        // Refresh profile so header cart count (quick/ecom) stays in sync
        const currentToken = reduxToken || getFromStorage(STORAGE_KEYS.token);
        if (currentToken) {
          try {
            const profileRes = await getProfile().unwrap();
            if (profileRes?.statusCode === 200 && profileRes?.data) {
              dispatch(setUser({ user: profileRes.data }));
            }
          } catch (profileErr) {
            console.warn("Failed to refresh profile after add to cart (ProductCard):", profileErr);
          }
        }
      } else {
        toast.error(res?.message || "Failed to add to cart");
      }
    } catch (error: any) {
      console.error("Add to cart error:", error);
      // Don't show generic error if it's a 500 error that will redirect
      if (error?.status !== 500 && error?.originalStatus !== 500) {
        toast.error(error?.data?.message || "Failed to add to cart");
      }
    }
  };

  // store_id removed/commented as it is no longer required in the application
  // const storeId = product?.store_id;

  const productWithOptionalTitle = product as Product & { title?: string };
  const productSlug =
    productWithOptionalTitle?.slug ||
    productWithOptionalTitle?.product_name ||
    productWithOptionalTitle?.title ||
    "";


  const selectedVariationForNavigation =
    displayVariations.find(
      (v: any) => String(v?.id) === selectedVariationId
    ) ||
    defaultVariation ||
    displayVariations[0];

  const variantSlugForNavigation =
    getVariantUrlSlug(selectedVariationForNavigation) ||
    getVariantUrlSlug(displayVariations[0]);

  const resolvedNavigation = resolveProductNavigationSlug(
    productSlug,
    variantSlugForNavigation || undefined,
    productId
  );

  const productHref = productId
    ? buildProductUrl(
        resolvedNavigation.slug,
        {
          product_id: resolvedNavigation.productId,
        },
        {
          usePathSlugAsIs: Boolean(variantSlugForNavigation),
        }
      )
    : "#";
      
  const handleProductClick = () => {
    if (isDisabled || !productId) return;

    pushEvent("select_item", {
      items: [buildGtmItem(product)],
    });

    router.push(productHref);
  };



  const statusLabel = getProductBadgeLabel(product);

  const selectedVarForImage =
    displayVariations.find((v: any) => String(v?.id) === selectedVariationId) ||
    rawVariations.find((v: any) => String(v?.id) === selectedVariationId);
  const cardDisplayImage = (() => {
    void pdpHeroRevision;
    const fromPdp = pdpHeroByVariationRef.current[selectedVariationId];
    if (fromPdp) return fromPdp;
    const urls = collectVariationImageUrls(selectedVarForImage);
    if (urls.length > 0) return urls[0];
    const fromProductGallery = getProductImageUrlForVariationId(
      product,
      selectedVariationId
    );
    if (fromProductGallery) return fromProductGallery;
    const p = product as any;
    const fallback =
      (p?.image || p?.primary_image || p?.image_url || "").toString().trim();
    return fallback || "/images/product_default.png";
  })();

  return (
    <div
      className={`productCard_item${isDisabled ? " productCard_item--disabled" : ""}`}
    >
      <Box
        component="a"
        href={isDisabled ? undefined : productHref}
        className="overlay_click"
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }

          // Keep normal browser behavior for:
          // right click / middle click / Ctrl+click / Cmd+click / Shift+click
          if (
            e.button !== 0 ||
            e.ctrlKey ||
            e.metaKey ||
            e.shiftKey ||
            e.altKey
          ) {
            return;
          }

          e.preventDefault();

          pushEvent("select_item", {
            items: [buildGtmItem(product)],
          });

          router.push(productHref);
        }}
        sx={{
          cursor: isDisabled ? "not-allowed" : "pointer",
        }}
      />
      <Box ref={figureRef} sx={{ position: "relative" }}>
        <figure>
          <img
            key={`${product?.product_id}-${selectedVariationId}-${cardDisplayImage}`}
            src={cardDisplayImage}
            alt="Product"
          />

          <Box sx={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}>
            <WishlistButton
              productId={product?.product_id}
              isWishlist={product?.is_wishlist}
            />
          </Box>
          {statusLabel && <span className="bestseller">{statusLabel}</span>}

          <Box
            component="a"
            className={`add${!currentSkuInStock ? " add--notify" : ""}`}
            onClick={currentSkuInStock ? handleAddToCart : (e) => {
              e.stopPropagation();
              e.preventDefault();
              handleProductClick();
            }}
            sx={{
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.6 : 1,
            }}
          >
            {isAddingToCart ? (
              <CircularProgress size={20} color="inherit" />
            ) : currentSkuInStock ? (
              <>
                <AddIcon /> Add
              </>
            ) : (
              "Notify Me"
            )}
          </Box>
        </figure>

        {/* Shade modal overlay over product image (only when multiple variants) */}
        {isColorVariation && colorModalOpen && displayVariations.length > 1 && (
          <Box
            ref={colorPopupRef}
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              maxHeight: "100%",
              overflowY: "auto",
              bgcolor: "background.paper",
              borderRadius: 1.5,
              display: "flex",
              flexDirection: "column",
              p: 1.5,
              zIndex: 10,
              boxShadow: 3,
            }}
          >
            {(() => {
              const sel = displayVariations.find(
                (v: any) => String(v?.id) === selectedVariationId
              );
              const colorOpt = sel ? getColorOption(sel) : null;
              return (
                <Box sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 1.5 }}>
                  {colorOpt?.display_value ?? getVariationLabel(sel) ?? "Shade"}
                </Box>
              );
            })()}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                flex: 1,
                minHeight: 0,
                alignContent: "start",
              }}
            >
              {displayVariations.map((v: any) => {
                const colorOpt = getColorOption(v);
                const isSelected = String(v?.id) === selectedVariationId;
                return (
                  <Box
                    key={v?.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const vid = String(v?.id);
                      setSelectedVariationId(vid);
                      handleColorDropdownClose();
                      void fetchPdpHeroForVariation(vid);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const vid = String(v?.id);
                        setSelectedVariationId(vid);
                        handleColorDropdownClose();
                        void fetchPdpHeroForVariation(vid);
                      }
                    }}
                    sx={{
                      aspectRatio: "1",
                      borderRadius: 1,
                      position: "relative",
                      border: "1px solid",
                      borderColor: "divider",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      "&:hover": { opacity: 0.9 },
                    }}
                    style={{
                      backgroundColor: colorOpt?.color_code ?? "#e0e0e0",
                    }}
                  >
                    {isSelected && (
                      <CheckIcon
                        sx={{
                          color: "#fff",
                          fontSize: 22,
                          filter: "drop-shadow(0 0 1px rgba(0,0,0,0.5))",
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      <div className="card_info form">
        {product?.brand?.name && (
          <p
            className="brand_name"
            onClick={handleProductClick}
            style={{
              cursor: isDisabled ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: 500,
              color: "#888",
              marginBottom: "4px",
              textTransform: "uppercase",
            }}
          >
            {product.brand.name}
          </p>
        )}
        <div className="cat_flex" style={{ position: "relative", zIndex: 1 }}>
          <Link
            href={isDisabled ? "#" : productHref}
            className="cat"
            onClick={(e) => {
              if (isDisabled) {
                e.preventDefault();
                return;
              }

              if (
                e.button !== 0 ||
                e.ctrlKey ||
                e.metaKey ||
                e.shiftKey ||
                e.altKey
              ) {
                return;
              }

              e.preventDefault();
              handleProductClick();
            }}
          >
            {product?.product_name ?? ""}
          </Link>
          {displayVariations.length > 1 &&
            (isColorVariation ? (
              <>
                <Box
                  component="button"
                  type="button"
                  ref={colorTriggerRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleColorDropdownOpen(e);
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={colorModalOpen}
                  className="color_shade_trigger"
                  sx={{
                    position: "relative",
                    zIndex: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    border:
                      "0.5px solid var(--commerce-primary, #d91b76)",
                    borderRadius: 1,
                    py: 0.5,
                    px: 1,
                    minWidth: 80,
                    justifyContent: "space-between",
                    bgcolor: "background.paper",
                    cursor: "pointer",
                    font: "inherit",
                    "&:hover": {
                      borderColor: "var(--commerce-primary, #d91b76)",
                    },
                  }}
                >
                  {(() => {
                    const sel = displayVariations.find(
                      (v: any) => String(v?.id) === selectedVariationId
                    );
                    const colorOpt = sel ? getColorOption(sel) : null;
                    return (
                      <>
                        {/* {colorOpt && (
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: 0.5,
                              border: "1px solid",
                              borderColor: "divider",
                              flexShrink: 0,
                            }}
                            style={{ backgroundColor: colorOpt.color_code }}
                            aria-hidden
                          />
                        )} */}
                        <span style={{ flex: 1, textAlign: "left" }}>
                          {colorOpt?.display_value ?? getVariationLabel(sel) ?? "Shade"}
                        </span>
                        <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                      </>
                    );
                  })()}
                </Box>
              </>
            ) : (
              <Box
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                sx={{ position: "relative", zIndex: 2, minWidth: 96 }}
              >
                <Select
                  labelId="variation-select-label"
                  id="variation-select"
                  value={selectedVariationId}
                  onChange={handleVariationChange}
                  size="small"
                  displayEmpty
                  MenuProps={{
                    // MUI Select → Menu → Popover → Modal scroll lock breaks inside carousels;
                    // color variants use a custom overlay and never hit this path.
                    disableScrollLock: true,
                  }}
                >
                  {displayVariations.map((v: any) => (
                    <MenuItem key={v?.id} value={String(v?.id)}>
                      {getVariationLabel(v)}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            ))}
        </div>
        <h3
          onClick={handleProductClick}
          style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
        >
          {product?.category?.name}
        </h3>
        {quickModeTagLabel && (
          <p className="delivery_mode_tag">{quickModeTagLabel}</p>
        )}
        <p className="price">
          {(() => {
            const sel = displayVariations.find(
              (v: any) => String(v?.id) === selectedVariationId
            );
            const storePriceRaw =
              sel?.price != null ? sel.price : (product?.price as any)?.store_price;
            const mrpRaw =
              sel?.mrp != null ? sel.mrp : (product?.price as any)?.mrp;
            const storePrice = Number(storePriceRaw);
            const mrp = Number(mrpRaw);
            const hasCutMrp = showMrpAsCutPrice(mrpRaw, storePriceRaw);
            const pctOff = hasCutMrp
              ? storePrice != null &&
                mrp != null &&
                mrp > 0 &&
                !Number.isNaN(storePrice)
                ? Math.round(((mrp - storePrice) / mrp) * 100)
                : (product?.price as any)?.percentage_off
              : null;
            return (
              <>
                <ins>₹{formatPriceInr(storePrice ?? 0)}</ins>
                {pctOff != null && Number(pctOff) > 0 && (
                  <span className="price_cut">
                    <del>₹{formatPriceInr(mrp ?? 0)}</del>
                    <span>{pctOff}% off</span>
                  </span>
                )}
              </>
            );
          })()}
        </p>

        {(() => {
          const reviewCount = parseReviewCount(product?.review_count);
          if (reviewCount === 0) return null;
          return (
            <p className="review">
              {(product?.average_rating ? Number(product.average_rating) : 0).toFixed(1)}
              <Rating name="read-only" value={1} max={1} readOnly />
              <span>({reviewCount})</span>
            </p>
          );
        })()}


        {/* <p className="deal">
          <strong>Best Deal</strong>
          <span>₹400 with Plus</span>
        </p> */}

        {product?.delivery_time && (
          <p className="time">
            <img src="/images/time_icon.svg" alt="icon" />{" "}
            {product.delivery_time}
          </p>
        )}
      </div>
    </div >
  );
}

export default ProductCard;

