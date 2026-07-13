// Viya REST cagrilari (cookie oturumuyla, sasrapor reposundaki akislarin
// tarayici karsiligi). Tum istekler credentials: "include" tasir; dev'de
// proxy, uretimde nginx ayni origin'e tasidigi icin CORS'a takilmaz.

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isReportUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Oturumdaki kullanicinin kimlik bilgisi (ad + id). */
export async function getCurrentUser(viyaUrl) {
  const res = await fetch(`${viyaUrl}/identities/users/@currentUser`, {
    credentials: "include",
    headers: { Accept: "application/vnd.sas.identity.user+json, application/json" },
  });
  if (!res.ok) throw new Error(`Kullanıcı bilgisi alınamadı (HTTP ${res.status}).`);
  const body = await res.json();
  return { id: body.id || "", name: body.name || body.id || "" };
}

/** Kullanicinin erisebildigi raporlari listeler (sasrapor: list_reports). */
export async function listUserReports(viyaUrl, limit = 100) {
  const res = await fetch(`${viyaUrl}/reports/reports?limit=${limit}&sortBy=name`, {
    credentials: "include",
    headers: { Accept: "application/vnd.sas.collection+json" },
  });
  if (!res.ok) {
    throw new Error(`Rapor listesi alınamadı (HTTP ${res.status}).`);
  }
  const body = await res.json();
  return (body.items || []).map((it) => ({
    id: it.id,
    name: it.name || "(adsız)",
    description: it.description || "",
    modified: it.modifiedTimeStamp || it.creationTimeStamp || null,
    createdBy: it.createdBy || "",
  }));
}

const PDF_PARAMS = "orientation=landscape&paperSize=A4&includeAppendix=false";
const PDF_TIMEOUT_MS = 150000;
const PDF_RETRY_DELAY_MS = 3000;

/**
 * Raporun PDF'ini uretir ve Blob dondurur (sasrapor: export_report_pdf).
 *
 * Viya, GET /visualAnalytics/reports/{id}/pdf istegini render bitene kadar
 * 303'lerle bekletir. Tarayici fetch yonlendirmeleri otomatik izler; is uzun
 * surer de yonlendirme limiti asilirsa istek hata verir — o durumda ayni
 * istegi kisa arayla yineleriz (is sunucuda devam eder, sonunda 200 + PDF).
 */
export async function exportReportPdf(reportId) {
  if (!isReportUuid(reportId)) throw new Error("Geçersiz rapor kimliği.");
  const url = `/visualAnalytics/reports/${reportId}/pdf?${PDF_PARAMS}`;
  const deadline = Date.now() + PDF_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    let res;
    try {
      res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/pdf" },
      });
    } catch (err) {
      // Yonlendirme limiti / ag kesintisi — is muhtemelen hala calisiyor, bekle & yeniden dene.
      lastError = err;
      await sleep(PDF_RETRY_DELAY_MS);
      continue;
    }
    const type = res.headers.get("content-type") || "";
    if (res.ok && type.includes("pdf")) {
      return res.blob();
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Bu raporun PDF çıktısını almaya yetkiniz yok (ya da oturum düştü).");
    }
    if (res.status === 404) {
      throw new Error("Rapor bulunamadı.");
    }
    // 202/303-sonrasi ara sayfa vb. — kisa bekleyip yeniden dene.
    lastError = new Error(`PDF servisi beklenmedik yanıt verdi (HTTP ${res.status}).`);
    await sleep(PDF_RETRY_DELAY_MS);
  }
  throw lastError || new Error("PDF zaman aşımına uğradı.");
}

/** Blob'u kullaniciya dosya olarak indirir. */
export function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

/** Dosya adi icin guvenli hale getir. */
export function safeFileName(name) {
  return (name || "rapor").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
