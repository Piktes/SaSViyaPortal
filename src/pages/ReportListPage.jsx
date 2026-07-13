import { Link } from "react-router-dom";
import { useApp } from "../App.jsx";

export default function ReportListPage() {
  const { config, auth } = useApp();

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">Viya Rapor Portalı</span>
        <button className="btn btn-ghost" onClick={auth.logout}>
          Çıkış
        </button>
      </header>

      <main className="content">
        <h2>Raporlar</h2>
        {config.reports.length === 0 ? (
          <p className="muted">
            Tanımlı rapor yok. Sunucudaki <code>reports.json</code> dosyasına
            rapor ekleyin.
          </p>
        ) : (
          <div className="card-grid">
            {config.reports.map((report) => (
              <Link key={report.id} to={`/report/${report.id}`} className="card">
                <h3>{report.name}</h3>
                {report.description && (
                  <p className="muted">{report.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
        <p className="muted small">
          Not: Bir raporu listede görmeniz erişiminiz olduğu anlamına gelmez —
          yetkilendirme SAS Viya tarafından yapılır.
        </p>
      </main>
    </div>
  );
}
