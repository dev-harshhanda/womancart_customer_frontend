export const STORAGE_KEYS = {
  tempUser: "TEMP_USER",
  fcmToken: "FCM_TOKEN",
  PERSIST: "persist:root",
  token: "TOKEN",
  credentials: "CREDENTIALS",
  tokenNode: "TOKEN_NODE",
  guestAuthToken: "GUEST_AUTH_TOKEN",
  guestJwtToken: "GUEST_JWT_TOKEN",
  guestUserId: "GUEST_USER_ID",
  guestLoginInitialized: "GUEST_LOGIN_INITIALIZED",
  rememberedCredentials: "REMEMBERED_CREDENTIALS",
  referralCode: "REFERRAL_CODE",
  profileSetupCompleted: "PROFILE_SETUP_COMPLETED",
  /** Persisted delivery mode: "quick_delivery" | "normal" */
  deliveryMode: "WC_DELIVERY_MODE",
  themeSetting: "THEME_SETTING",
  /** Pending action payload to replay after login (e.g., add-to-cart) */
  pendingAddToCart: "PENDING_ADD_TO_CART",
  /** Persist applied cart coupon code by delivery mode */
  cartAppliedCoupon: "WC_CART_APPLIED_COUPON",
  /** Last successful header megamenu categories (viewAllCategory) for instant render */
  cachedHeaderCategories: "WC_CACHED_HEADER_CATEGORIES",
  /** Last successful home category-list response for instant slider render */
  cachedCategoryList: "WC_CACHED_CATEGORY_LIST",
  /** Last successful header brands list for instant mega-menu render */
  cachedBrands: "WC_CACHED_BRANDS",
};
