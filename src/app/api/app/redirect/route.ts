import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppStoreRedirectUrlFromRequest } from "@/utils/deviceDetection";

export const runtime = "nodejs";

/** Dedicated redirect endpoint — never renders HTML. */
export function GET(request: NextRequest) {
  const storeUrl = getAppStoreRedirectUrlFromRequest(
    request.headers.get("user-agent") ?? "",
    {
      secChUaMobile: request.headers.get("sec-ch-ua-mobile"),
      secChUaPlatform: request.headers.get("sec-ch-ua-platform"),
    },
  );

  if (storeUrl) {
    return NextResponse.redirect(storeUrl, 302);
  }

  const appLanding = new URL("/app/", request.url);
  return NextResponse.redirect(appLanding, 302);
}
