import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../App.jsx";
import UserInfoModal from "./UserInfoModal.jsx";
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
  const [showUserInfo, setShowUserInfo] = useState(false);

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
          <button
            className="user-chip"
            title="Oturum bilgilerini görüntüle"
            onClick={() => setShowUserInfo(true)}
          >
            <IconUser size={14} />
            {currentUser.name}
          </button>
        )}
        <button className="icon-btn" onClick={toggleTheme} title="Tema Değiştir">
          {isDark ? <IconSun /> : <IconMoon />}
        </button>
        <button className="btn btn-ghost" onClick={auth.logout}>
          <IconLogout size={15} />
          Çıkış
        </button>
      </div>
      {showUserInfo && <UserInfoModal onClose={() => setShowUserInfo(false)} />}
    </header>
  );
}
