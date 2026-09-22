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
  entities?: Entity[];
  selectedIds?: number[];
  onEntityClick?: (entityId: number) => void;
}

function ShopBySkinType({ slidesToShow = 4, entities = [], selectedIds = [], onEntityClick }: Props) {
  // Default fallback data if no entities provided
  const defaultSkinTypeList = [
    {
      id: 1,
      img: "/images/cat_img_07.jpg",
      title: "Oily Skin",
    },
    {
      id: 2,
      img: "/images/cat_img_07.jpg",
      title: "Sensitive Skin",
    },
    {
      id: 3,
      img: "/images/cat_img_07.jpg",
      title: "Dry Skin",
    },
    {
      id: 4,
      img: "/images/cat_img_07.jpg",
      title: "Combination Skin",
    },
  ];

  // Use API id directly; fallback only if API id is missing/invalid.
  const skinTypeList = useMemo(
    () =>
      entities.length > 0
        ? entities.map((entity, index) => {
          const rawId = entity.id ?? entity.shop_attribute_entity_id ?? entity.entity_id ?? index;
          const resolvedId = Number(rawId);
          return {
            id: Number.isNaN(resolvedId) ? index : resolvedId,
            img: entity.image || "/images/cat_img_07.jpg",
            title: entity.name,
          };
        })
        : defaultSkinTypeList,
    [entities]
  );

  const settings = {
    infinite: false,
    slidesToShow,
    slidesToScroll: 1,
    arrows: true,
    dots: false,
    speed: 500,
    responsive: [
      {
        breakpoint: 1200,
        settings: { slidesToShow: 3 },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 520,
        settings: { slidesToShow: 1.2 },
      },
    ],
  };
  const sliderKey = useMemo(
    () => `${skinTypeList.map((item) => item.id).join(",")}|${selectedIds.join(",")}`,
    [skinTypeList, selectedIds]
  );

  if (skinTypeList.length === 0) {
    return null;
  }

  const handleCardClick = (entityId: number) => {
    onEntityClick?.(entityId);
  };

  return (
    <Slider key={sliderKey} {...settings} className="shop_by_skin">
      {skinTypeList.map((item, index) => {
        const isSelected = selectedIds.includes(item.id);
        const entityId = item.id;
        return (
          <div 
            className={`skin_card ${isSelected ? 'selected' : ''}`}
            key={`skin-${entityId}-${index}`}
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
            <figure>
              <img src={item.img} alt={item.title} />
              <figcaption>{item.title}</figcaption>
            </figure>
          </div>
        );
      })}
    </Slider>
  );
}

export default ShopBySkinType;