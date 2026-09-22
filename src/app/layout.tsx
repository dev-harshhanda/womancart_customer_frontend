import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.scss";
import "./styles.scss";
import "./styles2.scss";
import { Suspense } from "react";
import { StoreProvider } from "@/lib/storeprovider";
import { Toaster } from "react-hot-toast";
import type { ThemeSettingResponse } from "@/service/theme";
import { API_URL, END_POINTS } from "@/constants/url";
import { GtmPageDataTracker } from "@/components/GtmPageDataTracker";
import { STORAGE_KEYS } from "@/constants/storageKeys";
// import { ZendeskWidget } from "@/components/ZendeskWidget";

const GTM_CONTAINER_ID = "GTM-NRDNXBJ8";
const CLARITY_PROJECT_ID = "xcmz2aauzl";
const META_PIXEL_ID = "1177113029421622";
export const metadata: Metadata = {
  title: "Womanart",
  description: "Your Online Shopping Destination",
};

const DEFAULT_THEME_STYLE = {
  "--theme-website-primary-color": "#d91b76",
  "--theme-website-secondary-color": "#3B82F6",
  "--theme-header-background-color": "#ffeaf3",
  "--theme-landing-page-header-color": "#d91b76",
} as const;

async function getInitialThemeStyle() {
  try {
    const response = await fetch(`${API_URL}${END_POINTS.themeSetting.replace(/^\//, "")}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return DEFAULT_THEME_STYLE;
    }
    const themeSetting = (await response.json()) as ThemeSettingResponse;
    const first = themeSetting?.data?.[0];
    if (!first) {
      return DEFAULT_THEME_STYLE;
    }
    return {
      "--theme-website-primary-color":
        first.website_primary_color || DEFAULT_THEME_STYLE["--theme-website-primary-color"],
      "--theme-website-secondary-color":
        first.website_secondary_color || DEFAULT_THEME_STYLE["--theme-website-secondary-color"],
      "--theme-header-background-color":
        first.header_background_color || DEFAULT_THEME_STYLE["--theme-header-background-color"],
      "--theme-landing-page-header-color":
        first.landing_page_header_color || DEFAULT_THEME_STYLE["--theme-landing-page-header-color"],
    } as const;
  } catch {
    return DEFAULT_THEME_STYLE;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [initialThemeStyle, cookieStore, requestHeaders] =
    await Promise.all([
      getInitialThemeStyle(),
      cookies(),
      headers(),
    ]);

  const requestMode = requestHeaders.get("x-wc-delivery-mode");
  const cookieMode = cookieStore.get(STORAGE_KEYS.deliveryMode)?.value;

  const initialDeliveryMode =
  requestMode === "quick_delivery"
    ? "quick_delivery"
    : requestMode === "normal"
      ? "normal"
      : cookieMode === "quick_delivery"
        ? "quick_delivery"
        : "normal";

  return (
    <html
      lang="en"
      data-commerce-mode={initialDeliveryMode}
      style={initialThemeStyle as React.CSSProperties}
    >
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`,
          }}
        />
        {/* End Google Tag Manager */}
        {/* Microsoft Clarity */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`,
          }}
        />
        {/* End Microsoft Clarity */}
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`,
          }}
        />
        {/* End Meta Pixel Code */}
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {/* Meta Pixel Code (noscript) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code (noscript) */}
        <div className="app_shell">
          <StoreProvider>
            <Toaster />
            <GtmPageDataTracker />
            {/* <ZendeskWidget /> */}
            <Suspense>{children}</Suspense>
          </StoreProvider>
        </div>
      </body>
    </html>
  );
}
