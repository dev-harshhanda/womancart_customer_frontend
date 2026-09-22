/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter, useSearchParams } from "next/navigation";
import { withDeliveryModeInUrl } from "@/utils/deliveryMode";

const festiveItems = [
  { id: 1, image: "/images/festive_01.png", title: "Upto 50%off" },
  { id: 2, image: "/images/festive_02.png", title: "Upto 20%off" },
  { id: 3, image: "/images/festive_03.png", title: "Upto 50%off" },
  { id: 4, image: "/images/festive_04.png", title: "Upto 70%off" },
  { id: 5, image: "/images/festive_05.png", title: "Upto 20%off" },
  { id: 6, image: "/images/festive_06.png", title: "Upto 50%off" },
  { id: 7, image: "/images/festive_07.png", title: "Upto 50%off" },
];

function HomeBanner2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sliderRef = useRef<any>(null);
  const settings2 = {
    infinite: festiveItems.length > 7,
    slidesToShow: 7,
    slidesToScroll: 1,
    arrows: false,
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
        breakpoint: 1200,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 1,
          infinite: festiveItems.length > 5,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          infinite: festiveItems.length > 4,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 3.1,
          slidesToScroll: 1,
          infinite: festiveItems.length > 3,
          swipeToSlide: true,
          touchThreshold: 10,
        },
      },
    ],
  };

  return (
    <>
      <section className="home_banner1">
        <div className="container">
          <div className="s_head text_center">
            <h1>Diwali Sale</h1>
            <p>
              Celebrate Diwali with smart shopping, exclusive promos just for
              you
            </p>
          </div>

          <Slider ref={sliderRef} {...settings2} className="festive_grid">
            {festiveItems.map((item) => (
              <div
                className="festive_item"
                key={item.id}
                onClick={() =>
                  router.push(
                    withDeliveryModeInUrl(
                      `/product/product-category?type=festive&q=${encodeURIComponent(item.title)}`,
                      { searchParams },
                    ),
                  )
                }
              >
                <figure>
                  <img src={item.image} alt={item.title} />
                </figure>
                <p>
                  <span>{item.title}</span>
                </p>
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}

export default HomeBanner2;
