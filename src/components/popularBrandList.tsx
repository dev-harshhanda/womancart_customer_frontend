/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useEffect, useRef, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useLazyGetBrandsQuery } from "@/service/auth";
import { useRouter } from "next/navigation";
import { buildBrandUrl } from "@/utils/urlBuilder";

interface CustomSliderProps {
  slidesToShow?: number;
  responsive?: any[];
  onHasDataChange?: (hasData: boolean) => void;
}

function PopularBrandList({ slidesToShow = 11, responsive, onHasDataChange }: CustomSliderProps) {
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);
  const [currentSlides, setCurrentSlides] = useState(slidesToShow);
  const [brokenBrandImages, setBrokenBrandImages] = useState<Record<number, boolean>>({});
  const router = useRouter();

  // Fetch dynamic brands (same API as header - admin-added brands)
  const [getBrands, { isLoading: brandsLoading }] = useLazyGetBrandsQuery();
  const [brandList, setBrandList] = useState<Array<{ id: number; logo_url?: string; name: string }>>([]);

  useEffect(() => {
    const fetchAllBrands = async () => {
      try {
        const firstPageResult = await getBrands({ page: 1, limit: 10 }).unwrap();
        const totalCount = firstPageResult?.data?.data_count || 0;

        if (totalCount > 0) {
          const allBrandsResult = await getBrands({ page: 1, limit: totalCount }).unwrap();
          const list = allBrandsResult?.data?.data || [];
          setBrandList(
            list.map((b: any) => ({
              id: b.id ?? b.brand_id,
              logo_url: b.logo_url,
              name: b.name ?? b.brand_name ?? "Brand",
            }))
          );
        } else {
          const list = firstPageResult?.data?.data || [];
          setBrandList(
            list.map((b: any) => ({
              id: b.id ?? b.brand_id,
              logo_url: b.logo_url,
              name: b.name ?? b.brand_name ?? "Brand",
            }))
          );
        }
      } catch {
        try {
          const fallbackResult = await getBrands({ page: 1, limit: 1000 }).unwrap();
          const list = fallbackResult?.data?.data || [];
          setBrandList(
            list.map((b: any) => ({
              id: b.id ?? b.brand_id,
              logo_url: b.logo_url,
              name: b.name ?? b.brand_name ?? "Brand",
            }))
          );
        } catch {
          setBrandList([]);
        }
      }
    };

    fetchAllBrands();
  }, [getBrands]);

  useEffect(() => {
    const updateSlides = () => {
      if (slidesToShow) {

        setCurrentSlides(slidesToShow);
      } else {

        if (window.innerWidth < 1400) {
          setCurrentSlides(8);
        } else if (window.innerWidth < 1600) {
          setCurrentSlides(9);
        } else if (window.innerWidth < 1800) {
          setCurrentSlides(10);
        } else {
          setCurrentSlides(11);
        }
      }
    };

    updateSlides();
    window.addEventListener("resize", updateSlides);
    return () => window.removeEventListener("resize", updateSlides);
  }, [slidesToShow]);

  useEffect(() => {
    onHasDataChange?.(brandList.length > 0);
  }, [brandList.length, onHasDataChange]);

  const settings = {
    infinite: brandList.length > currentSlides,
    slidesToShow: currentSlides,
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
    responsive
  };

  if (brandsLoading && brandList.length === 0) {
    return (
      <div className="popular_brand_list">
        <div className="brand_bx_loading" style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="brand_bx" style={{ width: "100px" }}>
              <div className="skeleton_shimmer" style={{ width: "100%", aspectRatio: "1", borderRadius: "8px" }} />
              <div className="skeleton_shimmer" style={{ height: "14px", width: "70%", marginTop: "8px", borderRadius: "4px" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (brandList.length === 0) {
    return null;
  }

  return (
    <>
      <Slider
        ref={sliderRef}
        {...settings}
        className="popular_brand_list "
      >
        {brandList.map((brand, index) => (
          <div
            className="brand_bx"
            key={brand.id ?? index}
            onClick={() => router.push(buildBrandUrl(brand.name || "", { brandIds: brand.id }))}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(buildBrandUrl(brand.name || "", { brandIds: brand.id }));
              }
            }}
          >
            <figure className={`main ${brand.logo_url && !brokenBrandImages[brand.id] ? "" : "is-empty"}`.trim()}>
              {brand.logo_url && !brokenBrandImages[brand.id] ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  onError={() => {
                    setBrokenBrandImages((prev) => ({
                      ...prev,
                      [brand.id]: true,
                    }));
                  }}
                />
              ) : null}
            </figure>
            <h3>{brand.name}</h3>
          </div>
        ))}
      </Slider>
    </>
  );
}

export default PopularBrandList;
