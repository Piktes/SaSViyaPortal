import { Link } from "react-router-dom";
import { useApp } from "../App.jsx";
import {
  IconSun,
  IconMoon,
  IconUser,
  IconLogout,
  IconArrowLeft,
} from "./Icons.jsx";

export default function TopBar({ title, backTo, extra }) {
  const { auth, theme, currentUser } = useApp();
  const { isDark, toggleTheme, logoSrc } = theme;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        {backTo && (
          <Link to={backTo} className="icon-btn" title="Geri">
            <IconArrowLeft />
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
        {currentUser?.name && (
          <span className="user-chip" title={currentUser.id}>
            <IconUser size={14} />
            {currentUser.name}
          </span>
        )}
        <button className="icon-btn" onClick={toggleTheme} title="Tema Değiştir">
          {isDark ? <IconSun /> : <IconMoon />}
        </button>
        <button className="btn btn-ghost" onClick={auth.logout}>
          <IconLogout size={15} />
          Çıkış
        </button>
      </div>
    </header>
  );
}
