"use client";
import BredCrum from "@/components/bredCrum";
import { Button, Chip, IconButton } from "@mui/material";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import CloseIcon from '@mui/icons-material/Close';
import SortByFilter, { DEFAULT_SORT_ID, parseSortIdParam } from "@/components/sortByFilter";
import Filter from "@/components/filter/Filter";
import FilterListIcon from '@mui/icons-material/FilterList';
import ProductCard from "@/components/productCard";
import PopularBrandList from "@/components/popularBrandList";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useBreadcrumbsFromPath } from "@/hooks/useBreadcrumbsFromPath";
import { useLazyViewAllProductQuery, useViewAllCategoryQuery } from "@/service/home";
import { useLazyGetBrandsQuery, useGetBrandBySlugQuery } from "@/service/auth";
import { lookupSlugId, saveSlugId } from "@/utils/idStore";
import {
  isDiscountHighToLowSort,
  sortProductsByDiscountHighToLow,
} from "@/utils/productSort";
import { slugify } from "@/utils/urlBuilder";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { Product } from "@/types/General";
import ShopByOccasion from "@/components/shopByOccasion";
import ShopBySkinType from "@/components/shopBySkinType";
import { useGetShopAttributesEntityQuery } from "@/service/category";
import BrandBanner from "@/components/home/brandBanner";
import CategoryBanner from "@/components/home/categoryBanner";
import Image from "next/image";
import NoProductFound from "@/components/noProductFound";
import { flattenCategoryTree, minimizeCategoryIdsByAncestors } from "@/utils/categoryTree";
import { useViewItemListEvent } from "@/hooks/useViewItemListEvent";
import ListingSeoFooter, {
  getListingSeoSource,
  pickListingSeoEntity,
} from "@/components/seo/ListingSeoFooter";
import { useGetCategorySeoQuery } from "@/service/seo";

const responsiveSettings = [
  {
    breakpoint: 575,
    settings: {
      slidesToShow: 3,
      slidesToScroll: 1,
    },
  },
  {
    breakpoint: 992,
    settings: {
      slidesToShow: 5,
      slidesToScroll: 1,
    },
  },
  {
    breakpoint: 1200,
    settings: {
      slidesToShow: 7,
      slidesToScroll: 1,
    },
  },
];

const responsiveSettings1 = [
  {
    breakpoint: 1600,
    settings: { slidesToShow: 6 },
  },
  {
    breakpoint: 1400,
    settings: { slidesToShow: 5 },
  },
  {
    breakpoint: 1200,
    settings: { slidesToShow: 4 },
  },
  {
    breakpoint: 992,
    settings: { slidesToShow: 3 },
  },
  {
    breakpoint: 600,
    settings: { slidesToShow: 2 },
  },
];

/** Stable fallback so `useMemo(..., [allCategories])` does not see a new [] every render. */
const EMPTY_CATEGORY_LIST: unknown[] = [];

function normalizeCategoryProducts(raw: any[]): Product[] {
  return (raw ?? [])
    .map((product: any, index: number) => {
      const productId =
        product.product_id ||
        product.id ||
        product.productId ||
        product?.product?.id ||
        product?.product?.product_id ||
        product?.variation?.product_id ||
        product?.product_variation?.product_id ||
        // Keep record visible even when backend omits identifiers.
        `fallback-${index}-${String(product?.slug || product?.name || "product")}`;
      return {
        ...product,
        product_id: productId,
        image:
          product.image ||
          product.primary_image ||
          product.image_url ||
          "/images/product_default.png",
      };
    });
}

// Dynamic breadcrumb items will be set based on category

