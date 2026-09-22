"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withDeliveryModeInUrl } from "@/utils/deliveryMode";

/** Navigate while preserving `mode=quick_delivery` in the URL when active. */
export function useNavigateWithDeliveryMode() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (href: string) => {
      router.push(withDeliveryModeInUrl(href, { searchParams }));
    },
    [router, searchParams],
  );

  const replace = useCallback(
    (href: string) => {
      router.replace(withDeliveryModeInUrl(href, { searchParams }));
    },
    [router, searchParams],
  );

  return { navigate, replace };
}
