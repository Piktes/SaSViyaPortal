import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../App.jsx";
import TopBar from "../components/TopBar.jsx";
import {
  IconChart,
  IconFile,
  IconSupport,
  IconSend,
  IconSearch,
  IconBell,
  IconChevron,
  IconArrowRight,
} from "../components/Icons.jsx";
import {
  listUserReports,
  exportReportPdf,
  downloadBlob,
  safeFileName,
} from "../api/viyaApi.js";

const TABS = [
  { id: "duyurular", label: "Duyurular", icon: IconBell },
  { id: "live", label: "Canlı Raporlar", icon: IconChart },
  { id: "pdf", label: "Rapor Çıktıları", icon: IconFile },
  { id: "support", label: "Sorun Bildir", icon: IconSupport },
];

export default function HomePage() {
  const [tab, setTab] = useState("duyurular");

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <div className="tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <Icon /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "duyurular" && <AnnouncementsTab />}
        {tab === "live" && <LiveReportsTab />}
        {tab === "pdf" && <PdfOutputsTab />}
        {tab === "support" && <SupportTab />}
      </main>
    </div>
  );
}

/* Turkce-duyarli normalize: arama icin buyuk/kucuk ve aksan katlama. */
function norm(s) {
  return (s || "")
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .trim();
}

/* ─── Sekme 0: Duyurular ─── */
function AnnouncementsTab() {
  // Yarinin tarihi (Europe/Istanbul icin yerel tarih yeterli).
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="announce-wrap">
      <div className="announce-item">
        <div className="announce-head">
          <span className="announce-badge">
            <IconBell size={14} /> Duyuru
          </span>
          <span className="announce-date">{dateStr}</span>
        </div>
        <p className="announce-text">
          Artık ilinize ait <strong>"Öğrencinin Okul Terkini Etkileyen Faktörler"</strong>{" "}
          raporu <strong>Eğitim Öğretim</strong> başlığı altında yayındadır!
        </p>
      </div>
    </div>
  );
}

/* Tek rapor butonu (akordeon ve arama sonuclarinda ortak). */
function ReportButton({ report, index }) {
  return (
    <Link
      to={`/report/${report.id}`}
      className="report-btn"
      style={{ animationDelay: `${Math.min(index, 16) * 22}ms` }}
    >
      <span className="report-btn-name">{report.name}</span>
      {report.isNew && <span className="report-btn-new">Yeni</span>}
      <IconArrowRight size={15} className="report-btn-arrow" />
    </Link>
  );
}

