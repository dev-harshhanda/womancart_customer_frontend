/**
 * Validates a return path for post-login / post-action redirects (open-redirect safe).
 * Only same-origin relative paths are allowed.
 */
export function getSafeInternalReturnPath(
  raw: string | null | undefined,
): string | null {
  if (raw == null || raw === "") return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.trim());
  } catch {
    return null;
  }
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  if (decoded.toLowerCase().startsWith("/\\")) return null;
  return decoded;
}

/** Build `/account/my-address?returnTo=...` for returning after choosing an address. */
export function buildMyAddressUrlWithReturnTo(
  pathname: string | null | undefined,
  searchParams: URLSearchParams,
): string {
  const path = pathname && pathname.length > 0 ? pathname : "/";
  const qs = searchParams.toString();
  const returnTo = qs ? `${path}?${qs}` : path;
  const p = new URLSearchParams();
  p.set("returnTo", returnTo);
  return `/account/my-address?${p.toString()}`;
}
