import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {

  const allowedSources = new Set([
    "delivery_session_init",
    "quick_header",
    "add_address_button",
    "add_address_map_click",
    "add_address_drag_end",
    "delivery_location_button",
    "header_search_selection",
  ]);

  const rawSource =
    request.headers.get("x-wc-location-source") ?? "unknown";

  const source = allowedSources.has(rawSource)
    ? rawSource
    : "unknown";

  const startedAt = Date.now();




  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const latitude = lat === null ? NaN : Number(lat);
  const longitude = lng === null ? NaN : Number(lng);
  const hasAddress = Boolean(address?.trim());
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!hasAddress && !hasCoordinates) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_LOCATION",
        message: "Provide either an address or valid coordinates",
      },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        code: "GOOGLE_API_NOT_CONFIGURED",
        message: "Geocoding is temporarily unavailable",
      },
      { status: 500 },
    );
  }

  try {
    const hasValidBias =
      lat !== null &&
      lng !== null &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lng));
    const boundsParam = hasValidBias
      ? `&bounds=${encodeURIComponent(
          `${Number(lat) - 0.03},${Number(lng) - 0.03}|${Number(lat) + 0.03},${Number(lng) + 0.03}`
        )}`
      : "";

    const geocodeUrl = process.env.GOOGLE_GEOCODE_URL ?? "";
    const query = hasCoordinates
      ? `latlng=${encodeURIComponent(`${latitude},${longitude}`)}`
      : `address=${encodeURIComponent(address!.trim())}`;

      console.info(
      JSON.stringify({
        event: "google_geocode_called",
        source,
        requestType: hasCoordinates ? "reverse" : "forward",
      }),
    );

    const response = await fetch(
      `${geocodeUrl}?${query}&key=${apiKey}&language=en`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      },
    );

    console.info(
      JSON.stringify({
        event: "google_geocode_result",
        source,
        success: response.ok,
        upstreamStatus: response.status,
        durationMs: Date.now() - startedAt,
      }),
    );


    if (!response.ok) {
      console.error("Google API upstream failure", {
        status: response.status,
      });

      return NextResponse.json(
        {
          success: false,
          code: "GOOGLE_UPSTREAM_ERROR",
          message: "Location service is temporarily unavailable",
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Places Geocode API error:", error);
    return NextResponse.json(
      {
        error: "Failed to geocode address",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
