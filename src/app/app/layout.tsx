import type { Metadata } from "next";
import { APP_DOWNLOAD_LANDING_URL } from "@/constants/appDownload";

export const metadata: Metadata = {
  title: "Download WomanCart App",
  description:
    "Download the WomanCart app for iOS and Android. Shop beauty, fashion, and wellness with exclusive deals.",
  alternates: {
    canonical: APP_DOWNLOAD_LANDING_URL,
  },
  openGraph: {
    title: "Download WomanCart App",
    description:
      "Get the WomanCart app on the App Store or Google Play.",
    url: APP_DOWNLOAD_LANDING_URL,
    siteName: "WomanCart",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AppDownloadLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
