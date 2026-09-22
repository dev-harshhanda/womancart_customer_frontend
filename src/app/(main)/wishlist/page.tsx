/* eslint-disable @next/next/no-img-element */
"use client";
import BredCrum from "@/components/bredCrum";
import CustomPagination from "@/components/customPagination";
import ShareProduct from "@/components/shareProduct";
import { Button, Chip, CircularProgress } from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import SortByFilter from "@/components/sortByFilter";
import { sortProductsBySortId } from "@/utils/productSort";
import Filter from "@/components/filter/Filter";
import PopularBrandList from "@/components/popularBrandList";
import ProductCard from "@/components/productCard";
import { useGetWishlistQuery } from "@/service/wishlist";
import { useLazyViewAllProductQuery } from "@/service/home";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import {
  setWishlistProductIds,
  getWishlistProductIds,
} from "@/lib/slices/wishlistSlice";
import { Product } from "@/types/General";
import { getToken } from "@/lib/slices/authSlice";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { getDeliveryChannel } from "@/utils/deliveryMode";

const items = [{ label: "Wishlist" }];
const EMPTY_WISHLIST_ITEMS: any[] = [];

function parseIdsParam(paramValue: string | null) {
  if (!paramValue) return [];
  return paramValue
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => !Number.isNaN(id) && id > 0);
}

/** Read shared wishlist product ids from query (case-insensitive key). */
function getSharedProductIdsFromSearchParams(
  searchParams: Pick<URLSearchParams, "get" | "entries">,
) {
  const direct =
    searchParams.get("productIds") ??
    searchParams.get("share") ??
    searchParams.get("productids");
  if (direct) return parseIdsParam(direct);

  for (const [key, value] of searchParams.entries()) {
    if (key.toLowerCase() === "productids") {
      return parseIdsParam(value);
    }
  }
  return [];
}

