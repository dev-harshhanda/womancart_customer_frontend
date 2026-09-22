// 'use client';

// import { useMemo } from 'react';
// import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

// /**
//  * destination: { latitude: string|number, longitude: string|number }
//  * currentLocation: { type: "Point", coordinates: [lng, lat] } (GeoJSON order)
//  */
// export default function GoogleMap({ destination, currentLocation }) {
//   const destPosition = useMemo(() => {
//     const lat = typeof destination?.latitude === 'string' ? parseFloat(destination.latitude) : destination?.latitude;
//     const lng = typeof destination?.longitude === 'string' ? parseFloat(destination.longitude) : destination?.longitude;
//     if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
//     return { lat, lng };
//   }, [destination?.latitude, destination?.longitude]);

//   // Current location (driver) – updates every time socket sends new live_tracking data
//   const currentPosition = useMemo(() => {
//     const coords = currentLocation?.coordinates;
//     if (!Array.isArray(coords) || coords.length < 2) return null;
//     // GeoJSON: coordinates are [longitude, latitude]
//     const lng = Number(coords[0]);
//     const lat = Number(coords[1]);
//     if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
//     return { lat, lng };
//   }, [currentLocation?.coordinates?.[0], currentLocation?.coordinates?.[1]]);

//   const { center, zoom } = useMemo(() => {
//     if (destPosition && currentPosition) {
//       const center = {
//         lat: (destPosition.lat + currentPosition.lat) / 2,
//         lng: (destPosition.lng + currentPosition.lng) / 2,
//       };
//       const latDiff = Math.abs(destPosition.lat - currentPosition.lat);
//       const lngDiff = Math.abs(destPosition.lng - currentPosition.lng);
//       const degDiff = Math.max(latDiff, lngDiff);
//       // When points are very close (< ~0.001°), zoom in so both markers are visible
//       const zoom = degDiff < 0.001 ? 18 : degDiff < 0.01 ? 16 : 14;
//       return { center, zoom };
//     }
//     if (destPosition) return { center: destPosition, zoom: 14 };
//     if (currentPosition) return { center: currentPosition, zoom: 14 };
//     return { center: { lat: 28.6139, lng: 77.209 }, zoom: 12 };
//   }, [destPosition, currentPosition]);

//   return (
//     <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
//       <Map
//         style={{ width: '100%', height: '500px' }}
//         defaultCenter={center}
//         defaultZoom={zoom}
//         mapId="my-map"
//       >
//         {destPosition && (
//           <AdvancedMarker position={destPosition} title="Destination">
//             <img
//               src="/images/Homemarker.png"
//               alt="Destination"
//               style={{ width: 40, height: 48, objectFit: 'contain', display: 'block' }}
//             />
//           </AdvancedMarker>
//         )}
//         {currentPosition && (
//           <AdvancedMarker position={currentPosition} title="Current location (driver)">
//             <img
//               src="/images/Drivermarker.png"
//               alt="Driver"
//               style={{ width: 40, height: 48, objectFit: 'contain', display: 'block' }}
//             />
//           </AdvancedMarker>
//         )}
//       </Map>
//     </APIProvider>
//   );
// }


// app/api/directions/route.js

'use client';

import { useMemo, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useDeliveryMode } from "@/utils/deliveryMode";
/**
 * destination: { latitude: string|number, longitude: string|number }
 * currentLocation: { type: "Point", coordinates: [lng, lat] } (GeoJSON order)
 */

// Fit map bounds to show both markers with padding (must be inside Map)
function FitBounds({ origin, destination }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !origin || !destination || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    const padding = 80; // px padding so both markers are clearly visible
    map.fitBounds(bounds, padding);
  }, [map, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return null;
}

function distanceInMetres(a, b) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(
    Math.sqrt(haversine),
    Math.sqrt(1 - haversine),
  );
}

