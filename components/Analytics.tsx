"use client";

import { useEffect } from "react";
import Script from "next/script";
import { GA_ID, GA_LINKER_DOMAINS, captureUtm, flushSignup } from "@/lib/analytics";

export default function Analytics() {
  useEffect(() => {
    captureUtm();
    // gtag の読み込みを待ってから送る
    const t = setTimeout(flushSignup, 1500);
    return () => clearTimeout(t);
  }, []);

  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { linker: { domains: ${JSON.stringify(GA_LINKER_DOMAINS)} } });`}
      </Script>
    </>
  );
}
