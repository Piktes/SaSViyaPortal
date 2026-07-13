import { Link } from "react-router-dom";
import { useApp } from "../App.jsx";

export default function TopBar({ title, backTo, extra }) {
  const { auth, theme } = useApp();
  const { isDark, toggleTheme, logoSrc } = theme;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        {backTo && (
          <Link to={backTo} className="btn btn-ghost" title="Geri">
            ←
          </Link>
        )}
        <img src={logoSrc} alt="MEB" />
        <span className="brand-name">
          {title || "Bakanlık Yönetim Sistemi"}
          {!title && <span className="brand-sub">Rapor Portalı</span>}
        </span>
      </div>
      <div className="topbar-actions">
        {extra}
        <button className="icon-btn" onClick={toggleTheme} title="Tema Değiştir">
          {isDark ? "☀️" : "🌙"}
        </button>
        <button className="btn btn-ghost" onClick={auth.logout}>
          Çıkış
        </button>
      </div>
    </header>
  );
}
