/* eslint-disable @next/next/no-img-element */
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@mui/material";
import { FeaturedBrand } from "@/types/General";
import { getBannerDisplayImageSrc } from "@/utils/bannerWebImage";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface HomePromotion2Props {
  items: FeaturedBrand[];
  title?: string;
  showTitle?: boolean;
}

function HomePromotion2({ items, title = "Sponsored", showTitle = true }: HomePromotion2Props) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width:767px)");
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);
  const itemsWithBannerImage = (items || []).filter(
    (item) => getBannerDisplayImageSrc(item, isMobile) != null,
  );
  const settings = {
    infinite: itemsWithBannerImage.length > 3,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 3000,
    dots: false,
    swipeToSlide: true,
    touchThreshold: 10,
    speed: 500,
    cssEase: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    waitForAnimate: false,
    useCSS: true,
    useTransform: true,
    responsive: [
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2.1,
          slidesToScroll: 1,
          arrows: false,
          infinite: itemsWithBannerImage.length > 2,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 567,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          infinite: itemsWithBannerImage.length > 1,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
    ],
  };
  return (
    <>
      <section className="homePromotion2_sc">
        <div className="container">
          {showTitle && title ? (
            <div className="s_head flex hd_4">
              <h2 className="fw_med">{title}</h2>
            </div>
          ) : null}
          <Slider ref={sliderRef} {...settings} className="promotion_grid">
            {itemsWithBannerImage.map((item, index) => (
              <div
                className="promotion_grid_bx"
                key={index}
                onClick={() => router.push(getBannerNavigationUrl(item))}
                style={{ cursor: 'pointer' }}
              >
                <figure>
                  <img
                    src={getBannerDisplayImageSrc(item, isMobile) as string}
                    alt={item.title || "promotion"}
                  />
                </figure>
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default HomePromotion2;
