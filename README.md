# Bakanlık Yönetim Sistemi — Rapor Portalı

SAS Viya hesabıyla giriş yapan kullanıcılara raporları sunan bağımsız web uygulaması.
Açık/koyu tema, MEB kurumsal görünümü.

**İki sekme:**
- **📊 Canlı Raporlar** — yönetici tarafından `reports.json`'da tanımlanan raporlar,
  thumbnail'li kartlarla listelenir; tıklanınca `<sas-report>` ile canlı açılır.
- **📄 Rapor Çıktıları** — giriş yapan kullanıcının **Viya'da erişebildiği** raporlar
  (`GET /reports/reports`) listelenir; her biri için **PDF İndir**
  (`GET /visualAnalytics/reports/{id}/pdf`, A4 yatay — Viya render bitene dek bekletir).

- Kimlik doğrulama: [`@sassoftware/sas-auth-browser`](https://github.com/sassoftware/sas-viya-sdk-js/tree/main/sdk/sas-auth-browser) (cookie tabanlı, popup ile Viya login)
- Rapor gömme: [`@sassoftware/va-report-components`](https://github.com/sassoftware/sas-viya-sdk-js/tree/main/sdk/va-report-components) (`<sas-report>`)
- Uygulamada kullanıcı veritabanı/şifre YOK — yetkilendirmeyi tamamen Viya'nın rapor izinleri belirler.

## Kurulum (geliştirme)

```bash
npm install          # bağımlılıklar + va-report-components public/sdk-assets'e kopyalanır
npm run dev          # http://localhost:5173
npm run build        # dist/ (statik dosyalar)
npm run lint
```

## Rapor listesi: `public/reports.json`

Yayın sonrası sunucuda `reports.json` dosyasını düzenlemek yeterlidir (yeniden build gerekmez):

```json
{
  "viyaUrl": "https://viya.kurum.gov.tr",
  "reports": [
    {
      "id": "satis-2026",
      "name": "Satış Raporu 2026",
      "description": "Aylık satış performansı",
      "reportUri": "/reports/reports/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

- `reportUri` değerini SAS Visual Analytics'te rapor açıkken tarayıcı adresindeki
  `reportUri=/reports/reports/<uuid>` kısmından alabilirsiniz.
- Kurallar (uygulama tarafından doğrulanır, uymayan kayıt yüklenmez):
  - `viyaUrl` **https** olmalı (yalnız localhost için http'ye izin var),
  - `reportUri` tam olarak `/reports/reports/<uuid>` formatında olmalı,
  - `id` slug formatında ve benzersiz olmalı (`satis-2026` gibi; URL'de kullanılır).
- Doğrudan link paylaşımı: `https://portal-adresi/report/<id>` — kullanıcı giriş yaptıktan
  sonra o rapor açılır. Listede olmayan hiçbir rapor URL ile açılamaz (beyaz liste).

## Yayına alma

1. (Önerilir) `vite.config.js` içindeki `VIYA_ORIGIN` sabitine Viya adresinizi yazın —
   build'e CSP meta etiketi eklenir. CSP'yi sunucu header'ı olarak vermek daha da iyidir (aşağıda).
2. `npm run build` → `dist/` klasörünü nginx/IIS/Apache altında yayınlayın.
3. SPA olduğu için bilinmeyen yollar `index.html`'e yönlendirilmeli (aşağıdaki örneklerde var).
4. Portal **HTTPS ile** sunulmalı — cross-site cookie (`SameSite=None; Secure`) HTTPS ister.

### nginx örneği

```nginx
server {
    listen 443 ssl;
    server_name portal.kurum.gov.tr;
    root /var/www/viya-report-portal/dist;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Güvenlik başlıkları (VIYA adresini kendi sunucunuzla değiştirin)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://viya.kurum.gov.tr; img-src 'self' https://viya.kurum.gov.tr data: blob:; font-src 'self' https://viya.kurum.gov.tr data:; frame-src https://viya.kurum.gov.tr; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### IIS (web.config) örneği

`dist/` içine `web.config` koyun; URL Rewrite modülü gerekir:

```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA" stopProcessing="true">
          <match url=".*" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://viya.kurum.gov.tr; img-src 'self' https://viya.kurum.gov.tr data: blob:; font-src 'self' https://viya.kurum.gov.tr data:; frame-src https://viya.kurum.gov.tr; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

## SAS Viya sunucu ayarları (yayın sonrası YAPILMASI ZORUNLU)

Tarayıcıdan Viya API'lerine erişim için Viya yöneticisi, **SAS Environment Manager →
Configuration** altında şu üç ayarı yapmalı (üçü de portalın origin'ini içermeli,
örn. `https://portal.kurum.gov.tr`):

| # | Ayar | Yapılacak |
|---|---|---|
| 1 | **CORS** — `sas.commons.web.security.cors` | `allowedOrigins` listesine portal origin'i ekle; `allowCredentials=true`; `allowedMethods` en az `GET,POST,PUT,OPTIONS`; `allowedHeaders` `*` |
| 2 | **Cross-site cookie** — `sas.commons.web.security.cookies` | `sameSite=None` (Viya'nın HTTPS'te çalışması gerekir — `Secure` bayrağı otomatik gelir) |
| 3 | **CSRF** — `sas.commons.web.security.csrf` | `allowedUris` / allowed origins düzenine portal origin'ini ekle |

> Bu ayarlar yapılmadan portalda giriş/rapor **çalışmaz**; tarayıcı konsolunda CORS
> hataları görürsünüz. Ayrıntı: SAS Viya belgelerinde "Cross-Origin Resource Sharing".

### Viya ayarı yapılmadan yerel deneme (opsiyonel, yalnız geliştirme)

`vite.config.js` içindeki `server.proxy` bloğunu açın, `target`'ı Viya sunucunuza çevirin
ve `reports.json` içinde `viyaUrl` değerini `http://localhost:5173/viya` yapın. İstekler
aynı origin üzerinden proxy'lendiği için CORS ayarı gerekmeden deneme yapılabilir.
Bu yöntem yalnızca geliştirme içindir; üretimde kullanmayın.

## Güvenlik tasarımı

- **Sır yok:** İstemcide token/şifre saklanmaz; kimlik tamamen Viya'nın kendi cookie'sinde.
  `localStorage`'a kimlik verisi yazılmaz.
- **Beyaz liste:** Yalnızca `reports.json`'daki raporlar açılabilir; `reportUri` regex ile,
  `viyaUrl` tek origin olarak doğrulanır — keyfi adrese istek/gömme yapılamaz.
- **Yetki Viya'da:** Rapor listede görünse bile kullanıcının Viya izni yoksa rapor render
  edilmez; erişim kararını her zaman Viya verir.
- **Open redirect yok:** Giriş sonrası yönlendirme yapılmaz; kullanıcı bulunduğu uygulama-içi
  rotada kalır.
- **CSP + güvenlik başlıkları:** Yukarıdaki sunucu örnekleriyle XSS/gömme yüzeyi daraltılır.
- **Sabit sürümler:** `package-lock.json` commit'lenir; SDK'lar CDN'den değil yerelden sunulur.
