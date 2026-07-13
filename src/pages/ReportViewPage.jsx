import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../App.jsx";
import TopBar from "../components/TopBar.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import { exportReportPdf, downloadBlob, safeFileName } from "../api/viyaApi.js";

export default function ReportViewPage() {
  const { id } = useParams();
  const { config } = useApp();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Beyaz liste: yalnizca reports.json'da tanimli raporlar acilabilir.
  const report = config.reports.find((r) => r.id === id);
  if (!report) return <NotFoundPage />;

  const reportUuid = report.reportUri.split("/").pop();

  const handlePdf = async () => {
    setPdfBusy(true);
    setPdfError(null);
    try {
      const blob = await exportReportPdf(reportUuid);
      downloadBlob(blob, `${safeFileName(report.name)}.pdf`);
    } catch (err) {
      setPdfError(err.message);
    }
    setPdfBusy(false);
  };

  const pdfButton = (
    <button className="btn btn-ghost" onClick={handlePdf} disabled={pdfBusy}>
      {pdfBusy ? (
        <>
          <span className="spinner dark" /> PDF hazırlanıyor…
        </>
      ) : (
        "⬇ PDF"
      )}
    </button>
  );

  return (
    <div className="report-page">
      <TopBar title={report.name} backTo="/" extra={pdfButton} />
      {pdfError && (
        <div className="error-text" style={{ padding: "0.4rem 1.25rem" }}>
          {pdfError}
        </div>
      )}
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
