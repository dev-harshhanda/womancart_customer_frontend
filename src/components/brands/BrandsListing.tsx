"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Box, TextField, Typography, CircularProgress, Grid, Button, useMediaQuery, IconButton, Badge } from "@mui/material";
import { useLazyGetBrandsQuery } from "@/service/auth";
import { useGetBrandBannersQuery } from "@/service/home";
import { useGetCartQuery } from "@/service/cart";
import { sumCartLineQuantities } from "@/utils/cartQuantity";
import { usePathname } from "next/navigation";
import { useNavigateWithDeliveryMode } from "@/hooks/useNavigateWithDeliveryMode";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { buildBrandUrl } from "@/utils/urlBuilder";
import { useAppSelector } from "@/lib/hook";
import { getToken } from "@/lib/slices/authSlice";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

function getBrandLetterBucket(name: string): string {
  const firstChar = String(name || "").trim().charAt(0).toUpperCase();
  if (!firstChar || !/[A-Z]/.test(firstChar)) return "#";
  return firstChar;
}

interface BrandsListingProps {
  onBrandClick?: () => void;
  variant?: "page" | "mega-menu";
  brands?: any[];
}

const BrandsListing = ({ onBrandClick, variant = "page", brands }: BrandsListingProps) => {
  const { navigate } = useNavigateWithDeliveryMode();
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth/") ?? false;
  const [getBrands] = useLazyGetBrandsQuery();
  const queryArgs = useDashboardHomeQueryArgs();

  const token = useAppSelector(getToken);
  const [localToken, setLocalToken] = useState<string | null>(null);
  useEffect(() => {
    setLocalToken(getFromStorage(STORAGE_KEYS.token));
  }, [token]);

  // Cart badge only when logged in — guest cart/list can 401 and trigger global login redirect (see lib/rtk.ts).
  const { data: cartData } = useGetCartQuery(queryArgs, {
    skip: isAuthPage || !(token || localToken),
  });
  const cartItemCount = sumCartLineQuantities(cartData?.data?.items);

  // Banners for slider
  const { data: bannerData } = useGetBrandBannersQuery({
    latitude: queryArgs.latitude,
    longitude: queryArgs.longitude,
  });
  const banners = bannerData?.data?.data || [];

  // Breakpoints
  const isMobile = useMediaQuery("(max-width:991px)"); // Tablet and Mobile

  // State for all brands (used for sidebar and A-Z filtering)
  const [allBrands, setAllBrands] = useState<any[]>([]);
  const [isAllBrandsLoading, setIsAllBrandsLoading] = useState(false);

  // State for currently displayed grid brands (paginated/filtered)
  const [gridBrands, setGridBrands] = useState<any[]>([]);
  const [isGridLoading, setIsGridLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [brokenBrandImages, setBrokenBrandImages] = useState<Record<string | number, boolean>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [activeLetter, setActiveLetter] = useState("*");
  const [activeTab, setActiveTab] = useState("ALL");

  // Mobile View Toggle
  const [showGridOnMobile, setShowGridOnMobile] = useState(false);

  const renderBrandLogo = useCallback(
    (brand: any, imageSx: Record<string, unknown>) => {
      const brandKey = brand?.id ?? brand?.brand_id ?? brand?.name;
      const hasLogo = Boolean(brand?.logo_url) && !brokenBrandImages[brandKey];

      if (!hasLogo) {
        return (
          <Box
            aria-hidden="true"
            sx={{
              width: "100%",
              height: "100%",
              borderRadius: "8px",
              backgroundColor: "#f6f6f6",
            }}
          />
        );
      }

      return (
        <Box
          component="img"
          src={brand.logo_url}
          alt={brand.name}
          sx={imageSx}
          onError={() => {
            setBrokenBrandImages((prev) => ({
              ...prev,
              [brandKey]: true,
            }));
          }}
        />
      );
    },
    [brokenBrandImages],
  );

  // Fetch ALL brands for A–Z / search / "All" grid (follow total_pages — backend may cap a single limit).
  useEffect(() => {
    if (brands?.length) {
      setAllBrands(
        [...brands].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        ),
      );
    }
    let cancelled = false;
    const fetchAllBrands = async () => {
      setIsAllBrandsLoading(true);
      try {
        const byId = new Map<string | number, any>();
        let page = 1;
        let totalPages = 1;
        do {
          const result = await getBrands({ page, limit: 500 }).unwrap();
          if (cancelled) return;
          const raw = result?.data?.data ?? result?.data;
          const list = Array.isArray(raw) ? raw : [];
          for (const b of list) {
            if (b?.id != null) byId.set(b.id, b);
          }
          totalPages = Math.max(Number(result?.data?.total_pages) || 1, 1);
          page += 1;
        } while (page <= totalPages);

        if (cancelled) return;
        const merged = [...byId.values()].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        );
        if (merged.length > 0) {
          setAllBrands(merged);
        } else if (!brands?.length) {
          setAllBrands([]);
        }
      } catch (error) {
        console.error("Failed to fetch all brands:", error);
        if (!brands?.length) setAllBrands([]);
      } finally {
        if (!cancelled) setIsAllBrandsLoading(false);
      }
    };
    void fetchAllBrands();
    return () => {
      cancelled = true;
    };
  }, [brands, getBrands]);

  // Function to fetch brands for the grid based on tab/page
  const fetchGridData = useCallback(async (tab: string, pageNum: number, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setIsGridLoading(true);

    try {
      const params: any = { page: pageNum, limit: 20 };
      if (tab === "FEATURED") params.featured = 1;
      else if (tab === "NEW LAUNCHES") params.new_launch = 1;
      else if (tab === "ONLY AT WOMANCART") params.only_at_womancart = 1;

      const result = await getBrands(params).unwrap();
      const newBrands = result?.data?.data || result?.data || [];
      const totalPages = result?.data?.total_pages || 1;

      if (isLoadMore) {
        setGridBrands(prev => [...prev, ...newBrands]);
      } else {
        setGridBrands(newBrands);
      }
      setHasMore(pageNum < totalPages);
    } catch (error) {
      console.error("Failed to fetch grid brands:", error);
    } finally {
      setIsGridLoading(false);
      setLoadingMore(false);
    }
  }, [getBrands]);

  // Initial fetch on tab change
  useEffect(() => {
    setPage(1);
    fetchGridData(activeTab, 1);
  }, [activeTab, fetchGridData]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchGridData(activeTab, nextPage, true);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveLetter("*");
    setSearchTerm("");
    if (isMobile) setShowGridOnMobile(true);
  };

  const handleLetterHover = (letter: string) => {
    setActiveLetter(letter);
    setSearchTerm("");
    if (isMobile) setShowGridOnMobile(true);
  };

  const availableAlphabetLetters = useMemo(() => {
    const buckets = new Set<string>();
    for (const brand of allBrands) {
      buckets.add(getBrandLetterBucket(brand.name || brand.brand_name || ""));
    }
    return ALPHABET.filter((letter) => buckets.has(letter));
  }, [allBrands]);

  useEffect(() => {
    if (activeLetter === "*") return;
    if (availableAlphabetLetters.includes(activeLetter)) return;
    setActiveLetter("*");
  }, [activeLetter, availableAlphabetLetters]);

  // Sidebar brand list (always filtered from the full 'allBrands' list)
  const sidebarBrandsList = useMemo(() => {
    let list = allBrands;
    if (searchTerm) {
      list = list.filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
    } else if (activeLetter !== "*") {
      list = list.filter(
        (b) => getBrandLetterBucket(b.name || b.brand_name || "") === activeLetter,
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [allBrands, searchTerm, activeLetter]);

  // Grid display logic — "All" tab uses the merged full list so guests see every brand, not only page 1 (20).
  const finalGridBrands = useMemo(() => {
    if (searchTerm || activeLetter !== "*") {
      let list = allBrands;
      if (searchTerm) {
        list = list.filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      if (activeLetter !== "*") {
        list = list.filter(
          (b) =>
            getBrandLetterBucket(b.name || b.brand_name || "") === activeLetter,
        );
      }
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (activeTab === "ALL" && allBrands.length > 0) {
      return [...allBrands].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      );
    }
    return gridBrands;
  }, [allBrands, gridBrands, searchTerm, activeLetter, activeTab]);

  const showPagedLoadMore =
    !searchTerm &&
    activeLetter === "*" &&
    hasMore &&
    !(activeTab === "ALL" && allBrands.length > 0);

  const menuTabs = [
    { label: "All", value: "ALL" },
    { label: "Featured", value: "FEATURED" },
    { label: "Only at Womancart", value: "ONLY AT WOMANCART" },
    { label: "New Launches", value: "NEW LAUNCHES" }
  ];

  const handleBrandNavigate = (brand: any) => {
    navigate(buildBrandUrl(brand.name || brand.brand_name || "", { brandIds: brand.id }));
    onBrandClick && onBrandClick();
  };


  if (isMobile) {
    return (
      <Box sx={{ 
        display: "flex", 
        flexDirection: "column", 
        height: variant === "mega-menu" ? "auto" : "100%", 
        backgroundColor: "#fff",
        overflowY: variant === "mega-menu" ? "visible" : "auto",
        fontFamily: "'Jost', sans-serif !important"
      }}>
        {/* Mobile Header - Hide when in mega-menu variant as Header tab handles it */}
        {variant !== "mega-menu" && (
          <Box sx={{ 
            px: 2, 
            py: 1.5, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
            position: "sticky",
            top: 0,
            backgroundColor: "#fff",
            zIndex: 10
          }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton onClick={() => onBrandClick && onBrandClick()} size="small" sx={{ color: "#333", mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography sx={{ fontWeight: 600, color: "#000", fontSize: "18px", fontFamily: "'Jost', sans-serif" }}>
              Brands
            </Typography>
          </Box>
          <IconButton onClick={() => navigate("/cart?entry=nav")} size="small">
            {cartItemCount > 0 ? (
              <Badge
                badgeContent={cartItemCount}
                color="error"
                showZero={false}
                sx={{ "& .MuiBadge-badge": { backgroundColor: "var(--commerce-primary)" } }}
              >
                <ShoppingBagOutlinedIcon sx={{ color: "#333", fontSize: "28px" }} />
              </Badge>
            ) : (
              <ShoppingBagOutlinedIcon sx={{ color: "#333", fontSize: "28px" }} />
            )}
          </IconButton>
        </Box>
        )}

        {/* Guest Banner */}

        {/* Search Bar */}
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="medium"
            placeholder="Search in brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: "#999", mr: 1.5, fontSize: 24 }} />,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "4px",
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                "& fieldset": { border: "none" },
                "& input": { fontSize: "14px", py: 1.2, fontFamily: "'Jost', sans-serif" }
              },
            }}
          />
        </Box>

        {/* Banner Slider */}
        {banners.length > 0 && (
          <Box sx={{ px: 2, mb: 3 }}>
            <Box sx={{ borderRadius: "4px", overflow: "hidden" }}>
              <Slider 
                dots={false}
                infinite={banners.length > 1}
                speed={500}
                slidesToShow={1}
                slidesToScroll={1}
                autoplay={true}
                autoplaySpeed={3000}
                arrows={false}
              >
                {banners.map((banner: any) => (
                  <Box key={banner.id} component="img" src={banner.image} alt={banner.title} sx={{ width: "100%", height: "auto", display: "block", aspectRatio: "16/9", objectFit: "cover" }} />
                ))}
              </Slider>
            </Box>
          </Box>
        )}

        {/* Brand Filter Tabs */}
        <Box sx={{ 
          display: "flex", 
          gap: 1.5, 
          px: 2, 
          mb: 2,
          overflowX: "scroll",
          whiteSpace: "nowrap",
          "&::-webkit-scrollbar": { display: "none" },
          msOverflowStyle: "none",
          scrollbarWidth: "none"
        }}>
          {menuTabs.map((tab) => (
            <Button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              variant={activeTab === tab.value ? "contained" : "outlined"}
              sx={{
                borderRadius: "30px", // Rounded pills like in the screenshot
                textTransform: "none",
                whiteSpace: "nowrap",
                px: 2.5,
                py: 0.5,
                fontSize: "13px",
                fontWeight: 500,
                flexShrink: 0,
                fontFamily: "'Jost', sans-serif",
                color: activeTab === tab.value ? "#fff" : "var(--commerce-primary)",
                backgroundColor: activeTab === tab.value ? "var(--commerce-primary)" : "transparent",
                borderColor: "var(--commerce-primary)",
                "&:hover": {
                  backgroundColor: activeTab === tab.value ? "var(--commerce-primary-hover)" : "color-mix(in srgb, var(--commerce-primary) 4%, transparent)",
                  borderColor: "var(--commerce-primary)",
                }
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>

        {/* Grid Content */}
        <Box sx={{ px: 2, pb: 20 }}>
          {isGridLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress sx={{ color: "var(--commerce-primary)" }} /></Box>
          ) : (
            <Grid container spacing={2}>
              {finalGridBrands.length > 0 ? (
                finalGridBrands.map((brand: any) => (
                  <Grid size={{ xs: 4, sm: 3 }} key={brand.id}>
                    <Box 
                      onClick={() => handleBrandNavigate(brand)}
                      sx={{ 
                        display: "flex", 
                        flexDirection: "column",
                        alignItems: "center", 
                        cursor: "pointer",
                      }}
                    >
                      <Box sx={{ 
                        width: "100%", 
                        aspectRatio: "1", 
                        backgroundColor: "#fff", 
                        borderRadius: "4px", 
                        border: "1px solid #f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 1.5,
                        mb: 0.5,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                      }}>
                        {renderBrandLogo(brand, { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" })}
                      </Box>
                      <Typography sx={{ fontSize: "12px", mt: 0.5, textAlign: "center", color: "#333", fontFamily: "'Jost', sans-serif", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                        {brand.name}
                      </Typography>
                    </Box>
                  </Grid>
                ))
              ) : (
                <Box sx={{ width: "100%", textAlign: "center", py: 5 }}><Typography sx={{ color: "#999", fontFamily: "'Jost', sans-serif" }}>No brands found</Typography></Box>
              )}
            </Grid>
          )}

          {showPagedLoadMore && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Button 
                onClick={handleLoadMore} 
                disabled={loadingMore} 
                variant="contained"
                sx={{ 
                  backgroundColor: "var(--commerce-primary)",
                  color: "#fff",
                  textTransform: "none", 
                  fontFamily: "'Jost', sans-serif",
                  borderRadius: "30px",
                  px: 4,
                  py: 1.2,
                  fontWeight: 600,
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "var(--commerce-primary-hover)",
                    boxShadow: "none"
                  }
                }}
              >
                {loadingMore ? <CircularProgress size={20} color="inherit" /> : "View More"}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Desktop View (variant === "mega-menu" or "page")
  return (
    <Box sx={{ 
      display: "flex", 
      flexDirection: "row", 
      height: variant === "mega-menu" ? "600px" : "auto",
      backgroundColor: "#fff",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Sidebar - Visible on Desktop */}
      <Box sx={{ 
        width: "280px", 
        borderRight: "1px solid #f0f0f0", 
        display: "flex", 
        flexDirection: "column",
        flexShrink: 0,
        overflowY: "auto"
      }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search Brands"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value) {
                setActiveLetter("*");
              }
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: "#999", mr: 1, fontSize: 20 }} />,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "4px",
                backgroundColor: "#f9f9f9",
                "& fieldset": { borderColor: "#eee" },
              },
            }}
          />
        </Box>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ 
            flex: 1, 
            display: "flex", 
            gap: 0, 
            p: 0, 
            overflow: "hidden" // Let children handle their own scrolling
          }}>
            {/* Left Panel: List of Brand Names (Categories) */}
            <Box sx={{ 
              flex: 1, 
              borderRight: "1px solid #f0f0f0", 
              p: 2,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}>
              <Typography 
                variant="overline" 
                sx={{ 
                  color: "#999", 
                  fontWeight: 700, 
                  letterSpacing: '0.1em', 
                  mb: 2, 
                  display: "block",
                  fontSize: "10px",
                  fontFamily: "'Jost', sans-serif"
                }}
              >
                {searchTerm 
                  ? "SEARCH RESULTS" 
                  : activeLetter !== "*" 
                    ? `BRANDS STARTING WITH "${activeLetter}"` 
                    : "ALL BRANDS"}
              </Typography>

              <Box sx={{ 
                flex: 1, 
                overflowY: "auto", 
                pr: 1,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { backgroundColor: "#eee", borderRadius: "4px" }
              }}>
                {isAllBrandsLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={24} sx={{ color: "var(--commerce-primary)" }} />
                  </Box>
                ) : sidebarBrandsList.length > 0 ? (
                  sidebarBrandsList.map((brand: any) => (
                    <Typography 
                      key={brand.id} 
                      onClick={() => handleBrandNavigate(brand)} 
                      sx={{ 
                        fontSize: "14px", 
                        py: 0.8, 
                        cursor: "pointer", 
                        color: "#444", 
                        fontFamily: "'Jost', sans-serif",
                        transition: "all 0.2s ease",
                        "&:hover": { color: "var(--commerce-primary)", pl: 0.5 }, 
                        whiteSpace: "nowrap", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis" 
                      }}
                    >
                      {brand.name}
                    </Typography>
                  ))
                ) : (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography 
                      sx={{ 
                        color: "#999", 
                        fontSize: "14px", 
                        fontFamily: "'Jost', sans-serif",
                        fontStyle: "italic"
                      }}
                    >
                      No results found for "{activeLetter}"
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right Panel: A-Z Vertical Selector */}
            <Box sx={{ 
              width: "45px", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              py: 2,
              backgroundColor: "#fff",
              userSelect: "none"
            }}>
              <Typography 
                variant="caption" 
                onMouseEnter={() => handleLetterHover("*")} 
                sx={{ 
                  cursor: "pointer", 
                  color: activeLetter === "*" ? "var(--commerce-primary)" : "#999", 
                  fontWeight: activeLetter === "*" ? 800 : 500, 
                  mb: 1, 
                  fontSize: "12px", 
                  transition: "0.2s",
                  fontFamily: "'Jost', sans-serif",
                  "&:hover": { color: "var(--commerce-primary)", transform: "scale(1.2)" } 
                }}
              >
                ★
              </Typography>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: 0.2,
                overflowY: "auto",
                "&::-webkit-scrollbar": { display: "none" },
                msOverflowStyle: "none",
                scrollbarWidth: "none",
                pb: 2
              }}>
                {availableAlphabetLetters.map((letter) => (
                  <Typography 
                    key={letter} 
                    variant="caption" 
                    onMouseEnter={() => handleLetterHover(letter)} 
                    sx={{ 
                      width: "28px", 
                      height: "22px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      cursor: "pointer", 
                      color: activeLetter === letter ? "var(--commerce-primary)" : "#666", 
                      fontWeight: activeLetter === letter ? 800 : 500, 
                      fontSize: activeLetter === letter ? "13px" : "11px",
                      borderRadius: "4px",
                      backgroundColor: activeLetter === letter ? "var(--commerce-primary-light)" : "transparent",
                      transition: "all 0.1s ease",
                      fontFamily: "'Jost', sans-serif",
                      "&:hover": { 
                        color: "var(--commerce-primary)", 
                        backgroundColor: "var(--commerce-primary-light)",
                        transform: "scale(1.1)" 
                      } 
                    }}
                  >
                    {letter}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Grid Area - Visible on Desktop */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header Tabs */}
        <Box sx={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fff", zIndex: 1 }}>
          <Box sx={{ 
            display: "flex", 
            gap: 1.5, 
            p: 2, 
            overflowX: "auto", 
            "&::-webkit-scrollbar": { display: "none" }
          }}>
            {menuTabs.map((tab) => (
              <Typography
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                sx={{
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: activeTab === tab.value ? "var(--commerce-primary)" : "#666",
                  backgroundColor: activeTab === tab.value ? "var(--commerce-primary-light)" : "transparent",
                  minWidth: "80px",
                  textAlign: "center",
                  margin: 0,
                  padding: "3px 10px !important",
                  borderRadius: "30px",
                  transition: "0.2s",
                  border: activeTab === tab.value ? "1px solid var(--commerce-primary)" : "1px solid transparent",
                  "&:hover": { backgroundColor: "#f9f9f9" }
                }}
              >
                {tab.label}
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Guest Banner */}

        {/* Brand Grid Content area */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 3, backgroundColor: "#fafafa" }}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ mb: 2, fontWeight: 700, color: "#333", fontSize: "16px" }}>
              {searchTerm 
                ? `Results for "${searchTerm}"` 
                : activeLetter !== "*" 
                  ? `Brands starting with "${activeLetter}"`
                  : activeTab
              }
            </Typography>
            
            {isGridLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10 }}><CircularProgress color="primary" /></Box>
            ) : (
              <>
                <Grid container spacing={3}>
                  {finalGridBrands.length > 0 ? (
                    finalGridBrands.map((brand: any) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={`brand-card-${brand.id}`}>
                        <Box onClick={() => handleBrandNavigate(brand)} sx={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", aspectRatio: "1", borderRadius: "12px", p: 2, cursor: "pointer", border: "1px solid #eee", transition: "all 0.3s ease", "&:hover": { boxShadow: "0 8px 12px rgba(0,0,0,0.05)", transform: "translateY(-4px)" } }}>
                          {renderBrandLogo(brand, { maxWidth: "100%", maxHeight: "80%", objectFit: "contain", transition: "0.3s" })}
                        </Box>
                      </Grid>
                    ))
                  ) : (
                    <Box sx={{ width: "100%", textAlign: "center", py: 10 }}><Typography variant="h6" color="textSecondary">No brands found.</Typography></Box>
                  )}
                </Grid>

                {showPagedLoadMore && (
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 4, mb: 2 }}>
                    <Button variant="outlined" onClick={handleLoadMore} disabled={loadingMore} sx={{ color: "var(--commerce-primary)", borderColor: "var(--commerce-primary)", "&:hover": { borderColor: "var(--commerce-primary)", backgroundColor: "var(--commerce-primary-light)" }, textTransform: "none", borderRadius: "20px", px: 4 }}>
                      {loadingMore ? <CircularProgress size={20} sx={{ color: "var(--commerce-primary)" }} /> : "Load More"}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BrandsListing;
