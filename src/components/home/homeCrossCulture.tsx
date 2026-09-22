/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter } from "next/navigation";

import { FeaturedBrand } from "@/types/General";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface HomeCrossCultureProps {
  items: FeaturedBrand[];
  title?: string;
  showTitle?: boolean;
}
function HomeCrossCulture({
  items = [],
  title = "Regional Fashion",
  showTitle = true,
}: HomeCrossCultureProps) {
  const router = useRouter();
  type SliderType = any;
  const sliderRef = useRef<SliderType | null>(null);

  const settings2 = {
    infinite: items.length > 8,
    slidesToShow: 8,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    autoplay: true,
    swipeToSlide: true,
    touchThreshold: 10,
    speed: 500,
    cssEase: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    waitForAnimate: false,
    useCSS: true,
    useTransform: true,
    lazyLoad: "progressive" as const,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 1,
          infinite: items.length > 5,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          infinite: items.length > 4,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 3.1,
          slidesToScroll: 1,
          infinite: items.length > 3,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 2.1,
          slidesToScroll: 1,
          infinite: items.length > 2,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
    ],
  };

  return (
    <>
      <section className="home_collection_sc">
        <div className="container">
          {showTitle ? (
            <div className="s_head hd_4">
              <h2 className="fw_med">{title}</h2>
            </div>
          ) : null}

          <Slider ref={sliderRef} {...settings2} className="brand_slider">
            {items.map((item) => (
              <div
                key={item.id}
                className="brand_sssitem"
                onClick={() => router.push(getBannerNavigationUrl(item))}
                style={{ cursor: 'pointer' }}
              >
                <div className="brand_info">
                  <figure className="brand_bg">
                    <img
                      src={item.image}
                      alt={item.title || "banner"}
                    />
                  </figure>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default HomeCrossCulture;
