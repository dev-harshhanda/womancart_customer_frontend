type ServerMode = 0 | 1;

/**
 * Switch backend server quickly:
 * 0 = appgrowth
 * 1 = stage
 */
export let SERVER_MODE: ServerMode = 1;

const SERVER_URLS = {
  appgrowth: {
    API_URL: "https://admin-womancart.appgrowthcompany.com/api/",
    NODE_API_URL: "https://womancart-appapinode.appgrowthcompany.com",
    SOCKET_URL: "https://womancartsocketapi.appgrowthcompany.com",
    SITE_URL: "https://www.womancart.in",
  },
  stage: {
    // API_URL: "https://console.womancart.in/api/",
    // NODE_API_URL: "https://stg-inventoryapi.womancart.in",
    // SOCKET_URL: "https://stg-socketapi.womancart.in",
    // SITE_URL: "https://www.womancart.in",
    API_URL: "http://127.0.0.1:8000/api/",
    NODE_API_URL: "http://127.0.0.1:5689",
    SOCKET_URL: "https://stg-socketapi.womancart.in",
    SITE_URL: "http://localhost:3000",
  },
} as const;

const ACTIVE_SERVER_BY_MODE: Record<ServerMode, (typeof SERVER_URLS)[keyof typeof SERVER_URLS]> = {
  0: SERVER_URLS.appgrowth,
  1: SERVER_URLS.stage,
};

const ACTIVE_SERVER = ACTIVE_SERVER_BY_MODE[SERVER_MODE];

export const API_URL = ACTIVE_SERVER.API_URL;
export const NODE_API_URL = ACTIVE_SERVER.NODE_API_URL;
export const SOCKET_URL = ACTIVE_SERVER.SOCKET_URL;

/** True when running against the staging backend (SERVER_MODE = 1). */
export const IS_STAGING = false;

export const END_POINTS = {
  // onboarding api
  login: "/login",
  loginWithPhone: "/loginWithPhone",
  signUp: "/register",
  verifyOtp: "/verifyOtp",
  resendOtp: "/resendOtp",
  updateProfile: "/updateProfile",
  getProfile: "/getProfile",
  imageUpload: "/imageUpload",
  verifyChangePhoneNumber: "/verify_change_phone_number",
  changePhoneNumber: "/change-phone-number",
  changeEmail: "/change-email",
  deleteAccount: "/account-deleted",
  // eslint-disable-next-line sonarjs/hardcoded-credential
  forgotPassword: "/forgotPassword",  // No Sonar
  // eslint-disable-next-line sonarjs/hardcoded-credential
  changePassword: "/change-password",
  logout: "/logout",
  profile: "/getProfile",
  brands: "/brands",
  // socialLogin: "node:/onboarding/user/social-login",
  socialLogin: "/social-login",
  guestLogin: "/guest-login",

  // getProducts: "/getProducts",
  // getProductDetails: "/getProductDetails",

  //blogs
  blogs: "/blogs",
  blogBySlug: "/blogs",

  //home
  dashboard: "node:/home/user/dashboard",
  CATEGORY_DASHBOARD: "node:/home/user/dashboard",
  product: "node:/product/user/list",
  category: "node:/product/user/category",




  getProducts: "/getProducts",
  getProductDetails: "node:/product/user/product-detail",
  /** Admin API — back-in-stock alerts (POST). */
  stockAlertSubscribe: "/stock-alert/subscribe",
  getProductKitDetail: "node:/product/user/product-kit",
  moreProduct: "node:/product/user/more-product",

  CATEGORY_LIST: "node:/home/user/category-list",
  //cart
  addToCart: "node:/cart/add",
  getCart: "node:/cart/list",
  removeFromCart: "/cart/remove",
  clearCart: "/cart/clear",
  placeOrder: "node:/order/user/place-order",
  getOrders: "node:/order/user/orders",
  getOrderById: "node:/order/user/orders",
  getOrderInvoice: "node:/order/user/orders/invoice",
  viewAllCategory: "node:/home/user/viewAllCategory",
  viewAllProduct: "node:/home/user/viewAllProduct",
  viewAllProductsName: "node:/home/user/viewAllProductsName",

  // Address
  addressList: "/address-list",
  addressCreate: "/address/create",
  addressEdit: "/address/edit",
  addressDelete: "/address",

  // Wishlist
  getWishlist: "node:/product/user/getWishlist",
  addWishlist: "/addWishlist",
  deleteWishlist: "/deleteWishlist",
  getCouponList: "node:/cart/coupon-list",
  applyCoupon: "node:/cart/apply-coupon",
  removeCoupon: "node:/cart/remove-coupon",
  removedCoupon: "/removedCoupon",
  preferences: "/preferences",
  aboutUs: "/about-us",
  termsConditions: "/customer-term-condition",
  privacyPolicy: "/customer-privacy-policy",
  returnPolicy: "/return-policy",
  refundPolicy: "/refund-policy",
  faqs: "/faqs/customer",

  // Orders
  cancelOrder: "node:/order/user/cancel-order",
  returnOrder: "node:/order/user/return-order",
  cancelReturn: "node:/order/user/cancel-return",
  rateOrder: "node:/order/user/rate-order",
  exchangeOrder: "node:/order/user/exchange-order",
  getExchangeProductDetails: "node:/order/user/product-details",
  getDriverInfo: "node:/order/user/driver-info",
  getChatHistory: "node:/order/user/chat",
  searchAllProducts: "node:/home/user/search",
  FILTER_LIST: "node:/home/user/filter-list",
  verifyPayment: "node:/payment/verify-payment",
  walletTopUp: "node:/wallet/user/top-up",
  walletVerifyTopUp: "node:/wallet/user/verify-top-up",
  walletBalance: "node:/wallet/user/balance",
  walletHistory: "node:/wallet/user/history",
  getReferralStats: "node:/referral/user/stats",
  getReferralHistory: "node:/referral/user/history",
  getLoyaltyStats: "node:/loyalty/user/stats",
  getLoyaltyHistory: "node:/loyalty/user/history",
  helpCenter: "node:/cms/user/help-center",
  shopAttributesEntity: "node:/home/user/shop-attributes-entity",
  banners: "/banners",
  getPaymentMethods: "node:/payment/payment-methods",
  saveCardPayment: "node:/payment/save-card-payment",
  verifyCardPayment: "node:/payment/verify-card-payment",
  themeSetting: "/theme-setting",
  cookieConfig: "/cookie-config",
  cookieEvent: "/cookie/event",
  newsletterSubscribe: "/newsletter/subscribe",

  franchiseOpportunity: "/franchise-opportunity",
  franchiseEnquiry: "/franchise-enquiry",
  investorRelations: "/investor-relations",
  // SEO migration endpoints (admin API) — return a structured `seo` object.
  seoCategory: "/categories",
  seoBrand: "/brands",
  seoCollection: "/collections",
  seoCmsPage: "/cms-pages",
  seoBlog: "/blogs",
  seoHomepage: "/seo/homepage",
};

/** Canonical public site origin used for canonical/OG URL fallbacks and sitemaps. */
export const SITE_URL = ACTIVE_SERVER.SITE_URL;
