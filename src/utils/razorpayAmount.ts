function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Normalize API amount to rupees (handles paise when clearly indicated). */
export function normalizeAmountToRupees(
  value: unknown,
  expectedRupees?: number,
): number | null {
  const n = toPositiveNumber(value);
  if (n == null) return null;

  if (expectedRupees != null && expectedRupees > 0) {
    const asPaise = n / 100;
    if (
      Number.isInteger(n) &&
      n >= 100 &&
      Math.abs(asPaise - expectedRupees) <= 0.02
    ) {
      return asPaise;
    }
    if (Math.abs(n - expectedRupees) <= 0.02) {
      return n;
    }
  }

  if (Number.isInteger(n) && n >= 10000 && n % 100 === 0) {
    return n / 100;
  }

  return n;
}

/** Pick store/selling payable amount and skip MRP-looking values. */
export function resolvePayableAmountRupees(
  candidates: unknown[],
  options?: { mrpRupees?: number; fallbackRupees?: number },
): number {
  const fallback = toPositiveNumber(options?.fallbackRupees) ?? 0;
  const mrp = toPositiveNumber(options?.mrpRupees) ?? 0;

  for (const candidate of candidates) {
    const rupees = normalizeAmountToRupees(candidate, fallback || mrp || undefined);
    if (rupees == null) continue;

    if (
      mrp > 0 &&
      fallback > 0 &&
      fallback < mrp &&
      Math.abs(rupees - mrp) <= 0.02
    ) {
      continue;
    }

    return rupees;
  }

  return fallback;
}

export function resolveCartPayableAmountRupees(args: {
  cartData?: Record<string, unknown> | null;
  computedTotal: number;
  subTotal: number;
  totalMrp: number;
}): number {
  const { cartData, computedTotal, subTotal, totalMrp } = args;
  const data = cartData ?? {};

  return resolvePayableAmountRupees(
    [
      computedTotal,
      data.payable_amount,
      data.total_amount,
      data.grand_total,
      data.total,
      data.final_total,
      subTotal,
    ],
    { mrpRupees: totalMrp, fallbackRupees: computedTotal },
  );
}

export function resolveOrderPaymentAmountRupees(args: {
  payment?: Record<string, unknown> | null;
  order?: Record<string, unknown> | null;
  fallbackRupees: number;
  mrpRupees?: number;
}): number {
  const payment = args.payment ?? {};
  const order = args.order ?? {};

  return resolvePayableAmountRupees(
    [
      payment.payable_amount,
      payment.amount,
      payment.total_amount,
      order.payable_amount,
      order.total_amount,
      order.grand_total,
      order.total,
      args.fallbackRupees,
    ],
    { mrpRupees: args.mrpRupees, fallbackRupees: args.fallbackRupees },
  );
}

export function toRazorpayAmountPaise(rupees: number): number {
  return Math.round(Math.max(0, rupees) * 100);
}
