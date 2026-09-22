/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@mui/material";
import React, { useRef } from "react";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import ProductReviewList from "@/components/productReviewList";


const reviews = [
  {
    id: 1,
    name: "Mercari Tran",
    date: "May 12, 2025",
    message:
      "Transaction complete. This message is an automated posting by Fairu. This message is an automated",
    rating: 4,
    userDp: "/images/user_dp.png",
    userImg: "/images/user_img.png",
  },
  {
    id: 2,
    name: "Alice Doe",
    date: "June 1, 2025",
    message: "Great quality and fast delivery!",
    rating: 5,
    userDp: "/images/user_dp.png",
    userImg: "/images/user_img.png",
  },
    {
    id: 3,
    name: "Mercari Tran",
    date: "May 12, 2025",
    message:
      "Transaction complete. This message is an automated posting by Fairu. This message is an automated",
    rating: 4,
    userDp: "/images/user_dp.png",
    userImg: "/images/user_img.png",
  },
  {
    id: 4,
    name: "Alice Doe",
    date: "June 1, 2025",
    message: "Great quality and fast delivery!",
    rating: 5,
    userDp: "/images/user_dp.png",
    userImg: "/images/user_img.png",
  },
      {
    id: 5,
    name: "Mercari Tran",
    date: "May 12, 2025",
    message:
      "Transaction complete. This message is an automated posting by Fairu. This message is an automated",
    rating: 4,
    userDp: "/images/user_dp.png",
    userImg: "/images/user_img.png",
  },

];

function ProductReview() {
  type Slider = any;
  const sliderRef = useRef<Slider | null>(null);
  const settings = {
 infinite: reviews.length > 4,   
  slidesToShow: 4,
  slidesToScroll: 1,
  arrows: reviews.length > 4, 
    dots: false,
    swipe: false,     
  draggable: false,
  responsive: [
    {
      breakpoint: 1800,
      settings: {
        slidesToShow: 3,
        arrows: reviews.length > 3, 
        infinite: reviews.length > 3,
      },
    },
      {
      breakpoint: 1400,
      settings: {
        slidesToShow: 2,
        arrows: reviews.length > 2, 
        infinite: reviews.length > 2,
      },
      
    },
      {
      breakpoint: 767,
      settings: {
        slidesToShow: 1,
        arrows: reviews.length > 1, 
        infinite: reviews.length > 1,
      },
      
    },
  ],
  };
  return (
    <>
      <section className="product_review u_spc">
        <div className="container">
          <div className="s_head flex hd_4">
            <h2>Reviews (200)</h2>
            <div className="rt">
              <Button variant="outlined" size="small" color="inherit">
                More <KeyboardArrowRightIcon />{" "}
              </Button>
            </div>
          </div>

          <Slider
            ref={sliderRef}
            {...settings}
            className="review_list"
          >
            {reviews.map((review) => (
              <ProductReviewList review={review} key={review.id} />
            ))}
          </Slider>
      
        </div>
      </section>
    </>
  );
}

export default ProductReview;
