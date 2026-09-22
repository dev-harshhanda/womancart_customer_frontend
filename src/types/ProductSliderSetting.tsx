import type { ReactNode } from "react";

type HomeProductSliderArrows = {
  nextArrow?: ReactNode;
  prevArrow?: ReactNode;
};

/** When item count matches the visible cap, show a partial next slide so the carousel can scroll. */
function resolveSlidesToShow(maxSlides: number, length: number): number {
  if (length <= maxSlides) {
    return Math.max(length > 1 ? length - 0.2 : 1, 1);
  }
  return maxSlides;
}

function canCarousel(length: number, slidesToShow: number): boolean {
  return length > 1 && length > Math.floor(slidesToShow);
}

export function getHomeProductsCardSliderSettings(
  length: number,
  arrows?: HomeProductSliderArrows,
) {
  const desktopSlides = resolveSlidesToShow(5, length);
  const tabletSlides = resolveSlidesToShow(4, length);
  const mobileSlides = resolveSlidesToShow(3, length);
  const smallMobileSlides = resolveSlidesToShow(2.1, length);
  const hasArrows = Boolean(arrows?.nextArrow && arrows?.prevArrow);

  const buildBreakpoint = (slidesToShow: number) => ({
    slidesToShow,
    slidesToScroll: 1,
    arrows: hasArrows && canCarousel(length, slidesToShow),
    dots: true,
    infinite: canCarousel(length, slidesToShow),
    autoplay: canCarousel(length, slidesToShow),
    autoplaySpeed: 3000,
    pauseOnHover: true,
    swipeToSlide: true,
    touchThreshold: 10,
  });

  return {
    infinite: canCarousel(length, desktopSlides),
    slidesToShow: desktopSlides,
    slidesToScroll: 1,
    arrows: hasArrows && canCarousel(length, desktopSlides),
    nextArrow: arrows?.nextArrow,
    prevArrow: arrows?.prevArrow,
    dots: false,
    autoplay: canCarousel(length, desktopSlides),
    autoplaySpeed: 3000,
    pauseOnHover: true,
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
        settings: buildBreakpoint(tabletSlides),
      },
      {
        breakpoint: 991,
        settings: buildBreakpoint(mobileSlides),
      },
      {
        breakpoint: 767,
        settings: buildBreakpoint(smallMobileSlides),
      },
    ],
  };
}

export const getSliderSettings = (length: number) => {
  const breakpoints = [
    { bp: 1400, slides: 4 },
    { bp: 1200, slides: 3 },
    { bp: 992, slides: 2 },
    { bp: 576, slides: 1 },
  ];

  return {
    infinite: length > 5,
    slidesToShow: 5,
    slidesToScroll: 1,
    arrows: length > 5,
    dots: false,
    swipe: false,
    draggable: false,
    responsive: breakpoints.map(({ bp, slides }) => ({
      breakpoint: bp,
      settings: {
        slidesToShow: slides,
        infinite: length > slides,
        arrows: length > slides,
      },
    })),
  };
};
