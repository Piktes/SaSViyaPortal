// va-report-components UMD paketini public/ altina kopyalar.
// SDK, chunk'larini kendi yuklendigi yola gore runtime'da cektigi icin
// Vite bundle'ina dahil edilmez; statik dosya olarak sunulur.
import { cpSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@sassoftware", "va-report-components", "dist");
const dest = join(root, "public", "sdk-assets", "va-report-components");

if (!existsSync(src)) {
  console.warn("[copy-sdk] @sassoftware/va-report-components bulunamadi — once npm install calistirin.");
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-sdk] va-report-components -> public/sdk-assets/va-report-components kopyalandi.");
