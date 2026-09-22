/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@mui/material";
import React, { useEffect, useMemo, useRef } from "react";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import ProductCard from "../productCard";
import { useNavigateWithDeliveryMode } from "@/hooks/useNavigateWithDeliveryMode";
import { buildCategoryUrl } from "@/utils/urlBuilder";
import { Product } from "@/types/General";
import { getHomeProductsCardSliderSettings } from "@/types/ProductSliderSetting";

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

function HomeBestOfBest({
  products = [],
  categoryId,
  title = "Today's Best Deals",
  showTitle = true,
}: {
  products?: Product[];
  categoryId?: number | string;
  title?: string;
  showTitle?: boolean;
}) {
  const { navigate } = useNavigateWithDeliveryMode();
  type SliderType = any;
  const sliderRef = useRef<SliderType | null>(null);

  const validProducts = (products || []).filter(
    (product) => product?.product_id,
  );

  const resolvedCategoryId = categoryId || validProducts[0]?.category?.id;

  const settings = useMemo(
    () =>
      getHomeProductsCardSliderSettings(validProducts.length, {
        nextArrow: <CustomNextArrow />,
        prevArrow: <CustomPrevArrow />,
      }),
    [validProducts.length],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      sliderRef.current?.slickGoTo?.(0, true);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [validProducts.length]);

  if (!validProducts.length) {
    return null;
  }

  return (
    <section className="home_best_sc product_sc best_of_best">
      <div className="container">
        {showTitle ? (
          <div className="s_head flex hd_4">
            <h2>{title}</h2>
            <div className="rt">
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const url = resolvedCategoryId
                    ? buildCategoryUrl([], {
                        category_id: resolvedCategoryId,
                        type: "bestOfBest",
                      })
                    : `/category/best-sellers?type=bestOfBest`;
                  navigate(url);
                }}
              >
                More <KeyboardArrowRightIcon />
              </Button>
            </div>
          </div>
        ) : null}

        <Slider
          key={`best-of-best-${validProducts.length}`}
          ref={sliderRef}
          {...settings}
          className="products_card_list"
        >
          {validProducts.map((product, index) => (
            <div
              key={`home-best-${product.product_id || "no-id"}-${index}`}
              className="products_card_slide"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
}

export default HomeBestOfBest;