// Separated so we can use the useMap hook (must be inside APIProvider)
function RoutePolyline({ origin, destination, deliveryMode }) {
  const map = useMap();
  const polylineRef = useRef(null);
  const requestControllerRef = useRef(null);
  const lastRouteOriginRef = useRef(null);
  const lastRouteTimeRef = useRef(0);
  const lastDestinationKeyRef = useRef("");


  useEffect(() => {
    if (!map || !origin || !destination) return;

    const now = Date.now();
    const destinationKey = `${destination.lat},${destination.lng}`;
    const destinationChanged =
      destinationKey !== lastDestinationKeyRef.current;

    const previousOrigin = lastRouteOriginRef.current;
    const moved = previousOrigin
      ? distanceInMetres(previousOrigin, origin)
      : Number.POSITIVE_INFINITY;

    const enoughTimePassed =
      now - lastRouteTimeRef.current >= 30_000;

    if (
      !destinationChanged &&
      (moved < 75 || !enoughTimePassed)
    ) {
      return;
    }

    lastRouteOriginRef.current = origin;
    lastRouteTimeRef.current = now;
    lastDestinationKeyRef.current = destinationKey;

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    const fetchRoute = async () => {
      try {
        const params = new URLSearchParams({
          originLat: String(origin.lat),
          originLng: String(origin.lng),
          destLat: String(destination.lat),
          destLng: String(destination.lng),
        });

        const res = await fetch(`/api/directions?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!data.points?.length) return;

        if (polylineRef.current) {
          polylineRef.current.setMap(null);
        }

        const commercePrimary =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--commerce-primary")
            .trim() || "#d91b76";

        polylineRef.current = new window.google.maps.Polyline({
          path: data.points,
          geodesic: true,
          strokeColor: commercePrimary,
          strokeOpacity: 1,
          strokeWeight: 5,
        });

        polylineRef.current.setMap(map);
      } catch (error) {
        if (
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          console.error("Failed to fetch route:", error);
        }
      }
    };

    void fetchRoute();
  }, [
    map,
    origin?.lat,
    origin?.lng,
    destination?.lat,
    destination?.lng,
  ]);

  useEffect(() => {
  return () => {
    requestControllerRef.current?.abort();

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  };
}, []);


  useEffect(() => {
    if (!polylineRef.current) return;

    const commercePrimary =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--commerce-primary")
        .trim() || "#d91b76";

    polylineRef.current.setOptions({
      strokeColor: commercePrimary,
    });
  }, [deliveryMode]);


  return null;
}

export default function GoogleMap({ destination, currentLocation }) {
  const deliveryMode = useDeliveryMode();
  const destPosition = useMemo(() => {
    const lat = typeof destination?.latitude === 'string' ? parseFloat(destination.latitude) : destination?.latitude;
    const lng = typeof destination?.longitude === 'string' ? parseFloat(destination.longitude) : destination?.longitude;
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }, [destination?.latitude, destination?.longitude]);

  // Current location (driver) – updates every time socket sends new live_tracking data
  const currentPosition = useMemo(() => {
    const coords = currentLocation?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    // GeoJSON: coordinates are [longitude, latitude]
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }, [currentLocation?.coordinates?.[0], currentLocation?.coordinates?.[1]]);

  const { center, zoom } = useMemo(() => {
    if (destPosition && currentPosition) {
      const center = {
        lat: (destPosition.lat + currentPosition.lat) / 2,
        lng: (destPosition.lng + currentPosition.lng) / 2,
      };
      // Zoom out so both markers are visible on first load (fitBounds will refine)
      const latDiff = Math.abs(destPosition.lat - currentPosition.lat);
      const lngDiff = Math.abs(destPosition.lng - currentPosition.lng);
      const degDiff = Math.max(latDiff, lngDiff);
      const zoom = degDiff < 0.001 ? 14 : degDiff < 0.01 ? 13 : 12;
      return { center, zoom };
    }
    if (destPosition) return { center: destPosition, zoom: 14 };
    if (currentPosition) return { center: currentPosition, zoom: 14 };
    return { center: { lat: 28.6139, lng: 77.209 }, zoom: 12 };
  }, [destPosition, currentPosition]);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
      <Map
        style={{ width: '100%', height: '230px' }}
        defaultCenter={center}
        defaultZoom={zoom}
        mapId="my-map"
      >
        {/* Fit map to show both markers with padding on first load */}
        {currentPosition && destPosition && (
          <FitBounds origin={currentPosition} destination={destPosition} />
        )}
        {/* Route polyline between driver and destination */}
        {currentPosition && destPosition && (
          <RoutePolyline
            origin={currentPosition}
            destination={destPosition}
            deliveryMode={deliveryMode}
          />
        )}

        {destPosition && (
          <AdvancedMarker position={destPosition} title="Destination">
            <img
              src="/images/Homemarker.png"
              alt="Destination"
              style={{ width: 40, height: 48, objectFit: 'contain', display: 'block' }}
            />
          </AdvancedMarker>
        )}

        {currentPosition && (
          <AdvancedMarker position={currentPosition} title="Current location (driver)">
            <img
              src="/images/Drivermarker.png"
              alt="Driver"
              style={{ width: 40, height: 48, objectFit: 'contain', display: 'block' }}
            />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}