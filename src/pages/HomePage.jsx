import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../App.jsx";
import TopBar from "../components/TopBar.jsx";
import ReportThumb from "../components/ReportThumb.jsx";
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
            📊 Canlı Raporlar
          </button>
          <button
            className={`tab ${tab === "pdf" ? "active" : ""}`}
            onClick={() => setTab("pdf")}
          >
            📄 Rapor Çıktıları
          </button>
        </div>

        {tab === "live" ? <LiveReportsTab /> : <PdfOutputsTab />}
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
        Raporlar SAS Viya üzerinde canlı olarak açılır; erişim yetkiniz yoksa rapor
        görüntülenmez.
      </p>
    </>
  );
}

/* Sekme 2: kullanicinin Viya'da erisebildigi raporlar + PDF export (sasrapor mantigi). */
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
        Erişebildiğiniz raporlar Viya'dan alınıyor…
      </p>
    );
  }

  if (state.status === "error") {
    return <p className="state-note error-text">{state.error}</p>;
  }

  if (state.reports.length === 0) {
    return <p className="state-note">Viya'da erişebildiğiniz rapor bulunamadı.</p>;
  }

  return (
    <>
      <p className="muted small" style={{ marginBottom: "0.9rem" }}>
        Bu liste, SAS Viya'da <strong>sizin erişiminize açık</strong> raporlardır. "PDF
        İndir"e tıkladığınızda çıktı Viya üzerinde hazırlanır — rapora göre 10-60 saniye
        sürebilir.
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
