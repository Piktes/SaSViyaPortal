// reports.json'i yukler ve dogrular (beyaz liste guvenlik katmani).
// Kurallar:
//  - viyaUrl: gecerli URL, https zorunlu (yalniz localhost icin http'ye izin verilir,
//    dev proxy senaryosu). Yalnizca origin (+ varsa yol on-eki) kullanilir.
//  - reportUri: tam olarak /reports/reports/<uuid> formatinda olmali.
//  - id: guvenli slug (URL parametresi olarak kullanilir).
// Kurala uymayan kayitlar sessizce elenmez — skipped listesinde raporlanir.

const ID_RE = /^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/;
const REPORT_URI_RE =
  /^\/reports\/reports\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
  // Sorgu/fragment atilir; dev proxy icin yol on-ekine (orn. /viya) izin verilir.
  const path = url.pathname.replace(/\/+$/, "");
  return url.origin + path;
}

export async function loadConfig() {
  const res = await fetch("/reports.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`reports.json yüklenemedi (HTTP ${res.status}).`);
  }
  const raw = await res.json();

  if (!raw || typeof raw !== "object") throw new Error("reports.json geçersiz.");
  if (typeof raw.viyaUrl !== "string") throw new Error("reports.json: viyaUrl eksik.");
  if (!Array.isArray(raw.reports)) throw new Error("reports.json: reports listesi eksik.");

  const viyaUrl = normalizeViyaUrl(raw.viyaUrl);

  const reports = [];
  const skipped = [];
  const seenIds = new Set();
  for (const item of raw.reports) {
    const reason = validateReport(item, seenIds);
    if (reason) {
      skipped.push({ item, reason });
      continue;
    }
    seenIds.add(item.id);
    reports.push({
      id: item.id,
      name: item.name,
      description: typeof item.description === "string" ? item.description : "",
      reportUri: item.reportUri,
    });
  }

  if (skipped.length > 0) {
    // Admin'in fark etmesi icin konsola yazilir; uygulama calismaya devam eder.
    console.warn("[reports.json] Geçersiz olduğu için atlanan kayıtlar:", skipped);
  }

  // Opsiyonel: Sorun Bildir sekmesinin gonderecegi yonetici e-postasi.
  const supportEmail =
    typeof raw.supportEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.supportEmail)
      ? raw.supportEmail
      : "";

  return { viyaUrl, reports, supportEmail, skippedCount: skipped.length };
}

function validateReport(item, seenIds) {
  if (!item || typeof item !== "object") return "kayıt nesne değil";
  if (typeof item.id !== "string" || !ID_RE.test(item.id)) return "id geçersiz (slug olmalı)";
  if (seenIds.has(item.id)) return "id tekrar ediyor";
  if (typeof item.name !== "string" || item.name.trim() === "") return "name eksik";
  if (typeof item.reportUri !== "string" || !REPORT_URI_RE.test(item.reportUri))
    return "reportUri /reports/reports/<uuid> formatında olmalı";
  return null;
}
