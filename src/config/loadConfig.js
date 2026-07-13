// reports.json'i yukler ve dogrular (beyaz liste guvenlik katmani).
// Yeni sema (kategorili):
//   { viyaUrl, supportEmail, categories: [ { name, reports: [ {name, uuid, new?} ] } ] }
// Eski sema (duz liste) de desteklenir (geriye uyumluluk).
//
// Kurallar:
//  - viyaUrl: gecerli URL, https zorunlu (localhost icin http'ye izin — dev proxy).
//  - her rapor: uuid tam UUID formatinda olmali; id = uuid; reportUri = /reports/reports/<uuid>.

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const REPORT_URI_RE = new RegExp(`^/reports/reports/${UUID_RE.source.slice(1, -1)}$`);

function normalizeViyaUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`viyaUrl geçerli bir URL değil: ${value}`);
  }
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost)) {
    throw new Error("viyaUrl https olmalı (yalnızca localhost için http'ye izin verilir).");
  }
  const path = url.pathname.replace(/\/+$/, "");
  return url.origin + path;
}

export async function loadConfig() {
  const res = await fetch("/reports.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`reports.json yüklenemedi (HTTP ${res.status}).`);
  const raw = await res.json();

  if (!raw || typeof raw !== "object") throw new Error("reports.json geçersiz.");
  // viyaUrl belirtilmemisse sayfanin kendi origin'i kullanilir (proxy hem dev
  // hem prod'da ayni origin'de oldugu icin bu her ikisinde de dogru calisir).
  const viyaUrl =
    typeof raw.viyaUrl === "string" && raw.viyaUrl
      ? normalizeViyaUrl(raw.viyaUrl)
      : window.location.origin;

  const skipped = [];
  const seenIds = new Set();
  const categories = [];
  const flat = [];

  // Girdi kaynaklarini normalize et: her zaman kategori listesine cevir.
  const rawCategories = Array.isArray(raw.categories)
    ? raw.categories
    : Array.isArray(raw.reports)
      ? [{ name: "", reports: raw.reports }]
      : [];

  for (const cat of rawCategories) {
    const name = typeof cat?.name === "string" ? cat.name : "";
    const items = Array.isArray(cat?.reports) ? cat.reports : [];
    const built = [];
    for (const item of items) {
      const report = buildReport(item, seenIds);
      if (!report) {
        skipped.push(item);
        continue;
      }
      seenIds.add(report.id);
      built.push(report);
      flat.push(report);
    }
    if (built.length > 0) categories.push({ name, reports: built });
  }

  if (skipped.length > 0) {
    console.warn("[reports.json] Geçersiz olduğu için atlanan kayıtlar:", skipped);
  }

  const supportEmail =
    typeof raw.supportEmail === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.supportEmail)
      ? raw.supportEmail
      : "";

  return { viyaUrl, supportEmail, categories, reports: flat, skippedCount: skipped.length };
}

function buildReport(item, seenIds) {
  if (!item || typeof item !== "object") return null;
  if (typeof item.name !== "string" || item.name.trim() === "") return null;

  // uuid dogrudan veya reportUri'den; id = uuid.
  let uuid = typeof item.uuid === "string" ? item.uuid : "";
  if (!uuid && typeof item.reportUri === "string") {
    uuid = item.reportUri.split("/").pop() || "";
  }
  if (!UUID_RE.test(uuid)) return null;
  if (seenIds.has(uuid)) return null;

  const reportUri = `/reports/reports/${uuid}`;
  if (!REPORT_URI_RE.test(reportUri)) return null;

  return {
    id: uuid,
    name: item.name.trim(),
    reportUri,
    isNew: item.new === true || item.isNew === true,
  };
}
