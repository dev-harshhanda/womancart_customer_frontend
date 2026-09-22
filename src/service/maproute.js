// app/api/directions/route.js

export async function GET(request) {
    const { searchParams } = new URL(request.url);
  
    const originLat = searchParams.get('originLat');
    const originLng = searchParams.get('originLng');
    const destLat   = searchParams.get('destLat');
    const destLng   = searchParams.get('destLng');
  
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const directionsUrl = process.env.GOOGLE_DIRECTIONS_URL ?? '';

    const url =
      `${directionsUrl}?` +
      `origin=${originLat},${originLng}` +
      `&destination=${destLat},${destLng}` +
      `&key=${apiKey}`;
  
    const res  = await fetch(url);
    const data = await res.json();
  
    if (!data.routes || data.routes.length === 0) {
      return Response.json({ error: 'No routes found' }, { status: 404 });
    }
  
    const encoded = data.routes[0].overview_polyline.points;
    const points  = decodePolyline(encoded);
  
    return Response.json({ points });
  }
  
  function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;
  
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
  
      shift = 0; result = 0;
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