/* eslint-disable @next/next/no-img-element */
"use client";
import BredCrum from "@/components/bredCrum";
import { Button } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useGetOrderByIdQuery } from "@/service/order";
import {
  pushEvent,
  buildGtmItem,
  hasPurchaseFired,
  markPurchaseFired,
} from "@/lib/dataLayer";

const items = [
  { label: "Home", path: "/" },
  { label: "My Cart", path: "/cart" },
  { label: "Checkout", path: "/" },
  { label: "Success" },
];
function PaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get order ID from URL params or localStorage (fallback)
  const [orderId, setOrderId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    // Try to get from URL params first
    const urlOrderId = searchParams.get("orderId");
    
    if (urlOrderId) {
      setOrderId(urlOrderId);
    } else {
      // Fallback: try to get from localStorage (in case URL params don't work)
      const storedOrderId = localStorage.getItem("lastOrderId");
      if (storedOrderId) {
        setOrderId(storedOrderId);
        // Clean up after using it
        localStorage.removeItem("lastOrderId");
      }
    }
  }, [searchParams]);

  const { data: orderResponse } = useGetOrderByIdQuery(
    { orderId: orderId || "" },
    { skip: !orderId },
  );

  React.useEffect(() => {
    if (!orderId) return;
    pushEvent("order_confirmation_view", { transaction_id: orderId });
  }, [orderId]);

  React.useEffect(() => {
    if (!orderId || hasPurchaseFired(orderId)) return;
    const responseData = orderResponse?.data as any;
    const orderData = responseData?.data || responseData;
    if (!orderData) return;

    const orderItems = orderData.items || orderData.order_items || [];
    const value = Number(
      orderData.total ?? orderData.total_amount ?? orderData.grand_total ?? 0,
    );

    markPurchaseFired(orderId);
    pushEvent("purchase", {
      transaction_id: orderId,
      value: Number.isFinite(value) ? value : undefined,
      currency: "INR",
      items: Array.isArray(orderItems)
        ? orderItems.map((item: any) => buildGtmItem(item))
        : undefined,
    });
  }, [orderId, orderResponse]);

  const handleTrackOrder = () => {
    if (orderId) {
      // Navigate to order detail page with order ID
      router.push(`/account/orders/detail?id=${orderId}`);
    } else {
      // Navigate to orders list if no order ID
      router.push("/account/orders");
    }
  };

  return (
    <>
      <section className="pymnt_scsfl_sc u_spc">
        <div className="container">
          <BredCrum items={items} />
          <div className="pymnt_scsfl_mn text_center">
            <figure>
              <img src="/images/success_icon.svg" alt="Icon" />
            </figure>
            <h3 className="fw_med">Payment Successful</h3>
            <p>Thank you! Your order is confirmed.</p>
            <p className="ordrid">
              Order ID: {orderId ? `#${orderId}` : "Processing..."}
            </p>
            <div className="btn_flex">
              <Button className="dotd_btn" onClick={handleTrackOrder}>
                Track Order
              </Button>
              <Button onClick={() => router.push('/product/product-category')}>
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default PaymentSuccess;
