/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter, usePathname } from "next/navigation";
import { useMediaQuery } from "@mui/material";
import { useGetCategoryBannersQuery } from "@/service/home";
import { getBannerDisplayImageSrc } from "@/utils/bannerWebImage";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface CategoryBannerProps {
  categoryIds?: number[];
  latitude?: number;
  longitude?: number;
}

function CategoryBanner({
  categoryIds,
  latitude = 28.6573,
  longitude = 77.1642
}: CategoryBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isProductCategoryPage = pathname?.includes("product-category") || pathname?.includes("/category") || pathname?.includes("/brand");
  const isMobile = useMediaQuery("(max-width:767px)");
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);

  // Only fetch if categoryIds are available
  const { data: bannersData, isLoading } = useGetCategoryBannersQuery(
    {
      latitude,
      longitude,
      category_ids: categoryIds,
    },
    {
      skip: !categoryIds || categoryIds.length === 0,
    }
  );

  const banners = bannersData?.data?.data || [];
  const bannersWithWebImage = (banners || []).filter(
    (b: any) => getBannerDisplayImageSrc(b, isMobile) != null,
  );

  // Don't render if no banners or loading
  if (isLoading) {
    return null;
  }

  if (!bannersWithWebImage.length) {
    return null;
  }

  // Add autoplay and autoplaySpeed to settings for auto scroll
  const settings = {
    infinite: bannersWithWebImage.length > 1,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    dots: bannersWithWebImage.length > 1,
    autoplay: bannersWithWebImage.length > 1,
    autoplaySpeed: 3000, // 3 seconds
    pauseOnHover: true,
    swipeToSlide: true,
    touchThreshold: 100,
    speed: 500,
    cssEase: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    waitForAnimate: false,
    useCSS: true,
    useTransform: true,
  };

  const handleBannerClick = (banner: any) => {
    router.push(getBannerNavigationUrl(banner));
  };

  return (
    <>
      <section className="home_banner">
        <div className="">
          <Slider ref={sliderRef} {...settings} className="hero_slider">
            {bannersWithWebImage.map((banner: any) => {
              return (
                <figure
                  key={banner.id}
                  onClick={() => handleBannerClick(banner)}
                  style={{
                    cursor: "pointer",
                    borderRadius: isProductCategoryPage ? "14px" : "0px",
                    overflow: "hidden"
                  }}
                >
                  <img
                    src={getBannerDisplayImageSrc(banner, isMobile) as string}
                    alt={banner.title || banner.description || "banner"}
                    style={{
                      borderRadius: isProductCategoryPage ? "14px" : "0px",
                      width: "100%",
                      display: "block"
                    }}
                  />
                </figure>
              );
            })}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default CategoryBanner;
