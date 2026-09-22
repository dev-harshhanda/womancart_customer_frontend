export function canUseBrowserGeolocation(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "geolocation" in navigator
  );
}