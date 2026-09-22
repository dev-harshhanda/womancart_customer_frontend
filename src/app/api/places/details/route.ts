import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = searchParams.get("placeId");
  const sessionToken = searchParams.get("sessionToken");
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!placeId || placeId.length > 300) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_PLACE_ID",
        message: "A valid place ID is required",
      },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        code: "GOOGLE_API_NOT_CONFIGURED",
        message: "Place lookup is temporarily unavailable",
      },
      { status: 500 },
    );
  }

  try {
    const detailsUrl = process.env.GOOGLE_PLACES_DETAILS_URL ?? "";
    if (!detailsUrl) {
      return NextResponse.json(
        {
          success: false,
          code: "GOOGLE_API_NOT_CONFIGURED",
          message: "Place lookup is temporarily unavailable",
        },
        { status: 500 },
      );
    }

    const response = await fetch(
      `${detailsUrl}?place_id=${encodeURIComponent(
        placeId,
      )}&key=${apiKey}&fields=geometry,name,formatted_address,address_components,place_id${
        sessionToken
          ? `&sessiontoken=${encodeURIComponent(sessionToken)}`
          : ""
      }`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      },
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
    console.error('Places Details API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
