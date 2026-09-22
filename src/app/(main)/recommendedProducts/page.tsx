/* eslint-disable @next/next/no-img-element */
"use client";
import BredCrum from "@/components/bredCrum";
import CustomPagination from "@/components/customPagination";
import ShareProduct from "@/components/shareProduct";
import { Chip } from "@mui/material";
import React, { useMemo, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import SortByFilter, { DEFAULT_SORT_ID } from "@/components/sortByFilter";
import Filter from "@/components/filter/Filter";
import PopularBrandList from "@/components/popularBrandList";
import ProductCard from "@/components/productCard";
import { sortProductsBySortId } from "@/utils/productSort";

const products = [
  {
    image: "/images/product_img1.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img2.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img3.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img4.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img5.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img1.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img1.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img2.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img3.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img4.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img5.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  },
  {
    image: "/images/product_img1.jpg",
    category: "Sangria",
    title: "Embroidered A-Line Kurta Sets",
    price: 499,
    oldPrice: 599,
    discount: 20,
    rating: 3.9,
    reviews: 835,
    bestseller: true,
    time: '9 MINS'
  }
];

const items = [
  { label: "Home", path: "/" },
  { label: "Recommended for You" },

];
function RecommendedProducts() {
  const pageSize = 10;
  const [listPage, setListPage] = useState(1);
  const [sortId, setSortId] = useState(DEFAULT_SORT_ID);
  const sortedProducts = useMemo(
    () => sortProductsBySortId(products, sortId),
    [sortId],
  );
  const totalListPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const pagedProducts = useMemo(() => {
    const start = (listPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [listPage, sortedProducts]);

  const handleClick = () => {
    console.info('You clicked the Chip.');
  };

  const handleDelete = () => {
    console.info('You clicked the delete icon.');
  };

  const responsiveSettings = [
    {
      breakpoint: 575,
      settings: {
        slidesToShow: 3,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 992,
      settings: {
        slidesToShow: 5,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 1200,
      settings: {
        slidesToShow: 7,
        slidesToScroll: 1,
      },
    },

  ];

  return (
    <>
      <section className="product_category u_spc">
        <div className="container">
          <div className="s_head flex hd_3">
            <h2 className="fw_med">Recommended for You</h2>
            <ShareProduct />
            <div className="w_100">
              <BredCrum items={items} />
            </div>
          </div>
          <div className="product_filter">
            <div className="lt">
              <Filter />
            </div>
            <div className="rt">
              <div className="result_head">
                <p>
                  {sortedProducts.length}{" "}
                  {sortedProducts.length === 1 ? "Product" : "Products"}
                </p>
                <SortByFilter
                  value={sortId}
                  onChange={(nextSortId) => {
                    setSortId(nextSortId);
                    setListPage(1);
                  }}
                />
              </div>

              <Chip
                label="Clothing"
                deleteIcon={<CloseIcon />}
                onClick={handleClick}
                onDelete={handleDelete}
                variant="outlined"
              />

              <div className="mt_20 mb_20">
                <div className="s_head hd_6 ">
                  <h2>
                    <span className="custom_shape">Brands You Love</span> <span className="promotion">Promoted</span>
                  </h2>
                </div>
                <PopularBrandList slidesToShow={8} responsive={responsiveSettings} />
              </div>

              <div className="products_card_list gap_m">
                {pagedProducts.map((product, index) => (
                  <ProductCard key={`recommended-page-${index}-${product.title}`} product={product as any} />
                ))}
              </div>

              {totalListPages > 1 && (
                <CustomPagination
                  className="jcc"
                  currentPage={listPage}
                  totalPages={totalListPages}
                  onPageChange={setListPage}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default RecommendedProducts;
