import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const input = searchParams.get("input");
  const sessionToken = searchParams.get("sessionToken")?.trim() ?? "";
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const normalizedInput = input?.trim() ?? "";

  if (normalizedInput.length < 3 || normalizedInput.length > 120) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_INPUT",
        message: "Search input must contain between 3 and 120 characters",
      },
      { status: 400 },
    );
  }

  if (!sessionToken || sessionToken.length > 128) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_SESSION_TOKEN",
        message: "A valid autocomplete session token is required",
      },
      { status: 400 },
    );
  }


  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        code: "GOOGLE_API_NOT_CONFIGURED",
        message: "Location search is temporarily unavailable",
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
    const biasParams = hasValidBias
      ? `&location=${encodeURIComponent(`${lat},${lng}`)}&radius=5000`
      : '';

    
      const autocompleteUrl = process.env.GOOGLE_PLACES_AUTOCOMPLETE_URL;
      if (!autocompleteUrl) {
        return NextResponse.json(
          {
            success: false,
            code: "GOOGLE_API_NOT_CONFIGURED",
            message: "Location search is temporarily unavailable",
          },
          { status: 500 },
        );
      }

      const response = await fetch(
        `${autocompleteUrl}?input=${encodeURIComponent(normalizedInput)}` +
          `&key=${apiKey}` +
          `&language=en` +
          `&sessiontoken=${encodeURIComponent(sessionToken)}` +
          (searchParams.get("scope") === "header-delivery"
            ? "&components=country:in"
            : "") +
          biasParams,
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
    console.error('Places Autocomplete API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
