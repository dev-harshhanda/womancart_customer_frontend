/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useRef } from "react";
import { Button } from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useNavigateWithDeliveryMode } from "@/hooks/useNavigateWithDeliveryMode";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";
import { useGetBrandsQuery } from "@/service/auth";
interface HomeFeaturedBrands1Props {
  brands?: any[];
  title?: string;
  showTitle?: boolean;
}

function HomeFeaturedBrands1({
  brands = [],
  title = "Featured Brands",
  showTitle = true,
}: HomeFeaturedBrands1Props) {
  const { navigate } = useNavigateWithDeliveryMode();
  const { data: brandsData } = useGetBrandsQuery({ page: 1, limit: 1000 });
  const brandsList = useMemo(
    () => brandsData?.data?.data ?? [],
    [brandsData],
  );
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);
  const settings2 = {
    infinite: brands.length > 7,
    slidesToShow: 7,
    slidesToScroll: 1,
    arrows: true,
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
        breakpoint: 1800,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
          infinite: brands.length > 3,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2.1,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
          infinite: brands.length > 2,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
    ],
  };

  return (
    <>
      <section className="home_brands1_sc product_sc">
        <div className="container">
          {showTitle ? (
            <div className="s_head flex hd_4">
              <div className="lt">
                <h2>{title}</h2>
                <p>Handpicked for You, Trusted by All</p>
              </div>
              <div className="rt">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate("/product/product-category")}
                >
                  More <KeyboardArrowRightIcon />
                </Button>
              </div>
            </div>
          ) : null}

          <Slider ref={sliderRef} {...settings2} className="brand_slider1">
            {brands.map((brand, index) => (
              <div
                key={`home-featured-brand-1-${brand.id || brand.brand_id || 'no-id'}-${index}`}
                className="brand_item1"
                onClick={() =>
                  navigate(getBannerNavigationUrl(brand, { brandsList }))
                }
                style={{ cursor: 'pointer' }}
              >
                {brand.logo && (
                  <figure className="brand_logo">
                    <img src={brand.logo} alt="Logo" />
                  </figure>
                )}
                <figure className="brand_img" style={{ flex: 1, overflow: 'hidden', borderRadius: '15px' }}>
                  <img src={brand.image} alt="Brand Image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </figure>
              </div>
            ))}
          </Slider>
          <div className="mblvw_btn">
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate("/product/product-category")}
            >
              View All <KeyboardArrowRightIcon />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default HomeFeaturedBrands1;
