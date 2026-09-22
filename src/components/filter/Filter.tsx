/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AccordionDetails,
  Checkbox,
  Collapse,
  FormControlLabel,
  AccordionProps,
  accordionSummaryClasses,
  AccordionSummaryProps,
  styled,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import SwitchToggle from "../SwitchToggle";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import MuiAccordion from "@mui/material/Accordion";
import MuiAccordionSummary from "@mui/material/AccordionSummary";
import SearchBar from "../searchBar";
import { useGetFilterListQuery } from "@/service/filter";
import { useFilterListQueryArg } from "@/hooks/useFilterListQueryArg";
import { minimizeCategoryIdsByAncestors } from "@/utils/categoryTree";
import { getListingPathContext } from "@/utils/listingPathContext";

interface FilterValue {
  id: number;
  value: string;
  display_value: string | null;
  color_code: string | null;
}

interface FilterDataItem {
  id: number;
  name: string;
  logo_url?: string;
  banner_desktop_url?: string;
  banner_mobile_url?: string;
  image_url?: string;
  parent_id?: number | null;
  icon_url?: string;
  values?: FilterValue[];
}

interface FilterCategory {
  name: string;
  filterId: string;
  data: FilterDataItem[];
}

interface FilterApiResponse {
  statusCode: number;
  data: {
    result: FilterCategory[];
  };
  message: number;
}

interface FilterProps {
  closeFilter?: () => void;
  hideCategoryWhenEmpty?: boolean;
  hideBrandWhenEmpty?: boolean;
}
const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  "&:not(:last-child)": {
    borderBottom: 0,
  },
  "&::before": {
    display: "none",
  },
}));

const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor: "rgba(0, 0, 0, .03)",
  flexDirection: "row-reverse",
  [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]:
  {
    transform: "rotate(90deg)",
  },
  [`& .${accordionSummaryClasses.content}`]: {
    marginLeft: theme.spacing(1),
  },
  ...theme.applyStyles("dark", {
    backgroundColor: "rgba(255, 255, 255, .05)",
  }),
}));

