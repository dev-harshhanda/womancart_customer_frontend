/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useMemo } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Entity {
  id: number;
  name: string;
  image: string | null;
  shop_attribute_id: number;
  status: string;
  shop_attribute_entity_id?: number | string;
  entity_id?: number | string;
}

interface Props {
  slidesToShow?: number;
  responsive?: any[];
  entities?: Entity[];
  selectedIds?: number[];
  onEntityClick?: (entityId: number) => void;
}

function ShopByOccasion({ slidesToShow = 11, responsive, entities = [], selectedIds = [], onEntityClick }: Props) {
  // Default fallback data if no entities provided
  const defaultOccasionList = [
    {
      id: 1,
      img: "/images/occasion_img.png",
      title: "Glam Night Out",
    },
    {
      id: 2,
      img: "/images/occasion_img.png",
      title: "Self-Care Sunday",
    },
    {
      id: 3,
      img: "/images/occasion_img.png",
      title: "Beach Day Style",
    },
    {
      id: 4,
      img: "/images/occasion_img.png",
      title: "Everyday Essentials",
    },
    {
      id: 5,
      img: "/images/occasion_img.png",
      title: "Date Night Scent",
    },
    {
      id: 6,
      img: "/images/occasion_img.png",
      title: "Mani-Pedi Party",
    },
    {
      id: 7,
      img: "/images/occasion_img.png",
      title: "Spa Day Treats",
    },
    {
      id: 8,
      img: "/images/occasion_img.png",
      title: "Fresh Breath Confidence",
    },
  ];

  // Use API id directly; fallback only if API id is missing/invalid.
  const occasionList = useMemo(
    () =>
      entities.length > 0
        ? entities.map((entity, index) => {
          const rawId = entity.id ?? entity.shop_attribute_entity_id ?? entity.entity_id ?? index;
          const resolvedId = Number(rawId);
          return {
            id: Number.isNaN(resolvedId) ? index : resolvedId,
            img: entity.image || "/images/occasion_img.png",
            title: entity.name,
          };
        })
        : defaultOccasionList,
    [entities]
  );

  const settings = {
    infinite: occasionList.length > slidesToShow,
    slidesToShow: slidesToShow,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    speed: 500,
    responsive
  };
  const sliderKey = useMemo(
    () => `${occasionList.map((item) => item.id).join(",")}|${selectedIds.join(",")}`,
    [occasionList, selectedIds]
  );

  if (occasionList.length === 0) {
    return null;
  }

  const handleCardClick = (entityId: number) => {
    onEntityClick?.(entityId);
  };

  return (
    <Slider key={sliderKey} {...settings} className="occasion_list">
      {occasionList.map((item, index) => {
        const isSelected = selectedIds.includes(item.id);
        const entityId = item.id;
        return (
          <div
            className={`occasion_bx ${isSelected ? 'selected' : ''}`}
            key={`occasion-${entityId}-${index}`}
            onClick={() => handleCardClick(entityId)}
            style={{
              cursor: onEntityClick ? 'pointer' : 'default',
              opacity: isSelected ? 0.7 : 1,
              border: isSelected ? '2px solid var(--commerce-primary, #d91b76)' : 'none',
              position: 'relative',
              width: "100%",
              display: "block"
            }}
          >
            {isSelected && (
              <CheckCircleIcon
                className="selection_tick_icon"
                sx={{
                  color: 'var(--commerce-primary, #d91b76)',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  fontSize: '28px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            )}
            <figure className="main">
              <img src={item.img} alt={item.title} />
              <figcaption>{item.title}</figcaption>
            </figure>
          </div>
        );
      })}
    </Slider>
  );
};

export default ShopByOccasion;