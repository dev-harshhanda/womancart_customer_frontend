/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
"use client";
import CancelOrderModal from "@/modal/cancelOrderModal";
import ReturnOrderModal from "@/modal/returnOrderModal";
import ExchangeOrderModal from "@/modal/exchangeOrderModal";
import DriverChatModal from "@/modal/driverChatModal";
import { Button, FormControlLabel, Radio, RadioGroup, Box, TextField } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { buildProductUrl, getVariantUrlSlug } from "@/utils/urlBuilder";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import React from "react";
import toast from "react-hot-toast";
import RatingModal from "@/modal/RatingModal";
import { useGetOrderByIdQuery, useCancelReturnMutation, useGetDriverInfoQuery, useLazyGetOrderInvoiceQuery } from "@/service/order";
import { useAddToCartMutation } from "@/service/cart";
import {
  OrderStatus,
  ORDER_STATUS,
  DELIVERY_STATUS,
  ORDER_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  getSocketStatusToastMessage,
} from "@/constants/orderStatus";
import { getDeliveryChannel } from "@/utils/deliveryMode";
import { formatPriceInr } from "@/utils/format";
import { formatAddressPhone, resolvePhoneFields } from "@/utils/phoneNumber";
import {
  extractInvoiceUrl,
  extractOrderItemIdFromLine,
  isInvoiceUrlExplicitlyNull,
  resolveInvoiceUrlForOrderItem,
  triggerInvoiceDownload,
} from "@/utils/orderInvoice";
import { useDriverSocket } from "@/hooks/useDriverSocket";
import GoogleMap from "@/components/Map/map";
// Helper function to extract image URL from an image object or string
const extractImageUrl = (img: any): string => {
  if (!img) return '';
  if (typeof img === 'string') return img;
  // Check various possible field names for the URL
  return img.image_url || img.imageUrl || img.url || img.image || img.src || img.path || '';
};

// Helper function to extract image from various possible API structures
const getProductImage = (item: any, product: any, variation: any): string => {
  const kit = item?.product_kit || item?.kit || product?.product_kit;

  // If this is a product kit and it has an image, prefer that
  if (kit?.image && typeof kit.image === "string") {
    return kit.image;
  }

  // 1) Always prefer selected variant image (exact color/size) first.
  if (variation?.image && typeof variation.image === "string") return variation.image;
  if (variation?.product_image && typeof variation.product_image === "string")
    return variation.product_image;
  if (variation?.image_url && typeof variation.image_url === "string")
    return variation.image_url;
  if (Array.isArray(variation?.images) && variation.images.length > 0) {
    const imgUrl = extractImageUrl(variation.images[0]);
    if (imgUrl) return imgUrl;
  }
  const variationAttrs = Array.isArray(variation?.variation_attributes)
    ? variation.variation_attributes
    : [];
  for (const attr of variationAttrs) {
    const option = attr?.attribute_option ?? attr?.attributeOption ?? attr;
    const optionImage =
      option?.image_url ??
      option?.imageUrl ??
      option?.image ??
      option?.product_image ??
      option?.productImage;
    if (typeof optionImage === "string" && optionImage.trim() !== "") {
      return optionImage;
    }
  }

  // Check for images array on item first (this is where your API stores it)
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const imgUrl = extractImageUrl(item.images[0]);
    if (imgUrl) return imgUrl;
  }

  // Check for direct image fields on item
  if (item?.image && typeof item.image === "string") return item.image;
  if (item?.product_image && typeof item.product_image === "string") return item.product_image;
  if (item?.image_url && typeof item.image_url === "string") return item.image_url;
  if (item?.photo && typeof item.photo === "string") return item.photo;
  if (item?.picture && typeof item.picture === "string") return item.picture;
  if (item?.thumbnail && typeof item.thumbnail === "string") return item.thumbnail;

  // Check for other image arrays on item
  if (Array.isArray(item?.product_images) && item.product_images.length > 0) {
    const imgUrl = extractImageUrl(item.product_images[0]);
    if (imgUrl) return imgUrl;
  }
  if (Array.isArray(item?.media) && item.media.length > 0) {
    const imgUrl = extractImageUrl(item.media[0]);
    if (imgUrl) return imgUrl;
  }

  // Check for images array on product
  if (Array.isArray(product?.images) && product.images.length > 0) {
    const imgUrl = extractImageUrl(product.images[0]);
    if (imgUrl) return imgUrl;
  }

  // Check for direct image fields on product
  if (product?.image && typeof product.image === "string") return product.image;
  if (product?.product_image && typeof product.product_image === "string") return product.product_image;
  if (product?.image_url && typeof product.image_url === "string") return product.image_url;
  if (product?.photo && typeof product.photo === "string") return product.photo;
  if (product?.picture && typeof product.picture === "string") return product.picture;
  if (product?.thumbnail && typeof product.thumbnail === "string") return product.thumbnail;
  if (product?.main_image && typeof product.main_image === "string") return product.main_image;
  if (product?.featured_image && typeof product.featured_image === "string") return product.featured_image;

  // Check for other image arrays on product
  if (Array.isArray(product?.product_images) && product.product_images.length > 0) {
    const imgUrl = extractImageUrl(product.product_images[0]);
    if (imgUrl) return imgUrl;
  }
  if (Array.isArray(product?.media) && product.media.length > 0) {
    const imgUrl = extractImageUrl(product.media[0]);
    if (imgUrl) return imgUrl;
  }

  // Return placeholder if no image found
  return "/images/placeholder.png";
};

function withResolvedOrderPhone<T extends Record<string, unknown>>(data: T): T {
  const phone =
    data.phone ??
    data.phone_number ??
    data.contact_number ??
    null;
  const mobile = data.mobile ?? data.mobile_number ?? null;
  const rawCode = data.phone_code ?? data.dial_code ?? null;
  const resolved = resolvePhoneFields(
    phone as string | number | null,
    rawCode as string | number | null,
    mobile as string | number | null,
  );
  return {
    ...data,
    phone: resolved.phone,
    phone_code: resolved.phone_code,
    mobile: resolved.mobile,
  };
}

function AccountOrderDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const orderId = searchParams.get("id");
  const bookingIdFromQuery = searchParams.get("bookingId");
  const shouldAutoOpenChat = searchParams.get("openChat") === "1";

  // Fetch order details from API
  const { data: orderResponse, isLoading, error, refetch } = useGetOrderByIdQuery(
    { orderId: orderId || "" },
    { skip: !orderId }
  );

  
  // Extract order data
  const orderData = React.useMemo(() => {
    if (!orderResponse?.data) return null;
    const response = orderResponse.data as any;
    return response.data || response;
  }, [orderResponse]);

  // Extract order items
  const orderItems = React.useMemo(() => {
    if (!orderData) return [];
    const items = orderData.items || orderData.order_items || [];
    return Array.isArray(items) ? items : [];
  }, [orderData]);

  const [selectedOrderItemIndex, setSelectedOrderItemIndex] = React.useState(0);

  React.useEffect(() => {
    if (orderItems.length > 0) {
      setSelectedOrderItemIndex(0);
    }
  }, [orderItems.length]);

  const totalOrderItemCount = React.useMemo(() => {
    console.log("orderItems", orderItems);
    if (!Array.isArray(orderItems) || orderItems.length === 0) return 0;
    return orderItems.reduce((sum: number, it: any) => {
      const qty = it?.qty ?? it?.quantity ?? it?.count ?? 1;
      const n = Number(qty);
      return sum + (Number.isFinite(n) && n > 0 ? n : 1);
    }, 0);
  }, [orderItems]);

  const totalOrderItemCountForLabel = totalOrderItemCount > 0 ? totalOrderItemCount : 1;

  const extractOrderItemId = React.useCallback((item: any) => {
    return extractOrderItemIdFromLine(item);
  }, []);

  // Extract address data - check multiple possible locations in API response
  const addressData = React.useMemo(() => {
    if (!orderData) return null;

    // Try multiple possible locations for nested address object
    const nestedAddress = orderData.shipping_address
      || orderData.delivery_address
      || orderData.user_address
      || orderData.billing_address
      || orderData.shippingAddress
      || orderData.deliveryAddress
      || orderData.userAddress;

    // If nested address object is found, normalize important fields
    if (nestedAddress && typeof nestedAddress === 'object' && Object.keys(nestedAddress).length > 0) {
      const firstItem = orderData.items?.[0] || orderData.order_items?.[0];
      return withResolvedOrderPhone({
        ...nestedAddress,
        name:
          nestedAddress.name ||
          nestedAddress.full_name ||
          nestedAddress.customer_name ||
          nestedAddress.user_name ||
          `${nestedAddress.first_name || ""} ${nestedAddress.last_name || ""}`.trim() ||
          orderData.name ||
          orderData.full_name ||
          firstItem?.name ||
          "",
      });
    }

    // Check if orderData.address is an object (nested address)
    if (orderData.address && typeof orderData.address === 'object' && Object.keys(orderData.address).length > 0) {
      return withResolvedOrderPhone(orderData.address as Record<string, unknown>);
    }

    // Check if address fields are directly on orderData (flat structure from place order API)
    // This matches the order payload: address, address1, landmark, phone, phone_code, latitude, longitude
    if (orderData.address || orderData.address1 || orderData.address_line1 || orderData.street || orderData.full_address || orderData.landmark || orderData.phone) {
      // Also check first item for address_type if not found on orderData
      const firstItem = orderData.items?.[0] || orderData.order_items?.[0];
      const addressType = orderData.address_type || orderData.type || orderData.addressType || firstItem?.address_type || 'Home';
      
      return withResolvedOrderPhone({
        address: orderData.address || orderData.full_address || orderData.address_line1 || orderData.street || '',
        address1: orderData.address1 || orderData.address_line1 || orderData.street || firstItem?.address1 || '',
        address2: orderData.address2 || orderData.address_line2 || '',
        city: orderData.city || '',
        state: orderData.state || '',
        country: orderData.country || '',
        postal_code: orderData.postal_code || orderData.zip_code || orderData.pincode || '',
        phone:
          orderData.phone ||
          orderData.phone_number ||
          orderData.mobile ||
          orderData.mobile_number ||
          orderData.contact_number ||
          orderData.contact ||
          firstItem?.phone ||
          firstItem?.phone_number ||
          firstItem?.mobile ||
          firstItem?.mobile_number ||
          firstItem?.contact_number ||
          '',
        phone_code:
          orderData.phone_code ||
          orderData.dial_code ||
          firstItem?.phone_code ||
          firstItem?.dial_code ||
          '',
        mobile:
          orderData.mobile ||
          orderData.mobile_number ||
          firstItem?.mobile ||
          firstItem?.mobile_number ||
          '',
        address_type: addressType,
        landmark: orderData.landmark || firstItem?.landmark || '',
        latitude: orderData.latitude || firstItem?.latitude || '',
        longitude: orderData.longitude || firstItem?.longitude || '',
        name: orderData.name || firstItem?.name || '',
      });
    }

    // Check if address is in the first item
    const firstItem = orderData.items?.[0] || orderData.order_items?.[0];
    if (firstItem?.address || firstItem?.shipping_address || firstItem?.address_type) {
      const itemAddress = firstItem.address || firstItem.shipping_address;
      if (typeof itemAddress === 'object') {
        return withResolvedOrderPhone({
          ...itemAddress,
          address_type: itemAddress.address_type || firstItem.address_type || 'Home',
        });
      }
      return withResolvedOrderPhone({
        address: itemAddress || firstItem.address || '',
        address1: firstItem.address1 || '',
        landmark: firstItem.landmark || '',
        phone:
          firstItem.phone ||
          firstItem.phone_number ||
          firstItem.mobile ||
          firstItem.mobile_number ||
          firstItem.contact_number ||
          '',
        phone_code:
          firstItem.phone_code ||
          firstItem.dial_code ||
          '',
        mobile:
          firstItem.mobile ||
          firstItem.mobile_number ||
          '',
        address_type: firstItem.address_type || 'Home',
        latitude: firstItem.latitude || '',
        longitude: firstItem.longitude || '',
        name:
          firstItem.name ||
          firstItem.full_name ||
          firstItem.customer_name ||
          firstItem.user_name ||
          `${firstItem.first_name || ""} ${firstItem.last_name || ""}`.trim() ||
          '',
      });
    }

    return null;
  }, [orderData]);

  // Extract payment data
  const paymentData = React.useMemo(() => {
    if (!orderData) return null;

    const num = (v: any): number => {
      if (v == null || v === "") return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const firstItem: any = Array.isArray(orderItems) && orderItems.length > 0 ? orderItems[0] : null;
    const hasItems = Array.isArray(orderItems) && orderItems.length > 0;

    const lineQty = (it: any) => Math.max(1, num(it?.quantity ?? it?.qty ?? 1));

    // Subtotal row: each line's sub_total (selling subtotal before line-level loyalty).
    const lineSubTotal = (it: any) => {
      const direct = it?.sub_total ?? it?.subtotal;
      if (direct != null && direct !== "") return num(direct);
      return num(it?.price) * lineQty(it);
    };

    // MRP row (per product/API): sum of line item `price` × qty (not catalog product.mrp).
    const lineSellingPriceTotal = (it: any) => num(it?.price) * lineQty(it);

    const lineDiscount = (it: any) =>
      num(it?.discount ?? it?.discount_amount ?? it?.coupon_discount);

    const lineShipping = (it: any) =>
      num(it?.delivery_charges ?? it?.shipping_charges ?? it?.deliveryCharges);

    const lineLoyaltyRedemption = (it: any) =>
      num(it?.loyalty_redemption_amount ?? it?.loyaltyRedemptionAmount);

    const linePayableTotal = (it: any) => num(it?.total ?? it?.total_amount);

    const summedSubTotal = hasItems
      ? orderItems.reduce((acc: number, it: any) => acc + lineSubTotal(it), 0)
      : null;
    const summedSellingPrice = hasItems
      ? orderItems.reduce((acc: number, it: any) => acc + lineSellingPriceTotal(it), 0)
      : null;
    const summedDiscount = hasItems
      ? orderItems.reduce((acc: number, it: any) => acc + lineDiscount(it), 0)
      : null;
    const summedShipping = hasItems
      ? orderItems.reduce((acc: number, it: any) => acc + lineShipping(it), 0)
      : null;
    const summedLineTotal = hasItems
      ? orderItems.reduce((acc: number, it: any) => acc + linePayableTotal(it), 0)
      : null;

    const summedLoyaltyRedemptionFromItems = hasItems
      ? orderItems.reduce((acc: number, it: any) => acc + lineLoyaltyRedemption(it), 0)
      : 0;
    const orderLevelLoyaltyRaw =
      orderData.loyalty_redemption_amount ?? orderData.loyaltyRedemptionAmount;

    const itemSubTotal =
      firstItem?.sub_total ??
      firstItem?.subtotal ??
      firstItem?.item_total ??
      firstItem?.price ??
      null;
    const itemTotal = firstItem?.total ?? firstItem?.total_amount ?? null;
    const itemShipping =
      firstItem?.delivery_charges ??
      firstItem?.shipping_charges ??
      firstItem?.deliveryCharges ??
      null;
    const itemDiscount =
      firstItem?.discount ??
      firstItem?.discount_amount ??
      firstItem?.coupon_discount ??
      null;

    return {
      // Subtotal across all line items (was first line only).
      price: hasItems
        ? summedSubTotal!
        : num(
            itemSubTotal ??
              orderData.sub_total ??
              orderData.subtotal ??
              orderData.price ??
              orderData.item_total ??
              0,
          ),
      // Labelled "MRP" in UI: sum of each line's `price` × qty (API line selling amount).
      mrp: hasItems
        ? summedSellingPrice!
        : (() => {
            const q = firstItem ? lineQty(firstItem) : 1;
            const fromLine = num(firstItem?.price) * q;
            if (fromLine > 0) return fromLine;
            return (
              num(
                orderData.total_mrp ??
                  orderData.total_mrp_amount ??
                  orderData.mrp_amount ??
                  orderData.mrp_total ??
                  orderData.mrp ??
                  orderData.mrpPrice ??
                  0,
              ) || null
            );
          })(),
      shipping: hasItems
        ? summedShipping!
        : num(
            itemShipping ??
              orderData.shipping_charges ??
              orderData.delivery_charges ??
              orderData.shipping ??
              0,
          ),
      discount: hasItems
        ? summedDiscount!
        : num(
            itemDiscount ??
              orderData.discount ??
              orderData.discount_amount ??
              orderData.coupon_discount ??
              orderData.couponDiscount ??
              orderData.promo_discount ??
              orderData.promoDiscount ??
              0,
          ),
      // Payable total: sum of each line's total (matches what was charged per item).
      total: hasItems
        ? summedLineTotal!
        : num(
            itemTotal ??
              orderData.total ??
              orderData.total_amount ??
              orderData.grand_total ??
              0,
          ),

      loyaltyRedemptionAmount: hasItems
        ? summedLoyaltyRedemptionFromItems
        : (() => {
            if (orderLevelLoyaltyRaw != null && orderLevelLoyaltyRaw !== "") {
              const n = Number(orderLevelLoyaltyRaw);
              if (Number.isFinite(n)) return n;
            }
            return 0;
          })(),

      paymentMethod: orderData.payment_method || orderData.paymentMethod || "Card",
      paymentMode: orderData.payment_mode || orderData.paymentMode || "online",
      cardLast4: orderData.card_last4 || orderData.cardLast4 || "8345",
    };
  }, [orderData, orderItems]);

  // Format date for tracking
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatReturnDate = React.useCallback((dateString: string | Date) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    // Example: "20 Mar 2026"
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }, []);

  // Get order status for tracking - prioritize item level (more specific) then order level
  const orderStatus = React.useMemo(() => {
    if (!orderData) return OrderStatus.orderPlaced;

    const primaryItem = orderItems[0];
    const statusCandidates = [
      primaryItem?.status,
      primaryItem?.order_status,
      primaryItem?.order_status_name,
      orderData.status,
      orderData.order_status,
      orderData.orderStatus,
      orderData.current_status,
      mode,
      "Pending",
      "Return_requested", // Explicitly include the raw status
    ];

    const status = statusCandidates.find((s) => typeof s === "string" && s.trim().length > 0) as string;

    return OrderStatus.fromApi(status);
  }, [orderData, orderItems, mode]);

  const [overrideStatus, setOverrideStatus] = React.useState<string | null>(null);
  // Real-time status from socket (order_status_change) - overrides API when present
  const [socketOrderStatus, setSocketOrderStatus] = React.useState<string | null>(null);
  const [socketDeliveryStatus, setSocketDeliveryStatus] = React.useState<string | null>(null);
  const [socketStatusUpdatedAt, setSocketStatusUpdatedAt] = React.useState<Date | null>(null);
  const displayStatus = overrideStatus || (socketOrderStatus ? OrderStatus.fromApi(socketOrderStatus) : null) || orderStatus;
  const displayStatusLabel = React.useMemo(
    () => OrderStatus.fromApi(String(displayStatus || orderStatus || "Pending")),
    [displayStatus, orderStatus]
  );

  /** Each line item can have its own status (e.g. one item cancelled). Prefer item fields, then order-level label. */
  const getStatusLabelForOrderItem = React.useCallback(
    (item: any) => {
      const raw =
        item?.status ||
        item?.order_status ||
        item?.order_status_name;
      if (typeof raw === "string" && raw.trim() !== "") {
        return OrderStatus.fromApi(raw);
      }
      return displayStatusLabel;
    },
    [displayStatusLabel],
  );

  /** Invoice is enabled when the selected line item is delivered (matches item cards / tracking). */
  const isDeliveredOrder = React.useMemo(() => {
    const orderLevelDelivered = (() => {
      const normalized = String(displayStatusLabel || "")
        .toLowerCase()
        .replace(/[_\s-]/g, "");
      return normalized === "delivered" || normalized === "completed";
    })();

    if (!orderItems.length) {
      return orderLevelDelivered;
    }

    const selectedItem = orderItems[selectedOrderItemIndex];
    if (!selectedItem) {
      return orderLevelDelivered;
    }

    return getStatusLabelForOrderItem(selectedItem) === OrderStatus.delivered;
  }, [displayStatusLabel, orderItems, selectedOrderItemIndex, getStatusLabelForOrderItem]);

  const resolveSelectedItemInvoiceUrl = React.useCallback(
    (sourceOrderData: any, sourceItems: any[], itemIndex: number) => {
      const selectedItem = sourceItems[itemIndex];
      const selectedItemId = extractOrderItemId(selectedItem);
      const allowOrderLevel =
        sourceItems.length <= 1 ||
        sourceItems.every(
          (item: any) => getStatusLabelForOrderItem(item) === OrderStatus.delivered,
        );

      return resolveInvoiceUrlForOrderItem(
        sourceOrderData,
        selectedItem,
        selectedItemId,
        { allowOrderLevel },
      );
    },
    [extractOrderItemId, getStatusLabelForOrderItem],
  );

  const invoiceUrl = React.useMemo(() => {
    return resolveSelectedItemInvoiceUrl(
      orderData,
      orderItems,
      selectedOrderItemIndex,
    );
  }, [
    orderData,
    orderItems,
    selectedOrderItemIndex,
    resolveSelectedItemInvoiceUrl,
  ]);

  const isInvoiceExplicitlyUnavailable = React.useMemo(() => {
    const selectedItem = orderItems[selectedOrderItemIndex];
    if (isInvoiceUrlExplicitlyNull(selectedItem)) return true;
    if (isInvoiceUrlExplicitlyNull(orderData)) return true;
    return false;
  }, [orderData, orderItems, selectedOrderItemIndex]);

  const [fetchOrderInvoice] = useLazyGetOrderInvoiceQuery();
  const [isDownloadingInvoice, setIsDownloadingInvoice] = React.useState(false);

  const isDownloadInvoiceDisabled =
    !isDeliveredOrder ||
    isDownloadingInvoice ||
    (isInvoiceExplicitlyUnavailable && !invoiceUrl);

  const handleDownloadInvoice = React.useCallback(async () => {
    const selectedItem = orderItems[selectedOrderItemIndex];
    const selectedItemId = extractOrderItemId(selectedItem);
    const orderNumber = orderData?.id || orderData?.order_id || orderId || "invoice";

    const openInvoice = (url: string) => {
      triggerInvoiceDownload(url, `Invoice-${orderNumber}.pdf`);
    };

    const resolvedFromState = invoiceUrl;
    if (resolvedFromState) {
      openInvoice(resolvedFromState);
      return;
    }

    if (isInvoiceExplicitlyUnavailable) {
      return;
    }

    if (!isDeliveredOrder || !orderId) {
      toast.error("Invoice is not available");
      return;
    }

    setIsDownloadingInvoice(true);
    try {
      let resolvedUrl: string | null = null;

      if (selectedItemId) {
        try {
          const itemInvoice = await fetchOrderInvoice({
            orderId,
            orderItemId: selectedItemId,
          }).unwrap();
          resolvedUrl = extractInvoiceUrl(itemInvoice as Record<string, unknown>);
        } catch {
          // Per-item invoice may not exist yet; fall back to order-level invoice.
        }
      }

      if (!resolvedUrl) {
        const orderInvoice = await fetchOrderInvoice({ orderId }).unwrap();
        resolvedUrl = extractInvoiceUrl(orderInvoice as Record<string, unknown>);
      }

      if (resolvedUrl) {
        openInvoice(resolvedUrl);
        return;
      }

      toast.error("Invoice is not available");
    } catch {
      toast.error("Invoice is not available");
    } finally {
      setIsDownloadingInvoice(false);
    }
  }, [
    invoiceUrl,
    isInvoiceExplicitlyUnavailable,
    isDeliveredOrder,
    orderId,
    orderData,
    orderItems,
    selectedOrderItemIndex,
    extractOrderItemId,
    fetchOrderInvoice,
  ]);

  // Effective order status: prefer real-time socket, else API
  const effectiveOrderStatus = socketOrderStatus ? OrderStatus.fromApi(socketOrderStatus) : orderStatus;

  // Always show all 3 tracking steps with completion status (order + delivery from socket/API)
  const displayTrackingHistory = React.useMemo(() => {
    const normalizedStatus = effectiveOrderStatus.toLowerCase().replace(/[_\s-]/g, '');

    const packedRaw = [
      ORDER_STATUS.ORDER_PROCESSING,
      ORDER_STATUS.ORDER_PLACED,
      ORDER_STATUS.ORDER_CONFIRMED,
    ];
    const shippedRaw = [
      ORDER_STATUS.IN_TRANSIT,
      ORDER_STATUS.OUT_FOR_DELIVERY,
      ORDER_STATUS.DELIVERY_ATTEMPTED,
    ];
    const deliveredRaw = [ORDER_STATUS.DELIVERED];

    const rawStatus = (socketOrderStatus || '').toLowerCase().replace(/[_\s-]/g, '');
    const packedFromRaw = packedRaw.some((s) => s.toLowerCase().replace(/[_\s-]/g, '') === rawStatus) || shippedRaw.some((s) => s.toLowerCase().replace(/[_\s-]/g, '') === rawStatus) || deliveredRaw.some((s) => s.toLowerCase().replace(/[_\s-]/g, '') === rawStatus);
    const shippedFromRaw = shippedRaw.some((s) => s.toLowerCase().replace(/[_\s-]/g, '') === rawStatus) || deliveredRaw.some((s) => s.toLowerCase().replace(/[_\s-]/g, '') === rawStatus);
    const deliveredFromRaw = deliveredRaw.some((s) => s.toLowerCase().replace(/[_\s-]/g, '') === rawStatus);

    const packedStatuses = ['orderplaced', 'placed', 'confirmed', 'processing', 'packed', 'shipped', 'outfordelivery', 'delivered', 'completed', 'orderprocessing', 'orderconfirmed'];
    const shippedStatuses = ['shipped', 'outfordelivery', 'intransit', 'delivered', 'completed'];
    const deliveredStatuses = ['delivered', 'completed'];

    const isPacked = packedFromRaw || shippedFromRaw || deliveredFromRaw || packedStatuses.includes(normalizedStatus);
    const isShipped = shippedFromRaw || deliveredFromRaw || shippedStatuses.includes(normalizedStatus);
    const isDelivered = deliveredFromRaw || deliveredStatuses.includes(normalizedStatus);

    const trackingArray = orderData?.tracking
      || orderData?.tracking_history
      || orderData?.trackingHistory
      || orderData?.status_history
      || orderData?.statusHistory
      || orderData?.order_tracking
      || orderData?.history;

    let packedDate = orderData?.packed_at || orderData?.created_at || orderData?.createdAt || orderData?.order_date || '';
    let shippedDate = orderData?.shipped_at || orderData?.shippedAt || orderData?.dispatch_date || '';
    let deliveredDate = orderData?.delivered_at || orderData?.deliveredAt || orderData?.delivery_date || '';

    if (socketStatusUpdatedAt && isPacked && !packedDate) packedDate = socketStatusUpdatedAt.toISOString();
    if (socketStatusUpdatedAt && isShipped && !shippedDate) shippedDate = socketStatusUpdatedAt.toISOString();
    if (socketStatusUpdatedAt && isDelivered && !deliveredDate) deliveredDate = socketStatusUpdatedAt.toISOString();

    if (Array.isArray(trackingArray) && trackingArray.length > 0) {
      trackingArray.forEach((item: any) => {
        const itemStatus = (item.status || item.title || item.name || '').toLowerCase();
        const itemDate = item.date || item.created_at || item.createdAt || item.timestamp || item.time || '';

        if (itemStatus.includes('pack') || itemStatus.includes('confirm') || itemStatus.includes('placed')) {
          packedDate = packedDate || itemDate;
        }
        if (itemStatus.includes('ship') || itemStatus.includes('transit') || itemStatus.includes('way')) {
          shippedDate = shippedDate || itemDate;
        }
        if (itemStatus.includes('deliver') || itemStatus.includes('complete')) {
          deliveredDate = deliveredDate || itemDate;
        }
      });
    }

    const steps = [
      {
        status: 'packed',
        description: 'Order is being packed',
        isCompleted: isPacked,
        date: packedDate,
      },
      {
        status: 'shipped',
        description: 'Order is on the way',
        isCompleted: isShipped,
        date: shippedDate,
      },
      {
        status: 'delivered',
        description: 'Delivered',
        isCompleted: isDelivered,
        date: deliveredDate,
      },
    ];

    return steps;
  }, [effectiveOrderStatus, orderData, socketOrderStatus, socketStatusUpdatedAt]);

  // Live delivery status label for map (e.g. "At Store", "On the way")
  const deliveryStatusLabel = React.useMemo(() => {
    if (socketDeliveryStatus && DELIVERY_STATUS_LABELS[socketDeliveryStatus]) {
      return DELIVERY_STATUS_LABELS[socketDeliveryStatus];
    }
    if (socketOrderStatus === ORDER_STATUS.OUT_FOR_DELIVERY || socketOrderStatus === ORDER_STATUS.IN_TRANSIT) {
      return "On the way";
    }
    if (socketOrderStatus === ORDER_STATUS.DELIVERED) return "Delivered";
    return "Tracking…";
  }, [socketDeliveryStatus, socketOrderStatus]);

  // Normal delivery: 5 steps driven by socket order_status_change or API status (only used when !isQuickDelivery)
  const normalDeliverySteps = React.useMemo(() => {
    const raw =
      socketOrderStatus
      ?? orderData?.status
      ?? orderItems[0]?.status
      ?? orderData?.order_status
      ?? orderItems[0]?.order_status
      ?? "order_placed";
    const norm = (raw ?? "").toString().toLowerCase().replace(/[_\s-]/g, "");

    const isPlaced = true; // order exists
    const isConfirmed = ["orderconfirmed", "orderprocessing", "intransit", "outfordelivery", "deliveryattempted", "delivered"].some((s) => norm === s || norm.includes(s));
    const isShipped = ["intransit", "outfordelivery", "deliveryattempted", "delivered"].some((s) => norm === s || norm.includes(s));
    const isOutForDelivery = ["outfordelivery", "deliveryattempted", "delivered"].some((s) => norm === s || norm.includes(s));
    const isDelivered = norm === "delivered" || norm.includes("delivered");

    const placedDate = orderData?.created_at ?? orderData?.createdAt ?? orderData?.order_date ?? "";
    const lastUpdated = socketStatusUpdatedAt?.toISOString?.() ?? "";

    return [
      { label: "Order Placed", isCompleted: isPlaced, date: placedDate },
      { label: "Order Confirmed", isCompleted: isConfirmed, date: isConfirmed ? lastUpdated || placedDate : "" },
      { label: "Order Shipped", isCompleted: isShipped, date: isShipped ? lastUpdated : "" },
      { label: "Out for Delivery", isCompleted: isOutForDelivery, date: isOutForDelivery ? lastUpdated : "" },
      { label: "Delivered", isCompleted: isDelivered, date: isDelivered ? lastUpdated : "" },
    ];
  }, [socketOrderStatus, orderData, orderItems, socketStatusUpdatedAt]);

  const [open, setOpen] = React.useState(false);
  const handleCloseModal = () => {
    setOpen(false);
  };
  const [open1, setOpen1] = React.useState(false);
  const handleCloseModal1 = () => {
    setOpen1(false);
  };
  const [open2, setOpen2] = React.useState(false);
  const handleCloseModal2 = () => {
    setOpen2(false);
  };
  const [open3, setOpen3] = React.useState(false);
  const handleCloseModal3 = () => {
    setOpen3(false);
  };
  const [openChat, setOpenChat] = React.useState(false);
  const [hasAutoOpenedChat, setHasAutoOpenedChat] = React.useState(false);
  const handleCloseChatModal = () => {
    setOpenChat(false);
  };
  
  
  // Get list of products that already have reviews
  const reviewedProducts = React.useMemo(() => {
    if (!orderItems || orderItems.length === 0) return [];
    return orderItems
      .filter((item: any) => {
        const ratingsReviews = item?.ratings_reviews || [];
        return Array.isArray(ratingsReviews) && ratingsReviews.length > 0;
      })
      .map((item: any) => item.product_name || item.name || "Product");
  }, [orderItems]);
  
  // Check if any order item already has a review
  const hasAnyReview = reviewedProducts.length > 0;
  
  // Prevent multiple modal opens and show popup if already reviewed
  const handleOpenRatingModal = () => {
    if (open3) return; // Prevent multiple opens
    
    if (hasAnyReview) {
      // Show popup message
      toast.error(`You have submit review already${reviewedProducts.length > 0 ? `` : ""}`, {
        duration: 4000,
      });
      return;
    }
    
    setOpen3(true);
  };

  const selectedOrderItemId = React.useMemo(() => {
    const selectedItem = orderItems[selectedOrderItemIndex];
    return extractOrderItemId(selectedItem);
  }, [orderItems, selectedOrderItemIndex, extractOrderItemId]);

  const selectedProductId = React.useMemo(() => {
    const selectedItem = orderItems[selectedOrderItemIndex];
    if (!selectedItem) return null;
    const product = selectedItem.product || selectedItem.product_details || selectedItem;
    return product?.product_id || product?.id || selectedItem.product_id || selectedItem.productId || null;
  }, [orderItems, selectedOrderItemIndex]);

  const getProductIdFromOrderItem = React.useCallback((item: any) => {
    if (!item) return null;
    const product = item.product || item.product_details || item;
    return (
      product?.product_id ||
      product?.id ||
      item?.product_id ||
      item?.productId ||
      null
    );
  }, []);

  const goToProductDetail = React.useCallback(
    (item: any) => {
      const productId = getProductIdFromOrderItem(item);
      if (!productId) return;
      const variantUrlSlug = getVariantUrlSlug(item?.variation || item?.product_variation);
      const productSlug =
        variantUrlSlug ||
        item?.product?.slug ||
        item?.product?.product_name ||
        item?.product_name ||
        "";
      router.push(
        buildProductUrl(
          productSlug,
          { product_id: productId },
          { usePathSlugAsIs: Boolean(variantUrlSlug) },
        ),
      );
    },
    [getProductIdFromOrderItem, router],
  );

  const formattedDeliveryAddress = React.useMemo(() => {
    const data = addressData || orderData;
    if (!data) return "";

    const mainAddress = data.address || data.full_address || data.address1 || data.address_line1 || data.street || '';
    if (mainAddress) {
      const addressParts = [
        mainAddress,
        data.address1 !== mainAddress ? data.address1 : null,
        data.landmark
      ].filter(Boolean).join(' ');

      const locationParts = [
        data.city,
        data.state,
        data.postal_code || data.pincode || data.zip_code,
        data.country,
      ].filter(Boolean).join(', ');

      return locationParts ? `${addressParts}, ${locationParts}` : addressParts;
    }
    return "";
  }, [addressData, orderData]);

  // Extract product details from selected order item
  const selectedProductDetails = React.useMemo(() => {
    const selectedItem = orderItems[selectedOrderItemIndex];
    if (!selectedItem) return null;

    const product = selectedItem.product || selectedItem.product_details || selectedItem;
    const variation = selectedItem.variation || selectedItem.product_variation || {};
    const variantLabel = (() => {
      const attrs = Array.isArray(variation?.variation_attributes)
        ? variation.variation_attributes
        : [];
      const values = attrs
        .map((a: any) => {
          const value =
            a?.attribute_option?.display_value ??
            a?.attributeOption?.display_value ??
            a?.display_value ??
            a?.value ??
            a?.option_value ??
            a?.option ??
            "";
          return String(value || "").trim();
        })
        .filter(Boolean);
      if (values.length > 0) return values.join(" - ");
      if (variation?.name != null && String(variation.name).trim() !== "")
        return String(variation.name).trim();
      return variation?.size || "N/A";
    })();

    const productImage = getProductImage(selectedItem, product, variation);
    const productName = product.name || product.product_name || selectedItem.product_name || selectedItem.name || product.title || "Product";
    const productSize = variantLabel;
    const productQuantity = selectedItem.qty || selectedItem.quantity || 1;
    const productPrice = selectedItem.price || selectedItem.item_price || product.price || 0;

    return {
      image: productImage,
      name: productName,
      size: productSize,
      quantity: productQuantity,
      price: productPrice,
    };
  }, [orderItems, selectedOrderItemIndex]);

  const orderNumericId = React.useMemo(() => {
    if (!orderData) return null;
    return orderData.id || orderData.order_id || orderId || null;
  }, [orderData, orderId]);

  // Return eligibility (direct translation of your iOS Swift logic):
  // - total == 0 => not returnable (free)
  // - is_returnable != 1 => not returnable
  // - delivered_at missing/invalid => expired
  // - else expired check: Date() > (deliveredAt + delivery_time days)
  // - returnable item => status == delivered && !expired
  const returnEligibilityForSelectedItem = React.useMemo(() => {
    const selectedItem = orderItems[selectedOrderItemIndex];
    if (!selectedItem) {
      return {
        canReturn: false,
        canExchange: false,
        deliveredOn: "",
        returnMessage: "This item is not returnable",
      };
    }

    const product = selectedItem.product || selectedItem.product_details || selectedItem;

    const itemTotal =
      Number(
        selectedItem.total ??
        selectedItem.item_total ??
        selectedItem.item_price ??
        selectedItem.price ??
        0
      ) || 0;

    const isFree = itemTotal === 0;

    const isReturnableRaw =
      selectedItem?.is_returnable ??
      selectedItem?.isReturnable ??
      selectedItem?.product?.is_returnable ??
      selectedItem?.product?.isReturnable ??
      selectedItem?.product_details?.is_returnable ??
      selectedItem?.product_details?.isReturnable ??
      selectedItem?.product_details?.product?.is_returnable ??
      selectedItem?.product_details?.product?.isReturnable ??
      product?.is_returnable ??
      product?.isReturnable ??
      product?.product?.is_returnable ??
      product?.product?.isReturnable ??
      0;

    const isReturnableFlag = (() => {
      if (isReturnableRaw === true) return true;
      if (isReturnableRaw === false) return false;
      const asStr = isReturnableRaw != null ? String(isReturnableRaw).trim().toLowerCase() : "";
      if (asStr === "1" || asStr === "true" || asStr === "yes") return true;
      if (asStr === "0" || asStr === "false" || asStr === "no" || asStr === "") return false;
      const asNum = Number(isReturnableRaw);
      return !Number.isNaN(asNum) && asNum === 1;
    })();

    const deliveryTimeDays = Number(
      product?.delivery_time ?? product?.deliveryTime ?? selectedItem?.delivery_time ?? 0
    );

    const parseDeliveredAtDate = (value: unknown): Date | null => {
      if (!value) return null;
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? null : d;
    };

    // iOS uses `deliveredAt` (from `delivered_at`). No fallback to `delivery_datetime`.
    const deliveredAtDate = parseDeliveredAtDate(selectedItem.delivered_at ?? null);

    const isReturnExpired = (() => {
      if (!deliveredAtDate) return true;
      const days = Number.isFinite(deliveryTimeDays) ? deliveryTimeDays : 0;
      const expiryDate = new Date(deliveredAtDate.getTime() + days * 24 * 60 * 60 * 1000);
      // iOS: return Date() > expiryDate
      return Date.now() > expiryDate.getTime();
    })();

    const itemStatusRaw = selectedItem.status ?? selectedItem.order_status ?? selectedItem.orderStatus ?? "";
    const itemStatusNormalized = String(itemStatusRaw).toLowerCase().replace(/[_\s-]/g, "");
    // iOS check is `status == .delivered`, but API sometimes returns "completed".
    const isDelivered =
      itemStatusNormalized === "delivered" ||
      itemStatusNormalized === "completed" ||
      itemStatusNormalized.includes("delivered");

    const deliveredOnText = deliveredAtDate ? formatReturnDate(deliveredAtDate) : "";
    const expiryText = deliveredAtDate
      ? formatReturnDate(
        new Date(deliveredAtDate.getTime() + (Number.isFinite(deliveryTimeDays) ? deliveryTimeDays : 0) * 24 * 60 * 60 * 1000)
      )
      : "";

    // Message priority: same as your mobile snippet
    if (isFree) {
      return { canReturn: false, canExchange: false, deliveredOn: "", returnMessage: "Free items are not returnable" };
    }

    if (!isReturnableFlag) {
      return { canReturn: false, canExchange: false, deliveredOn: "", returnMessage: "This item is not returnable" };
    }

    if (isReturnExpired) {
      return { canReturn: false, canExchange: false, deliveredOn: deliveredOnText, returnMessage: "Return period has expired" };
    }

    if (!isDelivered) {
      return { canReturn: false, canExchange: false, deliveredOn: "", returnMessage: "This item is not returnable" };
    }

    return {
      canReturn: true,
      canExchange: true,
      deliveredOn: deliveredOnText,
      returnMessage: expiryText ? `This item is returnable till ${expiryText}` : "This item is not returnable",
    };
  }, [orderItems, selectedOrderItemIndex, formatReturnDate]);

  // Backend may return order_type at order level ("normal") and at item level ("quick"); treat "quick" and "quick_delivery" the same
  const isQuickDelivery = React.useMemo(() => {
    const normalize = (v: unknown) => (v ?? "").toString().toLowerCase();
    const isQuick = (type: string) => type === "quick" || type === "quick_delivery";

    if (orderData) {
      const orderType = normalize(orderData.order_type ?? orderData.orderType ?? orderData.channel ?? "");
      if (isQuick(orderType)) return true;
    }
    // Fallback: check item-level order_type (API can have order_type "normal" at order level but "quick" on items)
    if (orderItems?.length) {
      const hasQuickItem = orderItems.some(
        (item: any) => isQuick(normalize(item.order_type ?? item.orderType ?? ""))
      );
      if (hasQuickItem) return true;
    }
    return false;
  }, [orderData, orderItems]);

  const isOrderDelivered = React.useMemo(() => {
    const raw = (effectiveOrderStatus || "").toString().toLowerCase();
    const norm = raw.replace(/[_\s-]/g, "");
    return (
      norm === "delivered" ||
      norm === "completed" ||
      norm.includes("delivered") ||
      norm.includes("completed")
    );
  }, [effectiveOrderStatus]);

  // Fetch driver info from API
  const {
    data: driverResponse,
    isLoading: isLoadingDriver,
    refetch: refetchDriverInfo,
  } = useGetDriverInfoQuery(
    { orderId: orderNumericId || "" },
    { skip: !orderNumericId || !isQuickDelivery || isOrderDelivered }
  );

  // Extract driver data - API returns { driver: {...}, vehicle: {...} }
  const driverData = React.useMemo(() => {
    if (!driverResponse) return null;
    // Check if API returned error (driver not assigned)
    if (driverResponse.success === false) {
      return null;
    }
    const response = driverResponse.data as any;
    if (!response) return null;
    
    // API response structure: { driver: {...}, vehicle: {...} }
    // Return the full response object so we can access both driver and vehicle
    if (response.driver || response.vehicle) {
      return response;
    }
    
    // Fallback for other possible structures
    if (response.data?.driver || response.data?.vehicle) {
      return response.data;
    }
    
    return null;
  }, [driverResponse]);

  // Get bookingId from order ID (extract numeric part from order ID like #536 -> "536")
  const bookingId = React.useMemo(() => {
    if (bookingIdFromQuery) {
      const normalizedQueryBookingId = String(bookingIdFromQuery).replace(/[^0-9]/g, "");
      return normalizedQueryBookingId || String(bookingIdFromQuery);
    }
    if (!orderNumericId) return null;
    // Extract numeric part from order ID
    const numericId = String(orderNumericId).replace(/[^0-9]/g, '');
    return numericId || String(orderNumericId);
  }, [orderNumericId, bookingIdFromQuery]);

  React.useEffect(() => {
    if (!shouldAutoOpenChat || hasAutoOpenedChat || !bookingId) return;
    setOpenChat(true);
    setHasAutoOpenedChat(true);
  }, [shouldAutoOpenChat, hasAutoOpenedChat, bookingId]);

  // Map points: from socket payload { destination, currentLocation } or order/address as fallback
  const initialDest = {
    latitude: addressData?.latitude ?? orderData?.latitude ?? "30.713102",
    longitude: addressData?.longitude ?? orderData?.longitude ?? "76.7094125",
  };
  const [mapDestination, setMapDestination] = React.useState(initialDest);
  const [mapCurrentLocation, setMapCurrentLocation] = React.useState<[number, number]>([76.7094145, 30.7130983]);

  React.useEffect(() => {
    if (addressData?.latitude != null || orderData?.latitude != null) {
      setMapDestination({
        latitude: String(addressData?.latitude ?? orderData?.latitude ?? "30.713102"),
        longitude: String(addressData?.longitude ?? orderData?.longitude ?? "76.7094125"),
      });
    }
  }, [addressData?.latitude, addressData?.longitude, orderData?.latitude, orderData?.longitude]);


  const handleLiveTracking = React.useCallback((data: any) => {
    // Full payload: { destination: { latitude, longitude }, currentLocation: { type, coordinates } }
    if (data?.destination?.latitude != null && data?.destination?.longitude != null) {
      setMapDestination({
        latitude: String(data.destination.latitude),
        longitude: String(data.destination.longitude),
      });
    }
    if (data?.currentLocation?.coordinates && Array.isArray(data.currentLocation.coordinates) && data.currentLocation.coordinates.length >= 2) {
      const [lng, lat] = data.currentLocation.coordinates;
      setMapCurrentLocation([Number(lng), Number(lat)]);
    } else {
      // Fallback: top-level lat/lng or coordinates
      const lng = data?.longitude ?? data?.lng ?? data?.coordinates?.[0];
      const lat = data?.latitude ?? data?.lat ?? data?.coordinates?.[1];
      if (typeof lat === "number" && typeof lng === "number") {
        setMapCurrentLocation([lng, lat]);
      }
    }
  }, []);

  const handleOrderStatusChange = React.useCallback(
    (data: any) => {
      const orderStatusValue = data?.order_status ?? data?.status ?? data?.orderStatus ?? null;
      const deliveryStatusValue = data?.delivery_status ?? data?.deliveryStatus ?? null;
      if (orderStatusValue) {
        setSocketOrderStatus(orderStatusValue);
        setSocketStatusUpdatedAt(new Date());
      }
      if (deliveryStatusValue) {
        setSocketDeliveryStatus(deliveryStatusValue);
      }
      // Refetch order details and driver info so UI (map + driver card) stay in sync
      refetch();
      refetchDriverInfo();
      if (orderStatusValue || deliveryStatusValue) {
        const statusMessage = getSocketStatusToastMessage(
          orderStatusValue,
          deliveryStatusValue,
        );
        if (statusMessage) {
          toast.success(statusMessage, { icon: "✅", duration: 2000 });
        }
      }
    },
    [refetch, refetchDriverInfo]
  );

  const { isConnected } = useDriverSocket({
    bookingId,
    enabled: !!bookingId,
    onLiveTracking: handleLiveTracking,
    onOrderStatusChange: handleOrderStatusChange,
  });

  // Clear socket status when viewing a different order
  React.useEffect(() => {
    setSocketOrderStatus(null);
    setSocketDeliveryStatus(null);
    setSocketStatusUpdatedAt(null);
  }, [orderId]);

  // Log socket connection status so we can confirm socket is active on this page
  React.useEffect(() => {
    if (bookingId) {
    }
  }, [bookingId, isConnected]);

  const handleCancelClick = () => {
    if (!selectedOrderItemId) {
      toast.error("Order item not found. Please try again.");
      return;
    }
    setOpen1(true);
  };

  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();
  const [cancelReturn, { isLoading: isCancellingReturn }] = useCancelReturnMutation();

  // Check if there's an active return request
  const hasActiveReturnRequest = React.useMemo(() => {
    // Check mode query param
    if (mode && (mode.toLowerCase() === "return_requested" || mode.toLowerCase() === "returnrequested")) {
      return true;
    }
    // Check order data for return request status
    const primaryItem = orderItems[0];
    const itemStatus = (primaryItem?.status || primaryItem?.order_status || "").toLowerCase();
    const orderStatus = (orderData?.status || orderData?.order_status || "").toLowerCase();
    return itemStatus.includes("return_requested") || itemStatus.includes("returnrequested") ||
           orderStatus.includes("return_requested") || orderStatus.includes("returnrequested");
  }, [mode, orderItems, orderData]);

  const handleCancelReturn = React.useCallback(async () => {
    if (!selectedOrderItemId) {
      toast.error("Order item not found. Please try again.");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel the return request?")) {
      return;
    }

    try {
      const res = await cancelReturn({
        orderItemId: selectedOrderItemId,
        orderId: orderNumericId,
      }).unwrap();

      toast.success(res?.message || "Return request cancelled successfully");
      await refetch();
      // Remove the return_requested mode from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("mode");
      router.replace(newUrl.pathname + newUrl.search);
    } catch (error: any) {
      const message = error?.data?.message || error?.message || "Failed to cancel return request";
      toast.error(message);
    }
  }, [selectedOrderItemId, orderNumericId, cancelReturn, refetch, router]);

  const handleReorder = React.useCallback(async () => {
    if (!orderData || orderItems.length === 0) {
      toast.error("Order items not found. Please try again.");
      return;
    }

    try {
      // Get items to reorder - if multiple items, add all of them
      const itemsToReorder = orderItems.length > 1 ? orderItems : [orderItems[selectedOrderItemIndex]];

      // store_id removed/commented as it is no longer required in the application
      // // Extract store_id from orderData or first item
      // const storeId = orderData.store_id || orderData.storeId || itemsToReorder[0]?.store_id || itemsToReorder[0]?.storeId;
      //
      // if (!storeId) {
      //   toast.error("Store information not found. Please try again.");
      //   return;
      // }

      // Add each item to cart
      const addPromises = itemsToReorder.map(async (item: any) => {
        const product = item.product || item.product_details || item;
        const variation = item.variation || item.product_variation || {};

        // Extract product_id
        const productId = product?.product_id || product?.id || item.product_id || item.productId;

        // Extract variation_id (can be null)
        const variationId = variation?.id || variation?.variation_id || item.variation_id || item.variationId || null;

        // Extract quantity
        const qty = item.qty || item.quantity || 1;

        if (!productId) {
          throw new Error(`Product ID not found for item`);
        }

        const deliveryChannel = getDeliveryChannel(searchParams);
        return addToCart({
          product_id: productId,
          variation_id: variationId,
          qty: Number(qty),
          // store_id removed/commented as it is no longer required in the application
          // store_id: Number(storeId),
          channel: deliveryChannel,
        }).unwrap();
      });

      await Promise.all(addPromises);

      toast.success(itemsToReorder.length > 1
        ? `${itemsToReorder.length} items added to cart successfully!`
        : "Item added to cart successfully!");

      // Redirect to cart page
      router.push("/cart?entry=nav");
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || "Failed to add items to cart. Please try again.");
    }
  }, [orderData, orderItems, selectedOrderItemIndex, addToCart, router]);

  if (isLoading) {
    return (
      <div className="accountOrdersDetail_page">
        <div className="s_head flex border_none hd_6">
          <div className="skeleton_shimmer order_detail_skeleton_title" />
          <div className="rt">
            <div className="btn_flex">
              <div className="skeleton_shimmer order_detail_skeleton_icon_btn" />
              <div className="skeleton_shimmer order_detail_skeleton_button" />
            </div>
          </div>
        </div>

        <div className="grey_box orderDetail_box">
          <div className="skeleton_shimmer order_detail_skeleton_subtitle" />
          <div className="orderBox_single">
            <figure>
              <div className="skeleton_shimmer order_detail_skeleton_product_image" />
            </figure>
            <div className="info_rt">
              <div className="skeleton_shimmer order_detail_skeleton_product_title" />
              <div className="skeleton_shimmer order_detail_skeleton_order_id" />
              <ul>
                <li>
                  <div className="skeleton_shimmer order_detail_skeleton_meta" />
                </li>
                <li>
                  <div className="skeleton_shimmer order_detail_skeleton_meta_short" />
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grey_box addressDetail_box">
          <div className="skeleton_shimmer order_detail_skeleton_section_title" />
          <div className="addressBox_single">
            <div className="skeleton_shimmer order_detail_skeleton_address_type" />
            <ul>
              <li>
                <div className="skeleton_shimmer order_detail_skeleton_address_line" />
              </li>
              <li>
                <div className="skeleton_shimmer order_detail_skeleton_address_line" />
              </li>
            </ul>
          </div>

          <div className="tracking_list">
            <div className="tracking_list_mn">
              <div className="tracking_lt">
                <div className="skeleton_shimmer order_detail_skeleton_section_title" />
                <ul className="track_ul">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <li key={index}>
                      <div className="skeleton_shimmer order_detail_skeleton_tracking_item" />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mapouter">
                <div className="skeleton_shimmer order_detail_skeleton_map" />
              </div>
            </div>
          </div>
        </div>

        <div className="grey_box receiptDetail_box">
          <figure>
            <div className="skeleton_shimmer order_detail_skeleton_receipt_icon" />
          </figure>
          <div className="skeleton_shimmer order_detail_skeleton_receipt_text" />
        </div>

        <div className="grey_box paymentDetail_box">
          <div className="skeleton_shimmer order_detail_skeleton_section_title" />
          <ul>
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index}>
                <div className="skeleton_shimmer order_detail_skeleton_payment_item" />
              </li>
            ))}
          </ul>
        </div>

        <div className="btn_flex mt_20">
          <div className="skeleton_shimmer order_detail_skeleton_action_button" />
          <div className="skeleton_shimmer order_detail_skeleton_action_button" />
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="accountOrdersDetail_page">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" flexDirection="column" gap={2}>
          <p>Failed to load order details. Please try again.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Box>
      </div>
    );
  }

  return (
    <>
      <div className="accountOrdersDetail_page">
        <div className="s_head flex border_none hd_6">
          <h2>Order Details</h2>
          <div className="rt">
            <div className="btn_flex">
              <Button className="icon_btn">
                <img src="/images/share_icon.svg" alt="Icon" />
              </Button>
              <Button onClick={() => router.push("/account/help-center")}>
                Help
              </Button>
            </div>
          </div>
        </div>

        <div className="grey_box orderDetail_box">
          {orderItems.length > 1 ? (
            <>
              <h3>{orderItems.length} Items</h3>
              <RadioGroup
                value={String(selectedOrderItemIndex)}
                aria-labelledby="demo-radio-buttons-group-label"
                name="radio-buttons-group"
                onChange={(event) => setSelectedOrderItemIndex(Number(event.target.value))}
              >
                {orderItems.map((item: any, index: number) => {
                  const product = item.product || item.product_details || item;
                  const variation = item.variation || item.product_variation || {};
            const variantLabel = (() => {
              const attrs = Array.isArray(variation?.variation_attributes)
                ? variation.variation_attributes
                : [];
              const values = attrs
                .map((a: any) => {
                  const value =
                    a?.attribute_option?.display_value ??
                    a?.attributeOption?.display_value ??
                    a?.display_value ??
                    a?.value ??
                    a?.option_value ??
                    a?.option ??
                    "";
                  return String(value || "").trim();
                })
                .filter(Boolean);
              if (values.length > 0) return values.join(" - ");
              if (variation?.name != null && String(variation.name).trim() !== "")
                return String(variation.name).trim();
              return "";
            })();

                  // Get image using helper function
                  const productImage = getProductImage(item, product, variation);

                  // Get product name from multiple possible locations
                  const productName = product.name
                    || product.product_name
                    || product.title
                    || item.product_name
                    || item.name
                    || item.title
                    || "Product";
                  const hasProductLink = !!getProductIdFromOrderItem(item);

                  return (
                    <FormControlLabel
                      key={index}
                      value={String(index)}
                      control={<Radio />}
                      label={
                        <div className="orderBox_single">
                          <figure>
                            <img
                              src={productImage}
                              alt={productName}
                              style={{ cursor: hasProductLink ? "pointer" : "default" }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goToProductDetail(item);
                              }}
                            />
                          </figure>
                          <div className="info_rt">
                            <h4
                              style={{ cursor: hasProductLink ? "pointer" : "default" }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goToProductDetail(item);
                              }}
                            >
                              {productName}
                            </h4>
                            <p>Order ID #{orderData.id || orderData.order_id || orderId || "N/A"}</p>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "6px",
                                minHeight: "20px",
                                padding: "2px 10px",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: 500,
                                lineHeight: 1.2,
                                backgroundColor: "#fff",
                                border: "1px solid color-mix(in srgb, var(--commerce-primary) 5%, transparent)",
                                color: "var(--commerce-primary, #d91b76)",
                              }}
                            >
                              {getStatusLabelForOrderItem(item)}
                            </span>
                            <ul>
                              {variantLabel && (
                                <li>
                                  Variant: <strong>{variantLabel}</strong>
                                </li>
                              )}
                              <li>Qty: <strong>{item.qty || item.quantity || 1}</strong></li>
                              {item.total === 0 && (
                                <li>
                                  <strong
                                    style={{
                                      backgroundColor: 'var(--commerce-primary, #d91b76)',
                                      color: '#fff',
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                      display: 'inline-block',
                                    }}
                                  >
                                    Free
                                  </strong>
                                </li>
                              )}
                            </ul>
                            
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </RadioGroup>
            </>
          ) : (
            <>
              <h3>{orderItems.length} item{orderItems.length !== 1 ? 's' : ''}</h3>
              {orderItems.length > 0 ? (
                orderItems.map((item: any, index: number) => {
                  const product = item.product || item.product_details || item;
                  const variation = item.variation || item.product_variation || {};
                  const variantLabel = (() => {
                    const attrs = Array.isArray(variation?.variation_attributes)
                      ? variation.variation_attributes
                      : [];
                    const values = attrs
                      .map((a: any) => {
                        const value =
                          a?.attribute_option?.display_value ??
                          a?.attributeOption?.display_value ??
                          a?.display_value ??
                          a?.value ??
                          a?.option_value ??
                          a?.option ??
                          "";
                        return String(value || "").trim();
                      })
                      .filter(Boolean);
                    if (values.length > 0) return values.join(" - ");
                    if (variation?.name != null && String(variation.name).trim() !== "")
                      return String(variation.name).trim();
                    return "";
                  })();

                  // Get image using helper function
                  const productImage = getProductImage(item, product, variation);

                  // Get product name from multiple possible locations
                  const productName = product.name
                    || product.product_name
                    || product.title
                    || item.product_name
                    || item.name
                    || item.title
                    || "Product";
                  const hasProductLink = !!getProductIdFromOrderItem(item);

                  return (
                    <div key={index} className="orderBox_single">
                      <figure>
                        <img
                          src={productImage}
                          alt={productName}
                          style={{ cursor: hasProductLink ? "pointer" : "default" }}
                          onClick={() => goToProductDetail(item)}
                        />
                      </figure>
                      <div className="info_rt">
                        <h4
                          style={{ cursor: hasProductLink ? "pointer" : "default" }}
                          onClick={() => goToProductDetail(item)}
                        >
                          {productName}
                        </h4>
                        <p>Order ID #{orderData.id || orderData.order_id || orderId || "N/A"}</p>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "6px",
                            minHeight: "20px",
                            padding: "2px 10px",
                            borderRadius: "5px",
                            fontSize: "11px",
                            fontWeight: 500,
                            lineHeight: 1.2,
                            backgroundColor: "#fff",
                            border: "1px solid color-mix(in srgb, var(--commerce-primary) 5%, transparent)",
                            color: "var(--commerce-primary, #d91b76)",
                          }}
                        >
                          {getStatusLabelForOrderItem(item)}
                        </span>
                          <ul>
                          {variantLabel && (
                            <li>
                              Variant: <strong>{variantLabel}</strong>
                            </li>
                          )}
                          <li>Qty: <strong>{item.qty || item.quantity || 1}</strong></li>
                          {item.total === 0 && (
                            <li>
                              <strong
                                style={{
                                  backgroundColor: 'var(--commerce-primary, #d91b76)',
                                  color: '#fff',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  display: 'inline-block',
                                }}
                              >
                                Free
                              </strong>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="orderBox_single">
                  <figure>
                    <img src="/images/placeholder.png" alt="Icon" />
                  </figure>
                  <div className="info_rt">
                    <h4>Product</h4>
                    <p>Order ID #{orderData.id || orderData.order_id || orderId || "N/A"}</p>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "6px",
                        minHeight: "20px",
                        padding: "2px 10px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 500,
                        lineHeight: 1.2,
                        backgroundColor: "#fff",
                        border: "1px solid color-mix(in srgb, var(--commerce-primary) 5%, transparent)",
                        color: "var(--commerce-primary, #d91b76)",
                      }}
                    >
                      {displayStatusLabel}
                    </span>
                    <ul>
                      <li>Qty: <strong>1</strong></li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grey_box addressDetail_box">
          <h3>DELIVERY ADDRESS</h3>
          <div className="addressBox_single">
            <p>
              <strong>{addressData?.address_type?.toUpperCase()}</strong>
            </p>
            {(() => {
              const receiverName =
                addressData?.name ||
                addressData?.full_name ||
                addressData?.customer_name ||
                addressData?.user_name ||
                `${addressData?.first_name || ""} ${addressData?.last_name || ""}`.trim() ||
                orderData?.name ||
                orderData?.full_name ||
                "";
              if (!receiverName) return null;
              return (
                <p style={{ fontWeight: 600, marginTop: "6px" }}>{receiverName}</p>
              );
            })()}
            <ul>
              <li>
                <img src="/images/call_icon1.svg" alt="Icon" />{" "}
                {formatAddressPhone(
                  addressData?.phone || orderData?.phone || addressData?.phone_number || orderData?.phone_number,
                  addressData?.phone_code || orderData?.phone_code,
                  addressData?.mobile || orderData?.mobile || addressData?.mobile_number || orderData?.mobile_number,
                ) || "N/A"}
              </li>
              <li>
                <img src="/images/location_icon1.svg" alt="Icon" />{" "}
                {(() => {
                  // Try addressData first, then fallback to orderData
                  const data = addressData || orderData;
                  if (!data) return "Address not available";

                  // Build address from available fields
                  const mainAddress = data.address || data.full_address || data.address1 || data.address_line1 || data.street || '';

                  if (mainAddress) {
                    const addressParts = [
                      mainAddress,
                      data.address1 !== mainAddress ? data.address1 : null,
                      data.landmark
                    ].filter(Boolean).join(' ');

                    const locationParts = [
                      data.city,
                      data.state,
                      data.postal_code || data.pincode || data.zip_code,
                      data.country,
                    ].filter(Boolean).join(', ');
                    return locationParts ? `${addressParts}, ${locationParts}` : addressParts;
                  }

                  return "Address not available";
                })()}
              </li>
            </ul>
          </div>

          {(() => {
            // Only show map and tracking for quick delivery orders (order_type "quick" or "quick_delivery")
            if (!isQuickDelivery) return null;

            // Check if order is cancelled, returned, or failed delivery - normalize status for comparison
            const normalizedStatus = (displayStatus || '').toLowerCase().replace(/[_\s-]/g, '');
            const normalizedMode = (mode || '').toLowerCase().replace(/[_\s-]/g, '');
            const normalizedSocketOrder = (socketOrderStatus || '').toLowerCase().replace(/[_\s-]/g, '');
            const normalizedSocketDelivery = (socketDeliveryStatus || '').toLowerCase().replace(/[_\s-]/g, '');

            const isCancelled = normalizedStatus === 'cancelled' || normalizedMode === 'cancelled';
            const isReturned = normalizedStatus === 'returned' ||
                               normalizedStatus === 'returnrequested' ||
                               normalizedStatus === 'return_requested' ||
                               normalizedStatus.includes('return') ||
                               normalizedMode === 'returned' ||
                               normalizedMode === 'returnrequested' ||
                               normalizedMode === 'return_requested' ||
                               normalizedMode.includes('return');

            // Hide tracking when delivery has definitively failed
            const isFailedDelivery =
              normalizedStatus === 'faileddelivery' ||
              normalizedStatus === 'deliveryfailed' ||
              normalizedStatus.includes('failed') ||
              normalizedSocketOrder === 'faileddelivery' ||
              normalizedSocketOrder === 'deliveryfailed' ||
              normalizedSocketOrder.includes('failed') ||
              normalizedSocketDelivery === 'faileddelivery' ||
              normalizedSocketDelivery === 'deliveryfailed' ||
              normalizedSocketDelivery.includes('failed');

            // Don't show tracking history for cancelled, returned, or failed delivery orders
            if (isCancelled || isReturned || isFailedDelivery) {
              return null;
            }

            return (
              <div className="tracking_list">
                <div className="tracking_list_mn">
                  <div className="tracking_lt">
                    <h3>Tracking History</h3>
                    <ul className="track_ul">
                      {displayTrackingHistory.map((step, index) => (
                        <li key={index} className={step.isCompleted ? "active" : ""}>
                          <p>
                            {step.description} {step.date && <span>{formatDate(step.date)}</span>}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
               {driverData?.driver &&   <div className="mapouter">
                    <div className="gmap_canvas">
                      <GoogleMap
                        destination={mapDestination}
                        currentLocation={{ type: "Point", coordinates: mapCurrentLocation }}
                      />
                      <span className="tag">{deliveryStatusLabel}</span>
                    </div>
                  </div>}
                </div>
              </div>
            );
          })()}

          {(() => {
            // Normal delivery only: show 5-step timeline (Order Placed → … → Delivered), updated by socket order_status_change
            if (isQuickDelivery) return null;

            const normalizedStatus = (displayStatus || "").toLowerCase().replace(/[_\s-]/g, "");
            const normalizedMode = (mode || "").toLowerCase().replace(/[_\s-]/g, "");
            const normalizedSocketOrder = (socketOrderStatus || "").toLowerCase().replace(/[_\s-]/g, "");
            const normalizedSocketDelivery = (socketDeliveryStatus || "").toLowerCase().replace(/[_\s-]/g, "");

            const isCancelled = normalizedStatus === "cancelled" || normalizedMode === "cancelled";
            const isReturned =
              normalizedStatus === "returned" ||
              normalizedStatus === "returnrequested" ||
              normalizedStatus === "return_requested" ||
              normalizedStatus.includes("return") ||
              normalizedMode === "returned" ||
              normalizedMode === "returnrequested" ||
              normalizedMode === "return_requested" ||
              normalizedMode.includes("return");

            const isFailedDelivery =
              normalizedStatus === "faileddelivery" ||
              normalizedStatus === "deliveryfailed" ||
              normalizedStatus.includes("failed") ||
              normalizedSocketOrder === "faileddelivery" ||
              normalizedSocketOrder === "deliveryfailed" ||
              normalizedSocketOrder.includes("failed") ||
              normalizedSocketDelivery === "faileddelivery" ||
              normalizedSocketDelivery === "deliveryfailed" ||
              normalizedSocketDelivery.includes("failed");

            if (isCancelled || isReturned || isFailedDelivery) return null;

            return (
              <div className="tracking_list">
                <div className="tracking_list_mn">
                  <div className="tracking_lt">
                    <h3>Tracking History</h3>
                    <ul className="track_ul">
                      {normalDeliverySteps.map((step, index) => (
                        <li key={index} className={step.isCompleted ? "active" : ""}>
                          <p>
                            {step.label}
                            {step.date && <span>{formatDate(step.date)}</span>}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* {(orderStatus === "Confirmed" || orderStatus === "Shipped") && orderData?.driver && (
          <>
            <div className="grey_box driverDetail_box">
              <div className="driver_info">
                <figure>
                  <img src={orderData.driver.image || orderData.driver.avatar || "/images/dummy_user.png"} alt="Driver" />
                  <figcaption>
                    <StarRoundedIcon /> {orderData.driver.rating || 4.5}
                  </figcaption>
                </figure>
                <div className="info">
                  <h3>
                    <img src="/images/verified_driver_icon.svg" alt="Icon" />{" "}
                    {orderData.driver.name || orderData.driver.driver_name || "Driver"}
                  </h3>
                  <p>{orderData.driver.vehicle || orderData.driver.vehicle_name || "Vehicle"}</p>
                  <p className="big">{orderData.driver.vehicle_number || orderData.driver.license_plate || "N/A"}</p>
                </div>
              </div>
              <div className="btn_flex">
                <Button
                  className="icon_btn"
                  onClick={() => window.location.href = `tel:${orderData.driver.phone || orderData.driver.phone_number}`}
                >
                  <img src="/images/call_filled_icon.svg" alt="Icon" />
                </Button>
                <Button
                  className="send"
                  onClick={() => router.push("/account/chat/")}
                >
                  Send a message
                </Button>
              </div>
            </div>
          </>
        )} */}

        {/* Driver Section - only for quick delivery (order_type quick or quick_delivery) */}
        {(() => {
          // Only show driver info for quick delivery orders
          if (!isQuickDelivery) return null;
          // Don't show driver info after delivery is completed
          if (isOrderDelivered) return null;

          // Check if order is cancelled or returned - normalize status for comparison
          const normalizedStatus = (displayStatus || '').toLowerCase().replace(/[_\s-]/g, '');
          const normalizedMode = (mode || '').toLowerCase().replace(/[_\s-]/g, '');
          const isCancelled = normalizedStatus === 'cancelled' || normalizedMode === 'cancelled';
          const isReturned = normalizedStatus === 'returned' ||
                             normalizedStatus === 'returnrequested' ||
                             normalizedStatus === 'return_requested' ||
                             normalizedStatus.includes('return') ||
                             normalizedMode === 'returned' ||
                             normalizedMode === 'returnrequested' ||
                             normalizedMode === 'return_requested' ||
                             normalizedMode.includes('return');

          // Don't show driver section for cancelled or returned orders
          if (isCancelled || isReturned) {
            return null;
          }

          // Only show driver section if driver is assigned
          if (!driverData) {
            return null;
          }

          // Extract driver information from API response structure
          const driver = driverData.driver || {};
          const vehicle = driverData.vehicle || {};
          
          // Driver name: firstName + lastName
          const driverName = driver.firstName 
            ? `${driver.firstName}${driver.lastName ? ` ${driver.lastName}` : ''}`.trim()
            : driver.name || driver.driver_name || "Driver";
          
          // Driver image
          const driverImage = driver.image || driver.avatar || driver.profile_image || "/images/dummy_user.png";
          
          // Driver rating - use avgRating from driver object
          const driverRating = driver.avgRating !== undefined && driver.avgRating !== null 
            ? driver.avgRating 
            : driver.rating || 4.5;
          
          // Vehicle type from vehicle.vehicleId.type or vehicle.vehicleId.type_lng[0].value
          const vehicleType = vehicle.vehicleId?.type_lng?.[0]?.value 
            || vehicle.vehicleId?.type 
            || vehicle.type 
            || driver.vehicle 
            || "Vehicle";
          
          // Vehicle registration number - from driver.vehicleRegistrationNo or vehicle.vehicleRegistrationNo
          const vehicleNumber = driver.vehicleRegistrationNo 
            || vehicle.vehicleRegistrationNo 
            || vehicle.license_plate 
            || vehicle.registration_number 
            || "N/A";
          
          // Driver phone
          const driverPhone = driver.phone || driver.phone_number || driver.mobile || null;
          
          return (
            <div className="grey_box driverDetail_box" style={{
              marginTop: '20px',
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: '#f9f9f9',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '16px',
              }}>
                <figure style={{
                  margin: 0,
                  position: 'relative',
                  width: '60px',
                  height: '60px',
                }}>
                  <img 
                    src={driverImage} 
                    alt={driverName} 
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '-5px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--commerce-primary)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}>
                    <StarRoundedIcon sx={{ fontSize: '14px' }} />
                    {driverRating}
                  </div>
                </figure>
                <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <img 
                    src="/images/verified_driver_icon.svg" 
                    alt="Verified" 
                    style={{ width: '16px', height: '16px' }}
                  />
                  <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--commerce-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0,
                    marginBottom: '4px',
                  }}>
                    {driverName}
                  </h3>
                </div>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#333',
                    marginBottom: '2px',
                  }}>
                    {vehicleType}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '16px',
                    color: '#333',
                    fontWeight: '600',
                  }}>
                    {vehicleNumber}
                  </p>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <TextField
                  fullWidth
                  placeholder="Send a message"
                  onClick={() => setOpenChat(true)}
                  onFocus={(e) => {
                    e.target.blur();
                    setOpenChat(true);
                  }}
                  sx={{
                    cursor: 'pointer',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: '#f5f5f5',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--commerce-primary)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--commerce-primary)',
                      },
                    },
                  }}
                />
                <Button
                  className="icon_btn"
                  onClick={() => {
                    if (driverPhone) {
                      window.location.href = `tel:${driverPhone}`;
                    } else {
                      toast("Driver phone number not available");
                    }
                  }}
                  sx={{
                    minWidth: '48px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--commerce-primary)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'var(--commerce-primary-hover)',
                    },
                    '& img': {
                      filter: 'brightness(0) invert(1)',
                    },
                  }}
                >
                  <img src="/images/call_filled_icon.svg" alt="Phone" style={{ width: '20px', height: '20px' }} />
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Receipt Section - Matching Mobile Design */}
        <div className="grey_box receiptDetail_box" style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <figure style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            {/* PAY icon - phone with PAY label, matching mobile design */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'var(--commerce-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '30px',
                  borderRadius: '4px',
                  backgroundColor: '#2F80ED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.15)',
                }}
              >
                <span
                  style={{
                    padding: '2px 5px',
                    backgroundColor: '#A3E635',
                    borderRadius: '3px',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#111827',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  PAY
                </span>
              </div>
            </div>
          </figure>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#000',
              marginBottom: '4px'
            }}>
              Receipt
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#666',
              fontWeight: '400'
            }}>
              Paid by {paymentData?.paymentMode || "online"} payment
            </p>
          </div>
        </div>

        <div className="grey_box paymentDetail_box">
          <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span>Price Details</span>
            <Button
              variant="contained"
              disabled={isDownloadInvoiceDisabled}
              onClick={() => {
                void handleDownloadInvoice();
              }}
              sx={{
                minWidth: "auto",
                px: 2.25,
                py: 0.75,
                minHeight: "36px",
                textTransform: "none",
                borderRadius: "999px",
                fontSize: "13px",
                lineHeight: 1.2,
                fontWeight: 600,
                boxShadow: "none",
                backgroundColor: "var(--commerce-primary, #d91b76)",
                color: "#fff",
                "&:hover": {
                  boxShadow: "none",
                  backgroundColor: "var(--commerce-primary, #d91b76)",
                  filter: "brightness(0.95)",
                },
                "&.Mui-disabled": {
                  opacity: 1,
                  backgroundColor: "#D1D5DB",
                  color: "#6B7280",
                },
              }}
            >
              Download Invoice{isDownloadingInvoice ? "..." : ""}
            </Button>
          </h3>
          <ul>
            <li>
              <span>
                MRP ({totalOrderItemCountForLabel} item{totalOrderItemCountForLabel === 1 ? "" : "s"})
              </span>{" "}
              <strong>
                ₹{" "}
                {formatPriceInr(
                  paymentData?.mrp ?? paymentData?.price ?? "0.00",
                )}
              </strong>
            </li>
            <li>
              <span>Subtotal ({totalOrderItemCountForLabel} item{totalOrderItemCountForLabel === 1 ? "" : "s"})</span>{" "}
              <strong>
                ₹ {formatPriceInr(paymentData?.price ?? "0.00")}
              </strong>
            </li>
            <li>
              <span>Coupon Discount</span>{" "}
              <strong>-₹ {formatPriceInr(paymentData?.discount ?? "0.00")}</strong>
            </li>
            {Number(paymentData?.loyaltyRedemptionAmount ?? 0) > 0 ? (
              <li>
                <span>Loyalty Points</span>{" "}
                <strong>
                  -₹ {formatPriceInr(paymentData?.loyaltyRedemptionAmount ?? "0.00")}
                </strong>
              </li>
            ) : null}
            <li>
              <span>Shipping Fee</span>{" "}
              <strong>₹ {formatPriceInr(orderData?.delivery_charges ?? "0.00")}</strong>
            </li>
            <li>
              <span>Total Amount</span>{" "}
              <strong>
                ₹{" "}
                {formatPriceInr(
                  orderItems.length === 1
                    ? paymentData?.total ?? "0.00"
                    : orderData?.grand_total ?? "0.00"
                )}
              </strong>
            </li>
          </ul>
        </div>

        {/* BUTTON LOGIC BY STATUS */}
        {(() => {
          const selectedLine = orderItems[selectedOrderItemIndex];
          const hideCancelForFreeGift =
            selectedLine != null &&
            (selectedLine.is_free_gift === true || selectedLine.is_free_gift === 1);
          const normalized = (displayStatus || '').toLowerCase().replace(/[_\s-]/g, '');
          // const cancelStatuses = ["confirmed", "processing", "packed", "placed", "orderplaced"]; old
          const cancelStatuses = ["confirmed", "orderplaced"];

          const returnStatuses = ["delivered", "completed"];
          const reorderOnlyStatuses = ["cancelled", "faileddelivery", "deliveryfailed", "returned"];

          // If there's an active return request, show Cancel Order and Cancel Return buttons
          if (hasActiveReturnRequest) {
            // Check if order is in cancellable state (including returnrequested status)
            const isCancellable = cancelStatuses.includes(normalized) || normalized === "returnrequested";
            
            if (isCancellable) {
              if (hideCancelForFreeGift) {
                return null;
              }
              return (
                <div className="btn_group payment_btn mt_20">
                  <Button onClick={handleCancelClick}>Cancel Order</Button>
                  {/* <Button
                    onClick={handleCancelReturn}
                    variant="outlined"
                    disabled={isCancellingReturn}
                  >
                    {isCancellingReturn ? "Cancelling..." : "Cancel Return"}
                  </Button> */}
                </div>
              );
            }
            
            // If order is cancelled but has active return request
            if (normalized === "cancelled") {
              return (
                <div className="btn_group payment_btn mt_20">
                  <Button
                    onClick={handleCancelReturn}
                    variant="outlined"
                    disabled={isCancellingReturn}
                  >
                    {isCancellingReturn ? "Cancelling..." : "Cancel Return"}
                  </Button>
                  <Button
                    onClick={handleReorder}
                    className="bordered_btn"
                    disabled={isAddingToCart}
                  >
                    {isAddingToCart ? "Adding..." : "Reorder"}
                  </Button>
                </div>
              );
            }
          }

          if (cancelStatuses.includes(normalized)) {
            if (hideCancelForFreeGift) {
              return null;
            }
            return (
              <div className="btn_group payment_btn mt_20">
                <Button onClick={handleCancelClick}>Cancel Order</Button>
              </div>
            );
          }
          if (returnStatuses.includes(normalized)) {
            return (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${
                      returnEligibilityForSelectedItem.canReturn
                        ? "var(--commerce-primary)"
                        : "#E5E7EB"
                    }`,
                    background: returnEligibilityForSelectedItem.canReturn
                      ? "var(--commerce-primary-light)"
                      : "#F3F4F6",
                    marginBottom: 16,
                  }}
                >
                  <figure style={{ margin: 0 }}>
                    <img
                      src="/images/easy_return.svg"
                      alt="Return"
                      style={{
                        width: 28,
                        height: 28,
                        display: "block",
                        filter: returnEligibilityForSelectedItem.canReturn ? "none" : "grayscale(1) opacity(0.55)",
                      }}
                    />
                  </figure>
                  <div style={{ flex: 1 }}>
                    {returnEligibilityForSelectedItem.deliveredOn && (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: returnEligibilityForSelectedItem.canReturn ? "var(--commerce-primary, #d91b76)" : "#6B7280",
                          marginBottom: 2,
                        }}
                      >
                        Delivered on {returnEligibilityForSelectedItem.deliveredOn}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: returnEligibilityForSelectedItem.canReturn ? "var(--commerce-primary)" : "#6B7280",
                      }}
                    >
                      {returnEligibilityForSelectedItem.returnMessage}
                    </div>
                  </div>
                </div>

                <div className="btn_group payment_btn mt_20">
                  <Button
                    onClick={() => setOpen(true)}
                    variant="outlined"
                    disabled={!returnEligibilityForSelectedItem.canReturn}
                  >
                    Return Product
                  </Button>

                  {returnEligibilityForSelectedItem.canExchange && (
                    <Button onClick={() => setOpen2(true)} variant="outlined">
                      Exchange Product
                    </Button>
                  )}

                  <Button onClick={handleOpenRatingModal} disabled={open3}>
                    Rate Now
                  </Button>
                  <Button
                    onClick={handleReorder}
                    className="bordered_btn"
                    disabled={isAddingToCart}
                  >
                    {isAddingToCart ? "Adding..." : "Reorder"}
                  </Button>
                </div>
              </>
            );
          }
          if (reorderOnlyStatuses.includes(normalized)) {
            return (
              <div className="btn_group payment_btn mt_20">
                <Button
                  onClick={handleReorder}
                  className="bordered_btn"
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? "Adding..." : "Reorder"}
                </Button>
              </div>
            );
          }
          // Handle returnrequested status when no active return request detected
          if (normalized === "returnrequested") {
            return (
              <div className="btn_group payment_btn mt_20">
                {!hideCancelForFreeGift ? (
                  <Button onClick={handleCancelClick}>Cancel Order</Button>
                ) : null}
                <Button
                  onClick={handleCancelReturn}
                  variant="outlined"
                  disabled={isCancellingReturn}
                >
                  {isCancellingReturn ? "Cancelling..." : "Cancel Return"}
                </Button>
              </div>
            );
          }
          return null;
        })()}
      </div>

      <ReturnOrderModal
        open={open}
        onClose={handleCloseModal}
        setOpen={setOpen}
        orderItemId={selectedOrderItemId}
        orderId={orderNumericId}
        productName={orderItems[selectedOrderItemIndex]?.product_name || orderItems[selectedOrderItemIndex]?.name || "Product"}
        onSuccess={async () => {
          setOverrideStatus("returned");
          await refetch();
        }}
      />

      <ExchangeOrderModal
        open={open2}
        onClose={handleCloseModal2}
        setOpen={setOpen2}
        orderItemId={selectedOrderItemId}
        orderId={orderNumericId}
        productId={selectedProductId}
        productName={selectedProductDetails?.name}
        productSize={selectedProductDetails?.size}
        productQuantity={selectedProductDetails?.quantity}
        productPrice={selectedProductDetails?.price}
        productImage={selectedProductDetails?.image}
        deliveryAddress={formattedDeliveryAddress}
        onSuccess={async () => {
          await refetch();
        }}
      />

      <CancelOrderModal
        open={open1}
        onClose={handleCloseModal1}
        setOpen={setOpen1}
        orderItemId={selectedOrderItemId}
        orderId={orderNumericId}
        onSuccess={async () => {
          setOverrideStatus("cancelled");
          await refetch();
        }}
      />

      <RatingModal
        open={open3}
        onClose={handleCloseModal3}
        setOpen={setOpen3}
        orderItems={orderItems}
        onSuccess={refetch}
      />

      <DriverChatModal
        open={openChat}
        onClose={handleCloseChatModal}
        setOpen={setOpenChat}
        bookingId={bookingId}
        driverData={driverData}
      />
    </>
  );
}

export default AccountOrderDetail;
