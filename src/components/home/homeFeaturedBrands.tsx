/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useRef } from "react";
import { Button } from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useNavigateWithDeliveryMode } from "@/hooks/useNavigateWithDeliveryMode";
import { FeaturedBrand } from "@/types/General";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";
import { useGetBrandsQuery } from "@/service/auth";

interface HomeFeaturedBrandsProps {
  brands?: FeaturedBrand[];
  title?: string;
  showTitle?: boolean;
}

function HomeFeaturedBrands({
  brands = [],
  title = "Featured Brands",
  showTitle = true,
}: HomeFeaturedBrandsProps) {
  const { navigate } = useNavigateWithDeliveryMode();
  const { data: brandsData } = useGetBrandsQuery({ page: 1, limit: 1000 });
  const brandsList = useMemo(
    () => brandsData?.data?.data ?? [],
    [brandsData],
  );
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);
  const settings2 = {
    infinite: brands.length > 8,
    slidesToShow: 8,
    slidesToScroll: 1,
    arrows: true,
    dots: false,
    autoplay: true,
    swipeToSlide: true,
    touchThreshold: 100,
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
          slidesToShow: 4,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
          infinite: brands.length > 4,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
          infinite: brands.length > 2,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
    ],
  };

  return (
    <>
      <section className="home_brands_sc product_sc">
        <div className="container">
          {showTitle ? (
            <div className="s_head flex hd_4">
              <h2>{title}</h2>
              <div className="rt">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate("/product/product-category?type=featured_brands")}
                >
                  More <KeyboardArrowRightIcon />
                </Button>
              </div>
            </div>
          ) : null}

          <Slider ref={sliderRef} {...settings2} className="brand_slider featured_brands_cursor_slider">
            {brands?.map((brand, index) => (
              <div
                key={`home-featured-brand-${brand?.id || 'no-id'}-${index}`}
                className="featured_brands_cursor_tile"
                onClick={() =>
                  navigate(getBannerNavigationUrl(brand, { brandsList }))
                }
                style={{ cursor: 'pointer' }}
              >
                <div className="brand_info" style={{ height: '100%', cursor: "pointer" }}>
                  <figure className="bransssd_bg">
                    <img src={brand.image} alt={brand.title || "banner"} style={{ height: '100%', width: '100%', objectFit: 'cover', cursor: "pointer" }} />
                  </figure>
                  {/* {brand?.image && (
                    <figure className="brand_logo">
                      <img src={brand?.image} alt="Brand Logo" />
                    </figure>
                  )} */}
                  {/* {brand?.description && <h3>{brand?.description}</h3>} */}
                  {/* <p>{brand.title !== "FeaturedBrands" && brand.title !== "Featured Brands" ? brand.title : brand.description}</p> */}
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default HomeFeaturedBrands;
