/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button, IconButton, Rating } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { parseReviewCount } from "@/utils/reviewText";


const items = [
  { id: 1, text: "Selling Fast", icon: "/images/selling_fast_icon.svg" },
  { id: 2, text: "Global Delivery", icon: "/images/plane.png" },
  { id: 3, text: "Free Delivery", icon: "/images/delivery_car.png" },
];

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  oldPrice: number;
  discount: string;
  rating: number;
  reviews: number;
  sold: string;
  left: string;
  country: string;
  flashsale?: boolean;
  tag?: boolean | string;
  path?:string

  delivery: string;
  images: string[];
};

interface ProductCardProps {
  product: Product;
}

function ProductList({ product }: ProductCardProps) {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setIndex((prev) => (prev + 1) % items.length);
  //   }, 100); 
  //   return () => clearInterval(interval);
  // }, []);
  const [value, setValue] = React.useState<number | null>(1);
  type Slider = any;
  const sliderImgRef = useRef<Slider | null>(null);
  const Imgsettings = {
    infinite: true,
    slidesToShow: 1,
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
  };
  return (
    <div className="product_bx cursor_pointer" onClick={()=> router.push('/product/detail')}>
      <div className="product_img">
        <Slider
          {...Imgsettings}
          className="product_imgs slick_dots2"
          ref={sliderImgRef}
        >
          {product.images.map((img, idx) => (
            <figure className="main" key={idx}>
              <img src={img} alt={product.name} />
              {product.name}
            </figure>
          ))}
        </Slider>

        <Button size="small" variant="outlined" color="inherit">
          <AddIcon /> Add
        </Button>
        <IconButton className="fav_icon">
          <img src="/images/fav_icon.svg" alt="icon" />
        </IconButton>
        <div className="top_left">
          {product.flashsale && (
            <div className="flash_sale">
              <img src="/images/counter_icon.svg" alt="icon" />
              <p>Ends In</p>
              <ul className="countdown">
                <li>08</li>
                <li>39</li>
                <li>07</li>
              </ul>
            </div>
          )}
          {product.tag && (
            <span className={`tag ${product.tag === "New" ? "primary" : "info"}`}>
              {product.tag}
            </span>
          )}
        </div>
      </div>
      <div className="product_cnt">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <p className="price">
          <ins className="c_primary">${product.price}</ins>
          <del>${product.oldPrice}</del>
          <span className="discount">- {product.discount}</span>
        </p>
        {(() => {
          const reviewCount = parseReviewCount(product.reviews);
          if (reviewCount === 0) return null;
          return (
            <p className="review">
              {product.rating}
              <Rating
                name="read-only"
                value={product.rating}
                max={1}
                readOnly
              />
              <span>({reviewCount})</span>
            </p>
          );
        })()}
        <ul className="product_info">
          <li className="sold">{product.sold}</li>
          <li className="left">{product.left}</li>
          <li className="selling">
            <ul className="relative h-10 overflow-hidden">
              {/* <AnimatePresence mode="wait">
                <motion.li
                  key={items[index].id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="absolute left-0 top-0 flex items-center gap-2"
                >
                  <img src={items[index].icon} alt="icon" />
                  {items[index].text}
                </motion.li>
              </AnimatePresence> */}
              <li>   <img src={items[index].icon} alt="icon" />
                  {items[index].text}</li>
            </ul>
          </li>
        </ul>
        <h4>
          <i>
            get it <span>{product.delivery}</span>
          </i>
        </h4>
        <span>{product.country}</span>
      </div>
    </div>
  );
}

export default ProductList;
