"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  getDeliveryMode,
  setDeliveryModePersisted,
  type DeliveryMode,
} from "@/utils/deliveryMode";

function applyCommerceMode(mode: DeliveryMode) {
  document.documentElement.dataset.commerceMode = mode;
}

export default function CommerceModeSync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = getDeliveryMode(searchParams);

    applyCommerceMode(mode);
    setDeliveryModePersisted(mode);
  }, [searchParams]);

  useEffect(() => {
    const handleStorageChange = () => {
      const currentSearchParams = new URLSearchParams(
        window.location.search,
      );
      const mode = getDeliveryMode(currentSearchParams);

      applyCommerceMode(mode);
      setDeliveryModePersisted(mode);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return null;
}