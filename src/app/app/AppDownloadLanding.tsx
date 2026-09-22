/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  APP_DOWNLOAD_LANDING_URL,
  APP_DOWNLOAD_QR_PATH,
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
} from "@/constants/appDownload";

export default function AppDownloadLanding() {
  return (
    <main className="app_download_page">
      <div className="app_download_card">
        <figure className="app_download_logo">
          <img src="/images/logo.png" alt="WomanCart" width={180} height={48} />
        </figure>

        <h1>Download WomanCart App</h1>
        <p className="app_download_subtitle">
          Shop beauty, fashion &amp; wellness on India&apos;s favourite app.
          Scan the QR code or choose your store below.
        </p>

        <figure className="app_download_qr">
          <img
            src={APP_DOWNLOAD_QR_PATH}
            alt={`QR code for ${APP_DOWNLOAD_LANDING_URL}`}
            width={220}
            height={220}
          />
          <figcaption>Scan to open {APP_DOWNLOAD_LANDING_URL}</figcaption>
        </figure>

        <div className="app_download_stores">
          <Link
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download on the App Store"
          >
            <img src="/images/app_store.svg" alt="Download on the App Store" />
          </Link>
          <Link
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get it on Google Play"
          >
            <img src="/images/play_store.svg" alt="Get it on Google Play" />
          </Link>
        </div>

        <Link href="/" className="app_download_home_link">
          Continue to website
        </Link>
      </div>
    </main>
  );
}
