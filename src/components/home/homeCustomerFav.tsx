/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@mui/material";
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import ProductCard from "../productCard";
import { useNavigateWithDeliveryMode } from "@/hooks/useNavigateWithDeliveryMode";
import { Product } from "@/types/General";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
const CustomNextArrow = (props: any) => {
  const { className, onClick } = props;
  return (
    <div
      className={`custom-slick-arrow next-arrow ${className}`}
      onClick={onClick}
    >
      <KeyboardArrowRightIcon />
    </div>
  );
};

const CustomPrevArrow = (props: any) => {
  const { className, onClick } = props;
  return (
    <div
      className={`custom-slick-arrow prev-arrow ${className}`}
      onClick={onClick}
    >
      <KeyboardArrowLeftIcon />
    </div>
  );
};

function HomeCustomersFavourite({
  products,
  categoryId,
  title = "Your Favourite Section",
  showTitle = true,
}: {
  products?: Product[];
  categoryId?: number | string;
  title?: string;
  showTitle?: boolean;
}) {
  const { navigate } = useNavigateWithDeliveryMode();
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);

  // Get category ID from prop or from first product's category
  const resolvedCategoryId = categoryId || products?.[0]?.category?.id;

  // Use API products if provided, otherwise default to empty array
  const displayProducts = products || [];
  const canScrollDesktop = displayProducts.length > 5;
  const canScrollTablet = displayProducts.length > 4;
  const canScrollMobile = displayProducts.length > 3;
  const canScrollSmallMobile = displayProducts.length > 2;
  const settings = {
    infinite: canScrollDesktop,
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: canScrollDesktop,
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />,
    dots: false,
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
          slidesToShow: 4,
          slidesToScroll: 1,
          arrows: canScrollTablet,
          dots: true,
          infinite: canScrollTablet,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          arrows: canScrollMobile,
          dots: true,
          infinite: canScrollMobile,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2.1,
          slidesToScroll: 1,
          arrows: canScrollSmallMobile,
          dots: true,
          infinite: canScrollSmallMobile,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
    ],
  };
  return (
    <>
      <section className="product_sc">
        <div className="container">
          {showTitle ? (
            <div className="s_head flex hd_4">
              <h2>{title}</h2>
              <div className="rt">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate("/wishlist")}
                >
                  More <KeyboardArrowRightIcon />
                </Button>
              </div>
            </div>
          ) : null}

          <Slider ref={sliderRef} {...settings} className="products_card_list">
            {displayProducts.map((item, index) => (
              // store_id removed/commented as it is no longer required in the application
              // <ProductCard key={`home-fav-${item.product_id || 'no-id'}-${item.store_id || 'no-store'}-${index}`} product={item} />
              <ProductCard key={`home-fav-${item.product_id || 'no-id'}-${index}`} product={item} />
            ))}
          </Slider>
        </div>
      </section >
    </>
  );
}

export default HomeCustomersFavourite;
