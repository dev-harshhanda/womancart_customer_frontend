/** Raw order status values from API/socket (order_status_change) */
export const ORDER_STATUS = {
  ORDER_PROCESSING: "order_processing",
  ORDER_PLACED: "order_placed",
  ORDER_CONFIRMED: "order_confirmed",
  IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERY_ATTEMPTED: "delivery_attempted",
  DELIVERED: "delivered",
  FAILED_DELIVERY: "failed_delivery",
  RETURN_REQUESTED: "return_requested",
  RETURN_CONFIRMED: "return_confirmed",
  RETURN_PICKED_UP: "return_picked_up",
  RETURN_IN_TRANSIT: "return_in_transit",
  RETURN_DELIVERED: "return_delivered",
  RETURNED: "returned",
  CANCELLED: "cancelled",
} as const;

/** Human-readable labels for order status (display in Tracking History) */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUS.ORDER_PROCESSING]: "Order is being processed",
  [ORDER_STATUS.ORDER_PLACED]: "Order placed",
  [ORDER_STATUS.ORDER_CONFIRMED]: "Order confirmed",
  [ORDER_STATUS.IN_TRANSIT]: "Order is on the way",
  [ORDER_STATUS.OUT_FOR_DELIVERY]: "Out for delivery",
  [ORDER_STATUS.DELIVERY_ATTEMPTED]: "Delivery attempted",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.FAILED_DELIVERY]: "Delivery failed",
  [ORDER_STATUS.RETURN_REQUESTED]: "Return requested",
  [ORDER_STATUS.RETURN_CONFIRMED]: "Return confirmed",
  [ORDER_STATUS.RETURN_PICKED_UP]: "Return picked up",
  [ORDER_STATUS.RETURN_IN_TRANSIT]: "Return in transit",
  [ORDER_STATUS.RETURN_DELIVERED]: "Return delivered",
  [ORDER_STATUS.RETURNED]: "Returned",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
};

/** Raw delivery status values from API/socket */
export const DELIVERY_STATUS = {
  ACCEPTED: "accepted",
  CANCELLED: "cancelled",
  STARTED: "started",
  ARRIVED_AT_PICKUP: "arrived_at_pickup",
  PICKEDUP: "pickedup",
  ON_THE_WAY: "on_the_way",
  ARRIVED_AT_DESTINATION: "arrived_at_destination",
  DELIVERED: "delivered",
  REJECTED: "rejected",
} as const;

/** Human-readable labels for delivery status (e.g. map tag "At Store") */
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  [DELIVERY_STATUS.ACCEPTED]: "Accepted",
  [DELIVERY_STATUS.CANCELLED]: "Cancelled",
  [DELIVERY_STATUS.STARTED]: "Started",
  [DELIVERY_STATUS.ARRIVED_AT_PICKUP]: "At Store",
  [DELIVERY_STATUS.PICKEDUP]: "Picked up",
  [DELIVERY_STATUS.ON_THE_WAY]: "On the way",
  [DELIVERY_STATUS.ARRIVED_AT_DESTINATION]: "Arrived",
  [DELIVERY_STATUS.DELIVERED]: "Delivered",
  [DELIVERY_STATUS.REJECTED]: "Rejected",
};

export const OrderStatus = {
  confirmed: "Confirmed",
  shipped: "Shipped",
  outForDelivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  deliveryAttempted: "Delivery Attempted",
  failedDelivery: "Delivery Failed",
  returned: "Returned",
  returnRequested: "Return Requested",
  orderPlaced: "Order Placed",
  fromApi(apiStatus: string) {
    const status = (apiStatus || "").toLowerCase().replace(/[_\s-]/g, '');
    switch (status) {
      case "confirmed":
      case "orderconfirmed":
        return this.confirmed;
      case "shipped":
      case "intransit":
      case "onway":
        return this.shipped;
      case "outfordelivery":
        return this.outForDelivery;
      case "delivered":
      case "completed":
        return this.delivered;
      case "cancelled":
        return this.cancelled;
      case "deliveryattempted":
        return this.deliveryAttempted;
      case "faileddelivery":
      case "failed":
        return this.failedDelivery;
      case "returned":
      case "return":
        return this.returned;
      case "return_requested":
      case "returnrequested":
        return this.returnRequested;
      case "orderplaced":
      case "placed":
      case "pending":
        return this.orderPlaced;
      default:
        // Return the original status capitalized if no match found
        return apiStatus.charAt(0).toUpperCase() + apiStatus.slice(1).toLowerCase();
    }
  },
  icon: "shippingbox"
};

/** Human-readable status for socket toasts (matches order list / detail badges). */
export function getSocketStatusToastMessage(
  orderStatusValue?: string | null,
  deliveryStatusValue?: string | null,
): string | null {
  if (orderStatusValue) {
    return OrderStatus.fromApi(String(orderStatusValue));
  }
  if (deliveryStatusValue) {
    const key = String(deliveryStatusValue).toLowerCase();
    return DELIVERY_STATUS_LABELS[key] ?? OrderStatus.fromApi(String(deliveryStatusValue));
  }
  return null;
}