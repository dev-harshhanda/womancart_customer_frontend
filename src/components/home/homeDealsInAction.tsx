/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter } from "next/navigation";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface DealItem {
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

interface HomeDealsInActionProps {
  deals?: DealItem[];
}

function HomeDealsInAction({ deals = [] }: HomeDealsInActionProps) {
  const router = useRouter();
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);

  // Don't render if no deals
  if (!deals || deals.length === 0) {
    return null;
  }

  const settings = {
    infinite: deals.length > 9,
    slidesToShow: 9,
    slidesToScroll: 1,
    arrows: false,
    dots: true,
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
          slidesToShow: 5,
          slidesToScroll: 1,
          infinite: deals.length > 5,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          infinite: deals.length > 4,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: deals.length > 3,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
    ],
  };

  const handleDealClick = (deal: DealItem) => {
    const fallbackUrl = deal.title
      ? `/product/product-category?type=deals&q=${encodeURIComponent(deal.title)}`
      : undefined;
    router.push(getBannerNavigationUrl(deal, { fallbackUrl }));
  };

  return (
    <>
      <section className="home_deal">
        <div className="container">
          <Slider ref={sliderRef} {...settings} className="offer_slider">
            {deals.map((deal) => (
              <figure
                key={deal.id}
                onClick={() => handleDealClick(deal)}
                style={{ cursor: 'pointer', padding: '0 100px' }}
              >
                {/* <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}> */}
                <img
                  src={deal.image}
                  alt={deal.title || deal.description || "deal"}
                // style={{ padding: '0 10px', display: 'block', maxWidth: '100%', height: 'auto' }}
                />
                {/* {deal.title && <figcaption>{deal.title}</figcaption>} */}
                {/* </div> */}
              </figure>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default HomeDealsInAction;
