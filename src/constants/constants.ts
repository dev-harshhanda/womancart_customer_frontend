export const ONBOARDING_TYPE = {
  EMAIL: 1,
  PHONE: 2,
};

/**
 * Public Razorpay Key ID used by the browser checkout.
 * Sourced from env (NEXT_PUBLIC_RAZORPAY_KEY_ID) with a test-key fallback.
 * Prefer the `key_id` returned by the backend order response when available,
 * so the key always matches the account/mode the order was created in.
 */
export const RAZORPAY_KEY_ID =
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_Sr7wWInAA1Adk5";