function ProductCategory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const pathBreadcrumbs = useBreadcrumbsFromPath();

  // Raw values from URL query params (will be null after ID-hiding change)
  const rawBrandId = searchParams.get("brand");
  const rawCategoryId = searchParams.get("category_id");

  // Get productIds, brandIds, categoryIds, attributeIds from query params (comma-separated strings)
  const productIdsParam = searchParams.get("productIds");
  const rawBrandIdsParam = searchParams.get("brandIds");
  const rawCategoryIdsParam = searchParams.get("categoryIds");
  const attributeIdsParam = searchParams.get("attributeIds");

  useEffect(() => {
    const hasProductIds = (productIdsParam || "").trim() !== "";
    if (hasProductIds) {
      const modeParam = searchParams.get("mode");
      const typeParam = searchParams.get("type");
      const nextParams = new URLSearchParams();
      nextParams.set("productIds", productIdsParam!.trim());
      if (modeParam) nextParams.set("mode", modeParam);
      if (typeParam) nextParams.set("type", typeParam);
      const qs = nextParams.toString();
      router.replace(qs ? `/all-products?${qs}` : "/all-products");
      return;
    }

    const hasBrandIdsKey = rawBrandIdsParam !== null;
    const hasEmptyBrandIds = hasBrandIdsKey && rawBrandIdsParam.trim() === "";
    if (!hasEmptyBrandIds) return;

    const hasOtherListingFilters = Boolean(
      (searchParams.get("brand") || "").trim() ||
      (searchParams.get("category_id") || "").trim() ||
      (searchParams.get("categoryIds") || "").trim() ||
      (searchParams.get("productIds") || "").trim() ||
      (searchParams.get("search") || "").trim() ||
      (searchParams.get("attributeIds") || "").trim(),
    );
    if (hasOtherListingFilters) return;

    const modeParam = searchParams.get("mode");
    const typeParam = searchParams.get("type");
    const nextParams = new URLSearchParams();
    if (modeParam) nextParams.set("mode", modeParam);
    if (typeParam) nextParams.set("type", typeParam);
    const qs = nextParams.toString();
    router.replace(qs ? `/all-products?${qs}` : "/all-products");
  }, [rawBrandIdsParam, productIdsParam, searchParams, router]);

  // ─── Slug-based ID resolution ──────────────────────────────────────────────
  // When IDs are not in the URL (clean URLs), resolve them from the path slug.

  const isSearchPage =
    pathname === "/search" || pathname.startsWith("/search/");
  const isCategoryPage =
    !!pathname?.startsWith("/category/") && !isSearchPage;
  const isBrandPage = !!pathname?.startsWith("/brand/");

  /** The leaf slug segment that identifies the category or brand. */
  const pathLeafSlug = useMemo(() => {
    if (isSearchPage) return null;
    if (!pathname) return null;
    const segments = pathname.split("/").filter(Boolean);
    if (isCategoryPage) {
      const catSegments = segments.slice(1); // remove leading "category"
      const productIdx = catSegments.indexOf("product");
      const catOnly =
        productIdx !== -1 ? catSegments.slice(0, productIdx) : catSegments;
      return catOnly[catOnly.length - 1] ?? null;
    }
    if (isBrandPage) {
      return segments[1] ?? null; // /brand/[slug] → second segment
    }
    return null;
  }, [pathname, isCategoryPage, isBrandPage, isSearchPage]);

  // ── Slug-to-ID resolution state ────────────────────────────────────────────
  // These states start null/false and are updated by the effects below once
  // the ID is found in sessionStorage or in the API data.

  const [pageContextCategoryId, setPageContextCategoryId] = useState<string | null>(null);
  const [categoryResolutionDone, setCategoryResolutionDone] = useState(false);
  const [resolvedBrandId, setResolvedBrandId] = useState<string | null>(null);
  const [brandResolutionDone, setBrandResolutionDone] = useState(false);

  // Step 1 – try sessionStorage immediately (synchronous, covers client navigation)
  useEffect(() => {
    if (isSearchPage) {
      setPageContextCategoryId(null);
      setCategoryResolutionDone(true);
      return;
    }
    if (!isCategoryPage) {
      setPageContextCategoryId(null);
      setCategoryResolutionDone(true);
      return;
    }
    if (rawCategoryId) {
      setPageContextCategoryId(rawCategoryId);
      setCategoryResolutionDone(true);
      return;
    }
    if (!pathLeafSlug) { setCategoryResolutionDone(true); return; }
    const fromStorage = lookupSlugId("category", pathLeafSlug);
    if (fromStorage) {
      setPageContextCategoryId(fromStorage);
      setCategoryResolutionDone(true);
    } else {
      setPageContextCategoryId(null);
      setCategoryResolutionDone(false); // will be resolved via tree
    }
  }, [isSearchPage, isCategoryPage, pathLeafSlug, rawCategoryId]);

  useEffect(() => {
    if (!isBrandPage || rawBrandId || rawBrandIdsParam) {
      setResolvedBrandId(null);
      setBrandResolutionDone(true);
      return;
    }
    if (!pathLeafSlug) { setBrandResolutionDone(true); return; }
    const fromStorage = lookupSlugId("brand", pathLeafSlug);
    if (fromStorage) {
      setResolvedBrandId(fromStorage);
      setBrandResolutionDone(true);
    } else {
      setResolvedBrandId(null);
      setBrandResolutionDone(false); // will be resolved via brands list
    }
  }, [isBrandPage, pathLeafSlug, rawBrandId, rawBrandIdsParam]);

  // Effective ID values used throughout the rest of the component
  const categoryId = rawCategoryId || pageContextCategoryId;
  const brandId = rawBrandId;
  const brandIdsParam = rawBrandIdsParam || resolvedBrandId;
  const categoryIdsParam = rawCategoryIdsParam;

  // Always start this page from top when navigated to
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);
  const typeParam = searchParams.get("type");
  const urlSearchQuery = (searchParams.get("search") ?? searchParams.get("q") ?? "").trim();

  // Parse comma-separated strings into arrays of numbers - memoize to prevent unnecessary re-renders
  const productIds = useMemo(() => {
    return productIdsParam
      ? productIdsParam.split(",").map(id => Number(id.trim())).filter(id => !isNaN(id))
      : undefined;
  }, [productIdsParam]);

  const brandIds = useMemo(() => {
    return brandIdsParam
      ? brandIdsParam.split(",").map(id => Number(id.trim())).filter(id => !isNaN(id))
      : undefined;
  }, [brandIdsParam]);

  const categoryIds = useMemo(() => {
    return categoryIdsParam
      ? categoryIdsParam.split(",").map(id => Number(id.trim())).filter(id => !isNaN(id))
      : undefined;
  }, [categoryIdsParam]);

  const attributeIds = useMemo(() => {
    return attributeIdsParam
      ? attributeIdsParam.split(",").map(id => Number(id.trim())).filter(id => !isNaN(id))
      : undefined;
  }, [attributeIdsParam]);

  const deliveryLocationArgs = useDashboardHomeQueryArgs();

  /** Plain keyword listing uses viewAllProduct (POST) with `search` in the body — same as filtered listings. */

  const [currentPage, setCurrentPage] = useState(1);
  const [accumulatedProducts, setAccumulatedProducts] = useState<Product[]>([]);
  const pageChunksRef = useRef<Record<number, Product[]>>({});
  const limit = 12;
  const urlSortId = useMemo(
    () => parseSortIdParam(searchParams.get("sort") ?? searchParams.get("sortId")),
    [searchParams],
  );
  const [activeSortId, setActiveSortId] = useState(urlSortId);

  useEffect(() => {
    setActiveSortId(urlSortId);
  }, [urlSortId]);

  const handleSortChange = useCallback(
    (nextSortId: number) => {
      setActiveSortId(nextSortId);
      const newSearchParams = new URLSearchParams(searchParams.toString());
      if (nextSortId === DEFAULT_SORT_ID) {
        newSearchParams.delete("sort");
        newSearchParams.delete("sortId");
      } else {
        newSearchParams.set("sort", String(nextSortId));
        newSearchParams.delete("sortId");
      }
      const qs = newSearchParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );
  const [selectedShopAttributeEntityIds, setSelectedShopAttributeEntityIds] = useState<number[]>([]);
  const [hasPopularBrandsData, setHasPopularBrandsData] = useState(false);

  // Memoize stringified arrays for comparison
  const categoryIdsStr = useMemo(() => JSON.stringify(categoryIds), [categoryIds]);
  const brandIdsStr = useMemo(() => JSON.stringify(brandIds), [brandIds]);
  const productIdsStr = useMemo(() => JSON.stringify(productIds), [productIds]);
  const attributeIdsStr = useMemo(() => JSON.stringify(attributeIds), [attributeIds]);
  const selectedShopAttributeEntityIdsStr = useMemo(() => JSON.stringify(selectedShopAttributeEntityIds), [selectedShopAttributeEntityIds]);

  // Track previous filter values to detect changes - initialize once
  const prevFiltersRef = useRef<{
    categoryId: string | null;
    categoryIds: string;
    brandId: string | null;
    brandIds: string;
    productIds: string;
    attributeIds: string;
    sortId: number;
    typeParam: string | null;
    selectedShopAttributeEntityIds: string;
    urlSearchQuery: string;
  } | null>(null);

  // Initialize ref on first render
  if (prevFiltersRef.current === null) {
    prevFiltersRef.current = {
      categoryId,
      categoryIds: categoryIdsStr,
      brandId,
      brandIds: brandIdsStr,
      productIds: productIdsStr,
      attributeIds: attributeIdsStr,
      sortId: activeSortId,
      typeParam,
      selectedShopAttributeEntityIds: selectedShopAttributeEntityIdsStr,
      urlSearchQuery,
    };
  }

  // Toggle function to add/remove entity ID from selection
  const handleEntityToggle = useCallback((entityId: number) => {
    const normalizedEntityId = Number(entityId);
    if (Number.isNaN(normalizedEntityId)) {
      return;
    }
    setSelectedShopAttributeEntityIds((prev) => {
      const newIds = prev.includes(normalizedEntityId)
        ? prev.filter((id) => id !== normalizedEntityId) // Remove if already selected
        : [...prev, normalizedEntityId]; // Add if not selected

      // Reset to first page when selection changes
      setCurrentPage(1);
      return newIds;
    });
  }, []);

  // Fetch category details - use undefined instead of {} to avoid infinite re-renders
  const { data: categoriesData, isLoading: categoriesLoading } = useViewAllCategoryQuery(undefined);
  const allCategories = useMemo(
    () =>
      flattenCategoryTree(
        Array.isArray(categoriesData?.data) ? categoriesData.data : EMPTY_CATEGORY_LIST,
      ),
    [categoriesData?.data]
  );

  // Step 2 – resolve category ID from the flat category tree (fallback for direct URL access)
  useEffect(() => {
    if (!isCategoryPage || rawCategoryId || !pathLeafSlug) return;
    if (categoryResolutionDone) return; // already resolved via sessionStorage
    if (!allCategories.length) return; // still loading

    const matched = (allCategories as any[]).find(
      (cat: any) => slugify(cat.name || cat.category_name || "") === pathLeafSlug,
    );
    if (matched) {
      const id = String(matched.id || matched.category_id);
      saveSlugId("category", pathLeafSlug, id);
      setPageContextCategoryId(id);
    }
    setCategoryResolutionDone(true); // done whether or not a match was found
  }, [allCategories, isCategoryPage, pathLeafSlug, rawCategoryId, categoryResolutionDone]);

  // Step 2b – lazy-load brands list and resolve brand ID (fallback for direct URL access)
  const [loadBrandsForSlug, { data: brandsForSlugData }] = useLazyGetBrandsQuery();

  useEffect(() => {
    const needsBrandList =
      isBrandPage ||
      Boolean(rawBrandId) ||
      Boolean(rawBrandIdsParam) ||
      Boolean(resolvedBrandId);
    if (!needsBrandList) return;
    // Need brand list for slug→id resolution and SEO description / meta_description.
    loadBrandsForSlug({ page: 1, limit: 1000 });
  }, [
    isBrandPage,
    rawBrandId,
    rawBrandIdsParam,
    resolvedBrandId,
    loadBrandsForSlug,
  ]);

  useEffect(() => {
    if (!isBrandPage || rawBrandId || rawBrandIdsParam || !pathLeafSlug) return;
    if (brandResolutionDone) return;
    if (!brandsForSlugData?.data?.data) return;

    const list: any[] = brandsForSlugData.data.data;
    const matched = list.find(
      (b: any) => slugify(b.name || b.brand_name || "") === pathLeafSlug,
    );
    if (matched) {
      const id = String(matched.id || matched.brand_id);
      saveSlugId("brand", pathLeafSlug, id);
      setResolvedBrandId(id);
    }
    setBrandResolutionDone(true);
  }, [brandsForSlugData, isBrandPage, pathLeafSlug, rawBrandId, rawBrandIdsParam, brandResolutionDone]);

  // Whether slug→ID resolution is still in-flight.
  // Prevents fetchProducts from running with no filter while waiting for the ID.
  const slugResolutionPending = useMemo(() => {
    if (isSearchPage) return false;
    if (isCategoryPage && !rawCategoryId && !pageContextCategoryId && !categoryResolutionDone) return true;
    if (isBrandPage && !rawBrandId && !rawBrandIdsParam && !brandResolutionDone) return true;
    return false;
  }, [
    isSearchPage,
    isCategoryPage, rawCategoryId, pageContextCategoryId, categoryResolutionDone,
    isBrandPage, rawBrandId, rawBrandIdsParam, brandResolutionDone,
  ]);

  // Find selected category from categoryId or first categoryId in categoryIds array
  const selectedCategoryId = useMemo(
    () => categoryId || (categoryIds && categoryIds.length > 0 ? categoryIds[0] : null),
    [categoryId, categoryIds]
  );
  const selectedCategory = useMemo(
    () =>
      selectedCategoryId != null
        ? allCategories.find(
          (cat: any) =>
            String(cat.id ?? cat.category_id ?? "") === String(selectedCategoryId),
        )
        : null,
    [allCategories, selectedCategoryId]
  );

  const selectedBrandId = useMemo(() => {
    if (brandId) return String(brandId);
    if (brandIds && brandIds.length > 0) return String(brandIds[0]);
    if (resolvedBrandId) return String(resolvedBrandId);
    return null;
  }, [brandId, brandIds, resolvedBrandId]);

  const selectedBrand = useMemo(() => {
    const list: any[] = brandsForSlugData?.data?.data ?? [];
    if (selectedBrandId) {
      const byId = list.find(
        (b: any) => String(b.id ?? b.brand_id ?? "") === String(selectedBrandId),
      );
      if (byId) return byId;
    }
    if (isBrandPage && pathLeafSlug) {
      return (
        list.find(
          (b: any) =>
            slugify(b.slug || b.name || b.brand_name || "") === pathLeafSlug,
        ) ?? null
      );
    }
    return null;
  }, [selectedBrandId, brandsForSlugData, isBrandPage, pathLeafSlug]);

  // Brand detail (`GET /brands/{slug}`) carries `title` + `description` for footer SEO.
  const brandSlugForSeo = useMemo(() => {
    if (isBrandPage && pathLeafSlug) return pathLeafSlug;
    const fromBrand =
      selectedBrand?.slug ||
      selectedBrand?.name ||
      selectedBrand?.brand_name ||
      "";
    const slug = slugify(String(fromBrand));
    return slug && slug !== "item" ? slug : null;
  }, [isBrandPage, pathLeafSlug, selectedBrand]);

  const { data: brandDetailData } = useGetBrandBySlugQuery(
    { slug: brandSlugForSeo || "" },
    { skip: !brandSlugForSeo },
  );
  const brandDetail = brandDetailData?.data ?? null;

  // Category detail (`GET /categories/{slug}`) has the rich HTML `description`.
  const categorySlugForSeo = useMemo(() => {
    if (isCategoryPage && pathLeafSlug) return pathLeafSlug;
    const fromCategory =
      selectedCategory?.slug ||
      selectedCategory?.name ||
      selectedCategory?.category_name ||
      "";
    const slug = slugify(String(fromCategory));
    return slug && slug !== "item" ? slug : null;
  }, [isCategoryPage, pathLeafSlug, selectedCategory]);

  const { data: categoryDetailData } = useGetCategorySeoQuery(
    { slug: categorySlugForSeo || "" },
    { skip: !categorySlugForSeo || Boolean(selectedBrandId) || isBrandPage },
  );
  const categoryDetail = categoryDetailData?.data ?? null;

  const listingSeoSource = useMemo(() => {
    // Prefer the entity that actually has rich HTML description
    // (avoid empty category-detail responses wiping tree/brand SEO).
    if (selectedBrandId || isBrandPage) {
      return getListingSeoSource(
        pickListingSeoEntity(brandDetail, selectedBrand),
      );
    }
    return getListingSeoSource(
      pickListingSeoEntity(categoryDetail, selectedCategory),
    );
  }, [
    selectedBrandId,
    isBrandPage,
    brandDetail,
    selectedBrand,
    categoryDetail,
    selectedCategory,
  ]);

  const bannerCategoryIds = useMemo(() => {
    if (categoryIds && categoryIds.length > 0) {
      return categoryIds;
    }
    if (selectedCategoryId != null) {
      const parsedSelectedCategoryId = Number(selectedCategoryId);
      if (!Number.isNaN(parsedSelectedCategoryId)) {
        return [parsedSelectedCategoryId];
      }
    }
    return [];
  }, [categoryIds, selectedCategoryId]);

  // Resolve category IDs for product listing.
  // Sidebar categoryIds → send only those specific ids (e.g. Day Cream).
  // Page context category → include all descendant categories (e.g. Skin Care).
  const resolvedCategoryIds = useMemo(() => {
    if (categoryIds && categoryIds.length > 0) {
      return minimizeCategoryIdsByAncestors(
        categoryIds.map(Number).filter((id) => !isNaN(id)),
        allCategories as any[],
      );
    }

    const sourceIds: number[] = [];
    if (categoryId) {
      const id = Number(categoryId);
      if (!isNaN(id)) {
        sourceIds.push(id);
      }
    }

    if (!sourceIds.length) return undefined;

    if (!allCategories || !allCategories.length) {
      return sourceIds;
    }

    const minimized = minimizeCategoryIdsByAncestors(sourceIds, allCategories as any[]);

    const idsSet = new Set<number>();
    const collectDescendants = (id: number) => {
      if (idsSet.has(id)) return;
      idsSet.add(id);

      allCategories.forEach((cat: any) => {
        const catId = cat.id || cat.category_id;
        const parentId = cat.parent_id ?? cat.parentId ?? null;
        if (parentId === id && catId) {
          collectDescendants(Number(catId));
        }
      });
    };

    minimized.forEach((id) => collectDescendants(id));
    return Array.from(idsSet);
  }, [categoryId, categoryIdsStr, allCategories]);

  // Fetch products from viewAllProduct API using lazy query
  const [
    fetchProducts,
    {
      data: viewAllProductsData,
      isLoading: viewAllProductsLoading,
      isFetching: viewAllProductsFetching,
      error: viewAllProductsError
    }
  ] = useLazyViewAllProductQuery();

  // Reset to first page when filters change (but not when just changing page)
  useEffect(() => {
    const prevFilters = prevFiltersRef.current;
    if (!prevFilters) return;

    const filtersChanged =
      prevFilters.categoryId !== categoryId ||
      prevFilters.categoryIds !== categoryIdsStr ||
      prevFilters.brandId !== brandId ||
      prevFilters.brandIds !== brandIdsStr ||
      prevFilters.productIds !== productIdsStr ||
      prevFilters.attributeIds !== attributeIdsStr ||
      prevFilters.sortId !== activeSortId ||
      prevFilters.typeParam !== typeParam ||
      prevFilters.selectedShopAttributeEntityIds !== selectedShopAttributeEntityIdsStr ||
      prevFilters.urlSearchQuery !== urlSearchQuery;

    if (filtersChanged) {
      setCurrentPage(1);
      setAccumulatedProducts([]);
      pageChunksRef.current = {};
      prevFiltersRef.current = {
        categoryId,
        categoryIds: categoryIdsStr,
        brandId,
        brandIds: brandIdsStr,
        productIds: productIdsStr,
        attributeIds: attributeIdsStr,
        sortId: activeSortId,
        typeParam,
        selectedShopAttributeEntityIds: selectedShopAttributeEntityIdsStr,
        urlSearchQuery,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, categoryIdsStr, brandId, brandIdsStr, productIdsStr, attributeIdsStr, activeSortId, typeParam, selectedShopAttributeEntityIdsStr, urlSearchQuery]);

  // Merge attribute IDs from URL (Filter sidebar) and entity chips so both Filter and chips apply
  const mergedAttributeIds = useMemo(() => {
    const fromUrl = attributeIds ?? [];
    const fromChips = selectedShopAttributeEntityIds ?? [];
    const combined = [...fromUrl, ...fromChips];
    return combined.length ? [...new Set(combined)] : undefined;
  }, [attributeIds, selectedShopAttributeEntityIds]);

  // Fetch products when dependencies change (skip while waiting for slug→ID resolution)
  useEffect(() => {
    if (slugResolutionPending) {
      return;
    }
    fetchProducts({
      page: currentPage,
      limit: limit,
      sortId: isDiscountHighToLowSort(activeSortId) ? DEFAULT_SORT_ID : activeSortId,
      ...(typeParam && { type: typeParam }),
      ...(brandId && !brandIds && { brand_id: brandId }),
      productIds: productIds,
      brandIds: brandIds,
      // Use resolvedCategoryIds so parent category searches include child categories as well
      categoryIds: resolvedCategoryIds,
      shopAttributesEntityIds: mergedAttributeIds?.length ? mergedAttributeIds : undefined,
      attributeIds: mergedAttributeIds?.length ? mergedAttributeIds : undefined,
      ...(urlSearchQuery && { search: urlSearchQuery }),
      latitude: deliveryLocationArgs.latitude,
      longitude: deliveryLocationArgs.longitude,
      deliveryType: deliveryLocationArgs.type,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    selectedShopAttributeEntityIdsStr,
    categoryId,
    categoryIdsStr,
    brandId,
    brandIdsStr,
    productIdsStr,
    attributeIdsStr,
    activeSortId,
    typeParam,
    mergedAttributeIds,
    resolvedCategoryIds,
    urlSearchQuery,
    slugResolutionPending,
    deliveryLocationArgs.latitude,
    deliveryLocationArgs.longitude,
    deliveryLocationArgs.type,
  ]);

  // Fetch shop attributes entity data
  const { data: shopAttributesEntityData, isLoading: shopAttributesLoading } = useGetShopAttributesEntityQuery(
    { category_id: selectedCategoryId ? Number(selectedCategoryId) : undefined },
    { skip: !selectedCategoryId }
  );

  // Get all shop attributes from API response
  const shopAttributesResult = useMemo(
    () => shopAttributesEntityData?.data?.result || [],
    [shopAttributesEntityData?.data?.result]
  );

  const productsData = viewAllProductsData;
  const productsError = viewAllProductsError;

  const displayProducts = useMemo(() => {
    if (isDiscountHighToLowSort(activeSortId)) {
      return sortProductsByDiscountHighToLow(accumulatedProducts);
    }
    return accumulatedProducts;
  }, [accumulatedProducts, activeSortId]);

  useViewItemListEvent(displayProducts, "Product Category Listing");

  const viewAllPayload = productsData?.data;
  const viewAllTotalCountRaw = Number(
    viewAllPayload?.data_count ?? viewAllPayload?.total,
  );
  const currentApiPage = Number(viewAllPayload?.current_page ?? 1);
  const totalApiPages = Number(viewAllPayload?.total_pages ?? 1);
  const hasValidPagination =
    Number.isFinite(currentApiPage) &&
    currentApiPage > 0 &&
    Number.isFinite(totalApiPages) &&
    totalApiPages > 0;
  const totalProductCount = Number.isFinite(viewAllTotalCountRaw) && viewAllTotalCountRaw >= 0
    ? viewAllTotalCountRaw
    : accumulatedProducts.length;

  const isInitialListLoading =
    accumulatedProducts.length === 0 &&
    (viewAllProductsLoading || viewAllProductsFetching);

  const isLoadingMore =
    accumulatedProducts.length > 0 &&
    viewAllProductsFetching;

  const canLoadMoreViewAll =
    accumulatedProducts.length > 0 &&
    (
      hasValidPagination
        ? currentPage < totalApiPages
        : accumulatedProducts.length < totalProductCount
    );
  const shouldHideCategoryFilter =
    !isInitialListLoading &&
    !isLoadingMore &&
    !!selectedCategoryId &&
    displayProducts.length === 0;

  const handleLoadMore = useCallback(() => {
    if (viewAllProductsFetching || viewAllProductsLoading) {
      return;
    }
    if (hasValidPagination && currentPage >= totalApiPages) {
      return;
    }
    if (!hasValidPagination && accumulatedProducts.length >= totalProductCount) {
      return;
    }
    setCurrentPage((p) => p + 1);
  }, [
    viewAllProductsFetching,
    viewAllProductsLoading,
    accumulatedProducts.length,
    totalProductCount,
    hasValidPagination,
    currentPage,
    totalApiPages,
  ]);

  const infiniteScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!canLoadMoreViewAll) {
      return;
    }
    const node = infiniteScrollRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }
        handleLoadMore();
      },
      { root: null, rootMargin: "400px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMoreViewAll, handleLoadMore]);

  // Append each API page below the previous one (continuous list) instead of replacing the grid
  useEffect(() => {
    if (viewAllProductsFetching || viewAllProductsLoading) {
      return;
    }
    const res = viewAllProductsData;
    if (!res || res.statusCode !== 200 || !res.data) {
      return;
    }
    const page = Number(res.data.current_page) || currentPage;
    const chunk = normalizeCategoryProducts(res.data.data ?? []);
    pageChunksRef.current[page] = chunk;
    const merged = Object.keys(pageChunksRef.current)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
      .flatMap((p) => pageChunksRef.current[p] || []);
    const nextProducts = isDiscountHighToLowSort(activeSortId)
      ? sortProductsByDiscountHighToLow(merged)
      : merged;
    setAccumulatedProducts(nextProducts);
  }, [
    viewAllProductsData,
    viewAllProductsFetching,
    viewAllProductsLoading,
    currentPage,
    activeSortId,
  ]);

  const handleClick = useCallback(() => {
    console.info('You clicked the Chip.');
  }, []);
  const handleDelete = useCallback(() => {
    // Remove category filter — preserve current pathname so /category/... URLs stay intact
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("category_id");
    window.location.href = `${window.location.pathname}?${newParams.toString()}`;
  }, [searchParams]);

  const handleBrandDelete = useCallback(() => {
    // Remove brand filter — preserve current pathname so /brand/... URLs stay intact
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("brand");
    window.location.href = `${window.location.pathname}?${newParams.toString()}`;
  }, [searchParams]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const toggleFilter = useCallback(() => {
    setIsFilterOpen((prev) => !prev);
  }, []);
  const closeFilter = useCallback(() => {
    setIsFilterOpen(false);
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        (brandIds?.length ?? 0) > 0 ||
        brandId ||
        (categoryIds?.length ?? 0) > 0 ||
        (attributeIds?.length ?? 0) > 0 ||
        selectedShopAttributeEntityIds.length > 0 ||
        (productIds?.length ?? 0) > 0 ||
        urlSearchQuery ||
        searchParams.get("has_filtered") === "1",
      ),
    [
      brandIds,
      brandId,
      categoryIds,
      attributeIds,
      selectedShopAttributeEntityIds.length,
      productIds,
      urlSearchQuery,
      searchParams,
    ],
  );

  const handleClearFilters = useCallback(() => {
    setSelectedShopAttributeEntityIds([]);
    setCurrentPage(1);
    setAccumulatedProducts([]);
    pageChunksRef.current = {};
    router.push(pathname);
  }, [pathname, router]);

  const showClearFilterForEmptyResults = useMemo(
    () =>
      hasActiveFilters &&
      !slugResolutionPending &&
      !isInitialListLoading &&
      !isLoadingMore &&
      displayProducts.length === 0,
    [
      hasActiveFilters,
      slugResolutionPending,
      isInitialListLoading,
      isLoadingMore,
      displayProducts.length,
    ],
  );

  useEffect(() => {
    if (!isFilterOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFilterOpen]);

  return (
    <>
      <section className="product_category u_spc">
        <div className="container">
          <div className="s_head flex hd_4">
            <div className="lt product_category_page_head">
              <BredCrum
                items={
                pathBreadcrumbs ?? (selectedCategory || urlSearchQuery
                  ? [
                    { label: "Home", path: "/" },
                    { label: isSearchPage ? "Search" : "Category" },
                    {
                      label: selectedCategory
                        ? (selectedCategory.name || selectedCategory.category_name)
                        : isSearchPage
                          ? urlSearchQuery
                          : `Search: ${urlSearchQuery}`,
                    },
                  ]
                  : [
                    { label: "Home", path: "/" },
                    { label: "All Products" },
                  ])
              }
              />
              {showClearFilterForEmptyResults && (
                <button
                  type="button"
                  className="text_btn product_category_clear_filter_btn"
                  onClick={handleClearFilters}
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="rt" style={{ marginLeft: "auto" }}>
              <IconButton className="filter_icon" onClick={toggleFilter}>
                <FilterListIcon />
              </IconButton>
            </div>
          </div>
          <div className="product_filter">
            {isFilterOpen && (
              <div
                className="product_filter_backdrop"
                onClick={() => setIsFilterOpen(false)}
                aria-hidden
              />
            )}
            <div className={`lt ${isFilterOpen ? "open" : ""}`}>
              <Filter
                closeFilter={closeFilter}
                hideCategoryWhenEmpty={shouldHideCategoryFilter}
                hideBrandWhenEmpty={shouldHideCategoryFilter}
              />
            </div>
            <div className="rt">


              {/* {urlSearchQuery && (
                <Chip
                  label={`Search: ${urlSearchQuery}`}
                  deleteIcon={<CloseIcon />}
                  onClick={handleClick}
                  onDelete={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("search");
                    window.location.href = `/product/product-category/?${newParams.toString()}`;
                  }}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )}
              {categoryId && selectedCategory && (
                <Chip
                  label={`Category: ${selectedCategory.name || selectedCategory.category_name}`}
                  deleteIcon={<CloseIcon />}
                  onClick={handleClick}
                  onDelete={handleDelete}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )}
              {categoryIds && categoryIds.length > 0 && !categoryId && (
                <Chip
                  label={`Categories: ${categoryIds.length} selected`}
                  deleteIcon={<CloseIcon />}
                  onClick={handleClick}
                  onDelete={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("categoryIds");
                    window.location.href = `/product/product-category/?${newParams.toString()}`;
                  }}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )}
              {brandId && (
                <Chip
                  label={`Brand: ${brandId}`}
                  deleteIcon={<CloseIcon />}
                  onClick={handleClick}
                  onDelete={handleBrandDelete}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )}
              {brandIds && brandIds.length > 0 && !brandId && (
                <Chip
                  label={`Brands: ${brandIds.length} selected`}
                  deleteIcon={<CloseIcon />}
                  onClick={handleClick}
                  onDelete={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("brandIds");
                    window.location.href = `/product/product-category/?${newParams.toString()}`;
                  }}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )}
              {productIds && productIds.length > 0 && (
                <Chip
                  label={`Products: ${productIds.length} selected`}
                  deleteIcon={<CloseIcon />}
                  onClick={handleClick}
                  onDelete={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("productIds");
                    window.location.href = `/product/product-category/?${newParams.toString()}`;
                  }}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )}
              {attributeIds && attributeIds.length > 0 && (
                <Chip
                  label={`Filters: ${attributeIds.length} selected`}
                  deleteIcon={<CloseIcon />}
                  onClick={handleClick}
                  onDelete={() => {
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("attributeIds");
                    window.location.href = `/product/product-category/?${newParams.toString()}`;
                  }}
                  variant="outlined"
                  sx={{ marginRight: 1, marginBottom: 1 }}
                />
              )} */}

              {/* Category Banner - Show for selected category page and categoryIds listing */}
              {bannerCategoryIds.length > 0 && (
                <div className=" mb_20">
                  <CategoryBanner
                    categoryIds={bannerCategoryIds}
                    latitude={deliveryLocationArgs.latitude}
                    longitude={deliveryLocationArgs.longitude}
                  />
                </div>
              )}

              {/* Brand Banner - Show only when brandIds are available */}
              {brandIds && brandIds.length > 0 && (
                <div className=" mb_20">
                  <BrandBanner brandIds={brandIds} />
                </div>
              )}

              {/* Brands You Love / Promoted (disabled on this page) */}
              {/*
                {!brandId && !brandIds && (
                  <div>
                    {hasPopularBrandsData && (
                      <div className="s_head hd_6">
                        <h2>
                          <span className="custom_shape">Brands You Love</span>{" "}
                          <span className="promotion">Promoted</span>
                        </h2>
                      </div>
                    )}
                    <PopularBrandList
                      slidesToShow={8}
                      responsive={responsiveSettings}
                      onHasDataChange={setHasPopularBrandsData}
                    />
                  </div>
                )}
              */}

              {(() => {
                // Only show "no data found" if we have a category selected and data has loaded
                const hasCategory = selectedCategoryId !== null;
                const isShopAttributesReady = !shopAttributesLoading || shopAttributesEntityData !== undefined;

                // Filter out sections without entities and check if we have any valid sections
                const validSections = shopAttributesResult.filter(
                  (shopAttribute: any) => shopAttribute.entities && shopAttribute.entities.length > 0
                );

                // Show "no data found" only when:
                // 1. We have a category selected
                // 2. Shop attributes data has loaded (or is not loading)
                // 3. There are no valid sections
                // 4. Products are not loading
                if (validSections.length === 0 && hasCategory && isShopAttributesReady && !isInitialListLoading && !isLoadingMore) {
                  return (
                    <div >
                      <div className="products_card_list gap_m">
                        <p
                          style={{
                            textAlign: "center",
                            padding: validSections.length === 0 ? 0 : "40px 20px",
                            color: "#666",
                          }}
                        >
                          {/* No sections available */}
                        </p>
                      </div>
                    </div>
                  );
                }

                return shopAttributesResult.map((shopAttribute: any, index: number) => {
                  if (!shopAttribute.entities || shopAttribute.entities.length === 0) {
                    return null;
                  }

                  // Use ShopByOccasion for first item, ShopBySkinType for second, and alternate
                  const isEven = index % 2 === 0;
                  const Component = isEven ? ShopByOccasion : ShopBySkinType;
                  const componentProps = isEven
                    ? {
                      slidesToShow: 7,
                      responsive: responsiveSettings1,
                      entities: shopAttribute.entities,
                      selectedIds: selectedShopAttributeEntityIds,
                      onEntityClick: handleEntityToggle
                    }
                    : {
                      slidesToShow: 5,
                      entities: shopAttribute.entities,
                      selectedIds: selectedShopAttributeEntityIds,
                      onEntityClick: handleEntityToggle
                    };

                  return (
                    <div
                      key={`shop-attribute-${shopAttribute.id ?? shopAttribute.name ?? "section"}-${index}`}
                      className={isEven ? " mb_20" : "ub_spc"}
                    >
                      <div className="s_head hd_6">
                        <h2>{shopAttribute.name}</h2>
                      </div>
                      <Component {...componentProps} />
                    </div>
                  );
                });
              })()}
              {displayProducts.length > 0 && !isInitialListLoading && (
                <div className="result_head">
                  <p>
                    {isInitialListLoading
                      ? "Loading..."
                      : `${totalProductCount} ${totalProductCount === 1 ? "Product" : "Products"}`}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <SortByFilter
                      value={activeSortId}
                      onChange={handleSortChange}
                    />
                  </div>
                </div>
              )}

              {isInitialListLoading ? (
                <>
                  <p className="product_category_loading_text">Loading products...</p>
                  <div className="product_category_skeleton_grid gap_m">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="product_category_skeleton_card">
                        <div className="skeleton_shimmer product_category_skeleton_image" />
                        <div className="product_category_skeleton_body">
                          <div className="skeleton_shimmer product_category_skeleton_title" />
                          <div className="skeleton_shimmer product_category_skeleton_subtitle" />
                          <div className="product_category_skeleton_price_row">
                            <div className="skeleton_shimmer product_category_skeleton_price" />
                            <div className="skeleton_shimmer product_category_skeleton_old_price" />
                          </div>
                          <div className="skeleton_shimmer product_category_skeleton_rating" />
                          <div className="skeleton_shimmer product_category_skeleton_cta" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : productsError && accumulatedProducts.length === 0 ? (
                <div className="products_card_list gap_m">
                  <p>Error loading products. Please try again.</p>
                </div>
              ) : displayProducts.length > 0 ? (
                <>
                  <div className="products_card_list gap_m">
                    {displayProducts.map((product, index) => (
                      // store_id removed/commented as it is no longer required in the application
                      // <ProductCard key={`category-${product.product_id || 'no-id'}-${product.store_id || 'no-store'}-${index}`} product={product} />
                      <ProductCard key={`category-${product.product_id || 'no-id'}-${index}`} product={product} />
                    ))}
                  </div>
                  {isLoadingMore && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                      <p
                        className="product_category_loading_text"
                        style={{
                          textAlign: "center",
                          margin: 0,
                          padding: "8px 20px",
                          borderRadius: "999px",
                          border: "1px solid var(--commerce-primary, #d91b76)",
                          color: "var(--commerce-primary, #d91b76)",
                          fontWeight: 600,
                          backgroundColor: "#fff",
                        }}
                      >
                        Loading more products...
                      </p>
                    </div>
                  )}
                  {canLoadMoreViewAll && (
                    <div
                      className="product_category_load_more flex jcc"
                      style={{ marginTop: 20, marginBottom: 12, flexDirection: "column", alignItems: "center", gap: 12 }}
                    >
                      {/* {!isLoadingMore && (
                        <Button
                          type="button"
                          variant="outlined"
                          onClick={handleLoadMore}
                          disabled={viewAllProductsFetching}
                          sx={{ textTransform: "none" }}
                        >
                          Load more
                        </Button>
                      )} */}
                      <div
                        ref={infiniteScrollRef}
                        style={{ height: 1, width: "100%" }}
                        aria-hidden
                      />
                    </div>
                  )}
                </>
              ) : (
                <NoProductFound />
              )}
            </div>
          </div>
        </div>
      </section>
      <ListingSeoFooter source={listingSeoSource} />
    </>
  );
}

export default ProductCategory;
