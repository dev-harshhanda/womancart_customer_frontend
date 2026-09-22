"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useViewAllCategoryQuery } from "@/service/home";
import { useLazyGetBrandsQuery } from "@/service/auth";
import type { GetFilterListArg } from "@/service/filter";
import { lookupSlugId, saveSlugId } from "@/utils/idStore";
import {
  extractIdFromSlug,
  getListingPathContext,
  joinCommaSeparatedIds,
  matchEntityBySlug,
} from "@/utils/listingPathContext";

const EMPTY_CATEGORY_LIST: unknown[] = [];

export type UseFilterListQueryArgResult = {
  queryArg: GetFilterListArg;
  /** Category id from the URL path slug (e.g. Skin Care on /category/.../skin-care). */
  pageContextCategoryId: string | null;
  /** Skip contextual filter-list call until slug→ID resolution finishes. */
  skipQuery: boolean;
  /** Skip the generic fallback filter-list call (no context ids). */
  skipBaseFallback: boolean;
};

/**
 * Build `filter-list` query args with the same slug / URL resolution used on listing pages,
 * so category_ids / brand_ids / product_id are always sent for the current page context.
 */
export function useFilterListQueryArg(): UseFilterListQueryArgResult {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const { isCategoryPage, isBrandPage, pathLeafSlug, productSlug } =
    useMemo(() => getListingPathContext(pathname), [pathname]);

  const categoryIdsParam = searchParams.get("categoryIds");
  const categoryIdSingle = searchParams.get("category_id");
  const brandIdsParam = searchParams.get("brandIds");
  const brandIdSingle = searchParams.get("brand");
  const productIdsParam = searchParams.get("productIds");
  const productIdSingle = searchParams.get("product_id");

  /** Resolved from path slug; kept even when sidebar categoryIds are applied. */
  const [pageContextCategoryId, setPageContextCategoryId] = useState<string | null>(null);
  const [categoryResolutionDone, setCategoryResolutionDone] = useState(false);
  const [resolvedBrandId, setResolvedBrandId] = useState<string | null>(null);
  const [brandResolutionDone, setBrandResolutionDone] = useState(false);

  const { data: categoriesData } = useViewAllCategoryQuery(undefined, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const allCategories = useMemo(
    () =>
      Array.isArray(categoriesData?.data)
        ? categoriesData.data
        : EMPTY_CATEGORY_LIST,
    [categoriesData?.data],
  );

  const [loadBrandsForSlug, { data: brandsForSlugData }] = useLazyGetBrandsQuery();

  // Step 1 — sessionStorage (client navigation from urlBuilder)
  useEffect(() => {
    if (!isCategoryPage) {
      setPageContextCategoryId(null);
      setCategoryResolutionDone(true);
      return;
    }
    if (categoryIdSingle) {
      setPageContextCategoryId(categoryIdSingle);
      setCategoryResolutionDone(true);
      return;
    }
    if (!pathLeafSlug) {
      setCategoryResolutionDone(true);
      return;
    }
    const fromStorage = lookupSlugId("category", pathLeafSlug);
    if (fromStorage) {
      setPageContextCategoryId(fromStorage);
      setCategoryResolutionDone(true);
    } else {
      setPageContextCategoryId(null);
      setCategoryResolutionDone(false);
    }
  }, [isCategoryPage, pathLeafSlug, categoryIdSingle, searchParamsKey]);

  useEffect(() => {
    if (!isBrandPage || brandIdsParam || brandIdSingle) {
      setResolvedBrandId(null);
      setBrandResolutionDone(true);
      return;
    }
    if (!pathLeafSlug) {
      setBrandResolutionDone(true);
      return;
    }
    const fromStorage = lookupSlugId("brand", pathLeafSlug);
    if (fromStorage) {
      setResolvedBrandId(fromStorage);
      setBrandResolutionDone(true);
    } else {
      setResolvedBrandId(null);
      setBrandResolutionDone(false);
    }
  }, [isBrandPage, pathLeafSlug, brandIdsParam, brandIdSingle, searchParamsKey]);

  // Step 2 — category tree fallback (bookmark / fresh tab)
  useEffect(() => {
    if (!isCategoryPage || categoryIdSingle || !pathLeafSlug) {
      return;
    }
    if (categoryResolutionDone) return;
    if (!allCategories.length) return;

    const matched = matchEntityBySlug(allCategories as any[], pathLeafSlug);
    if (matched) {
      const id = String(matched.id ?? matched.category_id);
      saveSlugId("category", pathLeafSlug, id);
      setPageContextCategoryId(id);
    }
    setCategoryResolutionDone(true);
  }, [
    allCategories,
    isCategoryPage,
    pathLeafSlug,
    categoryIdSingle,
    categoryResolutionDone,
  ]);

  // Step 2b — brand list fallback
  useEffect(() => {
    if (!isBrandPage || brandIdsParam || brandIdSingle || !pathLeafSlug) {
      return;
    }
    if (brandResolutionDone) return;
    loadBrandsForSlug({ page: 1, limit: 1000 });
  }, [
    isBrandPage,
    pathLeafSlug,
    brandIdsParam,
    brandIdSingle,
    brandResolutionDone,
    loadBrandsForSlug,
  ]);

  useEffect(() => {
    if (!isBrandPage || brandIdsParam || brandIdSingle || !pathLeafSlug) {
      return;
    }
    if (brandResolutionDone) return;
    if (!brandsForSlugData?.data?.data) return;

    const matched = matchEntityBySlug(
      brandsForSlugData.data.data as any[],
      pathLeafSlug,
      ["name", "brand_name"],
    );
    if (matched) {
      const id = String(matched.id ?? matched.brand_id);
      saveSlugId("brand", pathLeafSlug, id);
      setResolvedBrandId(id);
    }
    setBrandResolutionDone(true);
  }, [
    brandsForSlugData,
    isBrandPage,
    pathLeafSlug,
    brandIdsParam,
    brandIdSingle,
    brandResolutionDone,
  ]);

  const resolvedProductIdFromSlug = useMemo(() => {
    if (!productSlug) return null;
    const fromPath = extractIdFromSlug(productSlug);
    if (fromPath) return fromPath;
    return lookupSlugId("product", productSlug);
  }, [productSlug]);

  const queryArg = useMemo((): GetFilterListArg => {
    // On category pages, filter-list options must stay scoped to the page category
    // (e.g. Skin Care), not sidebar subcategory picks (e.g. Day Cream).
    const category_ids = isCategoryPage
      ? joinCommaSeparatedIds(categoryIdSingle, pageContextCategoryId)
      : joinCommaSeparatedIds(categoryIdsParam, categoryIdSingle);

    const brand_ids = isBrandPage
      ? joinCommaSeparatedIds(brandIdsParam, brandIdSingle, resolvedBrandId)
      : isCategoryPage
        ? undefined
        : joinCommaSeparatedIds(brandIdsParam, brandIdSingle);

    const product_id = joinCommaSeparatedIds(
      productIdsParam,
      productIdSingle,
      resolvedProductIdFromSlug,
    );

    const arg: GetFilterListArg = {};
    if (category_ids) arg.category_ids = category_ids;
    if (brand_ids) arg.brand_ids = brand_ids;
    if (product_id) arg.product_id = product_id;
    return arg;
  }, [
    isCategoryPage,
    isBrandPage,
    categoryIdsParam,
    categoryIdSingle,
    brandIdsParam,
    brandIdSingle,
    productIdsParam,
    productIdSingle,
    pageContextCategoryId,
    resolvedBrandId,
    resolvedProductIdFromSlug,
    searchParamsKey,
  ]);

  const needsCategoryContext =
    isCategoryPage && !categoryIdSingle && !pageContextCategoryId;
  const needsBrandContext = isBrandPage && !brandIdsParam && !brandIdSingle;

  const skipQuery =
    (needsCategoryContext && !categoryResolutionDone) ||
    (needsBrandContext && !brandResolutionDone);

  const skipBaseFallback = isCategoryPage || isBrandPage;

  return {
    queryArg,
    pageContextCategoryId,
    skipQuery,
    skipBaseFallback,
  };
}
