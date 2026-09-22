/* eslint-disable @next/next/no-img-element */
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Slider from "react-slick";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import { Box, Rating } from "@mui/material";
import { parseReviewCount } from "@/utils/reviewText";
import { formatPriceInr } from "@/utils/format";
import { buildKitUrl } from "@/utils/urlBuilder";
import { getDeliveryMode } from "@/utils/deliveryMode";

type ProductKitItem = {
  id: number;
  kit_name: string;
  description: string | null;
  image: string;
  price: string;
  total_mrp: string;
  total_before_discount: string;
  discount_amount: string;
  average_rating?: string | number | null;
  review_count?: number | null;
};

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

function HomeOfferKit({
  kits = [],
  title = "Offer Kit",
  showTitle = true,
}: {
  kits?: ProductKitItem[];
  title?: string;
  showTitle?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deliveryMode = getDeliveryMode(searchParams);
  const quickModeTagLabel =
    deliveryMode === "quick_delivery" ? "Quick Delivery" : null;
  if (!kits || kits.length === 0) return null;

  const enableArrowTestMode = true;
  const sliderItems = kits;
  const canScrollDesktop = sliderItems.length > 5;
  const canScrollTablet = sliderItems.length > 4;
  const canScrollMobile = sliderItems.length > 3;
  const canScrollSmallMobile = sliderItems.length > 2;

  type SliderType = any;

  const settings = {
    infinite: canScrollDesktop,
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: enableArrowTestMode ? canScrollDesktop : false,
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />,
    dots: false,
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
          arrows: canScrollTablet,
          dots: true,
          infinite: canScrollTablet,
          swipeToSlide: true,
          touchThreshold: 100,
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
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          arrows: canScrollSmallMobile,
          dots: true,
          infinite: canScrollSmallMobile,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
    ],
  };

  const getDiscountPercentage = (price: string, totalMrp: string) => {
    const mrp = parseFloat(totalMrp);
    const selling = parseFloat(price);
    if (!mrp || mrp <= 0 || Number.isNaN(selling) || selling <= 0) return null;

    // Use price difference vs MRP so that:
    // - When price < MRP → positive discount
    // - When price > MRP → negative discount (price hike)
    const discount = ((mrp - selling) / mrp) * 100;

    if (Number.isNaN(discount) || discount === 0) return null;

    return Math.round(discount);
  };

  const getImageUrl = (image: string) => {
    if (!image) return "";
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }
    return `https://womancart1.s3.ap-south-1.amazonaws.com/${image}`;
  };

  return (
    <section className="home_best_sc product_sc">
      <div className="container">
        {showTitle ? (
          <div className="s_head flex hd_4">
            <h2>{title}</h2>
          </div>
        ) : null}

        <Slider {...settings} className="productBest_list">
          {sliderItems.map((kit) => {
            const discountPercent = getDiscountPercentage(
              kit.price,
              kit.total_mrp,
            );

            return (
              <div className="productBest_item" key={`offer-kit-${kit.id}`}>
                <Box
                  component="a"
                  className="overlay_click"
                  onClick={() =>
                    router.push(buildKitUrl(kit.kit_name || "offer-kit", { kitId: kit.id }))
                  }
                />

                <figure>
                  <img src={getImageUrl(kit.image)} alt={kit.kit_name} />
                </figure>

                <div className="card_info">
                  <h3>{kit.kit_name}</h3>
                  {quickModeTagLabel && (
                    <p className="delivery_mode_tag">{quickModeTagLabel}</p>
                  )}

                  <p className="price v2">
                    <ins>₹{formatPriceInr(kit.price)}</ins>
                    {discountPercent != null && (
                      <span className="price_cut">
                        <del>₹{formatPriceInr(kit.total_mrp)}</del>
                        <span>{discountPercent}% off</span>
                      </span>
                    )}
                  </p>

                  {(() => {
                    const reviewCount = parseReviewCount(kit?.review_count);
                    if (reviewCount === 0) return null;
                    return (
                      <p className="review">
                        {kit?.average_rating != null
                          ? Number(kit.average_rating).toFixed(1)
                          : "0.0"}
                        <Rating name="read-only" value={1} max={1} readOnly />
                        <span>({reviewCount})</span>
                      </p>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </Slider>
      </div>
    </section>
  );
}

export default HomeOfferKit;

