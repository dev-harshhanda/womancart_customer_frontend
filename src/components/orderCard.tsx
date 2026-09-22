/* eslint-disable @next/next/no-img-element */
"use client";
import { OrderStatus } from "@/constants/orderStatus";
import { useRouter , useSearchParams } from "next/navigation";
import { Button ,
  Dialog,
  DialogTitle,
  DialogContent,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import RatingModal from "@/modal/RatingModal";
import { useExchangeOrderMutation, useReturnOrderMutation } from "@/service/order";
import { useAddToCartMutation } from "@/service/cart";
import { formatPriceInr } from "@/utils/format";
import { getDeliveryChannel } from "@/utils/deliveryMode";
import toast from "react-hot-toast";

interface Order {
  id?: number | string;
  url?: string;
  title: string;
  status: string;
  forReview?: boolean;
  price?: number | string;
  orderId?: number | string;
  order_type?: string;
  orderType?: string;
  channel?: string;
  orderItemId?: number | string;
  product_id?: number | string;
  image?: string;
  rating?: number | string;
  productTitles?: string[];
  /** Lines built in orders/page mapOrderData for reorder-from-list */
  reorderItems?: Array<{
    product_id?: number;
    product_kit_id?: number;
    variation_id?: number | null;
    qty: number;
  }>;
}

/** Match order detail: reorder only for delivered/completed or cancelled (not "Order placed", etc.). */
function canShowReorderForOrder(order: Order): boolean {
  const raw = String(order.status || "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
  const display = OrderStatus.fromApi(String(order.status));
  const normalized = String(display).toLowerCase().replace(/[_\s-]/g, "");

  const isDelivered =
    normalized === "delivered" ||
    normalized === "completed" ||
    raw === "delivered" ||
    raw === "completed" ||
    raw.includes("delivered") ||
    raw.includes("completed");

  const isCancelled =
    normalized === "cancelled" || raw === "cancelled" || raw.includes("cancelled");

  return isDelivered || isCancelled;
}

type Props = {
  order: Order;
  tab?: number;
};

function OrderCard({ order, tab }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open1, setOpen1] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [addToCart] = useAddToCartMutation();
  const [exchangeOrder, { isLoading: isExchanging }] = useExchangeOrderMutation();
  const [returnOrder, { isLoading: isReturning }] = useReturnOrderMutation();
  const [showReturnExchangeModal, setShowReturnExchangeModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"return" | "exchange">("exchange");
  const [exchangeReason, setExchangeReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("");

  const handleCloseModal1 = () => {
    setOpen1(false);
  };

  const handleCardClick = () => {
    if (order.url) {
      router.push(order.url);
    }
  };

  const handleRateOrderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Prevent opening if already open
    if (!open1) {
      setOpen1(true);
    }
  };

  const handleViewDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (order.url) {
      router.push(order.url);
    }
  };

  const handleReturnExchangeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReturnExchangeModal(true);
  };

  const handleExchangeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowExchangeModal(true);
  };

  const handleCloseReturnExchangeModal = () => {
    setShowReturnExchangeModal(false);
    setActiveTab("exchange"); // Reset to default tab
    setExchangeReason(""); // Reset exchange reason
    setReturnReason(""); // Reset return reason
    setRefundMethod(""); // Reset refund method
  };

  const handleCloseExchangeModal = () => {
    setShowExchangeModal(false);
    setExchangeReason(""); // Reset exchange reason
  };

  const handleTabChange = (tab: "return" | "exchange") => {
    setActiveTab(tab);
  };

  const handleExchangeReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExchangeReason(event.target.value);
  };

  const handleReturnReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setReturnReason(event.target.value);
  };

  const handleRefundMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRefundMethod(event.target.value);
  };

  const handleReorderClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines = order.reorderItems;
    if (!lines || lines.length === 0) {
      toast.error("Line items are not available. Open order details to reorder.");
      if (order.url) router.push(order.url);
      return;
    }

    const channel = getDeliveryChannel(searchParams);
    setReordering(true);
    try {
      await Promise.all(
        lines.map((line) => {
          if (line.product_kit_id != null) {
            return addToCart({
              product_kit_id: line.product_kit_id,
              variation_id: null,
              qty: line.qty,
              channel,
            }).unwrap();
          }
          if (line.product_id != null) {
            return addToCart({
              product_id: line.product_id,
              variation_id: line.variation_id ?? null,
              qty: line.qty,
              channel,
            }).unwrap();
          }
          return Promise.resolve();
        }),
      );
      toast.success(
        lines.length > 1
          ? `${lines.length} items added to cart`
          : "Item added to cart",
      );
      router.push("/cart?entry=nav");
    } catch (err: any) {
      toast.error(
        err?.data?.message ||
          err?.message ||
          "Could not add to cart. Try from order details.",
      );
    } finally {
      setReordering(false);
    }
  };

  const displayProductTitles =
    Array.isArray(order.productTitles) && order.productTitles.length > 0
      ? order.productTitles
      : [order.title];

  const renderTitleWithCountBadge = (rawTitle: string) => {
    const titleText = String(rawTitle || "").trim();
    const match = titleText.match(/^(.*?)(\s\+\d+)$/);
    if (!match) return titleText;
    const baseTitle = match[1]?.trim() || titleText;
    const countLabel = match[2]?.trim() || "";
    return (
      <>
        {baseTitle}{" "}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--commerce-primary, #d91b76)",
            color: "#fff",
            borderRadius: "999px",
            minHeight: "20px",
            padding: "0 8px",
            fontSize: "12px",
            fontWeight: 700,
            lineHeight: 1,
            verticalAlign: "middle",
          }}
        >
          {countLabel}
        </span>
      </>
    );
  };

  const orderTypeLabel = React.useMemo(() => {
    const raw = String(order.order_type ?? order.orderType ?? order.channel ?? "")
      .toLowerCase()
      .trim()
      .replace(/[_\s-]/g, "");
    if (!raw) return "";
    if (raw === "quick" || raw === "quickdelivery") return "Quick Commerce";
    if (raw === "normal") return "E-Commerce";
    return "";
  }, [order.channel, order.orderType, order.order_type]);

  const displayPriceNum = Number(order.price ?? 0);
  const isOrderFree = Number.isFinite(displayPriceNum) && displayPriceNum === 0;

  return (
    <>
      <div
        className="orderCard_item"
        onClick={handleCardClick}
        style={{ cursor: order.url ? 'pointer' : 'default' }}
      >
        <figure>
          <img src={order.image || "/images/placeholder.png"} alt="Icon" />
          {(() => {
            // Safe conversion using the enum-like mapping
            const displayStatus = OrderStatus.fromApi(String(order.status));

            return (
              <span className="order_tag">{displayStatus}</span>
            );
          })()}
        </figure>
        <div className="orderCard_info">
          <p>
            <span>Order ID #{order.orderId || order.id || "N/A"}</span>
            <ins>
              {isOrderFree ? (
                <strong
                  style={{
                    backgroundColor: "var(--commerce-primary, #d91b76)",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: 4,
                    display: "inline-block",
                    fontStyle: "normal",
                    textDecoration: "none",
                  }}
                >
                  Free
                </strong>
              ) : (
                <>₹{formatPriceInr(order.price ?? "0.00")}</>
              )}
            </ins>
          </p>
          <h3>
            {displayProductTitles.map((name, index) => (
              <React.Fragment key={`${name}-${index}`}>
                {renderTitleWithCountBadge(name)}
                {index < displayProductTitles.length - 1 ? ", " : ""}
              </React.Fragment>
            ))}
          </h3>
          <div className="btn_flex">
            <Button onClick={handleViewDetailClick}>
              View Detail
            </Button>
            {orderTypeLabel ? (
              <div className="order_type_label">{orderTypeLabel}</div>
            ) : null}
            {/* Reorder icon intentionally hidden for all order statuses */}
            {/* <Button
              className="icon_btn"
              type="button"
              aria-label="Reorder"
              disabled={reordering}
              onClick={handleReorderClick}
              style={{
                minWidth: 'auto',
                padding: '8px',
                backgroundColor: '#fff',
                color: '#000',
              }}
            >
              <RefreshIcon
                style={{
                  transform: reordering ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease-in-out",
                }}
              />
            </Button> */}
            {(() => {
              // Show rating only for delivered orders
              const rawStatus = String(order.status || '').toLowerCase().replace(/[_\s-]/g, '');
              const displayStatus = OrderStatus.fromApi(String(order.status));
              const normalizedStatus = String(displayStatus).toLowerCase().replace(/[_\s-]/g, '');
              const isDelivered = normalizedStatus === 'delivered' ||
                normalizedStatus === 'completed' ||
                rawStatus === 'delivered' ||
                rawStatus === 'completed' ||
                rawStatus.includes('delivered') ||
                rawStatus.includes('completed');

              if (isDelivered && order.rating) {
                const ratingValue = typeof order.rating === 'number'
                  ? order.rating.toFixed(1)
                  : String(order.rating);
                return (
                  <p className="order_rating">
                    <img src="/images/Star.svg" alt="Icon" /> {ratingValue}
                  </p>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
      <RatingModal
        open={open1}
        onClose={handleCloseModal1}
        setOpen={setOpen1}
        orderItems={[order]}
      />
      <Dialog
        open={showReturnExchangeModal}
        onClose={handleCloseReturnExchangeModal}
        maxWidth={false}
        PaperProps={{
          style: {
            backgroundColor: 'var(--commerce-primary-light)',
            borderRadius: '24px',
            width: '500px',
            height: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <DialogTitle style={{ padding: '20px 20px 10px 20px', borderBottom: 'none', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <Typography style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
              Order ID: #{order.orderId || order.id || "N/A"}
            </Typography>
            <Button
              onClick={handleCloseReturnExchangeModal}
              style={{
                minWidth: 'auto',
                padding: '4px 8px',
                color: '#000',
                fontSize: '24px',
                fontWeight: 'normal',
                position: 'absolute',
                top: '15px',
                right: '15px',
                lineHeight: '1',
              }}
            >
              ×
            </Button>
          </div>
          <div className="tabs" style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0', gap: 0, width: '100%' }}>
            <Button
              onClick={() => handleTabChange("return")}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: activeTab === "return" ? '8px 0 0 8px' : '0',
                backgroundColor: activeTab === "return" ? 'var(--commerce-primary)' : '#fff',
                color: activeTab === "return" ? '#fff' : '#000',
                fontWeight: 'bold',
                border: 'none',
                textTransform: 'none',
                fontSize: '16px',
                boxShadow: 'none',
                minWidth: 'auto',
              }}
            >
              Return Order
            </Button>
            <Button
              onClick={() => handleTabChange("exchange")}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: activeTab === "exchange" ? '0 8px 8px 0' : '0',
                backgroundColor: activeTab === "exchange" ? 'var(--commerce-primary)' : '#fff',
                color: activeTab === "exchange" ? '#fff' : '#000',
                fontWeight: 'bold',
                border: 'none',
                textTransform: 'none',
                fontSize: '16px',
                boxShadow: 'none',
                minWidth: 'auto',
              }}
            >
              Exchange Order
            </Button>
          </div>
        </DialogTitle>
        <DialogContent style={{ padding: '20px', backgroundColor: 'var(--commerce-primary-light)', overflowY: 'auto', height: '100%' }}>
          {activeTab === "return" ? (
            <div>
              <Typography variant="h6" style={{ fontWeight: 'bold', marginBottom: '15px', color: '#000' }}>Select item you want to return</Typography>
              <RadioGroup value="product" onChange={() => { }} sx={{ '& .MuiFormControlLabel-root': { marginBottom: '12px' } }}>
                <FormControlLabel value="product" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label={order.title || "Product"} />
              </RadioGroup>

              <Typography variant="h6" style={{ fontWeight: 'bold', marginTop: '24px', marginBottom: '15px', color: '#000' }}>Select a reason for return</Typography>
              <RadioGroup value={returnReason} onChange={handleReturnReasonChange} sx={{ '& .MuiFormControlLabel-root': { marginBottom: '12px' } }}>
                <FormControlLabel value="I Changed my mind" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="I Changed my mind" />
                <FormControlLabel value="I don't like the material" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="I don't like the material" />
                <FormControlLabel value="Item quality is poor" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Item quality is poor" />
                <FormControlLabel value="I received wrong item" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="I received wrong item" />
                <FormControlLabel value="I don't like the color" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="I don't like the color" />
                <FormControlLabel value="I ordered more than one size" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="I ordered more than one size" />
                <FormControlLabel value="Other (please specify)" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Other (please specify)" />
              </RadioGroup>

              <Typography variant="h6" style={{ fontWeight: 'bold', marginTop: '24px', marginBottom: '15px', color: '#000' }}>Select Refund Method</Typography>
              <RadioGroup value={refundMethod} onChange={handleRefundMethodChange} sx={{ '& .MuiFormControlLabel-root': { marginBottom: '12px' } }}>
                <FormControlLabel value="Original Payment Method" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Original Payment Method" />
                <FormControlLabel value="Wallet Credit" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Wallet Credit" />
              </RadioGroup>

              <Button
                variant="contained"
                fullWidth
                sx={{
                  backgroundColor: 'var(--commerce-primary)',
                  color: '#fff',
                  marginTop: '24px',
                  padding: '14px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'var(--commerce-primary-hover)',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#D9D9D9',
                    color: '#737373',
                    WebkitTextFillColor: '#737373',
                  },
                }}
                onClick={async () => {
                  if (order.orderItemId) {
                    try {
                      await returnOrder({
                        orderItemId: order.orderItemId,
                        return_reason: returnReason,
                        refund_method: refundMethod,
                      }).unwrap();
                      alert("Return request submitted successfully!");
                      handleCloseReturnExchangeModal();
                    } catch (error) {
                      // console.error("Failed to submit return request:", error);
                      alert("Failed to submit return request.");
                    }
                  } else {
                    alert("Missing order item information for return.");
                  }
                }}
                disabled={!returnReason || !refundMethod || isReturning}
              >
                Submit
              </Button>
            </div>
          ) : (
            <div>
              <Typography variant="h6" style={{ fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>Select a reason for exchange</Typography>
              <RadioGroup value={exchangeReason} onChange={handleExchangeReasonChange} sx={{ '& .MuiFormControlLabel-root': { marginBottom: '12px' } }}>
                <FormControlLabel value="Size is too small" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Size is too small" />
                <FormControlLabel value="Size is too large" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Size is too large" />
                <FormControlLabel value="Wrong size delivered" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Wrong size delivered" />
                <FormControlLabel value="Fit is not good" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Fit is not good" />
                <FormControlLabel value="I want a different color" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="I want a different color" />
                <FormControlLabel value="Other" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Other" />
              </RadioGroup>
              <Button
                variant="contained"
                fullWidth
                style={{
                  backgroundColor: 'var(--commerce-primary)',
                  color: '#fff',
                  marginTop: '24px',
                  padding: '14px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'none',
                }}
                onClick={async () => {
                  if (order.orderItemId) {
                    try {
                      // Using order.orderItemId as previousOrderItemId
                      // Using order.product_id or order.id as product_id
                      // newVariationId: 1 is a placeholder - in production, this should be selected by the user
                      await exchangeOrder({
                        previousOrderItemId: Number(order.orderItemId),
                        product_id: Number(order.product_id) || Number(order.id) || Number(order.orderItemId),
                        newVariationId: 1, // TODO: This should be selected by user from available variations
                        reason: exchangeReason,
                      }).unwrap();
                      alert("Exchange request submitted successfully!");
                      handleCloseReturnExchangeModal();
                    } catch (error: any) {
                      console.error("Failed to submit exchange request:", error);
                      const errorMessage = error?.data?.message || error?.message || "Failed to submit exchange request.";
                      alert(errorMessage);
                    }
                  } else {
                    alert("Missing order item information for exchange.");
                  }
                }}
                disabled={!exchangeReason || isExchanging}
              >
                Next
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Separate Exchange Modal */}
      <Dialog
        open={showExchangeModal}
        onClose={handleCloseExchangeModal}
        maxWidth={false}
        PaperProps={{
          style: {
            backgroundColor: 'var(--commerce-primary-light)',
            borderRadius: '24px',
            width: '42%',
            maxWidth: '600px',
            minWidth: '400px',
            height: '78%',
            maxHeight: '90vh',
            margin: 'auto',
          }
        }}
      >
        <DialogTitle style={{ padding: '20px 20px 10px 20px', borderBottom: 'none', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <Typography style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
              Order ID: #{order.orderId || order.id || "N/A"}
            </Typography>
            <Button
              onClick={handleCloseExchangeModal}
              style={{
                minWidth: 'auto',
                padding: '4px 8px',
                color: '#000',
                fontSize: '24px',
                fontWeight: 'normal',
                position: 'absolute',
                top: '15px',
                right: '15px',
                lineHeight: '1',
              }}
            >
              ×
            </Button>
          </div>
          <Typography variant="h6" style={{ fontWeight: 'bold', color: '#000', marginTop: '10px' }}>
            Exchange Order
          </Typography>
        </DialogTitle>
        <DialogContent style={{ padding: '20px', backgroundColor: 'var(--commerce-primary-light)', overflowY: 'auto', height: '100%' }}>
          <div>
            <Typography variant="h6" style={{ fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>Select a reason for exchange</Typography>
            <RadioGroup value={exchangeReason} onChange={handleExchangeReasonChange} sx={{ '& .MuiFormControlLabel-root': { marginBottom: '12px' } }}>
              <FormControlLabel value="Size is too small" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Size is too small" />
              <FormControlLabel value="Size is too large" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Size is too large" />
              <FormControlLabel value="Wrong size delivered" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Wrong size delivered" />
              <FormControlLabel value="Fit is not good" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Fit is not good" />
              <FormControlLabel value="I want a different color" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="I want a different color" />
              <FormControlLabel value="Other" control={<Radio sx={{ color: 'var(--commerce-primary)', '&.Mui-checked': { color: 'var(--commerce-primary)' } }} />} label="Other" />
            </RadioGroup>
            <Button
              variant="contained"
              fullWidth
              style={{
                backgroundColor: 'var(--commerce-primary)',
                color: '#fff',
                marginTop: '24px',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
                textTransform: 'none',
              }}
              onClick={async () => {
                if (order.orderItemId) {
                  try {
                    // Using order.orderItemId as previousOrderItemId
                    // Using order.id as product_id (if product_id is different, it should be added to Order interface)
                    // newVariationId: 1 is a placeholder - in production, this should be selected by the user
                    await exchangeOrder({
                      previousOrderItemId: Number(order.orderItemId),
                      product_id: Number(order.id) || Number(order.orderItemId), // Using order.id or orderItemId as fallback
                      newVariationId: 1, // TODO: This should be selected by user from available variations
                      reason: exchangeReason,
                    }).unwrap();
                    alert("Exchange request submitted successfully!");
                    handleCloseExchangeModal();
                  } catch (error: any) {
                    console.error("Failed to submit exchange request:", error);
                    const errorMessage = error?.data?.message || error?.message || "Failed to submit exchange request.";
                    alert(errorMessage);
                  }
                } else {
                  alert("Missing order item information for exchange.");
                }
              }}
              disabled={!exchangeReason || isExchanging}
            >
              {isExchanging ? "Submitting..." : "Next"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default OrderCard;
