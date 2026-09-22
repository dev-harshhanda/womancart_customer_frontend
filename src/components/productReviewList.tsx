/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button, IconButton, Rating } from "@mui/material";
import React, { useRef } from "react";
import AddIcon from "@mui/icons-material/Add";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

type Review = {
  id: number;
  name: string;
  date: string;
  message: string;
  rating: number;
  userDp: string;
  userImg: string;
};

interface Props {
  review: Review;
}

function ProductReviewList({ review }: Props) {

    const [value, setValue] = React.useState<number | null>(5);
  return (
   <>
  <div className="review_bx" >
    <div className="lt">
      <div className="review_head">
        <figure>
          <img src={review.userDp} alt="user" />
        </figure>
        <div className="user_cnt">
          <h3>{review.name}</h3>
          <p>{review.date}</p>
        </div>
         </div>
        <p>{review.message}</p>
        <Rating name="read-only" value={review.rating} readOnly />
        <p>
          Product Purchased <img src="/images/tick_icon.svg" alt="tick" />
        </p>
     
    </div>
    <div className="rt">
      <figure>
        <img src={review.userImg} alt="product" />
      </figure>
    </div>
  </div>
   </>
  );
}

export default ProductReviewList;
