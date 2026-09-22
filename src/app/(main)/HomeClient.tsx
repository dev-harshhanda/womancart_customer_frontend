"use client";
import { useEffect, useState } from "react";
import HomeCategory from "@/components/home/homeCategory";
import HomeBanner from "@/components/home/homeBanner";
import HomeOffers from "@/components/home/homeOffers";
import HomeDealsInAction from "@/components/home/homeDealsInAction";
import HomeFeaturedProducts from "@/components/home/homePromotion";
import HomePromotion2 from "@/components/home/homePromotion2";
import HomeBestOfBest from "@/components/home/homeBest";
import HomeCare from "@/components/home/homeCare";
import HomeCustomersFavourite from "@/components/home/homeCustomerFav";
import HomeFeaturedBrands from "@/components/home/homeFeaturedBrands";
import HomeFestive from "@/components/home/homeFestive";
import HomeFeature from "@/components/home/homeFeature";
import HomeRecommendedProducts from "@/components/home/homeRecommendedProducts";
import HomeCTA from "@/components/home/homeCTA";
import HomeLowestPrice from "@/components/home/homeLowestPrice";
import FeatureVideo from "@/components/home/homeFeatureVideo";
import HomeOfferKit from "@/components/home/homeOfferKit";
import { useSearchParams } from "next/navigation";
import HomeBanner2 from "@/components/home/homeBanner2";
import { useGetCategoryDashboardQuery } from "@/service/home";
import NoDataFound from "@/components/noDataFound";
import ComingSoon from "@/components/comingSoon";
import HomeCrossCulture from "@/components/home/homeCrossCulture";
import HomeFeaturedBrands1 from "@/components/home/homeFeaturedBrands1";
import {
  useHomePageQuery,
  useLazyGetCookieConfigQuery,
  usePostCookieEventMutation,
} from "@/service/home";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { readSelectedLocation } from "@/utils/deliveryAddressSync";
import { WC_BROWSER_GEO_SESSION_KEY } from "@/utils/dashboardGeolocation";
import { useAppSelector, useAppDispatch } from "@/lib/hook";
import { getToken, setUser } from "@/lib/slices/authSlice";
import { setToStorage, getFromStorage, removeFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import { useGuestLoginMutation, useLazyGetProfileQuery } from "@/service/auth";
import {
  performGuestLogin,
} from "@/utils/guestLoginSession";
import { ensureCookieAnalyticsSessionId, useCookiePageView } from "@/hooks/useCookiePageView";

/**
 * Sections that read API `show_title` (1 = show `display_name`, 0 = hide). All other section types
 * default to showing the title bar unless added here.
 */
/** Fixed cookie-banner copy (not overridden by shorter API `banner_description`). */
const COOKIE_CONSENT_DESCRIPTION =
  "We use our own cookies for the use of this site, personalize content and ads and to perform analysis of our traffic. We also share information about your use of our site with analytics partners who may combine it with other information that you've provided to them or that they've collected from your use of their services";

const SECTION_KEYS_RESPECT_SHOW_TITLE = new Set<string>([
  "FEATURED_CATEGORY",
  "REGIONAL_FASHION",
  "FEATURED_BRANDS",
  "BEST_OF_BEST",
  "OFFERS",
  "CUSTOM_BANNER",
  "FEATURED_PRODUCTS",
  "PRODUCT_KIT",
  "AD",
  "FESTIVAL",
]);

function layoutShowsTitle(section: { show_title?: unknown } | null | undefined): boolean {
  const v = section?.show_title;
  if (v === undefined || v === null) return true;
  return Number(v) === 1;
}

function sectionShowsTitleBar(section: { label_key?: string; type?: string; show_title?: unknown }): boolean {
  const key = section?.label_key || section?.type;
  if (!key || !SECTION_KEYS_RESPECT_SHOW_TITLE.has(key)) return true;
  return layoutShowsTitle(section);
}

export default function Home() {
  useCookiePageView("Home Page");
  const dispatch = useAppDispatch();
  const dashboardArgs = useDashboardHomeQueryArgs();
  const {
    data,
    isLoading,
    isFetching,
    isError,
    isSuccess,
  } = useHomePageQuery(dashboardArgs, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const token = useAppSelector(getToken);
  const [getProfile] = useLazyGetProfileQuery();
  const [guestLogin] = useGuestLoginMutation();
  const [showReferralAlert, setShowReferralAlert] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showCookieConsentModal, setShowCookieConsentModal] = useState(false);
  const [cookieEventType, setCookieEventType] = useState("page_view");
  const [cookieBannerTitle, setCookieBannerTitle] = useState("Accept Cookies");
  const [cookiePolicyUrl, setCookiePolicyUrl] = useState<string | null>(null);
  // const [getCookieConfig] = useLazyGetCookieConfigQuery();
  const [postCookieEvent, { isLoading: isCookieEventSubmitting }] = usePostCookieEventMutation();

  // Handle referral code from URL (fallback if route doesn't work)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // Match /referral/CODE or /referCode/CODE
      const match = pathname.match(/\/(referral|referCode)\/([^\/]+)/);
      if (match && match[2]) {
        const code = match[2];
        setReferralCode(code);
        
        // Check if user is logged in (existing user)
        const userToken = token || getFromStorage(STORAGE_KEYS.token);
        
        if (userToken) {
          // User is logged in - show alert like mobile app
          setShowReferralAlert(true);
          // Clean URL by removing referral code from pathname
          window.history.replaceState({}, '', '/');
        } else {
          // New user - store referral code
          setToStorage(STORAGE_KEYS.referralCode, code);
          // Clean URL by removing referral code from pathname
          window.history.replaceState({}, '', '/');
        }
      }
    }
  }, [token]);

  // useEffect(() => {
  //   if (typeof window === "undefined") return;
  //   if (!sessionStorage.getItem("cookiePageStartAt")) {
  //     sessionStorage.setItem("cookiePageStartAt", String(Date.now()));
  //   }
  //   const accepted = localStorage.getItem("cookieConsentAccepted");
  //   const declined = localStorage.getItem("cookieConsentDeclined");
  //   if (accepted === "1" || declined === "1") return;

  //   void getCookieConfig()
  //     .unwrap()
  //     .then((res: any) => {
  //       const payload = res?.data ?? res;
  //       const enabledValue =
  //         payload?.isEnabled ?? payload?.is_enabled ?? payload?.isbanner;
  //       const isBannerEnabled =
  //         enabledValue === true ||
  //         enabledValue === "true" ||
  //         Number(enabledValue) === 1;
  //       const analytics = payload?.page_analytics || {};
  //       const eventType =
  //         typeof analytics?.event_type === "string" && analytics.event_type.trim()
  //           ? analytics.event_type.trim()
  //           : "page_view";
  //       const bannerTitle =
  //         typeof payload?.banner_title === "string" && payload.banner_title.trim()
  //           ? payload.banner_title.trim()
  //           : "Accept Cookies";
  //       const policyUrlRaw = payload?.policy_url ?? payload?.policyUrl;
  //       const policyUrl =
  //         typeof policyUrlRaw === "string" && policyUrlRaw.trim() ? policyUrlRaw.trim() : null;

  //       setCookieEventType(eventType);
  //       setCookieBannerTitle(bannerTitle);
  //       setCookiePolicyUrl(policyUrl);
  //       setShowCookieConsentModal(isBannerEnabled);
  //     })
  //     .catch(() => {
  //       // Ignore config failures; homepage should continue to render.
  //     });
  // }, [getCookieConfig]);


  // Guest flow: hit guest-login once when home is opened first time in this tab/session.
  // Also re-run when Sanctum auth_token is missing (needed for guest cart remove/qty).
  useEffect(() => {
    if (token || getFromStorage(STORAGE_KEYS.token)) return;
    if (typeof window === "undefined") return;

    const hasGuestAuthToken = Boolean(getFromStorage(STORAGE_KEYS.guestAuthToken));
    try {
      const alreadyInitialized = sessionStorage.getItem(
        STORAGE_KEYS.guestLoginInitialized,
      );
      if (alreadyInitialized === "1" && hasGuestAuthToken) return;
    } catch {
      // continue and attempt guest-login
    }

    void performGuestLogin(guestLogin).then((ok) => {
      if (!ok) {
        try {
          sessionStorage.removeItem(STORAGE_KEYS.guestLoginInitialized);
        } catch {
          /* ignore */
        }
      }
    });
  }, [guestLogin, token]);

  // Mirror saved delivery coordinates into session for dashboard fallback only — do not request
  // browser geolocation here (normal delivery uses default/saved address; quick fetches on toggle).
  useEffect(() => {
    const loc = readSelectedLocation();
    const lat = loc ? parseFloat(String(loc.latitude)) : NaN;
    const lng = loc ? parseFloat(String(loc.longitude)) : NaN;
    const hasValid =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !(lat === 0 && lng === 0);
    if (!hasValid) return;
    try {
      sessionStorage.setItem(
        WC_BROWSER_GEO_SESSION_KEY,
        JSON.stringify({ latitude: lat, longitude: lng }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  // Call getProfile API when user comes first time after profile setup
  useEffect(() => {
    const checkAndFetchProfile = async () => {
      const profileSetupCompleted = getFromStorage(STORAGE_KEYS.profileSetupCompleted);
      const currentToken = token || getFromStorage(STORAGE_KEYS.token);
      
      // If profile setup was just completed and user has token, fetch profile
      if (profileSetupCompleted === "true" && currentToken) {
        try {
          const profileResponse = await getProfile().unwrap();
          if (profileResponse?.statusCode === 200 && profileResponse?.data) {
            // Update user data in Redux store
            dispatch(setUser({ user: profileResponse.data }));
            // Update credentials in storage
            setToStorage(STORAGE_KEYS.credentials, JSON.stringify(profileResponse.data));
            // Clear the flag after successful fetch
            removeFromStorage(STORAGE_KEYS.profileSetupCompleted);
          }
        } catch (error) {
          // console.error("Error fetching profile after setup:", error);
          // Clear flag even on error to prevent infinite retries
          removeFromStorage(STORAGE_KEYS.profileSetupCompleted);
        }
      }
    };

    checkAndFetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const homeDataArray = [...(data?.data?.data || [])].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const tab = searchParams.get("tab");
  const isQuickDeliveryMode =
    mode === "quick_delivery" || dashboardArgs.type === "quick";

  // Check if it's "For You" tab (no tab param or tab=for-you)
  const isForYouTab = !tab || tab === "for-you";
  const selectedCategoryId = isForYouTab ? null : parseInt(tab as string);

  const {
    data: categoryDashboardData,
    isLoading: isCategoryDashboardLoading,
    isFetching: isCategoryDashboardFetching,
    isSuccess: isCategoryDashboardSuccess,
    isError: isCategoryDashboardError,
    isUninitialized: isCategoryDashboardUninitialized,
  } =
    useGetCategoryDashboardQuery(
      {
        categoryId: selectedCategoryId as number,
        latitude: dashboardArgs.latitude,
        longitude: dashboardArgs.longitude,
        type: dashboardArgs.type,
        pincode: dashboardArgs.pincode,
      },
      {
        skip: !selectedCategoryId || isForYouTab,
      },
    );
// no 
  const categoryDashboardArray = [...(categoryDashboardData?.data?.data || [])].sort(
    (a: any, b: any) => (a.position || 0) - (b.position || 0)
  );
  const isHomeInitialLoading =
    isLoading || isFetching || (!isSuccess && !isError);
  const isCategoryInitialLoading =
    isCategoryDashboardLoading ||
    isCategoryDashboardFetching ||
    isCategoryDashboardUninitialized ||
    (!isCategoryDashboardSuccess && !isCategoryDashboardError);

  const renderSection = (section: any) => {
    const type = section?.type;
    const labelKey = section?.label_key;
    const items = section?.items || [];
    const status = section?.status;
    const displayName = section?.display_name;
    const showTitle = sectionShowsTitleBar(section);

    // Skip inactive sections (status 0)
    if (status === 0) return null;
    if (!items || items.length === 0) return null;

    switch (labelKey || type) {
      case "PRODUCT_KIT":
        return <HomeOfferKit key={section.id} kits={items} title={displayName} showTitle={showTitle} />;
      case "CUSTOM_BANNER":
        return (
          <HomeBanner
            key={section.id}
            banners={items}
            isForYouTab={isForYouTab}
            title={displayName}
            showTitle={showTitle}
            isFull= {true}
          />
        );
      case "OFFERS":
        return <HomeOffers key={section.id} offers={items} title={displayName} showTitle={showTitle} />;
      case "DEALS":
        return <HomeDealsInAction key={section.id} deals={items} />;
      case "FEATURED_PRODUCTS":
        return (
          <HomeFeaturedProducts
            key={section.id}
            featuredProducts={items}
            title={displayName}
            showTitle={showTitle}
          />
        );
      case "BEST_OF_BEST":
        return (
          <HomeBestOfBest key={section.id} products={items} title={displayName} showTitle={showTitle} />
        );
      case "FEATURED_CATEGORY":
        return (
          <HomeCare
            key={section.id}
            cares={items}
            title={displayName}
            backgroundImage={section?.background_image}
            showTitle={showTitle}
          />
        );
      case "FAV":
        return <HomeCustomersFavourite key={section.id} products={items} title={displayName} />;
      case "FEATURED_BRANDS":
        return isQuickDeliveryMode ? (
          <HomeFeaturedBrands1 key={section.id} brands={items} title={displayName} showTitle={showTitle} />
        ) : (
          <HomeFeaturedBrands key={section.id} brands={items} title={displayName} showTitle={showTitle} />
        );
      case "AD":
        return <HomePromotion2 key={section.id} items={items} title={displayName} showTitle={showTitle} />;
      case "FESTIVAL":
        return (
          <HomeFestive
            key={section.id}
            items={items}
            title={displayName}
            titleImage={section?.title_image}
            backgroundImage={section?.background_image}
            showTitle={showTitle}
          />
        );
      case "LOWEST_PRICE":
        return <HomeLowestPrice key={section.id} items={items} title={displayName} />;
      case "REGIONAL_FASHION":
        return <HomeCrossCulture key={section.id} items={items} title={displayName} showTitle={showTitle} />;
      case "VIDEO":
        return items.some((it: any) => it?.embed_script) ? (
          <FeatureVideo key={section.id} items={items} title={displayName} />
        ) : null;
      case "RECOMMENDED_PRODUCTS":
      case "RECOMMENDED":
        // Specialized logic for recommended products filter
        // store_id removed/commented as it is no longer required in the application
        const validProducts = items.filter((product: any) => product?.product_id);
        if (validProducts.length > 0) {
          return (
            <HomeRecommendedProducts key={section.id} products={validProducts} title={displayName} />
          );
        }
        return null;
      default:
        return null;
    }
  };

  const handleCloseReferralAlert = () => {
    setShowReferralAlert(false);
    setReferralCode(null);
  };

  const handleAcceptCookieConsent = () => {
    if (typeof window === "undefined") return;

    const sessionId = ensureCookieAnalyticsSessionId();

    const pageStartAtRaw = sessionStorage.getItem("cookiePageStartAt");
    const pageStartAt = pageStartAtRaw ? Number(pageStartAtRaw) : Date.now();
    if (!pageStartAtRaw) {
      sessionStorage.setItem("cookiePageStartAt", String(pageStartAt));
    }
    const durationMs = Math.max(0, Date.now() - pageStartAt);

    void postCookieEvent({
      event_type: cookieEventType || "page_view",
      session_id: sessionId,
      page_name: "Home Page",
      page_path: window.location.pathname || "/",
      duration_ms: durationMs,
    })
      .unwrap()
      .catch(() => {
        // Keep UX smooth even if analytics call fails.
      })
      .finally(() => {
        localStorage.setItem("cookieConsentAccepted", "1");
        setShowCookieConsentModal(false);
      });
  };

  const handleDeclineCookieConsent = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem("cookieConsentDeclined", "1");
    setShowCookieConsentModal(false);
  };

  const renderedHomeSections = homeDataArray
    .map((section: any) => renderSection(section))
    .filter(Boolean);

  const renderedCategorySections = categoryDashboardArray
    .map((section: any) => renderSection(section))
    .filter(Boolean);

  return (
    <>
      <Dialog 
        open={showReferralAlert} 
        onClose={handleCloseReferralAlert}
        PaperProps={{
          style: {
            borderRadius: '8px',
            padding: '20px',
            minWidth: '300px',
          }
        }}
      >
        <DialogTitle style={{ fontWeight: 'bold', paddingBottom: '10px' }}>
          Referral Not Applicable
        </DialogTitle>
        <DialogContent>
          <p style={{ margin: 0 }}>
            To redeem the referral code, you must be a new user.
          </p>
        </DialogContent>
        <DialogActions style={{ paddingTop: '20px' }}>
          <Button 
            onClick={handleCloseReferralAlert} 
            variant="contained"
            style={{
              backgroundColor: '#f0f0f0',
              color: '#000',
              textTransform: 'none',
              borderRadius: '4px',
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {showCookieConsentModal && (
        <>
          <Box
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-consent-banner-title"
            sx={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1300,
              backgroundColor: "rgba(250, 250, 250, 0.88)",
              borderTop: "1px solid rgba(0, 0, 0, 0.08)",
              boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.12)",
            }}
          >
            <Box
              sx={{
                maxWidth: 1280,
                mx: "auto",
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 2.5, md: 3 },
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "stretch", md: "flex-start" },
                gap: { xs: 2.5, md: 4 },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, pr: { md: 2 } }}>
                <Box
                  id="cookie-consent-banner-title"
                  component="h2"
                  sx={{
                    m: 0,
                    mb: 1,
                    fontSize: "18px",
                    fontWeight: 700,
                    lineHeight: 1.25,
                    color: "#1F1F1F",
                  }}
                >
                  {cookieBannerTitle}
                </Box>
                <Box
                  component="p"
                  sx={{
                    m: 0,
                    fontSize: "14px",
                    lineHeight: 1.65,
                    color: "rgba(31, 31, 31, 0.9)",
                    overflowWrap: "break-word",
                  }}
                >
                  {COOKIE_CONSENT_DESCRIPTION}
                  {cookiePolicyUrl ? (
                    <>
                      {" "}
                      <Box
                        component="a"
                        href={cookiePolicyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: "var(--commerce-primary, #d91b76)",
                          fontWeight: 600,
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                          "&:hover": { opacity: 0.9 },
                        }}
                      >
                        Cookie & privacy policy
                      </Box>
                      .
                    </>
                  ) : null}
                </Box>
              </Box>
              <Stack
                spacing={1.25}
                sx={{
                  width: { xs: "100%", md: 168 },
                  flexShrink: 0,
                  pt: { md: 0.5 },
                }}
              >
                <Button
                  onClick={handleAcceptCookieConsent}
                  variant="contained"
                  disabled={isCookieEventSubmitting}
                  fullWidth
                  sx={{
                    textTransform: "none",
                    borderRadius: 0,
                    minHeight: 44,
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#fff",
                    backgroundColor: "var(--commerce-primary, #d91b76)",
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: "var(--commerce-primary, #d91b76)",
                      opacity: 0.92,
                      boxShadow: "none",
                    },
                  }}
                >
                  {isCookieEventSubmitting ? "Please wait…" : "Accept"}
                </Button>
                <Button
                  onClick={handleDeclineCookieConsent}
                  variant="outlined"
                  disabled={isCookieEventSubmitting}
                  fullWidth
                  sx={{
                    textTransform: "none",
                    borderRadius: 0,
                    minHeight: 44,
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#fff",
                    borderColor: "rgba(255, 255, 255, 0.9)",
                    borderWidth: "1px",
                    "&:hover": {
                      borderColor: "#fff",
                      borderWidth: "1px",
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                    },
                  }}
                >
                  Decline
                </Button>
              </Stack>
            </Box>
          </Box>
        </>
      )}

      {/* Category icon slider hidden — home still defaults to For You tab content */}

      {isForYouTab ? (
        <>
            {isHomeInitialLoading ? (
            <div className="wrap_home home_skeleton">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="home_skeleton_section">
                  <div className="skeleton_shimmer home_skeleton_banner" />
                  <div className="home_skeleton_row">
                    {Array.from({ length: 4 }).map((_, cardIndex) => (
                      <div
                        key={cardIndex}
                        className="home_skeleton_card skeleton_shimmer"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {renderedHomeSections.length > 0 ? (
                <>
                  <div className="wrap_home">{renderedHomeSections}</div>
                  <HomeCTA />
                  <HomeFeature />
                </>
              ) : (
                isQuickDeliveryMode ? <ComingSoon /> : <NoDataFound />
              )}
            </>
          )}
        </>
      ) : (
        <div className="wrap_home">
          {isCategoryInitialLoading ? (
            <div className="home_category_skeleton">
              <div className="skeleton_shimmer home_skeleton_banner" />
              <div className="home_skeleton_row">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="home_skeleton_card skeleton_shimmer"
                  />
                ))}
              </div>
            </div>
          ) : renderedCategorySections.length > 0 ? (
            renderedCategorySections
          ) : (
            isQuickDeliveryMode ? <ComingSoon /> : <NoDataFound />
          )}
        </div>
      )}
    </>
  );
}
