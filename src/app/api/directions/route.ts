import { NextRequest, NextResponse } from 'next/server';

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0,
    lat = 0,
    lng = 0;

    

  while (index < encoded.length) {
    let b: number,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const originLat = searchParams.get('originLat');
  const originLng = searchParams.get('originLng');
  const destLat = searchParams.get('destLat');
  const destLng = searchParams.get('destLng');

  const coordinates = [
    Number(originLat),
    Number(originLng),
    Number(destLat),
    Number(destLng),
  ];

  const valid =
    coordinates.every(Number.isFinite) &&
    coordinates[0] >= -90 &&
    coordinates[0] <= 90 &&
    coordinates[1] >= -180 &&
    coordinates[1] <= 180 &&
    coordinates[2] >= -90 &&
    coordinates[2] <= 90 &&
    coordinates[3] >= -180 &&
    coordinates[3] <= 180;

  if (!valid) {
    return NextResponse.json(
      { error: 'Missing origin or destination parameters' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    );
  }

  const directionsUrl = process.env.GOOGLE_DIRECTIONS_URL ?? "";
  const url =
    `${directionsUrl}?` +
    `origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}` +
    `&key=${apiKey}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();

    if (!res.ok || data.status !== "OK") {
      return NextResponse.json(
        {
          success: false,
          code: "DIRECTIONS_LOOKUP_FAILED",
          message: "Unable to calculate the delivery route",
        },
        { status: 502 },
      );
    }

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json({ error: 'No routes found' }, { status: 404 });
    }

    const encoded = data.routes[0].overview_polyline.points;
    const points = decodePolyline(encoded);

    return NextResponse.json({ points });
  } catch (err) {
    console.error('Directions API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch directions' },
      { status: 500 }
    );
  }
}
