/**
 * Google Analytics (gtag.js). Uses NEXT_PUBLIC_GA_MEASUREMENT_ID if set, otherwise G-SJZT0QJX54.
 * Google Search Console verification is set via layout metadata (NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION).
 */

import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || 'G-SJZT0QJX54';

export function AnalyticsHooks() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
