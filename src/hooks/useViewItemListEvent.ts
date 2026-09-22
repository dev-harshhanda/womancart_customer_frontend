"use client";

import { useEffect, useRef } from "react";
import { pushEvent, buildGtmItem } from "@/lib/dataLayer";

/**
 * Fires `view_item_list` once per distinct list result (not on every re-render
 * caused by unrelated state changes). Reusable across PLP/homepage/category/
 * collection/brand listing pages — they all render the same `Product` shape.
 */
export function useViewItemListEvent(
  items: any[] | undefined,
  listName: string,
  itemListId?: string,
) {
  const firedKeyRef = useRef<string>("");

  useEffect(() => {
    if (!items || items.length === 0) return;
    const firstId = items[0]?.product_id ?? items[0]?.id ?? "";
    const key = `${listName}:${items.length}:${firstId}`;
    if (firedKeyRef.current === key) return;
    firedKeyRef.current = key;

    pushEvent("view_item_list", {
      item_list_id: itemListId,
      item_list_name: listName,
      items: items.slice(0, 20).map((item) => buildGtmItem(item)),
    });
  }, [items, listName, itemListId]);
}
