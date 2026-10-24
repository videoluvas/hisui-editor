"use client";

import { useEffect } from "react";
import Script from "next/script";
import { GA_ID, GA_LINKER_DOMAINS, INTERNAL_KEY, captureUtm, flushSignup } from "@/lib/analytics";

// 社内のアクセスは LUVAS と同じく、各端末で一度 ?luvas_internal=1 を付けて開くと traffic_type=internal が付き、
// GA4 のデータフィルタ「Internal Traffic」で除外される（?luvas_internal=0 で解除）。ドメインごとに 1 回ずつ必要
const ENABLED = !!GA_ID && process.env.NODE_ENV === "production";

export default function Analytics() {
  useEffect(() => {
    captureUtm();
    // gtag の読み込みを待ってから送る
    const t = setTimeout(flushSignup, 1500);
    return () => clearTimeout(t);
  }, []);

  if (!ENABLED) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
var c = { linker: { domains: ${JSON.stringify(GA_LINKER_DOMAINS)} } };
try {
  var q = new URLSearchParams(location.search).get('luvas_internal');
  if (q === '1') localStorage.setItem('${INTERNAL_KEY}', '1');
  if (q === '0') localStorage.removeItem('${INTERNAL_KEY}');
  if (localStorage.getItem('${INTERNAL_KEY}') === '1') c.traffic_type = 'internal';
} catch (e) {}
gtag('config', '${GA_ID}', c);`}
      </Script>
    </>
  );
}
