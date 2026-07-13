import { useState } from "react";

export default function LoginPage({ auth, viyaUrl, theme }) {
  const [loading, setLoading] = useState(false);
  const { isDark, toggleTheme, logoSrc } = theme;

  const handleLogin = async () => {
    setLoading(true);
    await auth.login();
    setLoading(false);
  };

  return (
    <div className="login-page">
      {/* MEB filigran */}
      <div className="login-watermark">
        <img src={logoSrc} alt="" style={{ opacity: isDark ? 0.05 : 0.06 }} />
      </div>

      <div className="login-center">
        <div className="login-stack">
          <img
            src={logoSrc}
            alt="MEB"
            className="login-logo-top"
            style={{
              filter: isDark
                ? "drop-shadow(0 2px 10px rgba(0,0,0,0.6))"
                : "drop-shadow(0 2px 8px rgba(0,0,0,0.18))",
            }}
          />

          <div className="login-card">
            <button
              type="button"
              className="icon-btn login-theme-toggle"
              onClick={toggleTheme}
              title="Tema Değiştir"
            >
              {isDark ? "☀️" : "🌙"}
            </button>

            <div className="login-title">
              <h1>Bakanlık Yönetim Sistemi</h1>
              <p className="login-subtitle">Rapor Portalı</p>
            </div>

            <button className="login-btn" onClick={handleLogin} disabled={loading}>
              {loading ? <span className="spinner" /> : "SAS Viya ile Giriş Yap"}
            </button>

            {auth.error && <div className="login-error">{auth.error}</div>}

            <div className="login-info">
              ℹ️ Girişte açılan pencereye <strong>BYS (SAS Viya)</strong> kullanıcı adı ve
              şifrenizi yazın. Kimlik bilgileriniz yalnızca <code>{viyaUrl}</code> adresine
              iletilir, bu uygulamada saklanmaz.
            </div>
          </div>
        </div>
      </div>

      <footer className="login-footer">
        <div
          className="login-footer-line"
          style={{
            background: isDark
              ? "linear-gradient(to right, transparent, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.18) 75%, transparent)"
              : "linear-gradient(to right, transparent, rgba(0,0,0,0.14) 25%, rgba(0,0,0,0.14) 75%, transparent)",
          }}
        />
        <div className="login-footer-row">
          <img src={logoSrc} alt="MEB" />
          <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
            Bu uygulama T.C. Millî Eğitim Bakanlığı Bilgi İşlem Genel Müdürlüğü tarafından
            geliştirilmiştir &nbsp;·&nbsp; © 2026 Tüm hakları saklıdır
          </span>
        </div>
      </footer>
    </div>
  );
}
