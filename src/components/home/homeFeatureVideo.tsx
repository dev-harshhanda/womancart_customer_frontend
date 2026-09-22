/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useRef, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Box } from "@mui/material";

function injectEmbedScript(container: HTMLElement | null, embedScript: string) {
  if (!container || !embedScript || typeof embedScript !== "string") return;
  const scriptSrcMatch = embedScript.match(/<script[^>]+src=["']([^"']+)["'][^>]*>/i);
  const scriptContentMatch = embedScript.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  const divPart = embedScript
    .replace(/<script[\s\S]*?<\/script>\s*/gi, "")
    .trim();
  if (divPart) {
    container.innerHTML = divPart;
  }
  if (scriptSrcMatch) {
    const src = scriptSrcMatch[1];
    const script = document.createElement("script");
    script.type = "module";
    script.defer = true;
    script.src = src;
    container?.appendChild(script);
  } else if (scriptContentMatch) {
    const script = document.createElement("script");
    script.textContent = scriptContentMatch[1];
    container?.appendChild(script);
  }
}

interface VideoItem {
  id: number;
  title?: string;
  embed_script?: string;
  product_id?: number;
  [key: string]: any;
}

interface HomeFeatureVideoProps {
  items: VideoItem[];
  title?: string | null;
  showTitle?: boolean;
}

function HomeFeatureVideo({ items = [], title, showTitle = true }: HomeFeatureVideoProps) {
  type SliderType = any;
  const sliderRef = useRef<SliderType | null>(null);
  const videoItems = items.filter((it) => it?.embed_script);
  const settings2 = {
    infinite: videoItems.length > 6,
    slidesToShow: Math.min(6, videoItems.length || 1),
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: Math.min(3, videoItems.length || 1),
          slidesToScroll: 1,
          arrows: false,
          infinite: videoItems.length > 3,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: Math.min(2, videoItems.length || 1),
          slidesToScroll: 1,
          arrows: false,
          infinite: videoItems.length > 2,
        },
      },
    ],
  };

  if (!videoItems.length) return null;

  return (
    <section className="home_video_sc">
      <div className="container">
        {showTitle ? (
          <div className="s_head flex hd_4">
            <h2 className="fw_med">{title || "Featured In Videos"}</h2>
          </div>
        ) : null}

        <Slider ref={sliderRef} {...settings2} className="video_slider">
          {videoItems.map((video) => (
            <VideoSlide key={video.id} item={video} />
          ))}
        </Slider>
      </div>
    </section>
  );
}

function hideWatchAndShopOverlay(container: HTMLElement) {
  const watchShopRegex = /watch\s*&\s*shop/i;
  const walk = (el: HTMLElement) => {
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (watchShopRegex.test(text) && text.length < 30) {
      el.style.setProperty("display", "none", "important");
      return;
    }
    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i] as HTMLElement);
    }
  };
  walk(container);
}

function VideoSlide({ item }: { item: VideoItem }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (item?.embed_script && containerRef.current) {
      injectEmbedScript(containerRef.current, item.embed_script);
      const container = containerRef.current;
      const hide = () => hideWatchAndShopOverlay(container);
      hide();
      const t1 = setTimeout(hide, 500);
      const t2 = setTimeout(hide, 1500);
      const observer = new MutationObserver(hide);
      observer.observe(container, { childList: true, subtree: true });
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        observer.disconnect();
        if (container) container.innerHTML = "";
      };
    }
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [item?.embed_script]);

  return (
    <div className="video_item video_item_embed">
      <Box
        ref={containerRef}
        className="video_embed_container"
        sx={{
          minHeight: 320,
          "& .render_lively_html_content": {
            width: "100%",
            minHeight: 320,
            padding: "0 10px",
            boxSizing: "border-box",
          },
        }}
      />
      {item?.title && <p className="video_item_title">{item.title}</p>}
    </div>
  );
}

export default HomeFeatureVideo;
