import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAppStoreRedirectUrlFromRequest } from "@/utils/deviceDetection";
import AppDownloadGate from "./AppDownloadGate";

export default async function AppDownloadPage() {
  const headersList = await headers();
  const storeUrl = getAppStoreRedirectUrlFromRequest(
    headersList.get("user-agent") ?? "",
    {
      secChUaMobile: headersList.get("sec-ch-ua-mobile"),
      secChUaPlatform: headersList.get("sec-ch-ua-platform"),
    },
  );

  if (storeUrl) {
    redirect(storeUrl);
  }

  return <AppDownloadGate />;
}
