import { useEffect, useState } from "react";
import { useApp } from "../App.jsx";
import { getUserMemberships } from "../api/viyaApi.js";

// Oturumdan cekebildigimiz TUM kullanici bilgilerini gosterir:
// identities kaydinin alanlari + grup uyelikleri + ham JSON.
export default function UserInfoModal({ onClose }) {
  const { config, currentUser } = useApp();
  const [groups, setGroups] = useState(null); // null = yukleniyor
  const [groupsError, setGroupsError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUserMemberships(config.viyaUrl)
      .then((g) => {
        if (!cancelled) setGroups(g);
      })
      .catch((err) => {
        if (!cancelled) {
          setGroups([]);
          setGroupsError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [config.viyaUrl]);

  const raw = currentUser?.raw || {};
  // links disindaki tum alanlari duz tabloya ser.
  const fields = Object.entries(raw).filter(([k]) => k !== "links");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Oturum Bilgileri</h2>
          <button className="icon-btn" onClick={onClose} title="Kapat">
            ✕
          </button>
        </div>

        <h3 className="modal-section">Kimlik</h3>
        <table className="kv-table">
          <tbody>
            {fields.map(([key, value]) => (
              <tr key={key}>
                <td className="kv-key">{key}</td>
                <td>{renderValue(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="modal-section">Grup Üyelikleri</h3>
        {groups === null ? (
          <p className="muted small">Yükleniyor…</p>
        ) : groups.length === 0 ? (
          <p className="muted small">{groupsError || "Üyelik bulunamadı."}</p>
        ) : (
          <ul className="group-list">
            {groups.map((g) => (
              <li key={g.id}>
                <strong>{g.name}</strong>
                <span className="muted small"> — {g.id}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          className="btn btn-ghost small"
          style={{ marginTop: "1rem" }}
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? "Ham veriyi gizle" : "Ham veriyi göster (JSON)"}
        </button>
        {showRaw && <pre className="raw-json">{JSON.stringify(raw, null, 2)}</pre>}
      </div>
    </div>
  );
}

function renderValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "evet" : "hayır";
  if (typeof value === "object") return <code>{JSON.stringify(value)}</code>;
  // ISO tarihleri okunur bicimde goster.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    try {
      return new Date(value).toLocaleString("tr-TR");
    } catch {
      return value;
    }
  }
  return String(value);
}
