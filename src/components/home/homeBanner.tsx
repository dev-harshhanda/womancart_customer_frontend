/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter, usePathname } from "next/navigation";
import { useMediaQuery } from "@mui/material";
import { getBannerDisplayImageSrc } from "@/utils/bannerWebImage";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface BannerItem {
  id: number;
  title?: string;
  description?: string;
  image: string;
  web_image?: string | null;
  url?: string | null;
  banner_links?: Array<{
    id: number;
    linkable_type?: string | null;
    linkable_id?: number;
    banner_management_id?: number;
    type?: string;
  }>;
}

interface HomeBannerProps {
  banners?: BannerItem[];
  isForYouTab?: boolean;
  title?: string;
  showTitle?: boolean;
  isFull?: boolean;
}

function HomeBanner({ banners = [], isForYouTab: _isForYouTab = true, title, showTitle = true, isFull=false }: HomeBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isProductCategoryPage = pathname?.includes("product-category") || pathname?.includes("/category") || pathname?.includes("/brand");
  const isMobile = useMediaQuery("(max-width:767px)");
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);

  const bannersWithWebImage = (banners || []).filter((banner) => {
    return getBannerDisplayImageSrc(banner, isMobile) != null;
  }) as BannerItem[];

  // Don't render if no valid web-image banners
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
    lazyLoad: "progressive" as const,
  };

  const handleBannerClick = (banner: BannerItem) => {
    router.push(getBannerNavigationUrl(banner));
  };

  return (
    <>
      <section className="home_banner">
        <div className={!isFull ? "container" : ""}>
          {showTitle && title ? (
            <div className="s_head flex hd_4">
              <h2 className="fw_med">{title}</h2>
            </div>
          ) : null}
          <Slider ref={sliderRef} {...settings} className="hero_slider">
            {bannersWithWebImage.map((banner) => (
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
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default HomeBanner;