/* ─── Sekme 1: Canlı Raporlar (akordeon) ─── */
function LiveReportsTab() {
  const { config } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(() => new Set());

  const categories = useMemo(() => config.categories || [], [config.categories]);
  const totalCount = config.reports.length;
  const searching = query.trim() !== "";

  // Arama: her kategoriyi filtrele; eslesmeyen kategori gizlenir, eslesenler acilir.
  const view = useMemo(() => {
    const q = norm(query);
    return categories
      .map((cat) => ({
        name: cat.name,
        reports: q ? cat.reports.filter((r) => norm(r.name).includes(q)) : cat.reports,
      }))
      .filter((cat) => !q || cat.reports.length > 0);
  }, [categories, query]);

  const matchCount = view.reduce((n, c) => n + c.reports.length, 0);

  const toggle = (name) => {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  if (totalCount === 0) {
    return (
      <p className="state-note">
        Tanımlı rapor yok. Sunucudaki <code>reports.json</code> dosyasına rapor ekleyin.
      </p>
    );
  }

  return (
    <>
      <div className="search-bar">
        <IconSearch size={17} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Rapor ara… (${totalCount} rapor)`}
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery("")} title="Temizle">
            ✕
          </button>
        )}
      </div>

      {searching && view.length === 0 ? (
        <p className="state-note">"{query}" ile eşleşen rapor bulunamadı.</p>
      ) : (
        <div className="accordion">
          {view.map((cat) => {
            const isOpen = searching || open.has(cat.name);
            return (
              <div className={`acc ${isOpen ? "open" : ""}`} key={cat.name}>
                <button
                  className="acc-head"
                  onClick={() => !searching && toggle(cat.name)}
                  aria-expanded={isOpen}
                >
                  <span className="acc-title">{cat.name}</span>
                  <span className="acc-count">{cat.reports.length}</span>
                  <IconChevron size={18} className="acc-chevron" />
                </button>
                <div className="acc-panel">
                  <div className="acc-panel-inner">
                    <div className="btn-grid">
                      {cat.reports.map((r, i) => (
                        <ReportButton key={r.id} report={r} index={i} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="muted small" style={{ marginTop: "1.5rem" }}>
        {searching
          ? `${matchCount} rapor eşleşti.`
          : "Bir başlığa tıklayın, raporlar açılsın. Ya da yukarıdan arayın."}
      </p>
    </>
  );
}

/* ─── Sekme 2: Rapor Çıktıları (kullanicinin erisebildigi raporlar + PDF) ─── */
function PdfOutputsTab() {
  const { config } = useApp();
  const [state, setState] = useState({ status: "loading", reports: [], error: null });
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listUserReports(config.viyaUrl)
      .then((reports) => {
        if (!cancelled) setState({ status: "ready", reports, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", reports: [], error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [config.viyaUrl]);

  const handlePdf = async (report) => {
    setBusyId(report.id);
    setRowError(null);
    try {
      const blob = await exportReportPdf(report.id);
      downloadBlob(blob, `${safeFileName(report.name)}.pdf`);
    } catch (err) {
      setRowError({ id: report.id, message: err.message });
    }
    setBusyId(null);
  };

  if (state.status === "loading") {
    return (
      <p className="state-note">
        <span className="spinner dark" style={{ marginRight: 8 }} />
        Erişiminize açık raporlar alınıyor…
      </p>
    );
  }
  if (state.status === "error") {
    return <p className="state-note error-text">{state.error}</p>;
  }
  if (state.reports.length === 0) {
    return <p className="state-note">Erişiminize açık rapor bulunamadı.</p>;
  }

  return (
    <>
      <p className="muted small" style={{ marginBottom: "0.9rem" }}>
        Bu liste <strong>erişiminize açık</strong> raporlardır. "PDF İndir"e
        tıkladığınızda çıktı sunucuda hazırlanır — rapora göre 10-60 saniye sürebilir.
      </p>
      <div className="table-wrap">
        <table className="output-table">
          <thead>
            <tr>
              <th>Rapor</th>
              <th>Son Değişiklik</th>
              <th className="col-actions">Çıktı</th>
            </tr>
          </thead>
          <tbody>
            {state.reports.map((report) => (
              <tr key={report.id}>
                <td>
                  <strong>{report.name}</strong>
                  {report.description && (
                    <div className="muted small">{report.description}</div>
                  )}
                  {rowError?.id === report.id && (
                    <div className="error-text small" style={{ marginTop: 6 }}>
                      {rowError.message}
                    </div>
                  )}
                </td>
                <td className="muted">{formatDate(report.modified)}</td>
                <td className="col-actions">
                  <button
                    className="btn btn-primary pdf-btn"
                    onClick={() => handlePdf(report)}
                    disabled={busyId !== null}
                  >
                    {busyId === report.id ? (
                      <>
                        <span className="spinner" /> Hazırlanıyor…
                      </>
                    ) : (
                      "PDF İndir"
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─── Sekme 3: Sorun Bildir ─── */
function SupportTab() {
  const { config, currentUser } = useApp();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const supportEmail = config.supportEmail;

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = [
      `Bildiren: ${currentUser?.name || "bilinmiyor"} (${currentUser?.id || "-"})`,
      `Tarih: ${new Date().toLocaleString("tr-TR")}`,
      "",
      message,
    ].join("\n");
    window.location.href =
      `mailto:${supportEmail}` +
      `?subject=${encodeURIComponent(`[BYS Rapor Portalı] ${subject}`)}` +
      `&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <div className="support-wrap">
      <p className="muted small" style={{ marginBottom: "1rem" }}>
        Portalda yaşadığınız sorunu ya da önerinizi buradan iletebilirsiniz.
        {currentUser?.name && (
          <>
            {" "}Bildirim, <strong>{currentUser.name}</strong> adına gönderilecektir.
          </>
        )}
      </p>

      {!supportEmail ? (
        <p className="state-note">
          Sorun bildirimi için yönetici e-posta adresi henüz yapılandırılmadı.
          (<code>reports.json</code> içine <code>supportEmail</code> ekleyin.)
        </p>
      ) : (
        <form className="support-form" onSubmit={handleSubmit}>
          <label>
            Konu
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Örn. Rapor açılmıyor"
              required
              maxLength={120}
            />
          </label>
          <label>
            Açıklama
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sorunu kısaca anlatın: hangi rapor, ne zaman, hangi hata..."
              rows={6}
              required
            />
          </label>
          <div className="support-actions">
            <button type="submit" className="btn btn-primary">
              <IconSend size={15} /> Gönder
            </button>
            {sent && (
              <span className="muted small">
                E-posta uygulamanız açıldı — göndermeyi orada tamamlayın.
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
