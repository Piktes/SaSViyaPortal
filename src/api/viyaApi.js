// Viya REST cagrilari (cookie oturumuyla, sasrapor reposundaki akislarin
// tarayici karsiligi). Tum istekler credentials: "include" tasir; dev'de
// proxy, uretimde nginx ayni origin'e tasidigi icin CORS'a takilmaz.

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isReportUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Kullanici adi + parola ile SASLogon form girisi (popup'siz).
 *
 * Akis: login sayfasi GET'lenir (CSRF cerezi + gizli form alanlari),
 * form application/x-www-form-urlencoded olarak POST edilir, oturum
 * cerezleri tarayiciya yazilir. Basarisiz giriste SASLogon login sayfasina
 * "error" parametresiyle geri yonlendirir — bunu yakalayip Turkce hata veririz.
 */
export async function passwordLogin(viyaUrl, username, password) {
  const pageRes = await fetch(`${viyaUrl}/SASLogon/login`, {
    credentials: "include",
    headers: { Accept: "text/html" },
  });
  if (!pageRes.ok) throw new Error(`Giriş sayfasına ulaşılamadı (HTTP ${pageRes.status}).`);
  const doc = new DOMParser().parseFromString(await pageRes.text(), "text/html");

  const pwInput = doc.querySelector('form input[type="password"]');
  const form = pwInput ? pwInput.closest("form") : null;
  if (!form) throw new Error("Giriş sayfası beklenen biçimde değil.");

  const body = new URLSearchParams();
  // CSRF dahil tum gizli alanlar aynen tasinir.
  form.querySelectorAll('input[type="hidden"]').forEach((i) => {
    if (i.name) body.set(i.name, i.value);
  });
  const userInput = form.querySelector(
    'input[type="text"], input[type="email"], input:not([type])'
  );
  body.set(userInput?.name || "username", username);
  body.set(pwInput.name || "password", password);

  const action = new URL(form.getAttribute("action") || "login", pageRes.url);
  const res = await fetch(action, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
    },
    body: body.toString(),
  });

  // Basarisiz giris: login sayfasina error parametresiyle geri doner.
  const backAtLogin = /\/SASLogon\/login/.test(res.url);
  const hasError = /[?&]error/.test(res.url);
  if (hasError || (backAtLogin && res.ok)) {
    throw new Error("Kullanıcı kimliği veya parola hatalı.");
  }
  if (!res.ok && res.status !== 302) {
    throw new Error(`Giriş başarısız (HTTP ${res.status}).`);
  }

  // Admin/grup uyeleri icin "Assumable Groups" onay adimini otomatik gec.
  await completeConsentSteps(viyaUrl);
}

/**
 * Giristen sonra cikan ara onay sayfalarini (SAS "Assumable Groups" opt-in gibi)
 * otomatik olarak "Evet" ile gecer. SDK'nin bekledigi basari isaretine ulasana
 * kadar (en fazla birkac tur) formu bulup gonderir.
 */
async function completeConsentSteps(viyaUrl, maxSteps = 4) {
  for (let i = 0; i < maxSteps; i++) {
    const r = await fetch(`${viyaUrl}/SASVisualAnalytics/logon/index.html`, {
      credentials: "include",
      headers: { Accept: "text/html" },
    });
    const text = await r.text();
    if (text.includes("data-report-sas-auth-success")) return; // oturum tamam
    if (/\/SASLogon\/login/.test(r.url)) return; // login'e dustu — burada durma, ust katman kontrol eder

    const doc = new DOMParser().parseFromString(text, "text/html");
    const form = pickConsentForm(doc);
    if (!form) return; // taninmayan sayfa — checkAuthenticated karar versin

    const body = new URLSearchParams();
    form.querySelectorAll('input[type="hidden"]').forEach((inp) => {
      if (inp.name) body.set(inp.name, inp.value);
    });
    // Onaylama ("Evet"/"Yes") butonunu/alanini secip gonderime ekle.
    const affirm = pickAffirmative(form);
    if (affirm && affirm.name) body.set(affirm.name, affirm.value || "true");

    const action = new URL(form.getAttribute("action") || r.url, r.url);
    await fetch(action, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
      },
      body: body.toString(),
    });
  }
}

function pickConsentForm(doc) {
  const forms = [...doc.querySelectorAll("form")];
  // Icinde parola alani OLMAYAN (yani login degil) ilk form onay formudur.
  return forms.find((f) => !f.querySelector('input[type="password"]')) || null;
}

function pickAffirmative(form) {
  const candidates = [
    ...form.querySelectorAll(
      'button, input[type="submit"], input[type="radio"], input[type="checkbox"]'
    ),
  ];
  const isYes = (el) => {
    const t = `${el.value || ""} ${el.textContent || ""} ${el.name || ""}`.toLowerCase();
    return /(yes|evet|opt.?in|true|assume)/.test(t) && !/(no|hayır|false|opt.?out)/.test(t);
  };
  return candidates.find(isYes) || candidates[0] || null;
}

/** Oturumdaki kullanicinin kimlik bilgisi (ad + id + sunucudan gelen ham kayit). */
export async function getCurrentUser(viyaUrl) {
  const res = await fetch(`${viyaUrl}/identities/users/@currentUser`, {
    credentials: "include",
    headers: { Accept: "application/vnd.sas.identity.user+json, application/json" },
  });
  if (!res.ok) throw new Error(`Kullanıcı bilgisi alınamadı (HTTP ${res.status}).`);
  const body = await res.json();
  return { id: body.id || "", name: body.name || body.id || "", raw: body };
}

/** Kullanicinin uye oldugu gruplar (varsa). */
export async function getUserMemberships(viyaUrl) {
  const res = await fetch(
    `${viyaUrl}/identities/users/@currentUser/memberships?limit=100`,
    {
      credentials: "include",
      headers: { Accept: "application/vnd.sas.collection+json, application/json" },
    }
  );
  if (!res.ok) throw new Error(`Grup bilgisi alınamadı (HTTP ${res.status}).`);
  const body = await res.json();
  return (body.items || []).map((g) => ({
    id: g.id || "",
    name: g.name || g.id || "",
    providerId: g.providerId || "",
  }));
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
