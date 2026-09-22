"use client";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Rating,
  LinearProgress,
  styled,
} from "@mui/material";
import { linearProgressClasses } from "@mui/material/LinearProgress";
import BredCrum from "@/components/bredCrum";
import ShareProduct from "@/components/shareProduct";
import { useGetProductKitDetailQuery } from "@/service/home";
import { useEditAddressMutation, useLazyGetAddressListQuery } from "@/service/address";
import { Address } from "@/types/General";
import ShippingAddress from "@/modal/shippingAddress";
import { formatReviewCountText, parseReviewCount } from "@/utils/reviewText";
import { useAppSelector } from "@/lib/hook";
import { getToken } from "@/lib/slices/authSlice";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { getDeliveryChannel, getDeliveryMode } from "@/utils/deliveryMode";
import {
  buildEditAddressDefaultBody,
  DELIVERY_SELECTION_CHANGED,
  getDeliveryDisplayLabel,
  notifyDeliverySelectionChanged,
  persistDeliveryAddressIdForMode,
  resolveDeliveryAddressId,
  setNormalDeliverHerePinned,
  writeSelectedLocationFromAddress,
} from "@/utils/deliveryAddressSync";
import { useAddToCartMutation } from "@/service/cart";
import toast from "react-hot-toast";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { formatPriceInr } from "@/utils/format";
import { showMrpAsCutPrice } from "@/utils/priceDisplay";
import { lookupSlugId, saveSlugId } from "@/utils/idStore";
import { buildKitUrl, slugify } from "@/utils/urlBuilder";

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 12,
  borderRadius: 3,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[200],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 3,
    backgroundColor: "#FFB400",
  },
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`kit-tabpanel-${index}`}
      aria-labelledby={`kit-tab-${index}`}
      {...other}
    >
      {value === index && <>{children}</>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `kit-tab-${index}`,
    "aria-controls": `kit-tabpanel-${index}`,
  };
}

function getImageUrl(image: string) {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `https://womancart1.s3.ap-south-1.amazonaws.com/${image}`;
}

