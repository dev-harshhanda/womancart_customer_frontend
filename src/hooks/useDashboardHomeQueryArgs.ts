"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDeliveryChannel } from "@/utils/deliveryMode";
import {
  DELIVERY_SELECTION_CHANGED,
  hydrateDeliveryContextForProductRequest,
  readPincodeForProductApi,
  readSelectedLocation,
} from "@/utils/deliveryAddressSync";
import { getDashboardCoordinatesFromStorage } from "@/utils/dashboardGeolocation";

export type DashboardHomeQueryArgs = {
  latitude: number;
  longitude: number;
  type: "quick" | "normal";
  pincode?: string | null;
};

/** Args for `useHomePageQuery` — updates when delivery mode or stored coordinates change. */
export function useDashboardHomeQueryArgs(): DashboardHomeQueryArgs {
  const searchParams = useSearchParams();
  const type = getDeliveryChannel(searchParams);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener(DELIVERY_SELECTION_CHANGED, onChange);
    return () => window.removeEventListener(DELIVERY_SELECTION_CHANGED, onChange);
  }, []);

  return useMemo(() => {
    hydrateDeliveryContextForProductRequest();
    const { latitude, longitude } = getDashboardCoordinatesFromStorage();
    const loc = readSelectedLocation();
    const rawPc = loc?.pincode != null ? String(loc.pincode).trim() : "";
    const pincode =
      rawPc.length > 0 ? rawPc : readPincodeForProductApi() || null;
    return { latitude, longitude, type, pincode };
  }, [type, tick]);
}
