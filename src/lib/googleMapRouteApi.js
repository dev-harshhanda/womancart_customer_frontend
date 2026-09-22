// lib/googleMapRouteApi.js

export async function getRoute(origin, destination) {
  const res = await fetch(
    `/api/directions?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${destination.lat}&destLng=${destination.lng}`
  );

  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    console.error('Directions API error:', res.status, text?.slice(0, 200));
    return null;
  }

  const data = await res.json();
  return data.points ?? null; // Array of { lat, lng }
}