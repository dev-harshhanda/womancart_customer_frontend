import QRCode from "qrcode";
import { buildAppDownloadUrl } from "@/constants/appDownload";

export const runtime = "nodejs";

function resolveQrTargetUrl(request: Request): string {
  const host = request.headers.get("host") ?? "";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return buildAppDownloadUrl(host, proto);
}

export async function GET(request: Request) {
  const targetUrl = resolveQrTargetUrl(request);
  const svg = await QRCode.toString(targetUrl, {
    type: "svg",
    margin: 1,
    width: 220,
    color: {
      dark: "#110312",
      light: "#ffffff",
    },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
