import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VIYA_ROOTS, fixSetCookie } from "./viya-roots.mjs";

// ---------------------------------------------------------------------------
// YAYIN ONCESI: Viya sunucunuzun origin'ini girin (orn. "https://viya.kurum.gov.tr").
// Dolu ise uretim build'ine (dist/index.html) CSP meta etiketi otomatik eklenir.
// Bos birakilirsa CSP eklenmez — bu durumda CSP'yi web sunucusu header'i olarak
// vermeniz SIDDETLE onerilir (hazir nginx/IIS ornekleri README'de).
// ---------------------------------------------------------------------------
const VIYA_ORIGIN = "";

function buildCsp(viyaOrigin) {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // va-report-components runtime'da stil enjekte eder
    `connect-src 'self' ${viyaOrigin}`,
    `img-src 'self' ${viyaOrigin} data: blob:`,
    `font-src 'self' ${viyaOrigin} data:`,
    `frame-src ${viyaOrigin}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

function cspPlugin() {
  return {
    name: "inject-csp-meta",
    apply: "build",
    transformIndexHtml(html) {
      if (!VIYA_ORIGIN) {
        console.warn(
          "\n[CSP] VIYA_ORIGIN bos — build'e CSP meta etiketi eklenmedi. " +
            "CSP'yi sunucu header'i ile verin (bkz. README) veya vite.config.js'te VIYA_ORIGIN'i doldurun.\n"
        );
        return html;
      }
      const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(VIYA_ORIGIN)}" />`;
      return html.replace("<head>", `<head>\n    ${meta}`);
    },
  };
}

// Dev proxy: uygulama /viya oneki uzerinden Viya'ya konusur; SASLogon giris
// akisi ise mutlak kok yollara (/SASLogon, /SASVisualAnalytics) yonlendirdigi
// icin onlar da proxy'lenir. Yalniz gelistirmede kullanilir.
function buildDevProxy(target) {
  const common = {
    target,
    changeOrigin: true,
    secure: false,
    // Redirect (Location) basliklarindaki sunucu adresini localhost'a cevir —
    // OAuth login zinciri proxy disina kacmasin.
    autoRewrite: true,
    protocolRewrite: "http",
    cookieDomainRewrite: "localhost",
    // NOT: cookiePathRewrite KULLANMA — Viya her serviste kendi path'li
    // JSESSIONID'sini tutar; path'ler duzlestirilirse birbirini ezerler.
    configure: (proxy) => {
      // Viya, yabanci Origin/Referer tasiyan istekleri 403'ler —
      // proxy uzerinden gecerken bu basliklari temizle.
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.removeHeader("origin");
        proxyReq.removeHeader("referer");
      });
      // Viya bazi cerezleri "SameSite=None" ama "Secure"suz gonderiyor;
      // tarayicilar bu kombinasyonu reddeder. Eksik Secure'u tamamla.
      proxy.on("proxyRes", (proxyRes) => {
        if (proxyRes.headers["set-cookie"]) {
          proxyRes.headers["set-cookie"] = fixSetCookie(proxyRes.headers["set-cookie"]);
        }
      });
    },
  };
  // Servis kokleri paylasilan viya-roots.mjs'ten gelir (prod ile ayni liste).
  return {
    "/viya": { ...common, rewrite: (p) => p.replace(/^\/viya/, "") },
    [`^/(${VIYA_ROOTS.join("|")})(/|$)`]: { ...common },
  };
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  // ------------------------------------------------------------------------
  // OPSIYONEL (yalniz gelistirme): Viya tarafinda CORS/cookie ayari henuz
  // yapilmadiysa, Viya'yi ayni origin'e proxy'leyerek deneyebilirsiniz.
  // reports.json icinde viyaUrl'i "http://localhost:5173/viya" yapin ve
  // asagidaki blogu acip target'i kendi sunucunuza cevirin. Detay: README.
  // ------------------------------------------------------------------------
  server: {
    proxy: buildDevProxy("https://bys.meb.gov.tr"),
  },
});
