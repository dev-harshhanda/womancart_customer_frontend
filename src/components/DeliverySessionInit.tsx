"use client";

import { useLayoutEffect } from "react";
import { ensureBrowserDeliveryTabSession } from "@/utils/deliveryAddressSync";

/**
 * Run before Header: new browser tab clears saved "Deliver here" / pins (localStorage) and primes
 * GPS; same-tab refresh keeps sessionStorage so the chosen address survives F5.
 */
export default function DeliverySessionInit() {
  useLayoutEffect(() => {
    ensureBrowserDeliveryTabSession();
  }, []);

  return null;
}