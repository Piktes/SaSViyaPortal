import { createContext, useContext, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { loadConfig } from "./config/loadConfig.js";
import { useViyaAuth } from "./hooks/useViyaAuth.js";
import { useTheme } from "./hooks/useTheme.js";
import { getCurrentUser } from "./api/viyaApi.js";
import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import ReportViewPage from "./pages/ReportViewPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

const AppContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext);
}

export default function App() {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .catch((err) => setConfigError(err.message));
  }, []);

  const auth = useViyaAuth(config?.viyaUrl);
  const [currentUser, setCurrentUser] = useState(null);

  // Giris sonrasi oturumdaki kullaniciyi al (ust seritte gosterilir).
  useEffect(() => {
    if (auth.status !== "authenticated" || !config) {
      setCurrentUser(null);
      return;
    }
    let cancelled = false;
    getCurrentUser(config.viyaUrl)
      .then((u) => {
        if (!cancelled) setCurrentUser(u);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null); // bilgi alinamazsa sessizce gecilir
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, config]);

  if (configError) {
    return (
      <div className="center-screen">
        <div className="panel">
          <h1>Yapılandırma hatası</h1>
          <p className="error-text">{configError}</p>
          <p className="muted">
            Sunucudaki <code>reports.json</code> dosyasını kontrol edin.
          </p>
        </div>
      </div>
    );
  }

  if (!config || auth.status === "checking") {
    return (
      <div className="center-screen">
        <div className="panel muted">Yükleniyor…</div>
      </div>
    );
  }

  // Oturum yoksa hangi rotada olursa olsun giris ekrani gosterilir.
  // Yonlendirme yapilmadigi icin (rota korunur) open-redirect riski yoktur;
  // giris sonrasi kullanici zaten istedigi /report/:id rotasinda kalir.
  if (auth.status !== "authenticated") {
    return <LoginPage auth={auth} theme={theme} />;
  }

  return (
    <AppContext.Provider value={{ config, auth, theme, currentUser }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/report/:id" element={<ReportViewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppContext.Provider>
  );
}
