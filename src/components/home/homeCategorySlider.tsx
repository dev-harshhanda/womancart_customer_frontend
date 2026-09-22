/* eslint-disable @next/next/no-img-element */
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useGetCategoryListQuery } from "@/service/home";
import { CategoryItem } from "@/types/General";
import { useDashboardHomeQueryArgs } from "@/hooks/useDashboardHomeQueryArgs";
import { withDeliveryModeInUrl } from "@/utils/deliveryMode";
import { getFromStorage, setToStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

type CategorySlide = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
};

const FOR_YOU_SLIDE: CategorySlide = {
  id: -1,
  name: "For You",
  slug: "for-you",
  icon: "/images/cat_icon1.svg",
};

/**
 * Categories can come back as a full taxonomy path
 * (e.g. "Makeup > Face Makeup > Foundation"). Show only the leaf segment
 * for the slider label, matching the earlier UI.
 */
function getLeafName(name: string): string {
  if (!name) return name;
  const parts = String(name).split(/>|›/);
  return (parts[parts.length - 1] || name).trim();
}

function buildCategorySlides(items: CategoryItem[]): CategorySlide[] {
  return items.map((cat) => {
    const leafName = getLeafName(cat.name);
    return {
      id: cat.id,
      name: leafName,
      slug: leafName.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"),
      icon: cat.icon_url,
    };
  });
}

function readCachedCategorySlides(): CategorySlide[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = getFromStorage(STORAGE_KEYS.cachedCategoryList);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return buildCategorySlides(parsed as CategoryItem[]);
  } catch {
    return [];
  }
}

function HomeCategorySlider() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "for-you";
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const sliderRef = useRef<any>(null);
  const deliveryContext = useDashboardHomeQueryArgs();

  const { data: categoryData } = useGetCategoryListQuery({
    latitude: deliveryContext.latitude,
    longitude: deliveryContext.longitude,
    type: deliveryContext.type,
  }, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const [categories, setCategories] = useState<CategorySlide[]>(() => {
    const cached = readCachedCategorySlides();
    return cached.length > 0 ? [FOR_YOU_SLIDE, ...cached] : [FOR_YOU_SLIDE];
  });

  const settings = {
    infinite: false, // Disable infinite to prevent showing items before "For You"
    speed: 500,
    slidesToShow: 7,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    cssEase: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    swipe: true,
    draggable: true,
    touchMove: true,
    swipeToSlide: true,
    touchThreshold: 100,
    waitForAnimate: false,
    useCSS: true,
    useTransform: true,
    initialSlide: 0,
    variableWidth: true,
    centerMode: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 1,
          arrows: false,
          infinite: false,
          variableWidth: true,
          swipe: true,
          draggable: true,
          touchMove: true,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          arrows: false,
          infinite: false,
          variableWidth: true,
          swipe: true,
          draggable: true,
          touchMove: true,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          arrows: false,
          infinite: false,
          variableWidth: true,
          swipe: true,
          draggable: true,
          touchMove: true,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          arrows: false,
          infinite: false,
          variableWidth: true,
          swipe: true,
          draggable: true,
          touchMove: true,
          swipeToSlide: true,
          touchThreshold: 100,
        },
      },
    ],
  };

  useEffect(() => {
    if (categoryData?.statusCode === 200 && categoryData.data) {
      const dynamicCategories = buildCategorySlides(
        categoryData.data as CategoryItem[],
      );
      setCategories([FOR_YOU_SLIDE, ...dynamicCategories]);
      try {
        setToStorage(
          STORAGE_KEYS.cachedCategoryList,
          JSON.stringify(categoryData.data),
        );
      } catch {
        /* ignore quota / serialization errors */
      }
      // Reset slider to first slide (For You) when categories are loaded
      setTimeout(() => {
        if (sliderRef.current) {
          sliderRef.current.slickGoTo(0);
        }
      }, 100);
    }
  }, [categoryData]);

  // Reset slider to first slide when "For You" is selected
  useEffect(() => {
    if (currentTab === "for-you" && sliderRef.current) {
      setTimeout(() => {
        sliderRef.current?.slickGoTo(0);
      }, 50);
    }
  }, [currentTab]);

  const handleSelect = (categorySlug: string, categoryId: number) => {
    if (categorySlug === "for-you") {
      router.push(withDeliveryModeInUrl("/", { searchParams }));
      setSelectedCategoryId(null);
    } else {
      router.push(
        withDeliveryModeInUrl(`/?tab=${categoryId}`, { searchParams }),
      );
      setSelectedCategoryId(categoryId);
    }
  };

  return (
    <section className="category_slider_sc">
      <div className="container" >
        <Slider ref={sliderRef} {...settings} className="category_slider_row" >
          {categories.map((category) => (
            <div key={category.id}>
              <div
                className={`category_slide_item ${currentTab === category.id.toString() ||
                  (currentTab === "for-you" && category.id === -1)
                  ? "active"
                  : ""
                  }`} onClick={() => handleSelect(category.slug, category.id)}
                style={{ padding: '15px', height: '100%' }}
              >
                <figure>
                  <img src={category.icon || "/images/cat_icon1.svg"} alt={category.name} onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/cat_icon1.svg";
                  }} />
                </figure>
                <h3
                  style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color:
                      (currentTab === category.id.toString() ||
                        (currentTab === "for-you" && category.id === -1))
                        ? '#110312'
                        : '#666',
                    margin: '0',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2',
                    width: 'fit-content',
                  }}
                >
                  {category.name}
                </h3>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
}

export default HomeCategorySlider;
