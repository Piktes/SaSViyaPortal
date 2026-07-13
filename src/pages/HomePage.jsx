import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../App.jsx";
import TopBar from "../components/TopBar.jsx";
import ReportThumb from "../components/ReportThumb.jsx";
import { IconChart, IconFile, IconSupport, IconSend } from "../components/Icons.jsx";
import {
  listUserReports,
  exportReportPdf,
  downloadBlob,
  safeFileName,
} from "../api/viyaApi.js";

export default function HomePage() {
  const [tab, setTab] = useState("live");

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <div className="tabs">
          <button
            className={`tab ${tab === "live" ? "active" : ""}`}
            onClick={() => setTab("live")}
          >
            <IconChart /> Canlı Raporlar
          </button>
          <button
            className={`tab ${tab === "pdf" ? "active" : ""}`}
            onClick={() => setTab("pdf")}
          >
            <IconFile /> Rapor Çıktıları
          </button>
          <button
            className={`tab ${tab === "support" ? "active" : ""}`}
            onClick={() => setTab("support")}
          >
            <IconSupport /> Sorun Bildir
          </button>
        </div>

        {tab === "live" && <LiveReportsTab />}
        {tab === "pdf" && <PdfOutputsTab />}
        {tab === "support" && <SupportTab />}
      </main>
    </div>
  );
}

/* Sekme 1: yonetici tanimli liste (reports.json) — canli gomulu goruntuleme. */
function LiveReportsTab() {
  const { config } = useApp();

  if (config.reports.length === 0) {
    return (
      <p className="state-note">
        Tanımlı rapor yok. Sunucudaki <code>reports.json</code> dosyasına rapor ekleyin.
      </p>
    );
  }

  return (
    <>
      <div className="card-grid">
        {config.reports.map((report) => (
          <Link key={report.id} to={`/report/${report.id}`} className="report-card">
            <div className="report-thumb">
              <ReportThumb seed={report.name + report.id} />
            </div>
            <div className="report-card-body">
              <h3>{report.name}</h3>
              {report.description && <p>{report.description}</p>}
            </div>
          </Link>
        ))}
      </div>
      <p className="muted small">
        Raporlar canlı olarak açılır; erişim yetkiniz olmayan raporlar görüntülenmez.
      </p>
    </>
  );
}

/* Sekme 2: kullanicinin erisebildigi raporlar + PDF export (sasrapor mantigi). */
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

/* Sekme 3: sorun bildirimi — e-posta istemcisi uzerinden yoneticiye iletilir. */
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
