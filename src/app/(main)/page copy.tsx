"use client";
import { useEffect, useState } from "react";
import HomeCategory from "@/components/home/homeCategory";
import HomeCategorySlider from "@/components/home/homeCategorySlider";
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
import HomeCrossCulture from "@/components/home/homeCrossCulture";
import HomeFeaturedBrands1 from "@/components/home/homeFeaturedBrands1";
import { useHomePageQuery } from "@/service/home";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { useLazyGetAddressListQuery } from "@/service/address";
import { useAppSelector, useAppDispatch } from "@/lib/hook";
import { getToken, setUser } from "@/lib/slices/authSlice";
import { setToStorage, getFromStorage, removeFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { useLazyGetProfileQuery } from "@/service/auth";

export default function Home() {
  const dispatch = useAppDispatch();
  const dashboardArgs = useDashboardHomeQueryArgs();
  const { data, isLoading, isError, isSuccess } = useHomePageQuery(dashboardArgs);
  const token = useAppSelector(getToken);
  const [getAddressList] = useLazyGetAddressListQuery();
  const [getProfile] = useLazyGetProfileQuery();
  const [showReferralAlert, setShowReferralAlert] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

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

  // Fetch address list when user visits home page (ensures fresh data after login)
  useEffect(() => {
    if (token) {
      getAddressList();
    }
  }, [token, getAddressList]);

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

  // Check if it's "For You" tab (no tab param or tab=for-you)
  const isForYouTab = !tab || tab === "for-you";
  const selectedCategoryId = isForYouTab ? null : parseInt(tab as string);

  const { data: categoryDashboardData, isLoading: isCategoryDashboardLoading } =
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

  const categoryDashboardArray = [...(categoryDashboardData?.data?.data || [])].sort(
    (a: any, b: any) => (a.position || 0) - (b.position || 0)
  );

  const renderSection = (section: any) => {
    const type = section?.type;
    const labelKey = section?.label_key;
    const items = section?.items || [];
    const status = section?.status;
    const displayName = section?.display_name;

    // Skip inactive sections (status 0)
    if (status === 0) return null;
    if (!items || items.length === 0) return null;

    switch (labelKey || type) {
      case "PRODUCT_KIT":
        return <HomeOfferKit key={section.id} kits={items} title={displayName} />;
      case "CUSTOM_BANNER":
        return <HomeBanner key={section.id} banners={items} isForYouTab={isForYouTab} title={displayName} />;
      case "OFFERS":
        return <HomeOffers key={section.id} offers={items} title={displayName} />;
      case "DEALS":
        return <HomeDealsInAction key={section.id} deals={items} />;
      case "FEATURED_PRODUCTS":
        return <HomeFeaturedProducts key={section.id} featuredProducts={items} title={displayName} />;
      case "BEST_OF_BEST":
        return <HomeBestOfBest key={section.id} products={items} title={displayName} />;
      case "FEATURED_CATEGORY":
        return (
          <HomeCare
            key={section.id}
            cares={items}
            title={displayName}
            backgroundImage={section?.background_image}
          />
        );
      case "FAV":
        return <HomeCustomersFavourite key={section.id} products={items} title={displayName} />;
      case "FEATURED_BRANDS":
        return mode === "quick_delivery"
          ? <HomeFeaturedBrands1 key={section.id} brands={items} title={displayName} />
          : <HomeFeaturedBrands key={section.id} brands={items} title={displayName} />;
      case "AD":
        return <HomePromotion2 key={section.id} items={items} title={displayName} />;
      case "FESTIVAL":
        return (
          <HomeFestive
            key={section.id}
            items={items}
            title={displayName}
            titleImage={section?.title_image}
            backgroundImage={section?.background_image}
          />
        );
      case "LOWEST_PRICE":
        return <HomeLowestPrice key={section.id} items={items} title={displayName} />;
      case "REGIONAL_FASHION":
        return <HomeCrossCulture key={section.id} items={items} title={displayName} />;
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
          return <HomeRecommendedProducts key={section.id} products={validProducts} title={displayName} />;
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

      <HomeCategorySlider />

      {/* <HomeCategory /> */}

      {isForYouTab ? (
        <>
            {isLoading ? (
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
                <NoDataFound />
              )}
            </>
          )}
        </>
      ) : (
        <div className="wrap_home">
          {isCategoryDashboardLoading ? (
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
            <NoDataFound />
          )}
        </div>
      )}
    </>
  );
}
