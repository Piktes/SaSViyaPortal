export default function LoginPage({ auth, viyaUrl }) {
  return (
    <div className="center-screen">
      <div className="panel login-panel">
        <h1>Viya Rapor Portalı</h1>
        <p className="muted">
          Raporları görüntülemek için SAS Viya hesabınızla giriş yapın. Giriş
          penceresi açılır; kimlik bilgileriniz yalnızca{" "}
          <code>{viyaUrl}</code> adresine gider, bu uygulamada saklanmaz.
        </p>
        <button className="btn btn-primary" onClick={auth.login}>
          SAS Viya ile Giriş Yap
        </button>
        {auth.error && <p className="error-text">{auth.error}</p>}
      </div>
    </div>
  );
}
