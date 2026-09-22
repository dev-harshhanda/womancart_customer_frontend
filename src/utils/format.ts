/**
 * Format integer part with Indian lakh/crore comma separation.
 * e.g. 20000 → "20,000", 1234567 → "12,34,567"
 */
function formatIndianInteger(absInt: number): string {
  const intPart = String(absInt);
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const withCommas = rest.replace(/\B(?=(?:\d{2})+(?!\d))/g, ",");
  return `${withCommas},${last3}`;
}

/**
 * Format a number as INR price with Indian lakh/crore comma separation.
 * Shows decimals when present (e.g. 548.25) and omits ".00" for whole amounts (e.g. 449).
 */
export function formatPriceInr(
  value: number | string | null | undefined,
  options?: { decimals?: number },
): string {
  if (value == null || value === "") return "0";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "0";

  const negative = num < 0;
  const abs = Math.abs(num);
  const maxDecimals = options?.decimals ?? 2;
  const fixed = abs.toFixed(maxDecimals);
  const [intPart, decPart] = fixed.split(".");
  const formattedInt = formatIndianInteger(Number(intPart));

  let body: string;
  if (!decPart || /^0+$/.test(decPart)) {
    body = formattedInt;
  } else {
    const trimmedDec = decPart.replace(/0+$/, "");
    body = trimmedDec ? `${formattedInt}.${trimmedDec}` : formattedInt;
  }

  return negative ? `-${body}` : body;
}

const API_MESSAGE_MAP: Record<string, string> = {
  HELP_CENTER_QUERY_SUBMITTED_SUCCESSFULLY:
    "Your query has been submitted successfully. We will get back to you within 24–48 hours.",
};

/** Turn raw API message keys into user-friendly copy. */
export function formatApiMessage(
  message?: string | null,
  fallback = "",
): string {
  const trimmed = message?.trim();
  if (!trimmed) return fallback;

  if (API_MESSAGE_MAP[trimmed]) return API_MESSAGE_MAP[trimmed];

  if (/^[A-Z][A-Z0-9_]+$/.test(trimmed)) {
    const sentence = trimmed
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w/, (char) => char.toUpperCase());
    return sentence.endsWith(".") ? sentence : `${sentence}.`;
  }

  return trimmed;
}