function Wishlist() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const reduxToken = useAppSelector(getToken);
  const wishlistType = getDeliveryChannel(searchParams);
  const deliveryLocationArgs = useDashboardHomeQueryArgs();
  const sharedProductIds = useMemo(
    () => getSharedProductIdsFromSearchParams(searchParams),
    [searchParams],
  );
  const isSharedWishlistView = sharedProductIds.length > 0;
  const wishlistProductIds = useAppSelector((state) =>
    getWishlistProductIds(state, wishlistType),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [sortId, setSortId] = useState(1);
  const [isSorting, setIsSorting] = useState(false);
  const sortingTimerRef = useRef<number | null>(null);

  // Avoid reading localStorage during SSR / first hydration: the token gates the
  // entire render, so a server/client difference causes a structural hydration
  // mismatch (React throws in production -> global error boundary / 500).
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Check token from both Redux and localStorage (only meaningful after mount)
  const token = reduxToken || getFromStorage(STORAGE_KEYS.token);

  // Fetch wishlist data
  const {
    data: wishlistResponse,
    isLoading,
    isFetching,
    refetch,
  } = useGetWishlistQuery(
    { type: wishlistType },
    {
      skip: !token,
      refetchOnMountOrArgChange: true,
    }
  );

  const [
    fetchSharedProducts,
    {
      data: sharedProductsResponse,
      isLoading: isSharedProductsLoading,
      isFetching: isSharedProductsFetching,
    },
  ] = useLazyViewAllProductQuery();

  useEffect(() => {
    if (!isSharedWishlistView) return;
    void fetchSharedProducts({
      page: 1,
      limit: Math.max(sharedProductIds.length, 20),
      productIds: sharedProductIds,
      latitude: deliveryLocationArgs.latitude,
      longitude: deliveryLocationArgs.longitude,
      // Shared links must work regardless of the viewer's Quick/Normal toggle.
      deliveryType: "normal",
    });
  }, [
    isSharedWishlistView,
    sharedProductIds,
    deliveryLocationArgs.latitude,
    deliveryLocationArgs.longitude,
    fetchSharedProducts,
  ]);

  // Canonicalize `productIds` in the address bar (handles lowercase copies).
  useEffect(() => {
    if (!hasMounted || sharedProductIds.length === 0) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const canonical = sharedProductIds.join(",");
    if (params.get("productIds") === canonical) return;

    params.set("productIds", canonical);
    for (const key of [...params.keys()]) {
      if (key.toLowerCase() === "productids" && key !== "productIds") {
        params.delete(key);
      }
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [hasMounted, sharedProductIds]);

  // Support both Node API shape (data = array or data.data / data.items) and PHP shape
  const wishlistItems = useMemo(() => {
    const rawData = wishlistResponse?.data;
    if (!rawData) return EMPTY_WISHLIST_ITEMS;
    if (Array.isArray(rawData)) return rawData;
    return (rawData as any)?.data ?? (rawData as any)?.items ?? EMPTY_WISHLIST_ITEMS;
  }, [wishlistResponse?.data]);

  const rawData = wishlistResponse?.data;
  const apiTotal =
    (typeof rawData === "object" && rawData !== null && "total" in rawData
      ? (rawData as any).total
      : 0) || 0;
  const totalItems =
    apiTotal > 0
      ? apiTotal
      : wishlistProductIds.length > 0
        ? wishlistProductIds.length
        : 0;
  const totalPages =
    (typeof rawData === "object" && rawData !== null && "last_page" in rawData
      ? (rawData as any).last_page
      : 1) || 1;

  // Track previous wishlist count to detect removals
  const [prevWishlistCount, setPrevWishlistCount] = useState(wishlistProductIds.length);

  // Update wishlist state when data is fetched
  useEffect(() => {
    if (!token || isSharedWishlistView) return;
    const productIds = wishlistItems
      .map((item: any) => item.product?.product_id || item.product_id)
      .filter((id: unknown) => id != null && !Number.isNaN(Number(id)));
    const sameLength = productIds.length === wishlistProductIds.length;
    const sameIds =
      sameLength &&
      productIds.every(
        (id: number, index: number) =>
          Number(id) === Number(wishlistProductIds[index]),
      );
    if (sameIds) return;
    dispatch(setWishlistProductIds({ type: wishlistType, productIds }));
  }, [
    wishlistItems,
    dispatch,
    wishlistType,
    token,
    isSharedWishlistView,
    wishlistProductIds,
  ]);

  // Refetch wishlist when an item is removed (wishlistProductIds count decreases)
  useEffect(() => {
    if (!token || isSharedWishlistView) return;
    if (wishlistProductIds.length < prevWishlistCount) {
      refetch();
    }
    setPrevWishlistCount(wishlistProductIds.length);
  }, [
    wishlistProductIds.length,
    prevWishlistCount,
    refetch,
    token,
    isSharedWishlistView,
  ]);

  // Redirect to login if not authenticated (only after mount, once we can
  // reliably read the auth token on the client).
  useEffect(() => {
    if (hasMounted && !token && !isSharedWishlistView) {
      router.push("/auth/login");
    }
  }, [hasMounted, token, isSharedWishlistView, router]);

  useEffect(() => {
    return () => {
      if (sortingTimerRef.current !== null) {
        window.clearTimeout(sortingTimerRef.current);
      }
    };
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Convert wishlist items to products for ProductCard
  const products: Product[] = useMemo(() => {
    if (isSharedWishlistView) {
      const sharedRows = sharedProductsResponse?.data?.data ?? [];
      if (sharedRows.length > 0) {
        return sharedRows.map((product: any) => ({
          ...product,
          is_wishlist: false,
        }));
      }

      // Fallback when API returns nothing but viewer has matching wishlist items.
      if (token && wishlistItems.length > 0) {
        const idSet = new Set(sharedProductIds.map((id) => Number(id)));
        const fromWishlist = wishlistItems
          .map((item: any) => {
            const product = item.product ?? item;
            const productId = Number(
              product?.product_id ?? item?.product_id ?? product?.id,
            );
            if (!idSet.has(productId)) return null;
            return {
              ...product,
              product_id: productId,
              is_wishlist: true,
            } as Product;
          })
          .filter(Boolean) as Product[];
        if (fromWishlist.length > 0) return fromWishlist;
      }

      return [];
    }
    return wishlistItems.map((item: any) => {
      if (item.product) {
        return {
          ...item.product,
          is_wishlist: true,
        };
      }
      return {
        ...item,
        is_wishlist: true,
      };
    });
  }, [
    isSharedWishlistView,
    sharedProductsResponse?.data?.data,
    wishlistItems,
    sharedProductIds,
    token,
  ]);

  const wishlistShareUrl = useMemo(() => {
    if (typeof window === "undefined" || products.length === 0) return undefined;
    const ids = products
      .map((product) => product.product_id)
      .filter((id): id is number => id != null && !Number.isNaN(Number(id)));
    if (ids.length === 0) return undefined;
    const url = new URL("/wishlist/", window.location.origin);
    url.searchParams.set("productIds", ids.join(","));
    return url.href;
  }, [products]);

  const brandIds = useMemo(() => {
    const brandIdsParam = searchParams.get("brandIds");
    return parseIdsParam(brandIdsParam);
  }, [searchParams]);

  const categoryIds = useMemo(() => {
    const categoryIdsParam = searchParams.get("categoryIds");
    return parseIdsParam(categoryIdsParam);
  }, [searchParams]);

  const hasFilters = brandIds.length > 0 || categoryIds.length > 0;

  const filteredProducts = useMemo(() => {
    if (!hasFilters) {
      return products;
    }

    return products.filter((product) => {
      const productBrandId = Number(
        (product as any)?.brand?.id ??
        (product as any)?.brand_id ??
        (product as any)?.brandId
      );
      const productCategoryId = Number(
        (product as any)?.category?.id ??
        (product as any)?.category_id ??
        (product as any)?.categoryId
      );

      if (brandIds.length > 0 && !brandIds.includes(productBrandId)) {
        return false;
      }

      if (categoryIds.length > 0 && !categoryIds.includes(productCategoryId)) {
        return false;
      }

      return true;
    });
  }, [brandIds, categoryIds, hasFilters, products]);

  const sortedProducts = useMemo(
    () => sortProductsBySortId(filteredProducts, sortId),
    [filteredProducts, sortId],
  );

  const isPageLoading = isSharedWishlistView
    ? (isSharedProductsLoading || isSharedProductsFetching) && products.length === 0
    : isLoading || isFetching;

  if (!hasMounted || (!token && !isSharedWishlistView)) {
    return (
      <section className="product_category u_spc">
        <div className="container">
          <div className="text-center py-10">
            <CircularProgress />
            <p className="mt-4">Loading...</p>
          </div>
        </div>
      </section>
    );
  }

  const displayTotalItems = isSharedWishlistView
    ? products.length
    : totalItems;

  return (
    <>
      <section className="product_category u_spc">
        <div className="container">
          <div className="s_head flex hd_3">
            <h2 className="fw_med">
              {isSharedWishlistView ? "Shared Wishlist" : "Wishlist"}
            </h2>
            {displayTotalItems > 0 && (
              <ShareProduct productUrl={wishlistShareUrl} />
            )}
            <div className="w_100">
              <BredCrum items={items} />
            </div>
          </div>
          <div className="product_filter">
            <div className="lt">
              <Filter />
            </div>
            <div className="rt">
              <div className="result_head">
                <p>
                  {isPageLoading
                    ? "Loading..."
                    : (() => {
                      const count = hasFilters
                        ? filteredProducts.length > 0
                          ? filteredProducts.length
                          : displayTotalItems > 0
                            ? displayTotalItems
                            : 0
                        : displayTotalItems;
                      return `${count} ${count === 1 ? "Product" : "Products"}`;
                    })()}
                </p>
                <SortByFilter
                  value={sortId}
                  onChange={(nextSortId) => {
                    setSortId(nextSortId);
                    setCurrentPage(1);
                    if (sortingTimerRef.current !== null) {
                      window.clearTimeout(sortingTimerRef.current);
                    }
                    setIsSorting(true);
                    sortingTimerRef.current = window.setTimeout(() => {
                      setIsSorting(false);
                    }, 350);
                  }}
                />
              </div>

              {brandIds.length > 0 && (
                <Chip
                  label={`Brands: ${brandIds.length} selected`}
                  deleteIcon={<CloseIcon />}
                  onDelete={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("brandIds");
                    router.push(`${pathname}?${newParams.toString()}`);
                  }}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )}
              {categoryIds.length > 0 && (
                <Chip
                  label={`Categories: ${categoryIds.length} selected`}
                  deleteIcon={<CloseIcon />}
                  onDelete={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("categoryIds");
                    router.push(`${pathname}?${newParams.toString()}`);
                  }}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )}

              {/* <div className="mt_20 mb_20">
                <div className="s_head hd_6 ">
                  <h2>
                    <span className="custom_shape">
                      What&apos;s your favorite brand?
                    </span>{" "}
                    <span className="promotion">Promoted</span>
                  </h2>
                </div>
              </div> */}

              {isPageLoading || isSorting || (!isSharedWishlistView && wishlistResponse === undefined) ? (
                <div className="wishlist_skeleton_wrapper">
                  <p className="wishlist_loading_text">Loading wishlist...</p>
                  <div className="wishlist_skeleton_grid">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="wishlist_skeleton_card">
                        <div className="skeleton_shimmer wishlist_skeleton_image" />
                        <div className="wishlist_skeleton_body">
                          <div className="skeleton_shimmer wishlist_skeleton_title" />
                          <div className="skeleton_shimmer wishlist_skeleton_subtitle" />
                          <div className="wishlist_skeleton_price_row">
                            <div className="skeleton_shimmer wishlist_skeleton_price" />
                            <div className="skeleton_shimmer wishlist_skeleton_old_price" />
                          </div>
                          <div className="skeleton_shimmer wishlist_skeleton_cta" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="text-center py-10">
                  <img
                    src="/images/empty-wishlist.svg"
                    alt="Empty Wishlist"
                    style={{ maxWidth: "200px", margin: "0 auto" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <h3 className="mt-4">
                    {isSharedWishlistView
                      ? "No products found in this shared wishlist"
                      : "Your wishlist is empty"}
                  </h3>
                  <p className="mt-2 text-gray-500">
                    {isSharedWishlistView
                      ? "The shared link may be invalid or the products are no longer available."
                      : "Browse products and add items to your wishlist"}
                  </p>
                  <Button
                    style={{ fontSize: "12px" }}
                    size="small"
                    className="btn btn-primary mt-4"
                    onClick={() => router.push("/")}
                  >
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <>
                  <div className="products_card_list gap_m">
                    {sortedProducts.map((product, index) => (
                      <ProductCard key={`wishlist-${product.product_id || 'no-id'}-${index}`} product={product as any} />
                    ))}
                  </div>

                  {totalItems > 10 && totalPages > 1 && (
                    <CustomPagination
                      className="jcc"
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Wishlist;
