/* eslint-disable @next/next/no-img-element */
"use client"
import OrderCard from '@/components/orderCard';
import { Tabs, Tab } from '@mui/material';
import React from 'react'
import { useGetOrdersQuery } from '@/service/order';
import { Box } from '@mui/material';
import { useAppSelector } from '@/lib/hook';
import { getCurrentUser } from '@/lib/slices/authSlice';
import { getFromStorage } from '@/constants/storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import NoOrderFound from '@/components/noOrderFound';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <>{children}</>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

// Helper function to extract image URL from an image object or string
const extractImageUrl = (img: any): string => {
  if (!img) return '';
  if (typeof img === 'string') return img;
  return img.image_url || img.imageUrl || img.url || img.image || img.src || img.path || '';
};

// Helper function to get product image from various possible locations
const getProductImageFromOrder = (item: any, product: any, variation: any): string => {
  // Prefer selected variant image so order card matches purchased color/variant.
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

  // Check for images array on item first
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const imgUrl = extractImageUrl(item.images[0]);
    if (imgUrl) return imgUrl;
  }

  // Check for images array on product
  if (Array.isArray(product?.images) && product.images.length > 0) {
    const imgUrl = extractImageUrl(product.images[0]);
    if (imgUrl) return imgUrl;
  }

  // Check direct fields
  if (item?.image_url) return item.image_url;
  if (item?.image) return item.image;
  if (item?.product_image) return item.product_image;
  if (product?.image_url) return product.image_url;
  if (product?.image) return product.image;
  if (product?.product_image) return product.product_image;

  return "/images/placeholder.png";
};

/** Build add-to-cart lines from order items (same fields as order detail reorder). */
const buildReorderLines = (order: any) => {
  const items = order?.items || order?.order_items || [];
  if (!Array.isArray(items) || items.length === 0) return [];

  const lines: Array<{
    product_id?: number;
    product_kit_id?: number;
    variation_id?: number | null;
    qty: number;
  }> = [];

  for (const item of items) {
    const product = item?.product || item?.product_details || item;
    const variation = item?.variation || item?.product_variation || {};
    const kit = item?.product_kit || item?.kit;
    const qty = Number(item?.qty || item?.quantity || 1) || 1;

    const productKitId =
      kit?.id ??
      kit?.product_kit_id ??
      item?.product_kit_id ??
      null;
    if (productKitId != null && productKitId !== "") {
      lines.push({
        product_kit_id: Number(productKitId),
        variation_id: null,
        qty,
      });
      continue;
    }

    const productId =
      product?.product_id ??
      product?.id ??
      item?.product_id ??
      item?.productId;
    if (!productId) continue;

    const variationIdRaw =
      variation?.id ??
      variation?.variation_id ??
      item?.variation_id ??
      item?.variationId;
    const variationId =
      variationIdRaw != null && variationIdRaw !== ""
        ? Number(variationIdRaw)
        : null;

    lines.push({
      product_id: Number(productId),
      variation_id: Number.isNaN(variationId as number) ? null : variationId,
      qty,
    });
  }

  return lines;
};

const extractOrdersFromResponse = (ordersResponse: any): any[] => {
  if (!ordersResponse) return [];
  const response = ordersResponse as any;

  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.orders)) return response.data.orders;
  if (Array.isArray(response.data?.data)) return response.data.data;
  if (Array.isArray(response.data?.list)) return response.data.list;
  if (Array.isArray(response.orders)) return response.orders;
  if (Array.isArray(response)) return response;
  if (response.data && typeof response.data === 'object') {
    if (Array.isArray(response.data.results)) return response.data.results;
    if (Array.isArray(response.data.items)) return response.data.items;
  }

  return [];
};

const getOrderIdValue = (order: any) =>
  order?.id ?? order?.order_id ?? order?.orderId ?? order?.order_number ?? null;