function Filter({
  closeFilter,
  hideCategoryWhenEmpty = false,
  hideBrandWhenEmpty = false,
}: FilterProps) {
  const [expanded, setExpanded] = useState<string | false>(false);
  const [openCategorySubPanels, setOpenCategorySubPanels] = useState<Record<number, boolean>>({});
  const [filterData, setFilterData] = useState<FilterCategory[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isCategoryPage, isBrandPage } = useMemo(
    () => getListingPathContext(pathname),
    [pathname],
  );

  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<number[]>([]);

  useEffect(() => {
    const brandIdsParam = searchParams.get("brandIds");
    const brandSingle = searchParams.get("brand");
    const categoryIdsParam = searchParams.get("categoryIds");
    const categoryIdSingle = searchParams.get("category_id");
    const attributeIdsParam = searchParams.get("attributeIds");

    const brandFromMulti = brandIdsParam
      ? brandIdsParam.split(",").map(Number).filter((n) => !isNaN(n))
      : [];
    const brandOne = brandSingle != null && brandSingle !== "" ? Number(brandSingle) : NaN;
    const newSelectedBrands = [
      ...new Set([
        ...brandFromMulti,
        ...(Number.isFinite(brandOne) ? [brandOne] : []),
      ]),
    ];

    const catFromMulti = categoryIdsParam
      ? categoryIdsParam.split(",").map(Number).filter((n) => !isNaN(n))
      : [];
    const catOne =
      categoryIdSingle != null && categoryIdSingle !== ""
        ? Number(categoryIdSingle)
        : NaN;
    const newSelectedCategories = [
      ...new Set([
        ...catFromMulti,
        ...(Number.isFinite(catOne) ? [catOne] : []),
      ]),
    ];
    const newSelectedAttributeIds = attributeIdsParam ? attributeIdsParam.split(",").map(Number).filter((n) => !isNaN(n)) : [];

    if (JSON.stringify(newSelectedBrands) !== JSON.stringify(selectedBrands)) {
      setSelectedBrands(newSelectedBrands);
    }
    if (JSON.stringify(newSelectedCategories) !== JSON.stringify(selectedCategories)) {
      setSelectedCategories(newSelectedCategories);
    }
    if (JSON.stringify(newSelectedAttributeIds) !== JSON.stringify(selectedAttributeIds)) {
      setSelectedAttributeIds(newSelectedAttributeIds);
    }
  }, [searchParams]);

  const { queryArg: filterListQueryArg, pageContextCategoryId, skipQuery, skipBaseFallback } =
    useFilterListQueryArg();

  const { data: filterListData, isLoading, isSuccess, isError, error } =
    useGetFilterListQuery(filterListQueryArg, { skip: skipQuery });
  const { data: baseFilterListData } = useGetFilterListQuery(
    {},
    { skip: skipBaseFallback },
  );

  const mergedFilterSections = useMemo(() => {
    const primary: FilterCategory[] = filterListData?.data?.result ?? [];
    const fallback: FilterCategory[] = baseFilterListData?.data?.result ?? [];
    if (!primary.length) return fallback;

    const hasUsableOptions = (section: FilterCategory | undefined) => {
      if (!section || !Array.isArray(section.data) || section.data.length === 0) {
        return false;
      }
      if (section.filterId !== "attributeIds") return true;
      return section.data.some((attr) => (attr.values?.length ?? 0) > 0);
    };

    const merged = [...primary];
    fallback.forEach((fallbackSection) => {
      const existingIdx = merged.findIndex(
        (item) => item.filterId === fallbackSection.filterId
      );
      if (existingIdx === -1) {
        merged.push(fallbackSection);
        return;
      }
      if (!hasUsableOptions(merged[existingIdx]) && hasUsableOptions(fallbackSection)) {
        merged[existingIdx] = fallbackSection;
      }
    });

    // On category pages, keep category options from page context when brand
    // filters cause the contextual API to return an empty category section.
    if (isCategoryPage && pageContextCategoryId) {
      const categoryIdx = merged.findIndex((item) => item.filterId === "categoryIds");
      const primaryCategory = primary.find((item) => item.filterId === "categoryIds");
      const fallbackCategory = fallback.find((item) => item.filterId === "categoryIds");
      if (
        categoryIdx !== -1 &&
        !hasUsableOptions(merged[categoryIdx]) &&
        hasUsableOptions(fallbackCategory) &&
        fallbackCategory
      ) {
        merged[categoryIdx] = fallbackCategory;
      } else if (
        categoryIdx !== -1 &&
        !hasUsableOptions(merged[categoryIdx]) &&
        hasUsableOptions(primaryCategory) &&
        primaryCategory
      ) {
        merged[categoryIdx] = primaryCategory;
      }
    }

    return merged;
  }, [filterListData, baseFilterListData, isCategoryPage, pageContextCategoryId]);

  useEffect(() => {
    if (isSuccess && mergedFilterSections.length > 0) {
      setFilterData(mergedFilterSections);
    } else if (isError) {
    }
  }, [mergedFilterSections, isSuccess, isError, error]);

  const handleChange =
    (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const handleCheckboxChange = (filterType: "brandIds" | "categoryIds" | "attributeIds", id: number, isChecked: boolean) => {
    let updatedIds: number[];
    let currentSelected: number[];

    if (filterType === "brandIds") {
      currentSelected = [...selectedBrands];
      updatedIds = isChecked
        ? [...currentSelected, id]
        : currentSelected.filter((brandId) => brandId !== id);
      setSelectedBrands(updatedIds);
    } else if (filterType === "categoryIds") {
      currentSelected = [...selectedCategories];
      updatedIds = isChecked
        ? [...currentSelected, id]
        : currentSelected.filter((catId) => catId !== id);
      const categoryFilter = filterData.find((c) => c.filterId === "categoryIds");
      updatedIds = minimizeCategoryIdsByAncestors(
        updatedIds,
        categoryFilter?.data ?? [],
      );
      setSelectedCategories(updatedIds);
    } else if (filterType === "attributeIds") {
      currentSelected = [...selectedAttributeIds];
      updatedIds = isChecked
        ? [...currentSelected, id]
        : currentSelected.filter((attrId) => attrId !== id);
      setSelectedAttributeIds(updatedIds);
    } else {
      return;
    }

    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (updatedIds.length > 0) {
      newSearchParams.set(filterType, updatedIds.join(","));
    } else {
      newSearchParams.delete(filterType);
    }
    // When category filters are selected from sidebar, treat them as the source of truth
    // and remove single header category param to avoid mixed parent+child context.
    if (filterType === "categoryIds") {
      newSearchParams.delete("category_id");
    }
    const nextBrandIds =
      filterType === "brandIds" ? updatedIds : selectedBrands;
    const nextCategoryIds =
      filterType === "categoryIds" ? updatedIds : selectedCategories;
    const nextAttributeIds =
      filterType === "attributeIds" ? updatedIds : selectedAttributeIds;
    const hasAnyAppliedFilter =
      nextBrandIds.length > 0 ||
      nextCategoryIds.length > 0 ||
      nextAttributeIds.length > 0;
    if (hasAnyAppliedFilter) {
      newSearchParams.set("has_filtered", "1");
    } else {
      newSearchParams.delete("has_filtered");
    }
    router.push(`${pathname}?${newSearchParams.toString()}`);
  };

  const renderFilterOptions = (items: (FilterDataItem | { id: number; name: string })[], filterType: "brandIds" | "categoryIds" | "attributeIds", parentId?: string) => (
    <div className="checkbox_list brand_list">
      {items.map((item, idx) => {
        const displayLabel = "values" in item && item.values
          ? item.values.map((val) => val.display_value || val.value).join(", ")
          : item.name;

        const isChecked = filterType === "brandIds"
          ? selectedBrands.includes(item.id)
          : filterType === "categoryIds"
            ? selectedCategories.includes(item.id)
            : filterType === "attributeIds"
              ? selectedAttributeIds.includes(item.id)
              : false;

        return (
          <FormControlLabel
            className="v2"
            key={`${parentId || filterType}-${item.id}-${idx}`}
            control={
              <Checkbox
                size="small"
                checked={isChecked}
                onChange={(e) => handleCheckboxChange(filterType, item.id, e.target.checked)}
                sx={{
                  color: "#bdbdbd",
                  "&.Mui-checked": {
                    color: "var(--commerce-primary)",
                  },
                }}
              />
            }
            label={
              <span
                style={{
                  color: isChecked ? "var(--commerce-primary)" : "#212121",
                  fontWeight: isChecked ? 600 : 400,
                }}
              >
                {displayLabel}
              </span>
            }
          />
        );
      })}
    </div>
  );

  const categoryHierarchy = useMemo(() => {
    const categoryFilter = filterData.find((item) => item.filterId === "categoryIds");
    const categoryItems = categoryFilter?.data ?? [];
    const byId = new Map<number, FilterDataItem>();
    const childrenByParent = new Map<number, FilterDataItem[]>();

    categoryItems.forEach((item) => {
      const id = Number(item.id);
      if (!Number.isFinite(id)) return;
      byId.set(id, { ...item, id });
    });

    byId.forEach((item) => {
      const parentId = item.parent_id == null ? null : Number(item.parent_id);
      if (parentId != null && Number.isFinite(parentId) && byId.has(parentId)) {
        const existing = childrenByParent.get(parentId) ?? [];
        childrenByParent.set(parentId, [...existing, item]);
      }
    });

    return { byId, childrenByParent };
  }, [filterData]);

  const selectedHeaderCategoryId = useMemo(() => {
    const fromCategoryIds = (searchParams.get("categoryIds") || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    // Sidebar subcategory picks use the most specific id (last one).
    if (fromCategoryIds.length > 0) return fromCategoryIds[fromCategoryIds.length - 1];

    const fromCategoryId = Number(searchParams.get("category_id"));
    if (Number.isFinite(fromCategoryId)) return fromCategoryId;

    const fromPageContext = Number(pageContextCategoryId);
    return Number.isFinite(fromPageContext) ? fromPageContext : null;
  }, [searchParams, pageContextCategoryId]);

  const sidebarSubcategoryFolders = useMemo(() => {
    if (!selectedHeaderCategoryId) return null;
    return categoryHierarchy.childrenByParent.get(selectedHeaderCategoryId) ?? [];
  }, [categoryHierarchy.childrenByParent, selectedHeaderCategoryId]);

  const brandFilter = useMemo(
    () => filterData.find((item) => item.filterId === "brandIds"),
    [filterData],
  );
  const categoryFilter = useMemo(
    () => filterData.find((item) => item.filterId === "categoryIds"),
    [filterData],
  );
  const attributeFilter = useMemo(
    () => filterData.find((item) => item.filterId === "attributeIds"),
    [filterData],
  );
  const hasBrandOptions = (brandFilter?.data?.length ?? 0) > 0;
  const hasCategoryOptions = (categoryFilter?.data?.length ?? 0) > 0;
  const hasAttributeOptions =
    (attributeFilter?.data?.reduce(
      (sum, attr) => sum + (attr.values?.length ?? 0),
      0,
    ) ?? 0) > 0;

  const shouldShowBrandSection =
    !hideBrandWhenEmpty &&
    !isBrandPage &&
    hasBrandOptions;
  const shouldShowCategorySection = !hideCategoryWhenEmpty && hasCategoryOptions;
  const shouldRenderAnyFilterSection =
    shouldShowBrandSection || shouldShowCategorySection || hasAttributeOptions;

  useEffect(() => {
    // Reset nested open-state whenever category context changes
    setOpenCategorySubPanels({});
  }, [selectedHeaderCategoryId]);

  if (!shouldRenderAnyFilterSection) {
    return null;
  }

  return (
    <>
      <div className="filter_mn_box">
        <div className="filter_header">
          <h2>ALL FILTERS</h2>
          {closeFilter && (
            <a
              className="text_btn filter_close_link"
              onClick={closeFilter}
            >
              Close
            </a>
          )}
        </div>

        {/* <div className="new_arrival">
          <SwitchToggle label="New Arrivals" defaultChecked={true} />
        </div> */}
        <div className="accordian_list ">
          {filterData.map((category) => {
            if (category.filterId === "attributeIds") {
              return category.data.map((attribute) => (
                <Accordion
                  className=""
                  key={attribute.id}
                  expanded={expanded === `${category.filterId}-${attribute.id}`}
                  onChange={handleChange(`${category.filterId}-${attribute.id}`)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    {attribute.name}
                  </AccordionSummary>
                  <AccordionDetails>
                    {attribute.values && renderFilterOptions(attribute.values.map(val => ({ id: val.id, name: val.display_value || val.value })), "attributeIds", `${category.filterId}-${attribute.id}`)}
                  </AccordionDetails>
                </Accordion>
              ));
            } else {
              if (category.filterId === "categoryIds") {
                if (!shouldShowCategorySection) {
                  return null;
                }
                return (
                  <React.Fragment key={category.filterId}>
                    <Accordion
                      className=""
                      expanded={
                        expanded === category.filterId ||
                        Object.values(openCategorySubPanels).some(Boolean)
                      }
                      onChange={(_, isExpanded) => {
                        if (isExpanded) {
                          setExpanded(category.filterId);
                          return;
                        }
                        setExpanded(false);
                        setOpenCategorySubPanels({});
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        {category.name}
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderFilterOptions(category.data, "categoryIds")}
                        {sidebarSubcategoryFolders &&
                          sidebarSubcategoryFolders.length > 0 &&
                          sidebarSubcategoryFolders.map((subcat) => {
                            const subcatId = Number(subcat.id);
                            const subsubcats =
                              (categoryHierarchy.childrenByParent.get(subcatId) ?? []).filter(
                                (child) => Number(child.parent_id) === subcatId
                              );
                            const isOpen = !!openCategorySubPanels[subcatId];

                            return (
                              <Accordion
                                className=""
                                key={`root-subcat-folder-${subcatId}`}
                                expanded={isOpen}
                                onChange={(_, nextExpanded) => {
                                  setOpenCategorySubPanels((prev) => ({
                                    ...prev,
                                    [subcatId]: nextExpanded,
                                  }));
                                  if (nextExpanded) {
                                    setExpanded(category.filterId);
                                  }
                                }}
                              >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  {subcat.name}
                                </AccordionSummary>
                                <AccordionDetails>
                                  <div className="category_tree_children">
                                    {renderFilterOptions(subsubcats, "categoryIds", `subsub-${subcatId}`)}
                                  </div>
                                </AccordionDetails>
                              </Accordion>
                            );
                          })}
                      </AccordionDetails>
                    </Accordion>
                  </React.Fragment>
                );
              }

              if (category.filterId === "brandIds" && !shouldShowBrandSection) {
                return null;
              }

              return (
                <Accordion
                  className=""
                  key={category.filterId}
                  expanded={expanded === category.filterId}
                  onChange={handleChange(category.filterId)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    {category.name}
                  </AccordionSummary>
                  <AccordionDetails>
                    {category.filterId === "brandIds" && (
                      <SearchBar
                        placeholder="Search for brands"
                        adornmentPosition="start"
                      />
                    )}
                    {renderFilterOptions(
                      category.data,
                      category.filterId as "brandIds" | "categoryIds",
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            }
          })}
        </div>
      </div>
    </>
  );
}

export default Filter;
