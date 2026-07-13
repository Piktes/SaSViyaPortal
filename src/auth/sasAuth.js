import { CookieAuthenticationCredential } from "@sassoftware/sas-auth-browser";

// Tek instance: ayni Viya sunucusu icin tek cookie-auth nesnesi kullanilir.
let instance = null;
let instanceUrl = null;

export function getSasAuth(viyaUrl) {
  if (!instance || instanceUrl !== viyaUrl) {
    instance = new CookieAuthenticationCredential({ url: viyaUrl });
    instanceUrl = viyaUrl;
  }
  return instance;
}
