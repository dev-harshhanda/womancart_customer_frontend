/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter } from "next/navigation";
import { getBannerNavigationUrl } from "@/utils/bannerNavigation";

interface OfferItem {
  type: any;
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

interface HomeOffersProps {
  offers?: OfferItem[];
  title?: string;
  showTitle?: boolean;
}

function HomeOffers({ offers = [], title = "Best Offers", showTitle = true }: HomeOffersProps) {
  const router = useRouter();
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);

  // Don't render if no offers
  if (!offers || offers.length === 0) {
    return null;
  }

  const settings = {
    infinite: offers.length > 9,
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
          infinite: offers.length > 5,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          infinite: offers.length > 4,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: offers.length > 3,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
    ],
  };

  const handleOfferClick = (offer: OfferItem) => {
    const offerTitle = offer.title || "Offers";
    const typeParam = offer.type ? `&type=${offer.type}` : "";
    const fallbackUrl = `/product/product-category?type=offers&q=${encodeURIComponent(offerTitle)}${typeParam}`;
    const typeForUrl = typeof offer.type === "string" ? offer.type : undefined;
    router.push(getBannerNavigationUrl(offer, { typeParam: typeForUrl, fallbackUrl }));
  };

  return (
    <>
      <section className="home_offers">
        <div className="container">
          {showTitle ? (
            <div className="s_head flex hd_4">
              <h2 className="fw_med">{title}</h2>
            </div>
          ) : null}
          <Slider ref={sliderRef} {...settings} className="offer_slider">
            {offers.map((offer) => (
              <figure
                key={offer.id}
                onClick={() => handleOfferClick(offer)}
                style={{ cursor: 'pointer', padding: '0 100px' }}
              >
                {/* <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}> */}
                <img
                  src={offer.image}
                  alt={offer.title || offer.description || "offer"}
                // style={{ padding: '0 10px', display: 'block', maxWidth: '100%', height: 'auto' }} 
                />
                {/* {offer.title && <figcaption>{offer.title}</figcaption>} */}
                {/* </div> */}
              </figure>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default HomeOffers;
