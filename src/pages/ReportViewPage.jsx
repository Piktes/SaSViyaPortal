import { Link, useParams } from "react-router-dom";
import { useApp } from "../App.jsx";
import NotFoundPage from "./NotFoundPage.jsx";

export default function ReportViewPage() {
  const { id } = useParams();
  const { config, auth } = useApp();

  // Beyaz liste: yalnizca reports.json'da tanimli raporlar acilabilir.
  const report = config.reports.find((r) => r.id === id);
  if (!report) return <NotFoundPage />;

  return (
    <div className="page report-page">
      <header className="topbar">
        <div className="topbar-left">
          <Link to="/" className="btn btn-ghost">
            ← Raporlar
          </Link>
          <span className="brand">{report.name}</span>
        </div>
        <button className="btn btn-ghost" onClick={auth.logout}>
          Çıkış
        </button>
      </header>

      <div className="report-frame">
        <sas-report
          url={config.viyaUrl}
          reportUri={report.reportUri}
          authenticationType="credentials"
        ></sas-report>
      </div>
    </div>
  );
}