const normalizeOrderRowsByOrderId = (orders: any[]): any[] => {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const merged = new Map<string, any>();

  orders.forEach((row: any, index: number) => {
    const rawOrderId = getOrderIdValue(row);
    const mergeKey = rawOrderId != null && rawOrderId !== "" ? String(rawOrderId) : `__row__${index}`;
    const rowItemsRaw = row?.items || row?.order_items || [];
    const rowItems = Array.isArray(rowItemsRaw) ? rowItemsRaw : [];
    const fallbackItem = rowItems.length === 0 ? row?.item || row : null;
    const normalizedRowItems = rowItems.length > 0 ? rowItems : fallbackItem ? [fallbackItem] : [];

    if (!merged.has(mergeKey)) {
      merged.set(mergeKey, {
        ...row,
        items: [...normalizedRowItems],
      });
      return;
    }

    const existing = merged.get(mergeKey);
    const existingItemsRaw = existing?.items || existing?.order_items || [];
    const existingItems = Array.isArray(existingItemsRaw) ? existingItemsRaw : [];
    merged.set(mergeKey, {
      ...existing,
      ...row,
      items: [...existingItems, ...normalizedRowItems],
    });
  });

  return Array.from(merged.values());
};

// Helper function to map API order data to OrderCard format.
// Show one card per order id and summarize extra items as "+N".
const mapOrderData = (order: any) => {
  const rawItems = order?.items || order?.order_items || [];
  const items = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : [order?.item || order];

  // Get order ID once (same for all grouped cards)
  const orderId = order?.id || order?.order_id || order?.orderId || order?.order_number;
  const groupedItems = Array.isArray(items) ? items : [];
  if (groupedItems.length === 0) return [];

  return (() => {
    const firstItem = groupedItems[0];
    const product = firstItem?.product || firstItem?.product_details || firstItem;
    const variation = firstItem?.variation || firstItem?.product_variation || {};
    const kit = firstItem?.product_kit || firstItem?.kit || order?.product_kit;
    const orderTypeRaw =
      firstItem?.order_type ??
      firstItem?.orderType ??
      order?.order_type ??
      order?.orderType ??
      order?.channel ??
      order?.type ??
      "";

    const status =
      firstItem?.status ||
      firstItem?.order_status ||
      firstItem?.order_status_name ||
      order?.status ||
      order?.order_status ||
      order?.orderStatus ||
      "Pending";

    const normalizedStatus =
      typeof status === "string" ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";

    // Sum total per grouped shipment card
    const itemLevelPrice = groupedItems.reduce((sum: number, item: any) => {
      const n = Number(item?.total ?? item?.total_amount ?? item?.price ?? 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const fallbackOrderPrice = Number(
      order?.total ??
      order?.total_amount ??
      order?.grand_total ??
      order?.payable_amount ??
      order?.amount ??
      0
    );
    const groupPrice = itemLevelPrice > 0
      ? itemLevelPrice
      : Number.isFinite(fallbackOrderPrice)
        ? fallbackOrderPrice
        : 0;

    const getItemTitle = (item: any) => {
      const itemProduct = item?.product || item?.product_details || item;
      const itemKit = item?.product_kit || item?.kit;
      return (
        itemKit?.kit_name ||
        itemProduct?.name ||
        itemProduct?.product_name ||
        itemProduct?.title ||
        item?.product_name ||
        item?.name ||
        (Number(item?.total ?? item?.price ?? 0) === 0 ? "Free Gift" : "") ||
        "Product"
      );
    };

    const titleList = groupedItems
      .map((item: any) => String(getItemTitle(item) || "").trim())
      .filter(Boolean);
    const primaryTitle = titleList[0] || "Product";
    const totalUnits = groupedItems.reduce((sum: number, item: any) => {
      const qty = Number(item?.qty ?? item?.quantity ?? item?.count ?? 1);
      return sum + (Number.isFinite(qty) && qty > 0 ? qty : 1);
    }, 0);
    const extraCount = Math.max(totalUnits - 1, 0);
    const title = extraCount > 0 ? `${primaryTitle} +${extraCount}` : primaryTitle;

    const baseImage = getProductImageFromOrder(firstItem, product, variation);
    const image = kit?.image || baseImage;

    const ratingsReviews = order?.ratings_reviews || firstItem?.ratings_reviews || [];
    const rating =
      Array.isArray(ratingsReviews) && ratingsReviews.length > 0
        ? ratingsReviews[0]?.rating || null
        : null;

    const reorderItems = buildReorderLines({ items: groupedItems });
    const detailUrl = `/account/orders/detail?id=${orderId}&mode=${normalizedStatus}`;

    return {
      id: `${orderId}`,
      orderId: orderId,
      title,
      productTitles: [title],
      name: title,
      status: normalizedStatus,
      price: groupPrice,
      url: detailUrl,
      image: image,
      order_type: orderTypeRaw,
      forReview: normalizedStatus === "Delivered" || normalizedStatus === "delivered",
      rating:
        rating !== null && rating !== undefined
          ? typeof rating === "number"
            ? rating.toFixed(1)
            : String(rating)
          : undefined,
      reorderItems,
      orderItemId: firstItem?.id ?? firstItem?.order_item_id ?? firstItem?.orderItemId,
      product_id: product?.product_id ?? product?.id ?? firstItem?.product_id,
      shiprocket_shipment_id:
        firstItem?.shiprocket_shipment_id ?? firstItem?.shipment_id ?? undefined,
    };
  })();
};


function AccountOrders() {
  const [value, setValue] = React.useState(0);
  const [isTabChanging, setIsTabChanging] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [limit] = React.useState(10); // 10 records per page
  const [hasReachedLastPage, setHasReachedLastPage] = React.useState(false);
  const [lastValidPage, setLastValidPage] = React.useState<number | null>(null);
  const user = useAppSelector(getCurrentUser);

  // Get userId from user data or storage
  const userId = React.useMemo(() => {
    // Try from Redux user state
    if (user?.id) {
      return user.id.toString();
    } else if (user?._id) {
      return user._id.toString();
    }

    // Try from storage
    const userDataFromStorage = getFromStorage(STORAGE_KEYS.credentials);
    if (userDataFromStorage) {
      try {
        const credentials = JSON.parse(userDataFromStorage);
        const id = credentials?.id || credentials?._id || credentials?.userId || credentials?.user_id;
        if (id) {
          return id.toString();
        }
      } catch (e) { }
    }

    // Try from token (if it contains user info)
    const token = getFromStorage(STORAGE_KEYS.tokenNode);
    if (token) {
      try {
        // JWT tokens sometimes contain user info in payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload?.userId || payload?.user_id || payload?.sub) {
          const id = payload.userId || payload.user_id || payload.sub;
          return id.toString();
        }
      } catch (e) {
        // Not a JWT or can't parse
      }
    }

    return "";
  }, [user]);

  // Determine order type based on selected tab
  const orderType = React.useMemo(() => {
    switch (value) {
      case 1: // Past Orders
        return "completed";
      case 2: // Ongoing Orders
        return "ongoing";
      default: // All Orders
        return undefined; // No type parameter for all orders
    }
  }, [value]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue !== value) {
      setIsTabChanging(true);
    }
    setValue(newValue);
    // Reset to page 1 when switching tabs
    setCurrentPage(1);
    setHasReachedLastPage(false);
    setLastValidPage(null);
  };

  // Fetch orders from API with dynamic page, limit, userId, and type
  const { data: ordersResponse, isLoading, isFetching, error, refetch } = useGetOrdersQuery({
    page: currentPage,
    limit: limit,
    userId: userId || undefined,
    type: orderType,
  });

  React.useEffect(() => {
    if (!isTabChanging) return;
    if (isLoading || isFetching) return;
    const timeout = window.setTimeout(() => {
      setIsTabChanging(false);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [isTabChanging, isLoading, isFetching]);

  const showOrdersLoader = isLoading || isTabChanging;

  React.useEffect(() => {
    // No console.log
  }, [ordersResponse, error, currentPage, limit, userId, orderType, value, user]);

  // Map API response to order format
  const orderData = React.useMemo(() => {
    const orders = extractOrdersFromResponse(ordersResponse);
    const mergedOrders = normalizeOrderRowsByOrderId(orders);
    return mergedOrders.flatMap(mapOrderData);
  }, [ordersResponse]);

  // Get total count and calculate total pages
  const totalCount = React.useMemo(() => {
    if (!ordersResponse) return 0;
    const response = ordersResponse as any;

    const total = response.total ||
      response.data?.total ||
      response.data?.total_count ||
      response.count ||
      response.data?.count ||
      response.totalRecords ||
      response.data?.totalRecords;

    if (total && total > 0) {
      return lastValidPage != null ? Math.min(total, lastValidPage * limit) : total;
    }

    if (lastValidPage != null) {
      return lastValidPage * limit;
    }

    if (hasReachedLastPage) {
      return Math.max((currentPage - 1) * limit + orderData.length, 0);
    }

    return orderData.length > 0 ? Math.max(orderData.length, (currentPage * limit)) : 0;
  }, [ordersResponse, orderData.length, limit, currentPage, hasReachedLastPage, lastValidPage]);

  const totalPagesFromCount = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / limit)) : 1;
  const totalPages =
    lastValidPage != null
      ? Math.min(totalPagesFromCount, lastValidPage)
      : totalPagesFromCount;
  const observedTotalPages = hasReachedLastPage
    ? Math.max(currentPage, 1)
    : Math.max(currentPage + (orderData.length >= limit ? 1 : 0), 1);
  const effectiveTotalPages = Math.min(totalPages, observedTotalPages);

  React.useEffect(() => {
    if (isLoading) return;
    // If current page returns less than page size, we reached final page.
    if (orderData.length < limit) {
      setHasReachedLastPage(true);
      setLastValidPage(currentPage);
      return;
    }
    setHasReachedLastPage(false);
  }, [orderData.length, limit, isLoading, currentPage]);

  React.useEffect(() => {
    if (isLoading) return;
    // Defensive fallback for out-of-range page (e.g., page 11 shows empty).
    if (currentPage > 1 && orderData.length === 0) {
      const fallbackPage = currentPage - 1;
      setLastValidPage(fallbackPage);
      setHasReachedLastPage(true);
      setCurrentPage(fallbackPage);
    }
  }, [currentPage, orderData.length, isLoading]);

  React.useEffect(() => {
    if (isLoading) return;
    // Guard against navigating past last page (e.g., stale inferred pages).
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, isLoading]);

  React.useEffect(() => {
    // No console.log
  }, [currentPage, totalCount, totalPages, limit, orderData.length]);

  // Handle pagination
  const handlePrevPage = React.useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const handleNextPage = React.useCallback(() => {
    const canGoNext = !hasReachedLastPage && currentPage < effectiveTotalPages;
    if (canGoNext) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, effectiveTotalPages, hasReachedLastPage]);

  const handlePageClick = React.useCallback((page: number) => {
    if (page >= 1 && page <= effectiveTotalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [effectiveTotalPages]);

  // Function to filter orders based on tab
  const getFilteredOrders = (tabIndex: number) => {
    // The API response is already filtered by type (ongoing/completed) if a specific tab is selected.
    // So we should return all orders from the current data state.
    // This avoids hiding orders that the backend considers ongoing but don't match our hardcoded status list.
    return orderData;
  };

  return (
    <div className="accountOrders_page">
      <div className="s_head flex border_none hd_6">
        <h2>My Orders</h2>
        <div className="rt site_tabs2">
          <Tabs value={value} onChange={handleChange} aria-label="basic tabs example" variant="scrollable"
            scrollButtons="auto">
            <Tab label="All Orders" {...a11yProps(0)} />
                  <Tab
                    label={
                      <span>
                        <span
                          className="icon_theme_primary"
                          style={{
                            WebkitMaskImage: "url(/images/shipping_icon1.svg)",
                            maskImage: "url(/images/shipping_icon1.svg)",
                            ["--icon-size" as string]: "20px",
                          }}
                          aria-hidden
                        />{" "}
                        Past Orders
                      </span>
                    }
                    {...a11yProps(1)}
                  />
                  <Tab
                    label={
                      <span>
                        <span
                          className="icon_theme_primary"
                          style={{
                            WebkitMaskImage: "url(/images/delivered_icon.svg)",
                            maskImage: "url(/images/delivered_icon.svg)",
                            ["--icon-size" as string]: "20px",
                          }}
                          aria-hidden
                        />{" "}
                        Ongoing Orders
                      </span>
                    }
                    {...a11yProps(2)}
                  />
          </Tabs>
        </div>
      </div>

      {[0, 1, 2].map((tabIndex) => (
        <CustomTabPanel key={tabIndex} value={value} index={tabIndex}>
          {showOrdersLoader ? (
            <>
              <p className="orders_loading_text">Loading orders...</p>
              <div className="orderCard_grid gap_m">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="orderCard_item orders_skeleton_card">
                    <figure>
                      <div className="skeleton_shimmer orders_skeleton_image" />
                      <div className="skeleton_shimmer orders_skeleton_tag" />
                    </figure>
                    <div className="orderCard_info">
                      <div className="orders_skeleton_header">
                        <div className="skeleton_shimmer orders_skeleton_order_id" />
                        <div className="skeleton_shimmer orders_skeleton_price" />
                      </div>
                      <div className="skeleton_shimmer orders_skeleton_title" />
                      <div className="btn_flex">
                        <div className="skeleton_shimmer orders_skeleton_button" />
                        <div className="skeleton_shimmer orders_skeleton_icon" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : error ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" flexDirection="column" gap={2}>
              <NoOrderFound />
              {/* <button onClick={() => refetch()} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                Retry
              </button> */}
            </Box>
          ) : getFilteredOrders(tabIndex).length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <p>No orders found</p>
            </Box>
          ) : (
            <>
              <div className="orderCard_grid gap_m">
                {getFilteredOrders(tabIndex).map((order) => (
                  <OrderCard key={order.id || order.orderId} order={order} tab={tabIndex} />
                ))}
              </div>
              {/* Pagination with Back and Next Arrows - show only when more than 10 items */}
              {effectiveTotalPages > 1 && (
                <ul className="pagination_list jcc" style={{ marginTop: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', listStyle: 'none', padding: 0, margin: '40px auto 0' }}>
                  {/* Back/Previous Arrow */}
                  <li
                    className={`arrow prev_arrow ${currentPage <= 1 ? 'disabled' : ''}`}
                    onClick={currentPage > 1 ? handlePrevPage : undefined}
                    style={{
                      cursor: currentPage > 1 ? 'pointer' : 'not-allowed',
                      opacity: currentPage > 1 ? 1 : 0.5,
                      width: '38px',
                      height: '38px',
                      minWidth: '38px',
                      borderRadius: '50%',
                      border: '1px solid #d0d5dd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      pointerEvents: currentPage > 1 ? 'auto' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage > 1) {
                        e.currentTarget.style.borderColor = 'var(--commerce-primary, #d91b76)';
                        e.currentTarget.style.cursor = 'pointer';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d0d5dd';
                    }}
                  >
                    <img src="/images/left_arrow.svg" alt="Previous" style={{ height: '18px', width: 'auto' }} />
                  </li>

                  {/* Page Numbers */}
                  {effectiveTotalPages > 1 && Array.from({ length: Math.min(effectiveTotalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (effectiveTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= effectiveTotalPages - 2) {
                      pageNum = effectiveTotalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <li
                        key={pageNum}
                        className={currentPage === pageNum ? "active" : ""}
                        onClick={() => handlePageClick(pageNum)}
                        style={{
                          cursor: 'pointer',
                          background: currentPage === pageNum ? 'var(--commerce-primary-light)' : '#f3f4f6',
                          borderRadius: '50%',
                          width: '38px',
                          minWidth: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1d2939',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'all 0.3s ease',
                          userSelect: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.backgroundColor = '#e5e7eb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }
                        }}
                      >
                        {pageNum}
                      </li>
                    );
                  })}

                  {/* Next Arrow */}
                  <li
                    className={`next_arrow arrow ${currentPage >= effectiveTotalPages || hasReachedLastPage ? 'disabled' : ''}`}
                    onClick={(!hasReachedLastPage && currentPage < effectiveTotalPages) ? handleNextPage : undefined}
                    style={{
                      cursor: (!hasReachedLastPage && currentPage < effectiveTotalPages) ? 'pointer' : 'not-allowed',
                      opacity: (!hasReachedLastPage && currentPage < effectiveTotalPages) ? 1 : 0.5,
                      width: '38px',
                      height: '38px',
                      minWidth: '38px',
                      borderRadius: '50%',
                      border: '1px solid #d0d5dd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      pointerEvents: (!hasReachedLastPage && currentPage < effectiveTotalPages) ? 'auto' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!hasReachedLastPage && currentPage < effectiveTotalPages) {
                        e.currentTarget.style.borderColor = 'var(--commerce-primary, #d91b76)';
                        e.currentTarget.style.cursor = 'pointer';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d0d5dd';
                    }}
                  >
                    <img
                      src="/images/left_arrow.svg"
                      alt="Next"
                      style={{
                        height: '18px',
                        width: 'auto',
                        transform: 'scale(-1)'
                      }}
                    />
                  </li>
                </ul>
              )}
            </>
          )}
        </CustomTabPanel>
      ))}
    </div>
  );
}

export default AccountOrders