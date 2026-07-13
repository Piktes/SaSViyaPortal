// Prodüksiyon sunucusu: statik SPA'yı sunar + Viya servis köklerini
// bys.meb.gov.tr'ye proxy'ler (yerelde doğrulanan çerez/origin düzeltmeleriyle).
// nginx bunun önünde TLS + digi-link.com.tr yönlendirmesi yapar (begumatak.com
// ile aynı desen: nginx -> 127.0.0.1:PORT Node uygulaması).
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { request as httpsRequest } from "node:https";
import { isViyaPath, fixSetCookie } from "../viya-roots.mjs";

const PORT = Number(process.env.PORT || 3003);
const VIYA_ORIGIN = process.env.VIYA_ORIGIN || "https://bys.meb.gov.tr";
const PUBLIC_HOST = process.env.PUBLIC_HOST || "digi-link.com.tr";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const viya = new URL(VIYA_ORIGIN);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
};

const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (isViyaPath(pathname)) {
    proxyToViya(req, res);
  } else {
    serveStatic(req, res, pathname);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[portal] http://127.0.0.1:${PORT} → statik + Viya proxy (${VIYA_ORIGIN})`);
});

// ---- Viya proxy -----------------------------------------------------------
function proxyToViya(req, res) {
  const headers = { ...req.headers };
  // Viya yabanci Origin/Referer'i 403'ler — temizle. Host'u Viya'ya çevir.
  delete headers.origin;
  delete headers.referer;
  headers.host = viya.host;
  delete headers["accept-encoding"]; // basit tutmak icin sikistirma istemiyoruz

  const upstream = httpsRequest(
    {
      protocol: viya.protocol,
      host: viya.hostname,
      port: viya.port || 443,
      method: req.method,
      path: req.url,
      headers,
      timeout: 120000,
    },
    (up) => {
      const outHeaders = { ...up.headers };

      // Set-Cookie: SameSite=None + Secure düzeltmesi.
      if (outHeaders["set-cookie"]) {
        outHeaders["set-cookie"] = fixSetCookie(up.headers["set-cookie"]);
      }
      // Location: bys.meb.gov.tr -> kendi origin'imize çevir (login zinciri
      // dışarı kaçmasın). Şema/host değiştir, yol korunur.
      if (outHeaders.location) {
        outHeaders.location = rewriteLocation(outHeaders.location);
      }
      res.writeHead(up.statusCode || 502, outHeaders);
      up.pipe(res);
    }
  );

  upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
  upstream.on("error", (err) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Viya sunucusuna ulaşılamadı: ${err.message}`);
  });

  req.pipe(upstream);
}

function rewriteLocation(loc) {
  try {
    const u = new URL(loc);
    if (u.host === viya.host) {
      // Tarayıcı bize https ile geldiği için https + public host'a çevir.
      return `https://${PUBLIC_HOST}${u.pathname}${u.search}${u.hash}`;
    }
    return loc;
  } catch {
    return loc; // göreli Location — olduğu gibi bırak
  }
}

// ---- Statik dosyalar (SPA fallback) --------------------------------------
async function serveStatic(req, res, pathname) {
  // Yol gezinme (path traversal) korumasi.
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(root, safe);
  if (!filePath.startsWith(root)) filePath = join(root, "index.html");

  try {
    const st = await stat(filePath);
    if (st.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    // Dosya yok → SPA fallback (index.html), istemci-tarafı router karar verir.
    filePath = join(root, "index.html");
  }

  try {
    const ext = filePath.slice(filePath.lastIndexOf("."));
    const type = MIME[ext] || "application/octet-stream";
    const headers = { "content-type": type };
    if (filePath.endsWith("index.html") || filePath.endsWith("reports.json")) {
      headers["cache-control"] = "no-cache";
    } else if (safe.startsWith("/assets/") || safe.startsWith("/sdk-assets/")) {
      headers["cache-control"] = "public, max-age=31536000, immutable";
    }
    res.writeHead(200, headers);
    createReadStream(filePath).pipe(res);
  } catch {
    const html = await readFile(join(root, "index.html")).catch(() => "not found");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  }
}
