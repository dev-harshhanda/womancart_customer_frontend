/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter } from "next/navigation";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface CareItem {
  id: number;
  title?: string;
  description?: string;
  image: string;
  url?: string | null;
  banner_links?: Array<{
    id: number;
    linkable_type?: string | null;
    linkable_id?: number;
    banner_management_id?: number;
    type?: string;
  }>;
}

interface HomeCareProps {
  cares?: CareItem[];
  title?: string;
  backgroundImage?: string | null;
  showTitle?: boolean;
}

function HomeCare({
  cares = [],
  title = "Featured Categories",
  backgroundImage,
  showTitle = true,
}: HomeCareProps) {
  const router = useRouter();
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);
  // Don't render if no cares data
  if (!cares || cares.length === 0) {
    return null;
  }

  const settings2 = {
    infinite: cares.length > 8,
    slidesToShow: 8,
    slidesToScroll: 1,
    arrows: true,
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
          arrows: false,
          slidesToScroll: 1,
          infinite: cares.length > 4,
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
          infinite: cares.length > 2,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
    ],
  };

  const handleCareClick = (care: CareItem) => {
    const careTitle = care.title || "Care";
    const fallbackUrl = `/product/product-category?type=care&q=${encodeURIComponent(careTitle)}`;
    router.push(getBannerNavigationUrl(care, { fallbackUrl }));
  };

  const containerStyle =
    backgroundImage != null && backgroundImage !== ""
      ? { backgroundImage: `url(${backgroundImage})` }
      : undefined;

  return (
    <>
      <section className="home_care res_home_care">
        <div className="container" style={containerStyle}>
          {showTitle ? (
            <div className="s_head text_center hd_3">
              <h2 className="fw_med f_Jost">{title}</h2>
            </div>
          ) : null}
          <Slider ref={sliderRef} {...settings2} className="care_slider">
            {cares.map((care) => (
              <div
                key={care.id}
                className="care_isstem"
                onClick={() => handleCareClick(care)}
                style={{ cursor: "pointer" }}
              >
                <figure>
                  <img src={care.image} alt={care.title || care.description || "care"} />
                  {/* {care.description && <figcaption>{care.description}</figcaption>} */}
                </figure>
                {/* <p>{care.title}</p> */}
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default HomeCare;
