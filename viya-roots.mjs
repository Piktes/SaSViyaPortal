// Viya servis kokleri — hem dev proxy (vite.config.js) hem prod sunucusu
// (server/server.mjs) ayni listeyi kullanir. va-report-components servis
// cagrilarini origin kokune attigi icin bu koklerin tamami proxy'lenmeli.
// "reports" deseni "(/|$)" ile biter: uygulamanin /reports.json'u eslesmez.
export const VIYA_ROOTS = [
  "SASLogon",
  "SASVisualAnalytics",
  "SASReportViewer",
  "identities",
  "reports",
  "reportImages",
  "reportPackages",
  "reportData",
  "reportOperations",
  "reportTemplates",
  "visualAnalytics",
  "folders",
  "files",
  "casManagement",
  "casProxy",
  "themes",
  "preferences",
  "deviceManagement",
  "maps",
  "webDataAccess",
  "comments",
  "appRegistry",
  "authorization",
  "configuration",
  "searchIndex",
  "annotations",
  "featureFlags",
  "audit",
  "dataSources",
  "dataTables",
  "compute",
  "jobExecution",
  "launcher",
];

// Bir yolun Viya'ya proxy'lenmesi gerekip gerekmedigi (ortak kural).
export function isViyaPath(pathname) {
  return VIYA_ROOTS.some(
    (root) => pathname === `/${root}` || pathname.startsWith(`/${root}/`)
  );
}

// Set-Cookie duzeltmesi: SameSite=None ama Secure'suz cerezlere Secure ekle
// (tarayici bu kombinasyonu reddeder). Ortak yardimci.
export function fixSetCookie(cookies) {
  if (!cookies) return cookies;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.map((c) =>
    /samesite=none/i.test(c) && !/;\s*secure/i.test(c) ? `${c}; Secure` : c
  );
}
