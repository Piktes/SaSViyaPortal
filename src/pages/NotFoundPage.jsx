import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="center-screen">
      <div className="panel">
        <h1>Rapor bulunamadı</h1>
        <p className="muted">
          Aradığınız sayfa yok ya da bu rapor tanımlı değil. Raporlar yalnızca
          yöneticinin tanımladığı listeden açılabilir.
        </p>
        <Link to="/" className="btn btn-primary">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