export default function ProductKitDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ slug?: string | string[] }>();
  const slugParam = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const queryKitId = searchParams.get("id");
  const numericSlugId =
    slugParam && /^\d+$/.test(slugParam) ? slugParam : null;
  const kitId =
    queryKitId ||
    numericSlugId ||
    (slugParam ? lookupSlugId("kit", slugParam) : null);
  const token = useAppSelector(getToken) || getFromStorage(STORAGE_KEYS.token);
  const deliveryMode = getDeliveryMode(searchParams);

  const [tabValue, setTabValue] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [openAddressModal, setOpenAddressModal] = useState(false);
  const [addToCartApi, { isLoading: addToCartLoading }] = useAddToCartMutation();

  const { data, isLoading, isError, refetch } = useGetProductKitDetailQuery(
    { kitId: kitId ?? "" },
    { skip: !kitId }
  );
  const [getAddressList, { data: addressResponse }] = useLazyGetAddressListQuery();
  const [editAddress] = useEditAddressMutation();
  const addresses = addressResponse?.data || [];
  const selectedAddress =
    addresses.find((addr: Address) => addr.id.toString() === selectedAddressId) || null;

  useEffect(() => {
    if (token) getAddressList();
  }, [token, getAddressList]);

  const applyResolvedKitAddress = React.useCallback(() => {
    if (!addresses.length) {
      setSelectedAddressId("");
      return;
    }
    setSelectedAddressId(resolveDeliveryAddressId(addresses, deliveryMode));
  }, [addresses, deliveryMode]);

  useEffect(() => {
    applyResolvedKitAddress();
  }, [applyResolvedKitAddress]);

  useEffect(() => {
    const handler = () => applyResolvedKitAddress();
    window.addEventListener(DELIVERY_SELECTION_CHANGED, handler);
    return () => window.removeEventListener(DELIVERY_SELECTION_CHANGED, handler);
  }, [applyResolvedKitAddress]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleQuantityChange = (e: any) => {
    setQuantity(e.target.value || "1");
  };

  const kit = data?.data?.productKit;
  useEffect(() => {
    const resolvedId = kit?.id;
    const kitName = kit?.kit_name;
    if (!resolvedId || !kitName) return;
    const slug = slugify(kitName);
    if (slug) saveSlugId("kit", slug, resolvedId);
  }, [kit?.id, kit?.kit_name]);

  useEffect(() => {
    if (!queryKitId || !kit?.id || !kit?.kit_name) return;
    router.replace(buildKitUrl(kit.kit_name, { kitId: kit.id }));
  }, [queryKitId, kit?.id, kit?.kit_name, router]);

  const firstItem = kit?.items && kit.items.length > 0 ? kit.items[0] : null;
  const kitBaseProduct: any = firstItem?.product || null;

  const addToCart = async () => {
    if (!kit?.id || !kit.in_stock) {
      toast.error("Kit information missing or out of stock");
      return;
    }

    // Derive store id from first item or warehouse
    const storeId = firstItem?.store?.id || kit.warehouse_id;
    if (!storeId) {
      toast.error("Store information missing for this kit");
      return;
    }

    try {
      const selectedQuantity = quantity ? Number(quantity) : 1;
      const deliveryChannel = getDeliveryChannel(searchParams);

      const res = await addToCartApi({
        product_kit_id: kit.id,
        qty: selectedQuantity,
        store_id: Number(storeId),
        channel: deliveryChannel,
      }).unwrap();

      if (res?.statusCode === 200) {
        toast.success(res?.message || "Added to cart successfully");
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to add kit to cart");
    }
  };

  // Placeholder review data (kit API may not have reviews yet)
  const totalReviews = 0;
  const averageRating = "0";
  const ratingDistribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const reviews: any[] = [];

  if (!kitId) {
    return (
      <section className="product_detail_sc u_spc">
        <div className="container">
          <p>Invalid kit. Missing id.</p>
          <Button onClick={() => router.push("/")}>Back to Home</Button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="product_detail_sc u_spc">
        <div className="container">
          <p className="product_loading_text">Loading offer kit...</p>
          <div className="product_detail_skeleton">
            <div className="skeleton_col lt">
              <div
                className="skeleton_shimmer skeleton_main_image"
                style={{ aspectRatio: "1", maxHeight: 400 }}
              />
            </div>
            <div className="skeleton_col rt">
              <div
                className="skeleton_shimmer skeleton_title"
                style={{ width: "70%", height: 28 }}
              />
              <div
                className="skeleton_shimmer skeleton_subtitle"
                style={{ width: "100%", height: 60, marginTop: 12 }}
              />
              <div
                className="skeleton_shimmer"
                style={{ width: 120, height: 32, marginTop: 12 }}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isError || !kit) {
    return (
      <section className="product_detail_sc u_spc">
        <div className="container">
          <p>Offer kit not found.</p>
          <Button
            variant="outlined"
            onClick={() => router.push("/")}
            startIcon={<KeyboardArrowRightIcon />}
          >
            Back to Home
          </Button>
        </div>
      </section>
    );
  }

  const breadcrumbItems = [
    { label: "Home", path: "/" },
    { label: "Offer Kit", path: "/" },
    { label: kit.kit_name },
  ];

  const singleQtyPrice = kit.final_price ?? kit.price;
  const discountPercent =
    kit.total_mrp && parseFloat(kit.total_mrp) > 0 && singleQtyPrice
      ? Math.round(
        ((parseFloat(kit.total_mrp) - parseFloat(singleQtyPrice)) /
          parseFloat(kit.total_mrp)) *
        100
      )
      : null;

  return (
    <>
      <section className="product_detail_sc u_spc">
        <div className="container">
          <BredCrum items={breadcrumbItems} />

          <div className="about_product gap_m">
            <div className="lt">
              <div className="product_slider product_slider_single">
                <Slider
                  arrows={false}
                  infinite={false}
                  className="main_slider"
                >
                  <figure className="main view_similar_main">
                    <img
                      src={getImageUrl(kit.image)}
                      alt={kit.kit_name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/product_default.png";
                      }}
                    />
                  </figure>
                </Slider>
                {/* Optional buttons below image */}
                <div className="btn_group">
                  <ShareProduct />
                  <Button className="icon_btn">
                    <img src="/images/zoomout_icon.svg" alt="icon" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="rt">
              <div className="right_head">
                <p>&nbsp;</p>
                <ShareProduct />
              </div>
              <h2 style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>
                Offer Kit
              </h2>
              <h3 className="product_title">{kit.kit_name}</h3>

              {parseReviewCount(totalReviews) > 0 ? (
                <p className="review">
                  <Rating
                    name="read-only"
                    value={parseFloat(averageRating || "0")}
                    readOnly
                  />
                  <span>({totalReviews})</span>
                </p>
              ) : null}

              <p className="price">
                <ins>₹{formatPriceInr(singleQtyPrice)}</ins>
                {discountPercent != null && discountPercent > 0 && (
                  <span className="price_cut">
                    <del>₹{formatPriceInr(kit.total_mrp)}</del>
                    <span>{discountPercent}% off</span>
                  </span>
                )}
              </p>

              <div className="variant" style={{ marginTop: "24px" }}>
                <div className="variant_bx">
                  <ul className="size_list gap_m variant_cards_list" style={{ marginTop: 0 }}>
                    <li
                      className={`${!kit.in_stock ? "disable out_of_stock" : ""} selected`}
                      style={{ cursor: "default" }}
                    >
                      <div className="size_list_inr">
                        <p className="size">{kit.kit_name || "Final product"}</p>
                        <h3>
                          ₹{formatPriceInr(singleQtyPrice)}
                          {showMrpAsCutPrice(kit.total_mrp, singleQtyPrice) && (
                            <del>₹{formatPriceInr(kit.total_mrp)}</del>
                          )}
                        </h3>
                      </div>
                      
                      {kit.in_stock && discountPercent != null && discountPercent > 0 ? (
                        <h4 className="variant_badge variant_badge_off">{discountPercent}%off</h4>
                      ) : !kit.in_stock ? (
                        <h4 className="variant_badge variant_badge_notify">Out of stock</h4>
                      ) : null}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="arving_time">
                <div className="dlvry_adrs">
                  <span>Deliver to</span>
                  <strong>
                    {getDeliveryDisplayLabel(selectedAddressId, addresses)}
                  </strong>
                  <a
                    className="text_btn"
                    onClick={() => setOpenAddressModal(true)}
                    style={{ cursor: "pointer" }}
                  >
                    Change
                  </a>
                </div>
              </div>

              <div className="return_plcy">
                <Link href="/refund-return-policy" className="return_plcy_bx">
                  <figure>
                    <img src="/images/easy_return.svg" alt="" />
                  </figure>
                  <p>Easy Return Policy</p>
                </Link>
                <div className="return_plcy_bx">
                  <figure>
                    <img src="/images/fast_delivery.svg" alt="" />
                  </figure>
                  <p>Fast Delivery</p>
                </div>
              </div>

              <div className="add_cart form mt_20">
                <label htmlFor="kit-quantity">
                  <Select
                    value={quantity}
                    onChange={handleQuantityChange}
                    id="kit-quantity"
                    inputProps={{ "aria-label": "Quantity" }}
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <MenuItem key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </label>

                {kit.in_stock
                  ? (
                    <Button
                      onClick={addToCart}
                      disabled={addToCartLoading}
                    >
                      {addToCartLoading ? "Adding..." : "Add to Cart"}
                    </Button>
                  )
                  : (
                    <Button
                      disabled
                      variant="contained"
                      sx={{
                        bgcolor: "#9e9e9e",
                        color: "#fff",
                        "&.Mui-disabled": { bgcolor: "#9e9e9e", color: "#fff" },
                      }}
                    >
                      Out of stock
                    </Button>
                  )
                }







              </div>
            </div>
          </div>
        </div>

        {/* Product Description + Tabs */}
        <section className="prodct_info_sc ub_spc">
          <div className="container">
            <div className="product_detail">
              <div className="descrptn hd_3">
                <h2 className="fw_med">Product Description</h2>
                <div className="product-description-content">
                  {kitBaseProduct?.name ? (
                    <p>{kitBaseProduct.name}</p>
                  ) : kit.description ? (
                    <p>{kit.description}</p>
                  ) : (
                    <p>No description available for this kit.</p>
                  )}
                </div>
              </div>
              <div className="prodct_info_mn">
                <div className="lt">
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="kit detail tabs"
                    className="site_tabs2"
                  >
                    <Tab label="Specifications" {...a11yProps(0)} />
                    <Tab label="How to use" {...a11yProps(1)} />
                    <Tab label="Delivery & Returns" {...a11yProps(2)} />
                  </Tabs>
                  <CustomTabPanel value={tabValue} index={0}>
                    <ul className="spcificatns_tb" style={{ textAlign: "left" }}>
                      {kitBaseProduct?.description ? (
                        <li>{kitBaseProduct.description}</li>
                      ) : (
                        <li>No specifications available for this kit.</li>
                      )}
                    </ul>
                  </CustomTabPanel>
                  <CustomTabPanel value={tabValue} index={1}>
                    <ul className="spcificatns_tb" style={{ textAlign: "left" }}>
                      {kitBaseProduct?.how_to_use &&
                        kitBaseProduct.how_to_use.trim() ? (
                        <li>{kitBaseProduct.how_to_use}</li>
                      ) : (
                        <li>No usage instructions available for this kit.</li>
                      )}
                    </ul>
                  </CustomTabPanel>
                  <CustomTabPanel value={tabValue} index={2}>
                    <ul className="spcificatns_tb" style={{ textAlign: "left" }}>
                      {kitBaseProduct?.delivery_return ? (
                        <li>{kitBaseProduct.delivery_return}</li>
                      ) : (
                        <li>
                          No delivery and return information available for this
                          kit.
                        </li>
                      )}
                    </ul>
                  </CustomTabPanel>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Products in this kit */}
        {kit.items && kit.items.length > 0 && (
          <div className="gap_m" style={{ marginTop: 24 }}>
            <div className="container">
              <h2 style={{ fontSize: 20, marginBottom: 16 }}>
                Products in this kit
              </h2>
              <Box
                component="ul"
                sx={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gap: 2,
                }}
              >
                {kit.items.map((item: any) => (
                  <Box
                    component="li"
                    key={item.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 2,
                      border: "1px solid #eee",
                      borderRadius: 1,
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <strong>{item.product?.name ?? "Product"}</strong>
                      {item.store?.name && (
                        <span
                          style={{
                            color: "#666",
                            fontSize: 14,
                            display: "block",
                          }}
                        >
                          {item.store.name}
                        </span>
                      )}
                      <span style={{ fontSize: 14, color: "#666" }}>
                        {" "}
                        · Qty: {item.quantity}
                      </span>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>₹{formatPriceInr(item.final_price)}</span>
                      {!item.in_stock && (
                        <span style={{ fontSize: 12, color: "#999" }}>
                          (Out of stock)
                        </span>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </div>
          </div>
        )}

        {/* Ratings & Reviews */}
        <section className="product_rvws_sc ut_spc">
          <div className="container">
            <div className="s_head hd_4">
              <h2 className="fw_med">
                Ratings & Reviews ({totalReviews})
              </h2>
            </div>
            <div className="rating_overall">
              <ul className="rating_prgrs">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution[star] || 0;
                  const percentage =
                    totalReviews > 0
                      ? Math.round((count / totalReviews) * 100)
                      : 0;
                  return (
                    <li key={star}>
                      <span className="count">{star}</span>
                      <BorderLinearProgress
                        variant="determinate"
                        value={percentage}
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="overall_info">
                <span className="revws_detail rtng">
                  {averageRating}
                  <img src="/images/Star_rating.svg" alt="" />
                </span>
                <span className="revws_detail">
                  {formatReviewCountText(totalReviews)}
                </span>
              </div>
            </div>
            <div className="wrt_rvw">
              {/* <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Button>Write a review</Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => refetch()}
                >
                  Refresh Reviews
                </Button>
              </div> */}
              <p>
                Product reviews are managed by a third party to verify
                authenticity and compliance with our{" "}
                <a
                  href="/terms-conditions"
                >
                  Ratings & Reviews Guidelines
                </a>
              </p>
            </div>
            <ul className="product_rvws_lst">
              {reviews && reviews.length > 0 ? (
                reviews.map((review: any, index: number) => (
                  <li key={review.id || index} className="product_rvws_bx">
                    <div className="lt">
                      <p>{review.comment || review.message || ""}</p>
                    </div>
                  </li>
                ))
              ) : (
                <li className="product_rvws_bx">
                  <div className="lt">
                    <p>No reviews available for this product yet.</p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </section>
      </section>

      <ShippingAddress
        open={openAddressModal}
        onClose={() => setOpenAddressModal(false)}
        setOpen={setOpenAddressModal}
        addresses={addresses}
        selectedAddress={selectedAddress}
        onSelectAddress={async (address: Address) => {
          setSelectedAddressId(address.id.toString());
          const nextAddressId = address.id.toString();
          // Keep normal and quick headers aligned to the last user-selected saved address.
          persistDeliveryAddressIdForMode("normal", nextAddressId);
          persistDeliveryAddressIdForMode("quick_delivery", nextAddressId);
          if (deliveryMode === "normal") setNormalDeliverHerePinned(true);
          writeSelectedLocationFromAddress(address);
          setOpenAddressModal(false);
          if (deliveryMode === "quick_delivery") {
            try {
              await editAddress({
                id: address.id,
                body: buildEditAddressDefaultBody(address),
              }).unwrap();
              getAddressList();
            } catch {
              toast.error("Could not update default address for quick delivery");
            }
          }
          notifyDeliverySelectionChanged();
        }}
      />
    </>
  );
}
