import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {

    const allowedSources = new Set([
        "delivery_session_init",
        "quick_header",
        "add_address_button",
        "delivery_location_button",
    ]);

    const allowedReasons = new Set([
        "insecure_context",
        "browser_unavailable",
        "permission_denied",
        "gps_timeout",
        "gps_unavailable",
        "watch_error",
        "watch_timeout",
    ]);

    const rawSource = request.headers.get("x-wc-location-source") ?? "unknown";
    const rawReason = request.headers.get("x-wc-location-reason") ?? "unknown";

    const source = allowedSources.has(rawSource) ? rawSource : "unknown";
    const reason = allowedReasons.has(rawReason) ? rawReason : "unknown";

    const startedAt = Date.now();


  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const geolocateUrl = process.env.GOOGLE_GEOLOCATE_URL;

  if (!apiKey || !geolocateUrl) {
    return NextResponse.json(
      {
        success: false,
        code: "GOOGLE_API_NOT_CONFIGURED",
        message: "Location lookup is temporarily unavailable",
      },
      { status: 500 },
    );
  }

  try {
    console.info(
        JSON.stringify({
            event: "google_geolocate_called",
            source,
            reason,
        }),
    );

    const response = await fetch(`${geolocateUrl}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ considerIp: true }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();


    console.info(
        JSON.stringify({
            event: "google_geolocate_result",
            source,
            reason,
            success: response.ok,
            upstreamStatus: response.status,
            durationMs: Date.now() - startedAt,
        }),
    );


    if (
      !response.ok ||
      typeof data?.location?.lat !== "number" ||
      typeof data?.location?.lng !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "LOCATION_LOOKUP_FAILED",
          message: "Unable to determine approximate location",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      location: {
        lat: data.location.lat,
        lng: data.location.lng,
      },
      accuracy: data.accuracy,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "LOCATION_LOOKUP_TIMEOUT",
        message: "Location lookup timed out",
      },
      { status: 504 },
    );
  }
}