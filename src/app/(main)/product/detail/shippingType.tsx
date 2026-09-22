/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Button,
  MenuItem,
  Rating,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import React, { useState } from "react";
import GridViewIcon from "@mui/icons-material/GridView";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hook";
import { getToken } from "@/lib/slices/authSlice";
import GuestLoginModal from "@/modal/guestLoginModal";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

const shippingData = [
  {
    img: "/images/shipping_icon.svg",
    title: "Shipping",
    desc: "Arrives by Tue, Jun 18",
  },
  {
    img: "/images/shipping_icon2.svg",
    title: "Pickup",
    desc: "Ready within 2 hours",
  },
  {
    img: "/images/shipping_icon3.svg",
    title: "Delivery",
    desc: "As soon as 1am tomorrow",
  },
];
const policies = [
  {
    title: "Buyer Protection",
    desc: 'Receive your item as described or your money back for eligible orders. <a class="text_btn">Learn more</a>',
    icon: "/images/policy_icon.svg",
  },
  {
    title: "Return & Exchange Policy",
    desc: "Your payment information is processed securely. We don’t store credit card details.",
    icon: "/images/policy_icon2.svg",
  },
];
function ShippingType() {
  const [quantity, setQuantity] = React.useState("");
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const reduxToken = useAppSelector(getToken);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleChange = (event: SelectChangeEvent) => {
    setQuantity(event.target.value);
  };

  const handleActionClick = (actionText: string, redirectPath?: string) => {
    const currentToken = reduxToken || getFromStorage(STORAGE_KEYS.token);
    if (!currentToken) {
      setIsLoginModalOpen(true);
      return;
    }
    if (redirectPath) {
      router.push(redirectPath);
    }
  };

  const [value, setValue] = React.useState<number | null>(5);
  return (
    <>
      <div className="shipping_type ">
        <div className="s_head">
          <h2>How do you want your item?</h2>
        </div>
        <ul className="ship_list">
          {shippingData.map((item, index) => (
            <li key={index} className={activeIndex === index ? "active" : ""}
              onClick={() => setActiveIndex(index)}>
              <figure>
                <img src={item.img} alt={item.title} />
              </figure>
              <h3>{item.title}</h3>
              <p className={index === 0 ? "c_primary" : ""}>{item.desc}</p>
            </li>
          ))}
        </ul>

        {activeIndex === 0 && (
          <div className="address_dtl">
            <p className="pickup_location">
              <span>Pick up at</span>{" "}
              <strong>McKinney</strong>{" "}
              <a className="text_btn">Change</a>
              <a className="text_btn">Check Other Store</a>

            </p>
            <p>
              <span className="c_primary"> Ready within 2 hours </span>  <span> for pickup</span>
            </p>
            <ul className="product_info">
              <li className="c_danger">Only 2 left</li>
              <li>27 Sold</li>
              <li>
                <span>Condition:</span> <strong>New</strong>{" "}
              </li>
            </ul>
          </div>
        )}


        {activeIndex === 1 && (
          <div className="address_dtl">
            <p className="pickup_location">
              <span>Pick up from</span>{" "}
              <strong>Carrollton Supermarket - McKinney</strong>{" "}
              <a className="text_btn">Change</a>{" "}
              <strong>
                <img src="/images/location_icon.svg" alt="icon" /> Aisle A19
              </strong>{" "}
            </p>
            <p>
              <span className="c_primary"> Ready within 2 hours</span> for pickup inside the store
            </p>
            <ul className="product_info">
              <li className="c_info">100 available</li>
              <li>27 Sold</li>
              <li>
                <span>Condition:</span> <strong>New</strong>{" "}
              </li>
            </ul>
          </div>
        )}

        {activeIndex === 2 && (
          <div className="address_dtl">
            <p className="pickup_location">


              <strong>
                <img src="/images/location_icon.svg" alt="icon" /> Ships from:
              </strong>{" "}
              <a className="text_btn">H&M</a>{" "}
            </p>

            <p>
              <span className="c_primary"> Arrives by Tue, Jun 18</span>
            </p>
            <p className="pickup_location">
              <span>Deliver to</span>{" "}
              <strong>633 Tradewind Dr, Fort Worth, TX 76131</strong>{" "}
              <a className="text_btn">Change</a>


            </p>
            <p className="pickup_location">
              <span>Cost to ship:</span>{" "}
              <strong>Free Shipping</strong>{" "}



            </p>
            <ul className="product_info">
              <li className="c_info">100 available</li>
              <li>27 Sold</li>
              <li>
                <span>Condition:</span> <strong>New</strong>{" "}
              </li>
            </ul>
          </div>
        )}


        <div className="add_cart form mt_20">
          <label htmlFor="quantity">
            <span>Qty</span>
            <Select
              value={quantity}
              onChange={handleChange}
              displayEmpty
              id="quantity"
              inputProps={{ "aria-label": "Without label" }}
            >
              <MenuItem value="">1</MenuItem>
              {Array.from({ length: 10 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {i + 1}
                </MenuItem>
              ))}
            </Select>

          </label>
          <Button onClick={() => handleActionClick("Add to Cart", "/cart")}>Add to Cart</Button>
          <Button variant="outlined" className="w_100" onClick={() => handleActionClick("Buy Now", "/cart")}>Buy Now</Button>
        </div>

        <ul className="policy_list mt_20">
          {policies.map((item, index) => (
            <li key={index}>
              <figure>
                <img src={item.icon} alt="icon" />
              </figure>
              <div className="policy_cnt">
                <h4>{item.title}</h4>
                <p dangerouslySetInnerHTML={{ __html: item.desc }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="payment_method">
          <div className="s_head">
            <h3>Payment Methods</h3>
          </div>
          <figure>
            <img src="/images/card_list2.png" alt="icon" />
          </figure>
          <p>
            Fairu keeps your payment information secure. <span className="d_block"> Fairu sellers never
              receive your card information.</span>
          </p>
        </div>

        <div className="vendor_bx spacer">
          <figure className="main">
            <img src="/images/vendor_icon.png" alt="icon" />
          </figure>
          <div className="vendor_detail">
            <div className="vendor_head">
              <h4>Dream Essentials</h4>
              <ul className="verify_list">
                <li>
                  <figure>
                    <img src="/images/trust_icon.png" alt="img" />
                  </figure>
                </li>
                <li>
                  <figure>
                    <img src="/images/verify_icon.png" alt="img" />
                  </figure>
                </li>
              </ul>
            </div>
            <ul className="detail_list">
              <li>
                <span className="tag">4.9</span>
                <Rating name="read-only" value={value} readOnly />
                <span>(200)</span>
              </li>
              <li>
                <p>
                  <span>Followers:</span> <strong>20K+</strong>{" "}
                </p>
                <p>
                  <span>Sales: </span> <strong>200</strong>{" "}
                </p>
              </li>
            </ul>
            <div className="btn_group">
              <Button variant="outlined" color="inherit" onClick={() => router.push('/vendor')}>
                <GridViewIcon />
                All Items
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => handleActionClick("Follow Shop")}>
                <FavoriteBorderIcon />
                Follow Shop
              </Button>
            </div>
          </div>
        </div>
      </div>
      <GuestLoginModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}

export default ShippingType;
